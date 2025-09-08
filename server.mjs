const { floor, random } = Math

import { join, dirname } from "path"
import { fileURLToPath } from "url"
import crypto from "crypto"
import { networkInterfaces } from "os"

import express from "express"
import websocketWs from 'express-ws'
import bodyParser from 'body-parser'

import { GameMap, Game, MODE_SERVER, MSG_KEYS, MSG_KEY_LENGTH, GAME_STEP_WAITING } from './static/core/game.mjs'
import { loadCatalog } from './static/core/catalog.mjs'

const PROD = ((process.env.DRAWMYGAME_ENV || "").toLowerCase() === "production") ? true : false
const PORT = parseInt(process.env.PORT || 8080)
const DIRNAME = dirname(fileURLToPath(import.meta.url))
const IS_DEBUG_MODE = process.env.DEBUG == "1"

const MAX_BODY_SIZE = '2mb'
const ASSETS_STATIC_CACHE_MAX_AGE = PROD ? "1d" : "1h"
const DEFAULT_STATIC_CACHE_MAX_AGE = IS_DEBUG_MODE ? "1d" : 0

const RM_PLAYER_COUNTDOWN = 10
const CLOSE_ROOM_COUNTDOWN = 60

let catalog = null


async function main() {
  const gameServer = new GameServer()
  gameServer.serve()
  const localIp = Object.values(getLocalIps())[0]
  console.log(`Server started at: http://${localIp}:${PORT}`)
  catalog = await loadCatalog()
  await catalog.preloadAll()
}


class GameServer {

  constructor() {
    this.port = PORT
    this.rooms = {}
    this.initApp()
  }

  initApp() {
    this.app = express()
    websocketWs(this.app)

    this.app.use(bodyParser.raw({
      type: 'application/octet-stream',
      limit : MAX_BODY_SIZE
    }))

    if(IS_DEBUG_MODE) {
      this.app.use((req, res, next) => {
        console.log(`${req.method} ${req.url}`)
        next()
      })
    }

    this.app.use('/static/assets', express.static('static/assets', { maxAge: ASSETS_STATIC_CACHE_MAX_AGE }))
    this.app.use('/static', express.static('static', { maxAge: DEFAULT_STATIC_CACHE_MAX_AGE }))
    this.app.get("/", (req, res) => {
      res.sendFile(join(DIRNAME, "static/index.html"))
    })
    this.app.get("/favicon.ico", (req, res) => {
      res.sendFile(join(DIRNAME, "static/favicon.ico"))
    })
    this.app.get("/r/*", (req, res) => {
      res.sendFile(join(DIRNAME, "static/room.html"))
    })


    this.app.get('/ping', (req, res) => {
      res.end('pong')
    })

    this.app.post("/newroom", (req, res) => {
      const roomId = this.newRoom()
      res.json({ roomId })
    })

    this.app.post("/room/:roomId/map", async (req, res) => {
      const { roomId } = req.params
      const room = this.rooms[roomId]
      if(!room) return res.sendStatus(404)
      room.mapBuf = new Buffer(req.body.toString('binary'),'binary')
      this.startGame(room)
      res.end()
    })

    this.app.get("/room/:roomId/map", (req, res) => {
      const { roomId } = req.params
      const room = this.rooms[roomId]
      if(!room || !room.mapBuf) return res.sendStatus(404)
      res.writeHead(200, {
        "Content-Type": "application/octet-stream"
      }).end(room.mapBuf)
    })

    this.app.ws('/client', (ws, req) => {
      ws.on('message', msg => {
        const key = msg.substring(0, MSG_KEY_LENGTH)
        const body = msg.substring(MSG_KEY_LENGTH)
        if(key === MSG_KEYS.STATE) this.handleState(ws, body)
        else if(key === MSG_KEYS.IDENTIFY_CLIENT) this.handleIdentifyClient(ws, JSON.parse(body))
        else if(key === MSG_KEYS.JOIN_GAME) this.handleJoinGame(ws, JSON.parse(body))
        else if(key === MSG_KEYS.GAME_INSTRUCTION) this.handleGameInstruction(ws, body)
        else if(key === MSG_KEYS.PING) this.handlePing(ws)
        else console.warn("Unknown websocket key", key)
      })
      ws.on('close', () => {
        console.log(`Client '${ws.client.id}' disconnected`)
        this.handleClientDeconnection(ws)
      })
    })
  }

  serve() {
    this.app.listen(this.port, '0.0.0.0')
  }

  generateClientId() {
    return crypto.randomBytes(8).toString("hex")
  }

  newRoom() {
    let it = 1, room = null
    while(room === null) {
      const roomId = this.generateRoomId(it)
      if(this.rooms[roomId] === undefined) {
        room = new Room(this, roomId)
      }
      it++
    }
    return room.id
  }

  generateRoomId(numTry) {
    return PROD ? floor(random() * 1000).toString() : numTry.toString()
  }

  registerRoom(room) {
    this.rooms[room.id] = room
  }

  deregisterRoom(room) {
    delete this.rooms[room.id]
  }

  handleIdentifyClient(ws, kwargs) {
    let { roomId, id: clientId } = kwargs
    const room = this.rooms[roomId]
    if(!room || room.closed) { closeWs(ws); return }
    let client = clientId && room.clients[clientId]
    if(!client) {
      clientId = this.generateClientId()
      client = room.addClient(clientId)
    }
    client.attachWs(ws)
    const idBody = { id: clientId }
    if(client.playerName) {
      idBody.name = client.playerName
      idBody.color = client.playerColor
    } else {
      idBody.suggestedName = room.nextPlayerName()
      idBody.suggestedColor = "black"
    }
    ws.send(MSG_KEYS.IDENTIFY_CLIENT + JSON.stringify(idBody))
    console.log(`Client '${clientId}' connected`)
  }

