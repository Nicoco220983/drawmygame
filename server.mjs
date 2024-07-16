// const { floor, random } = Math

import { join, dirname } from "path"
// import fs from "fs"
import { fileURLToPath } from "url"
import crypto from "crypto"
import { networkInterfaces } from "os"
// import path from "path"

import express from "express"
import bodyParser from 'body-parser'
import { WebSocketServer } from 'ws'

import { GameMap, Game, MSG_KEYS, MSG_KEY_LENGTH } from './static/game.mjs'

// import Consts from './static/consts.mjs'

const PROD = ((process.env.MULTISTAR_ENV || "").toLowerCase() === "production") ? true : false
const PORT = process.env.MULTISTAR_PORT || (PROD ? 8080 : 3000)
const DIRNAME = dirname(fileURLToPath(import.meta.url))

// const games = initGames()

const octetStreamParser = bodyParser.raw({
  inflate: false,
  type: "application/octet-stream",
  limit: "2mb",
})

class GameServer {

  constructor() {
    this.port = PORT
    this.rooms = {}
    this.initApp()
  }

  initApp() {
    this.app = express()
    this.app.use('/static', express.static('static'))
    this.app.get('/', (req, res) => {
      res.sendFile(join(DIRNAME, 'static/index.html'));
    })

    this.app.post("/newroom", (req, res) => {
      const roomId = this.newRoom()
      res.json({ roomId })
      // res.redirect(`/r/${this.generateRoomId()}`)
    })

    this.app.get("/r/:roomId", (req, res) => {
      res.sendFile(join(DIRNAME, "static/room.html"))
    })

    this.app.get("/room/:roomId/map", (req, res) => {
      const { roomId } = req.params
      const room = this.rooms[roomId]
      if(!room || !room.mapBuf) return res.sendStatus(404)
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': room.mapBuf.length
      })
      res.end(room.mapBuf)
    })

    this.app.post("/room/:roomId/map", octetStreamParser, (req, res) => {
      const { roomId } = req.params
      const room = this.rooms[roomId]
      if(room === undefined) return res.sendStatus(404)
      room.mapBuf = req.body
      this.startGame(room)
      res.end()
    })

    // this.app.get("/r/:roomId/p", (req, res) => {
    //   const { roomId } = req.params
    //   const room = this.rooms[roomId]
    //   if(room === undefined) return res.sendStatus(404)
    //   res.redirect(`/r/${roomId}/p/${room.generatePlayerId()}`)
    // })

    // this.app.get("/r/:roomId/p/:playerId", (req, res) => {
    //   const { roomId } = req.params
    //   if(this.rooms[roomId] === undefined) return res.sendStatus(404)
    //   res.sendFile(join(DIRNAME, "static/joypad.html"))
    // })

    // this.app.get("/games", (req, res) => {
    //   res.json({ games })
    // })
  }

  serve() {
    this.server = this.app.listen(this.port)
    this.startWebocketServer()
  }

  startWebocketServer() {

    this.websocketServer = new WebSocketServer({ server: this.server })

    this.websocketServer.on('connection', ws => {
    
      ws.on('message', (data, isBinary) => {
        const msg = isBinary ? data : data.toString()
        const key = msg.substring(0, MSG_KEY_LENGTH)
        const body = msg.substring(MSG_KEY_LENGTH)
        if(key === MSG_KEYS.PLAYER_INPUT) this.handlePlayerInput(ws, body)
        //else if(key === MSG_KEYS.GAME_INPUT) this.onGameInput(ws, body)
        // else if(key === MSG_KEYS.GAME_STATE) this.onGameState(ws, body)
        else if(key === MSG_KEYS.IDENTIFY_CLIENT) this.handleIdentifyClient(ws, JSON.parse(body))
        else if(key === MSG_KEYS.JOIN_GAME) this.handleJoinGame(ws, JSON.parse(body))
        // else if(key === MSG_KEYS.START_GAME) this.handleStartGame(ws, JSON.parse(body))
        // else if(key === MSG_KEYS.DISCONNECT_PLAYER) this.handleDisconnectPlayer(ws, body)
        else console.warn("Unknown websocket key", key)
      })
    
      ws.on('error', console.error)
    
      ws.on('close', () => {
        console.log(`Client '${ws.id}' disconnected`)
        this.handleClientDeconnection(ws)
      })
    })
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

  closeRoom(room) {
    for(let wsId in room.websockets) room.websockets[wsId].close()
    if(room.game) room.game.stop()
    delete this.rooms[room.id]
    room.closed = true
    console.log(`Room '${room.id}' has been closed`)
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
    const { roomId } = kwargs
    const room = this.rooms[roomId]
    if(!room) { ws.close(); return }
    if(room.closed) { room.closeClient(ws); return }
    ws.id = this.generateClientId()
    room.attachClient(ws)
    const suggestedName = room.nextPlayerName()
    ws.send(MSG_KEYS.IDENTIFY_CLIENT + JSON.stringify({
      id: ws.id,
      name: suggestedName,
    }))
    console.log(`Client '${ws.id}' connected`)
  }

  handleJoinGame(ws, kwargs) {
    const { room } = ws
    if(!room) { ws.close(); return }
    if(room.closed) { room.closeClient(ws); return }
    const { name, color } = kwargs
    ws.playerName = name
    ws.playerColor = color
    if(room.game) room.game.addPlayer(ws.id, { name, color })
    console.log(`Client '${ws.id}' joined game as '${name}'`)

    // ws.send(MSG_KEYS.IDENTIFY_PLAYER + JSON.stringify({
    //   name: `Player${playerId}`,
    //   color: "blue"
    // }))
    // if(room.gameKey) {
    //   ws.send(MSG_KEYS.START_GAME + JSON.stringify({
    //     gameKey: room.gameKey
    //   }))
    //   if(room.gameState) ws.send(MSG_KEYS.GAME_STATE + room.gameState)
    // }
    // } else {
    //   // player chose its name and color
    //   const { room } = ws
    //   if(!room || room.closed) { ws.close(); return }
    //   if(kwargs.name) ws.name = kwargs.name
    //   if(kwargs.color) ws.color = kwargs.color
    //   const msg = MSG_KEYS.SYNC_PLAYERS + JSON.stringify(room.exportPlayers())
    //   room.sendToGame(msg)
    //   room.sendToPlayers(msg)
    // }
  }

  handlePlayerInput(ws, data) {
    const { room } = ws
    if(!room) { ws.close(); return }
    if(room.closed) { room.closeClient(ws); return }
    const { game } = room
    if(game) game.receivePlayerInputState(ws.id, data)
  }

  // handleStartGame(ws, kwargs) {
  //   const { map } = kwargs
  //   const { room } = ws
  //   if(!room || room.closed) { ws.close(); return }
  //   // room.gameKey = gameKey
  //   // room.gameState = null
  //   room.game = new Game(null, map)
  //   // console.log(`Game of room '${room.id}' set to '${gameKey}'`)
  //   // room.sendToPlayers(MSG_KEYS.START_GAME + JSON.stringify({
  //   //   gameKey
  //   // }))
  // }

  async startGame(room) {
    const map = new GameMap()
    const mapBin = new Uint8Array(room.mapBuf)
    await map.importFromBinary(mapBin)
    room.game = new Game(null, map, null, {
      sendState: stateStr => room.sendAll(MSG_KEYS.GAME_STATE + stateStr)
    })
    room.game.play()
  }

  handleClientDeconnection(ws) {
    const { room } = ws
    if(!room) { ws.close(); return }
    room.closeClient(ws)
  }

  // onJoypadInput(ws, body) {
  //   const { room } = ws
  //   if(!room || room.closed) { ws.close(); return }
  //   room.sendToGame(MSG_KEYS.JOYPAD_INPUT + ws.id + ':' + body)
  // }

  // onGameInput(ws, body) {
  //   const { room } = ws
  //   if(!room || room.closed) { ws.close(); return }
  //   room.sendToPlayers(MSG_KEYS.GAME_INPUT + body)
  // }

  // onGameState(ws, body) {
  //   const { room } = ws
  //   if(!room || room.closed) { ws.close(); return }
  //   room.gameState = body
  //   room.sendToPlayers(MSG_KEYS.GAME_STATE + body)
  // }

  // onDisconnectPlayer(ws, playerId) {
  //   const { room } = ws
  //   if(!room || room.closed) { ws.close(); return }
  //   const playerWs = room.playerWebsockets[playerId]
  //   if(!playerWs) return
  //   playerWs.close()
  // }
}