  handleJoinGame(ws, kwargs) {
    const { client } = ws
    if(!client || client.closed) { closeWs(ws); return }
    const { name, color } = kwargs
    client.playerName = name
    client.playerColor = color
    if(client.room.game) client.room.game.addPlayer(ws.client.id, { num: client.num, name, color })
    console.log(`Client '${client.id}' joined game as '${name}'`)
  }

  handleState(ws, data) {
    const { client } = ws
    if(!client || client.closed) { closeWs(ws); return }
    const { game } = client.room
    if(game) game.receiveStatesFromPlayer(client.id, data)
  }

  handleReqState(ws) {
    const { client } = ws
    if(!client || client.closed) { closeWs(ws); return }
    const { game } = client.room
    if(game) game.getAndSendFullState()
  }

  handleGameInstruction(ws, data) {
    const { client } = ws
    if(!client || client.closed) { closeWs(ws); return }
    const { game } = client.room
    if(data == "restart" && game) game.restartGame()
    else if(data == "start" && game) game.startGame()
    else if(data == "pause" && game) game.pause(true)
    else if(data == "unpause" && game) game.pause(false)
    else if(data == "state" && game) game.getAndSendFullState()
    else console.warn(`Unknown game instruction: ${data}`)
  }

  async startGame(room) {
    const map = new GameMap()
    const mapBin = new Uint8Array(room.mapBuf)
    await map.importFromBinary(mapBin)
    const game = room.game = new Game(null, catalog, map, null, {
      mode: MODE_SERVER,
      sendStates: statesStr => room.sendAll(MSG_KEYS.STATE + statesStr),
      debug: IS_DEBUG_MODE,
    })
    await game.loadWaitingScenes()
    game.run()
  }

  handlePing(ws) {
    const { client } = ws
    if(!client || client.closed) { closeWs(ws); return }
    ws.send(MSG_KEYS.PING)
  }

  handleClientDeconnection(ws) {
    const { client } = ws
    if(!client || client.closed) return
    client.onCloseWs()
  }
}


class Room {

  constructor(server, id) {
    this.server = server
    this.id = id
    this.numLastClient = 0
    this.clients = {}
    this.server.registerRoom(this)
    this.initCloseCountdown()
    console.log(`Room '${this.id}' has been created`)
  }

  addClient(clientId) {
    this.numLastClient += 1
    const client = this.clients[clientId] = new Client(this, clientId, this.numLastClient)
    return client
  }

  onCloseClient(client) {
    if(this.closed) return
    delete this.clients[client.id]
    if(!this.hasClients()) this.initCloseCountdown()
  }

  onCloseWs(client) {
    if(this.closed) return
    this.initCloseClientCountdown(client.id)
    console.log(`Client '${client.id}' left the room '${this.id}'`)
  }

  hasClients() {
    for(let _ in this.clients) return true
    return false
  }

  nextPlayerName() {
    return `Player${this.numLastClient}`
  }

  sendAll(msg) {
    const { clients } = this
    for(const clientId in clients) {
      const { ws } = clients[clientId]
      if(ws && !ws.closed) ws.send(msg)
    }
  }

  initCloseClientCountdown(clientId) {
    const closeClientCountdownStartTimes = this.closeClientCountdownStartTimes ||= {}
    const closeClientCountdownStartTime = closeClientCountdownStartTimes[clientId] = Date.now()
    setTimeout(() => {
      if(this.closed) return
      if(closeClientCountdownStartTime != closeClientCountdownStartTimes[clientId]) return
      const client = this.clients[clientId]
      if(client && client.isConnected()) return
      if(this.game) this.game.rmPlayer(clientId)
      if(client) client.close()
    }, RM_PLAYER_COUNTDOWN * 1000)
  }

  initCloseCountdown() {
    const closeCountdownStartTime = this.closeCountdownStartTime = Date.now()
    setTimeout(() => {
      if(this.closed) return
      if(closeCountdownStartTime != this.closeCountdownStartTime) return
      if(this.hasClients()) return
      this.close()
    }, CLOSE_ROOM_COUNTDOWN * 1000)
  }

  close() {
    if(this.closed) return
    this.closed = true
    for(let clientId in this.clients) this.clients[clientId].close()
    if(this.game) this.game.stop()
    this.server.deregisterRoom(this)
    console.log(`Room '${this.id}' has been closed`)
  }
}


class Client {
  constructor(room, id, num) {
    this.room = room
    this.id = id
    this.num = num
    this.ws = null
    this.playerName = null
    this.playerColor = null
  }
  attachWs(ws) {
    this.ws = ws
    ws.client = this
  }
  isConnected() {
    return Boolean(this.ws && !this.ws.closed)
  }
  isJoined() {
    return this.isConnected() && Boolean(this.playerName)
  }
  onCloseWs() {
    this.closeWs()
    this.room.onCloseWs(this)
  }
  closeWs() {
    if(!this.ws) return
    closeWs(this.ws)
    this.ws.client = null
    this.ws = null
  }
  close() {
    if(this.closed) return
    this.closed = true
    this.closeWs()
    this.room.onCloseClient(this)
    this.room = null
    console.log(`Client '${this.id}' has been closed`)
  }
}

function closeWs(ws) {
  if(ws.closed) return
  try {
    ws.close()
  } catch(err) {}
  ws.closed = true
}


function getLocalIps() {
  const nets = networkInterfaces();
  const res = {}

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
        const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
        if (net.family === familyV4Value && !net.internal) {
            if (!res[name]) {
              res[name] = [];
            }
            res[name].push(net.address);
        }
    }
  }
  return res
}

main()