// function toArrayBuffer(buffer) {
//   const arrayBuffer = new ArrayBuffer(buffer.length)
//   const view = new Uint8Array(arrayBuffer)
//   for (let i = 0; i < buffer.length; ++i) {
//     view[i] = buffer[i]
//   }
//   return arrayBuffer
// }


class Room {

  constructor(server, id) {
    this.server = server
    this.id = id
    this.numPlayer = 1
    this.websockets = {}
    // this.gameKey = null
    // this.gameState = null
    this.server.registerRoom(this)
    this.initCloseCountdown()
    console.log(`Room '${this.id}' has been created`)
  }

  attachClient(ws) {
    this.websockets[ws.id] = ws
    ws.room = this
  }

  closeClient(ws) {
    delete this.websockets[ws.id]
    delete ws.room
    ws.close()
    if(this.game) this.game.rmPlayer(ws.id)
    if(!this.hasClients()) this.initCloseCountdown()
    console.log(`Player '${ws.id}' left the room '${this.id}'`)
  }

  hasClients() {
    for(let wsId in this.websockets) return true
    return false
  }

  nextPlayerName() {
    const res = `Player${this.numPlayer}`
    this.numPlayer += 1
    return res
  }

  sendAll(msg) {
    const { websockets } = this
    for(const wsId in websockets) {
      websockets[wsId].send(msg)
    }
  }

  initCloseCountdown() {
    if(this.closed) return
    const closeCountdownStartTime = this.closeCountdownStartTime = Date.now()
    setTimeout(() => {
      if(closeCountdownStartTime != this.closeCountdownStartTime) return
      if(this.hasClients()) return
      this.close()
    }, 60 * 1000)
  }

  close() {
    if(this.closed) return
    for(let wsId in this.websockets) this.websockets[wsId].close()
    if(this.game) this.game.stop()
    this.server.deregisterRoom(this)
    this.closed = true
    console.log(`Room '${this.id}' has been closed`)
  }

  // sendToGame(msg) {
  //   this.gameWebsocket.send(msg)
  // }

  // sendToPlayers(msg) {
  //   for(const jpws of Object.values(this.playerWebsockets)) {
  //     jpws.send(msg)
  //   }
  // }

  // exportPlayers() {
  //   const res = {}
  //   const { playerWebsockets } = this
  //   for(const jpWs of Object.values(playerWebsockets)) {
  //     const { name, color } = jpWs
  //     if(!name) continue
  //     res[jpWs.id] = { name, color }
  //   }
  //   return res
  // }
}


// function initGames() {
//   const games = {}
//   for(const dirent of fs.readdirSync(path.join(DIRNAME, 'static/game'), { withFileTypes: true })) {
//     try {
//       if(!dirent.isSymbolicLink()) continue
//       const gameRelPath = path.join(dirent.path, dirent.name)
//       const confPath = path.join(fs.realpathSync(gameRelPath), '../multistar.json')
//       const conf = JSON.parse(fs.readFileSync(confPath))
//       games[conf.key] = conf
//     } catch(err) {
//       console.error(err)
//     }
//   }
//   return games
// }


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


const gameServer = new GameServer()
gameServer.serve()
const localIp = Object.values(getLocalIps())[0]
console.log(`Server started at: http://${localIp}:${PORT}`)
