const { assign } = Object
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, checkHit, sumTo, newCanvas } = utils

export const FPS = 60
const CANVAS_MAX_WIDTH = 800
const CANVAS_MAX_HEIGHT = 600
const MAP_BOX_DEFAULT_SIZE = 20
const MAP_DEFAULT_NB_COLS = 50
const MAP_DEFAULT_NB_ROWS = 50
const GRAVITY = 1000

export const MSG_KEY_LENGTH = 3
export const MSG_KEYS = {
  JOIN_GAME: 'JOI',
  IDENTIFY_CLIENT: 'IDC',
  GAME_STATE: 'STT',
  PLAYER_INPUT: 'INP',
//   GAME_OVER: 'GOV',
}

const IS_SERVER_ENV = (typeof window === 'undefined')
const SEND_STATE_PERIOD = 1
const SEND_INPUT_STATE_PERIOD = .1


// MAP

export class GameMap {
    constructor() {
        this.boxSize = MAP_BOX_DEFAULT_SIZE
        this.nbCols = MAP_DEFAULT_NB_COLS
        this.nbRows = MAP_DEFAULT_NB_ROWS
        this.walls = []
        this.entities = []
        this.syncSize()
    }

    syncSize() {
        this.width = this.boxSize * this.nbCols
        this.height = this.boxSize * this.nbRows
        this.syncMap()
    }

    syncMap() {
        const { nbRows, nbCols, walls } = this
        for(let x=0; x<nbCols; ++x) {
            if(walls.length == x) walls.push([])
            const col = walls[x]
            for(let y=0; y<nbRows; ++y) if(col.length == y) col.push(null)
        }
    }

    async exportAsBinary() {
        let wallsStr = ""
        for(let bx=0; bx<this.nbCols; ++bx) for(let by=0; by<this.nbRows; ++by) {
            wallsStr += this.walls[bx][by] || " "
        }
        const outObj = {
            bs: this.boxSize,
            nc: this.nbCols,
            nr: this.nbRows,
            w: wallsStr,
            e: this.entities
        }
        const outStr = JSON.stringify(outObj)
        const outBin = await compress(outStr)
        return outBin
    }
    async exportAsSafeBase64() {
        const outBin = await this.exportAsBinary()
        const outSB64 = await binToSafeB64(outBin)
        return outSB64
    }

    async importFromSafeBase64(inSB64) {
        const inBin = await safeB64ToBin(inSB64)
        await this.importFromBinary(inBin)
    }
    async importFromBinary(inBin) {
        const inStr = await decompress(inBin)
        const inObj = JSON.parse(inStr)
        this.boxSize = inObj.bs
        this.nbCols = inObj.nc
        this.nbRows = inObj.nr
        this.walls = []
        const inObjWalls = inObj.w, nbBox = this.nbCols * this.nbRows, nbRows = this.nbRows
        let col
        for(let i=0; i<nbBox; ++i) {
            if(i % nbRows == 0) {
                col = []
                this.walls.push(col)
            }
            let key = inObjWalls[i]
            if(key === " ") key = null
            col.push(key)
        }
        this.entities = inObj.e
        this.syncSize()
    }
}

async function compress(str) {
  const stream = new Blob([str]).stream()
  const compressedStream = stream.pipeThrough(new CompressionStream("gzip"))
  const chunks = []
  for await (const chunk of compressedStream) chunks.push(chunk)
  return await concatUint8Arrays(chunks)
}

async function decompress(compressedBytes) {
  const stream = new Blob([compressedBytes]).stream()
  const decompressedStream = stream.pipeThrough(new DecompressionStream("gzip"))
  const chunks = [];
  for await (const chunk of decompressedStream) chunks.push(chunk)
  const stringBytes = await concatUint8Arrays(chunks)
  return new TextDecoder().decode(stringBytes)
}

async function concatUint8Arrays(uint8arrays) {
  const blob = new Blob(uint8arrays)
  const buffer = await blob.arrayBuffer()
  return new Uint8Array(buffer)
}

const BIN_AS_B64_DATA_URL_PREFIX = "data:application/octet-stream;base64,"

function binToSafeB64(bytes) {
    return new Promise((ok, ko) => {
        const reader = new FileReader()
        reader.onload = () => {
            if(!reader.result.startsWith(BIN_AS_B64_DATA_URL_PREFIX)) ko("Invalid binary encoding")
            else ok(encodeURIComponent(reader.result.substring(BIN_AS_B64_DATA_URL_PREFIX.length)))
        }
        reader.readAsDataURL(new Blob([bytes]))
    })
}

function safeB64ToBin(sb64) {
    return new Promise((ok, ko) => {
        const b64 = decodeURIComponent(sb64)
        fetch(`${BIN_AS_B64_DATA_URL_PREFIX}${b64}`).then(async res => {
            const reader = new FileReader()
            reader.onload = () => ok(reader.result)
            reader.readAsArrayBuffer(await res.blob())
        })
    })
}


// GAME UTILS ///////////////////////

export function now() {
    return Date.now() / 1000
}

function range(start, end) {
    const res = []
    for(let i=start; i<end; ++i) res.push(i)
    return res
}

function hasKeys(obj) {
    for(let _ in obj) return true
    return false
}

export const Loads = []

function _waitLoad(load) {
    return new Promise((ok, ko) => {
        const __waitLoad = () => {
            if (!load._loading) return ok()
            if (load.loadError) return ko(load.loadError)
            setTimeout(__waitLoad, 10)
        }
        __waitLoad()
    })
}

function waitLoads() {
    return Promise.all(Loads.map(_waitLoad))
}

class None {}
const Image = (!IS_SERVER_ENV && window.Image) || None
export class Img extends Image {
    constructor(src) {
        super()
        this.src = src
        this._loading = true
        Loads.push(this)
        this.onload = () => this._loading = false
        this.onerror = () => this.loadError = `load error: ${src}`
    }
}

class SpriteSheet {
    constructor(src, nbCols, nbRows, kwargs) {
        this.src = src
        this.nbCols = nbCols
        this.nbRows = nbRows
        this.frames = []
        this._loading = true
        assign(this, kwargs)
        if(!IS_SERVER_ENV) this.load()
    }
    async load() {
        if (!this._loading) return
        const { nbRows, nbCols } = this
        Loads.push(this)
        const img = this.img = new Img(this.src)
        await _waitLoad(img)
        const frameWidth = floor(img.width / nbCols)
        const frameHeight = floor(img.height / nbRows)
        for (let j = 0; j < nbRows; ++j) for (let i = 0; i < nbCols; ++i) {
            const can = this.getFrame(i + nbCols * j)
            can.width = frameWidth
            can.height = frameHeight
            can.getContext("2d").drawImage(img, ~~(-i * frameWidth), ~~(-j * frameHeight))
            can._loading = false
        }
        this._loading = false
    }
    getFrame(num) {
        const frames = this.frames
        while (frames.length <= num) {
            const can = newCanvas(0, 0)
            can._loading = true
            frames.push(can)
        }
        return frames[num]
    }
}

export class Sprite {
    constructor(img) {
        this.baseImg = img
        this.transImgs = {}
    }
    getImg(width, height, dirX, dirY) {
        const key = `${width}:${height}:${dirX}:${dirY}`
        let res = this.transImgs[key]
        if(res) return res
        const { baseImg } = this
        if(baseImg._loading) return null
        const { width: baseWidth, height: baseHeight } = baseImg
        const resImg = newCanvas(width, height)
        const ctx = resImg.getContext("2d")
        ctx.translate(dirX >= 0 ? 0 : width, dirY >= 0 ? 0 : height)
        ctx.scale(width/baseWidth * dirX, height/baseHeight * dirY)
        ctx.drawImage(baseImg, 0, 0)
        this.transImgs[key] = resImg
        return resImg
    }
}


// BUILDER //////////////////////////

export class Entity {

    constructor(scn, x, y) {
        this.x = x
        this.y = y
        this.width = 10
        this.height = 10
        this.dirX = 1
        this.dirY = 1
        this.scene = scn
        this.game = scn.game
        this.spriteVisible = true
        this.scaleSprite = Entity.spriteFit
    }

    update(time) {}

    drawTo(ctx) {
        const img = this.getImg()
        if(img) ctx.drawImage(img, ~~(this.x - img.width/2), ~~(this.y - img.height/2))
    }

    getImg() {
        if(this.sprite && this.spriteVisible) {
            this.scaleSprite()
            return this.sprite.getImg(
                this.spriteWidth,
                this.spriteHeight,
                this.dirX,
                this.dirY,
            )
        }
    }

    getHitBox() {
        const { x, y, width, height } = this
        return {
            left: x - width/2,
            width,
            top: y - height/2,
            height,
        }
    }

    remove() {
        this.removed = true
    }

    getState() {
        const state = this.state ||= {}
        state.key = this.constructor.key
        state.x = this.x
        state.y = this.y
        return state
    }

    setState(state) {
        this.x = state.x
        this.y = state.y
    }
}

Entity.spriteFit = function() {
    const { width, height } = this
    const { width: baseWidth, height: baseHeight } = this.sprite.baseImg
    if(width * baseHeight > baseWidth * height){
        this.spriteWidth = ~~(baseWidth*height/baseHeight)
        this.spriteHeight = height
    } else {
        this.spriteWidth = width
        this.spriteHeight = ~~(baseHeight*width/baseWidth)
    }
}

Entity.spriteFill = function() {
    const { width, height } = this
    const { width: baseWidth, height: baseHeight } = this.sprite.baseImg
    if(width * baseHeight < baseWidth * height){
        this.spriteWidth = ~~(baseWidth*height/baseHeight)
        this.spriteHeight = height
    } else {
        this.spriteWidth = width
        this.spriteHeight = ~~(baseHeight*width/baseWidth)
    }
}

Entity.spriteFitWidth = function() {
    const { width } = this
    const { width: baseWidth, height: baseHeight } = this.sprite.baseImg
    this.spriteWidth = width
    this.spriteHeight = ~~(baseHeight*width/baseWidth)
}

Entity.spriteFitHeight = function() {
    const { height } = this
    const { width: baseWidth, height: baseHeight } = this.sprite.baseImg
    this.spriteWidth = ~~(baseWidth*height/baseHeight)
    this.spriteHeight = height
}

function newTextCanvas(text, kwargs) {
    if(IS_SERVER_ENV) return null
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "black"
    ctx.font = "30px serif"
    assign(ctx, kwargs)
    const metrics = ctx.measureText(text)
    canvas.width = metrics.width
    canvas.height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    ctx.fillStyle = "black"
    ctx.font = "30px serif"
    assign(ctx, kwargs)
    ctx.fillText(text, 0, metrics.actualBoundingBoxAscent)
    return canvas
}

class Text extends Entity {
    constructor(scn, text, x, y, kwargs) {
        super(scn, x, y)
        this.textArgs = kwargs
        this.updateText(text)
    }

    updateText(text) {
        const canvas = newTextCanvas(text, this.textArgs)
        this.width = canvas.width
        this.height = canvas.height
        this.sprite = new Sprite(canvas)
    }
}

export class Group {

    constructor(scn) {
        this.x = 0
        this.y = 0
        this.scene = scn
        this.game = scn.game
        this.items = {}
        this.lastAutoId = -1
    }

    nextAutoId() {
        this.lastAutoId += 1
        return this.lastAutoId
    }

    add(arg1, arg2) {
        let id, item
        if(arg2 === undefined) { id = this.nextAutoId(); item = arg1 }
        else { id = arg1; item = arg2 }
        this.items[id] = item
        return item
    }

    forEach(next) {
        const { items } = this
        for(let key in items) next(items[key])
    }

    cleanRemoved() {
        const { items } = this
        for(let key in items) if(items[key].removed) delete items[key]
    }

    update(time) {
        this.forEach(ent => ent.update(time))
    }

    drawTo(gameCtx) {
        this.cleanRemoved()
        const x = ~~this.x, y = ~~this.y
        gameCtx.translate(x, y)
        this.forEach(ent => ent.drawTo(gameCtx))
        gameCtx.translate(-x, -y)
    }

    getState(isFull) {
        const { items } = this
        const res = {}
        for(let key in items) {
            const item = items[key]
            if(isFull || item._isStateToSend) {
                res[key] = item.getState(isFull)
                delete item._isStateToSend
            }
        }
        return hasKeys(res) ? res : null
    }

    setState(state, isFull) {
        const { items } = this
        if(state) for(let key in state) {
            let ent = items[key]
            if(!ent) {
                const cls = Entities[state[key].key]
                ent = this.add(new cls(this.scene))
            }
            ent.setState(state[key], isFull)
        }
        if(isFull) for(let key in items) if(!state || !state[key]) items[key].remove()
    }
}

export class GameCommon {

    constructor(wrapperEl, map) {
        this.isServerEnv = IS_SERVER_ENV
        if(!this.isServerEnv) {
            this.canvas = document.createElement("canvas")
            assign(this.canvas.style, {
                outline: "2px solid grey"
            })
            wrapperEl.appendChild(this.canvas)
        }

        this.game = this
        this.map = map

        this.syncSize()
    }

    initPointer() {
        if(this.pointer) return
        this.pointer = utils.newPointer(this)
        this.pointer.prevIsDown = false
    }

    setMainScene(scn) {
        if(this.mainScene !== undefined) this.mainScene.remove()
        this.mainScene = scn
    }

    update(time) {
        this.mainScene.update(time)
        if(this.joypadScene) this.joypadScene.update(time)
    }

    draw() {
        if(this.isServerEnv) return
        this.mainScene.draw()
        if(this.joypadScene) this.joypadScene.draw()
        const ctx = this.canvas.getContext("2d")
        ctx.drawImage(this.mainScene.canvas, 0, 0)
        if(this.joypadScene) ctx.drawImage(this.joypadScene.canvas, 0, this.gameCanvasHeight)
    }

    syncSize() {
        this.gameCanvasWidth = this.joypadCanvasWidth = min(this.map.width, CANVAS_MAX_WIDTH)
        this.gameCanvasHeight = min(this.map.height, CANVAS_MAX_HEIGHT)
        this.joypadCanvasHeight = 200;
        assign(this, {
            width: this.gameCanvasWidth,
            height: this.gameCanvasHeight + (this.joypadScene ? this.joypadCanvasHeight : 0)
        })
        if(!this.isServerEnv) {
            assign(this.canvas, { width: this.width, height: this.height })
        }
        if(this.mainScene) this.mainScene.syncSize()
        if(this.joypadScene) this.joypadScene.syncSize()
    }
}

export class SceneCommon {

    constructor(game) {
        this.game = game
        this.x = 0
        this.y = 0
        this.pointer = null
        if(!this.game.isServerEnv) {
            this.canvas = document.createElement("canvas")
        }
        this.syncSize()
        this.walls = new Group(this)
        this.entities = new Group(this)
        this.initWalls()
        this.initEntities()
    }

    syncSize() {
        const { width, height } = this.game.map
        this.width = width
        this.height = height
        if(this.canvas) {
            this.canvas.width = this.game.gameCanvasWidth
            this.canvas.height = this.game.gameCanvasHeight
        }
    }

    initWalls() {
        const { nbCols, nbRows, walls } = this.game.map
        for(let boxX=0; boxX<nbCols; ++boxX) for(let boxY=0; boxY<nbRows; ++boxY) {
            const wall = walls[boxX][boxY]
            if(wall) this.addWall(boxX, boxY, wall)
        }
    }

    initEntities() {
        this.game.map.entities.forEach(e => this.addEntity(e.x, e.y, e.key))
    }

    addWall(boxX, boxY, key) {
        let wall
        if(key == "W") wall = this.walls.add(new Wall(this, boxX, boxY, key))
        return wall
    }

    addEntity(x, y, key) {
        const cls = Entities[key]
        const ent = this.entities.add(new cls(this, x, y))
        return ent
    }

    update(time) {
        this.time = time
        this.syncPointer()
    }

    syncPointer() {
        const gamePointer = this.game.pointer
        if(!gamePointer) return
        const thisPointer = this.pointer ||= {}
        thisPointer.isDown = gamePointer.isDown
        thisPointer.prevIsDown = gamePointer.prevIsDown
        thisPointer.x = gamePointer.x - this.x
        thisPointer.y = gamePointer.y - this.y
    }

    draw() {
        const ctx = this.canvas.getContext("2d")
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        this.drawTo(ctx)
    }
}

const wallSprite = new Sprite(newCanvas(10, 10, "black"))

class Wall extends Entity {
    constructor(scn, boxX, boxY, key) {
        super(scn)
        this.boxX = boxX
        this.boxY = boxY
        this.key = key
        const { boxSize } = this.game.map
        this.x = (boxX + .5) * boxSize
        this.y = (boxY + .5) * boxSize
        this.width = boxSize
        this.height = boxSize
        this.sprite = wallSprite
        this.spriteScaleX = this.spriteScaleY = boxSize / 10
    }
}


// GAME //////////////////////////

export class Game extends GameCommon {

    constructor(wrapperEl, map, playerId, kwargs) {
        super(wrapperEl, map)

        this.pointer = null

        this.players = {}
        this.localPlayerId = playerId

        this.setMainScene(new GameScene(this))

        this.sendState = (kwargs && kwargs.sendState) || null
        this.lastSendStateTime = -SEND_STATE_PERIOD

        this.sendInputState = (kwargs && kwargs.sendInputState) || null
        this.lastSendInputStateTime = -SEND_INPUT_STATE_PERIOD

        this.keyboardKeysPressed = {}
        this.joypadKeysPressed = {}
        if(!this.isServerEnv) {
            document.addEventListener('keydown', evt => {this.keyboardKeysPressed[evt.key] = true})
            document.addEventListener('keyup', evt => delete this.keyboardKeysPressed[evt.key])
        }
    }

    play() {
        if(this.gameLoop) return
        const beginTime = now()
        this.gameLoop = setInterval(() => {
            const time = now() - beginTime
            this.update(time)
            if(this.sendState) {
                if(time > this.lastSendStateTime + SEND_STATE_PERIOD) {
                    this.sendState(this.getState(true))
                    this.lastSendStateTime = time
                } else {
                    const stateStr = this.getState(false)
                    if(stateStr) this.sendState(stateStr)
                }
            }
            if(this.sendInputState) {
                const inputStateStr = this.getLocalPlayerInputState()
                if(this.prevInputStateStr != inputStateStr || (inputStateStr && time > this.lastSendInputStateTime + SEND_INPUT_STATE_PERIOD)) {
                    this.sendInputState(inputStateStr)
                    this.prevInputStateStr = inputStateStr
                    this.lastSendInputStateTime = time
                }
            }
            this.draw()
        }, 1000 / FPS)
    }

    stop() {
        if(this.gameLoop) clearInterval(this.gameLoop)
        this.gameLoop = null
    }

    addPlayer(playerId, kwargs) {
        this.players[playerId] = kwargs
        this.mainScene.addPlayer(playerId)
    }

    isKeyPressed(key) {
        return this.keyboardKeysPressed[key] || this.joypadKeysPressed[key]
    }

    setJoypadKeyPressed(key, val) {
        this.joypadKeysPressed[key] = val
    }

    getState(isFull) {
        const state = this.state ||= {}
        state._full = isFull
        const players = state.players = this.players
        const main = state.main = this.mainScene.getState(isFull)
        return (isFull || players || main) ? JSON.stringify(state) : null
    }

    setState(stateStr) {
        const state = JSON.parse(stateStr)
        if(state.players || state._full) this.players = state.players
        this.mainScene.setState(state ? state.main : null, state ? state._full : false)
    }

    getLocalPlayerInputState() {
        const hero = this.mainScene.getHero(this.localPlayerId)
        if(!hero) return null
        const inputState = hero.getInputState()
        return inputState ? JSON.stringify(inputState) : ""
    }

    setPlayerInputState(playerId, inputStateStr) {
        const hero = this.mainScene.getHero(playerId)
        if(!hero) return
        const inputState = inputStateStr ? JSON.parse(inputStateStr) : null
        hero.setInputState(inputState)
    }

    async showJoypadScene() {
        const joypadMod = await import("./joypad.mjs")
        if(this.joypadScene) return
        this.initPointer()
        const { JoypadScene } = joypadMod
        this.joypadScene = new JoypadScene(this)
        const localHero = this.mainScene.getHero(this.localPlayerId)
        if(localHero) localHero.initJoypadButtons(this.joypadScene)
        this.syncSize()
    }
}

export class GameScene extends SceneCommon {
    constructor(game) {
        super(game)
        this.notifs = new Group(this)
        // this.entities.forEach(ent => { if(ent instanceof Hero) this.initHero(ent) })
        this.step = "GAME"
        this.time = 0
    }

    initEntities() {
        this.game.map.entities.forEach(mapEnt => {
            const { x, y, key } = mapEnt
            const cls = Entities[key]
            if(cls.prototype instanceof Hero) this.mapHero = mapEnt
            else this.addEntity(x, y, key)
        })
    }

    addPlayer(playerId) {
        if(!this.mapHero) return
        const { x, y, key } = this.mapHero
        const cls = Entities[key]
        const heroId = this.entities.nextAutoId()
        this.entities.add(heroId, new cls(this, x, y))
        this.game.players[playerId].heroId = heroId
    }

    getHero(playerId) {
        const player = this.game.players[playerId]
        if(!player) return null
        const { heroId } = player
        if(heroId === undefined) return null
        return this.entities.items[heroId]
    }

    initLocalHero() {
        if(this.localHero) return
        const hero = this.getHero(this.game.localPlayerId)
        if(!hero) return
        this.localHero = hero
        this.hearts = new Group(this)
        for(let i=0; i<hero.life; ++i)
            this.hearts.add(new Heart(this, i))
        if(this.game.joypadScene) hero.initJoypadButtons(this.game.joypadScene)
    }

    syncHearts() {
        if(!this.hearts) return
        this.hearts.forEach(heart => {
            heart.setFull(heart.num < this.localHero.life)
        })
    }

    update(time) {
        super.update(time)
        this.initLocalHero()
        this.applyPhysics(time)
        this.entities.update(time)
    }

    drawTo(ctx) {
        this.walls.drawTo(ctx)
        this.entities.drawTo(ctx)
        if(this.hearts) this.hearts.drawTo(ctx)
        this.notifs.drawTo(ctx)
    }

    getTeam(team) {
        const teams = this._teams ||= {}
        const teamsTime = this._teamsTime ||= {}
        if(teamsTime[team] != this.time) {
            const teamEnts = teams[team] ||= []
            teamEnts.length = 0
            this.entities.forEach(ent => {
                const entTeam = ent.team
                if(entTeam && entTeam.startsWith(team)) teamEnts.push(ent)
            })
            teamsTime[team] = this.time
        }
        return teams[team]
    }

    applyPhysics(time) {
        const { nbRows, nbCols, boxSize, walls } = this.game.map
        const { getHitBox } = utils
        this.entities.forEach(ent => {
            // gravity
            if(ent.undergoGravity) ent.speedY += GRAVITY / FPS
            // speed & collisions
            const { left: entX, top: entY, width: entW, height: entH } = getHitBox(ent)
            const dx = ent.speedX / FPS, dy = ent.speedY / FPS
            ent.speedResX = 0; ent.speedResY = 0
            if(dx > 0) {
                let blocked = false
                if(ent.undergoWalls) {
                    const bx1 = max(0, min(nbCols-1, ceil((entX + entW/2) / boxSize)))
                    const bx2 = max(0, min(nbCols-1, floor((entX + entW + dx) / boxSize)))
                    for(let bx=bx1; !blocked && bx<=bx2; ++bx) {
                        const ddx = max(0, (bx * boxSize) - (entX + entW))
                        const ddy = dy * ddx / dx
                        const by1 = max(0, min(nbRows-1, floor((entY+ddy+1) / boxSize)))
                        const by2 = max(0, min(nbRows-1, floor((entY+entH+ddy-1) / boxSize)))
                        for(let by=by1; !blocked && by<=by2; ++by) {
                            blocked = (walls[bx][by] !== null)
                        }
                        if(blocked) {
                            ent.x += ddx
                            ent.speedX = 0
                            ent.speedResX = ddx - dx
                        }
                    }
                }
                if(!blocked) ent.x += dx
            }
            else if(dx < 0) {
                let blocked = false
                if(ent.undergoWalls) {
                    const bx1 = max(0, min(nbCols-1, floor((entX + entW/2) / boxSize) - 1))
                    const bx2 = max(0, min(nbCols-1, ceil((entX + dx) / boxSize) - 1))
                    for(let bx=bx1; !blocked && bx>=bx2; --bx) {
                        const ddx = min(0, ((bx+1) * boxSize) - entX)
                        const ddy = dy * ddx / dx
                        const by1 = max(0, min(nbRows-1, floor((entY+ddy+1) / boxSize)))
                        const by2 = max(0, min(nbRows-1, floor((entY+entH+ddy-1) / boxSize)))
                        for(let by=by1; !blocked && by<=by2; ++by) {
                            blocked = (walls[bx][by] !== null)
                        }
                        if(blocked) {
                            ent.x += ddx
                            ent.speedX = 0
                            ent.speedResX = ddx - dx
                        }
                    }
                }
                if(!blocked) ent.x += dx
            }
            if(dy > 0) {
                let blocked = false
                if(ent.undergoWalls) {
                    const by1 = max(0, min(nbRows-1, ceil((entY + entH/2) / boxSize)))
                    const by2 = max(0, min(nbRows-1, floor((entY + entH + dy) / boxSize)))
                    for(let by=by1; !blocked && by<=by2; ++by) {
                        const ddy = max(0, (by * boxSize) - (entY + entH))
                        const ddx = dx * ddy / dy
                        const bx1 = max(0, min(nbCols-1, floor((entX+ddx+1) / boxSize)))
                        const bx2 = max(0, min(nbCols-1, floor((entX+entW+ddx-1) / boxSize)))
                        for(let bx=bx1; !blocked && bx<=bx2; ++bx) {
                            blocked = (walls[bx][by] !== null)
                        }
                        if(blocked) {
                            ent.y += ddy
                            ent.speedY = 0
                            ent.speedResY = ddy - dy
                        }
                    }
                }
                if(!blocked) ent.y += dy
            }
            else if(dy < 0) {
                let blocked = false
                if(ent.undergoWalls) {
                    const by1 = max(0, min(nbRows-1, floor((entY + entH/2) / boxSize) - 1))
                    const by2 = max(0, min(nbRows-1, ceil((entY + dy) / boxSize) - 1))
                    for(let by=by1; !blocked && by>=by2; --by) {
                        const ddy = min(0, ((by+1) * boxSize) - entY)
                        const ddx = dx * ddy / dy
                        const bx1 = max(0, min(nbCols-1, floor((entX+ddx+1) / boxSize)))
                        const bx2 = max(0, min(nbCols-1, floor((entX+entW+ddx-1) / boxSize)))
                        for(let bx=bx1; !blocked && bx<=bx2; ++bx) {
                            blocked = (walls[bx][by] !== null)
                        }
                        if(blocked) {
                            ent.y += ddy
                            ent.speedY = 0
                            ent.speedResY = ddy - dy
                        }
                    }
                }
                if(!blocked) ent.y += dy
            }
        })
    }

    setStepGameOver() {
        if(this.step == "GAMEOVER") return
        this.step = "GAMEOVER"
        this.notifs.add(new Text(
            this,
            "GAME OVER",
            this.game.width/2, this.game.height/2,
            { font: "100px serif" },
        ))
    }

    setStepVictory() {
        if(this.step == "VICTORY") return
        this.step = "VICTORY"
        this.notifs.add(new Text(
            this,
            "VICTORY !",
            this.game.width/2, this.game.height/2,
            { font: "100px serif" },
        ))
    }

    getState(isFull) {
        const state = this.state ||= {}
        const ent = state.entities = this.entities.getState(isFull)
        return ent ? state : null
    }

    setState(state, isFull) {
        this.entities.setState(state ? state.entities : null, isFull)
    }
}

// ENTITIES ///////////////////////////////////

const Entities = {}
Entities.register = function(key, cls) {
    cls.key = key
    this[key] = cls
}

class DynamicEntity extends Entity {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.speedX = this.speedY = 0
        this.speedResX = this.speedResY = 0
        this.undergoGravity = true
        this.undergoWalls = true
    }

    getState() {
        const state = super.getState()
        state.speedX = this.speedX
        state.speedY = this.speedY
        return state
    }

    setState(state) {
        super.setState(state)
        this.speedX = state.speedX
        this.speedY = state.speedY
    }
}

export class Hero extends DynamicEntity {
    constructor(...args) {
        super(...args)
        this.team = "hero"
        this.life = 3
        this.damageLastTime = -3
    }

    isLocalHero() {
        return this === this.scene.localHero
    }

    update(time) {
        this.time = time
        if(this.life == 0 || this.isDamageable()) this.spriteVisible = true
        else this.spriteVisible = floor(time * 100) % 2 == 0
        if(this.life == 0) this.rotation += 4 * PI / FPS
    }

    isDamageable(force) {
        return (this.damageLastTime + 3) < this.time
    }

    damage(val, damager, force) {
        if(this.life == 0) return
        if(!force && !this.isDamageable()) return
        this.life = max(0, this.life - val)
        this.scene.syncHearts()
        if(this.life == 0) {
            this.kill(damager)
            this.scene.setStepGameOver()
        } else {
            this.damageLastTime = this.time
            if(damager) {
                this.speedY = -200
                this.speedX = 200 * ((this.x > damager.x) ? 1 : -1)
            }
        }
    }

    kill(damager) {
        if(damager) {
            this.speedY = -500
            this.speedX = 100 * ((damager && this.x < damager.x) ? -1 : 1)
        }
        this.undergoWalls = false
    }

    getState() {
        const state = super.getState()
        state.life = this.life
        return state
    }

    setState(state) {
        super.setState(state)
        this.life = state.life
    }

    getInputState() {
        const { inputState, inputStateTime } = this
        if(inputState && inputStateTime && now() < inputStateTime + SEND_INPUT_STATE_PERIOD * 2 && hasKeys(inputState))
            return inputState
    }

    setInputState(inputState) {
        this.inputState = inputState
        this.inputStateTime = now()
    }

    initJoypadButtons(joypadScn) {}
}

const NicoSpriteSheet = new SpriteSheet("/static/assets/nico_full.png", 4, 1)
const NicoStandingSprite = new Sprite(NicoSpriteSheet.getFrame(0))
const NicoRunningSprites = range(1, 4).map(i => new Sprite(NicoSpriteSheet.getFrame(i)))
const NicoJumpingSprite = new Sprite(NicoSpriteSheet.getFrame(1))

class Nico extends Hero {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.width = 50
        this.height = 50
        this.initPos = { x, y }
        this.sprite = NicoStandingSprite
    }

    update(time) {
        super.update(time)
        // inputs
        this.updateInputState(time)
        this.applyInputState(time)
        // display
        if(this.speedX > 0) this.dirX = 1
        else if(this.speedX < 0) this.dirX = -1
        if(this.speedResY == 0) this.sprite = NicoJumpingSprite
        else if(this.speedX == 0) this.sprite = NicoStandingSprite
        else this.sprite = NicoRunningSprites[floor((time * 6) % 3)]
        // fall
        if(this.y > this.game.map.height + 100) {
            this.damage(1, null, true)
            if(this.life > 0) this.respawn()
        }
    }

    updateInputState(time) {
        if(this.game.isServerEnv || !this.isLocalHero() || this.life <= 0) return
        const { game } = this
        const inputState = {}
        if(game.isKeyPressed("ArrowRight")) inputState.walkX = 1
        else if(game.isKeyPressed("ArrowLeft")) inputState.walkX = -1
        if(this.speedResY < 0 && game.isKeyPressed("ArrowUp")) inputState.jump = true
        this.setInputState(inputState)
    }

    applyInputState(time) {
        const inputState = this.getInputState()
        if(!inputState || !inputState.walkX) this.speedX = sumTo(this.speedX, 500, 0)
        else if(inputState.walkX > 0) this.speedX = sumTo(this.speedX, 1000/FPS, 300)
        else if(inputState.walkX < 0) this.speedX = sumTo(this.speedX, 1000/FPS, -300)
        if(inputState && inputState.jump) this.speedY = -500
    }

    getHitBox() {
        return {
            left: this.x - 20,
            width: 40,
            top: this.y - 25,
            height: 50,
        }
    }

    respawn() {
        this.x = this.initPos.x
        this.y = this.initPos.y
        this.speedX = 0
        this.speedY = 0
    }

    getState() {
        const state = super.getState()
        state.dirX = this.dirX
        return state
    }

    setState(state) {
        super.setState(state)
        this.dirX = state.dirX
    }

    initJoypadButtons(joypadScn) {
        joypadScn.addButtons([
            { key: "ArrowLeft" },
            { key: "ArrowUp" },
            { key: "ArrowRight" },
        ])
    }
}
Entities.register("nico", Nico)


class Enemy extends DynamicEntity {
    constructor(...args) {
        super(...args)
        this.team = "enemy"
    }
}


const ZombiSpriteSheet = new SpriteSheet("/static/assets/zombi.png", 8, 1)
const ZombiSprites = range(0, 8).map(i => new Sprite(ZombiSpriteSheet.getFrame(i)))

class Zombi extends Enemy {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.width = 50
        this.height = 60
        this.sprite = ZombiSprites[0]
        this.scaleSprite = Entity.spriteFitHeight
    }

    update(time) {
        const { nbRows, nbCols, boxSize, walls } = this.game.map
        // move
        if(this.speedResX * this.dirX < 0) this.dirX *= -1
        if(this.speedResY < 0) {
            const { left, width, top, height } = this.getHitBox()
            const wallAheadBy = ceil((top + height - 1) / boxSize)
            const wallAheadBx = (this.dirX > 0) ? ceil((left + width / 2) / boxSize) : floor((left + width / 2) / boxSize)
            if(wallAheadBx<0 || wallAheadBx>=nbCols || wallAheadBy<0 || wallAheadBy>=nbRows || walls[wallAheadBx][wallAheadBy] === null) this.dirX *= -1
            this.speedX = this.dirX * 2000 / FPS
        }
        // anim
        this.sprite = ZombiSprites[floor((time * 6) % 8)]
        // attack
        this.scene.getTeam("hero").forEach(hero => {
            if(utils.checkHit(this, hero)) hero.damage(1, this)
        })
    }

    getHitBox() {
        return {
            left: this.x - 10,
            width: 20,
            top: this.y - 30,
            height: 60,
        }
    }
}
Entities.register("zombi", Zombi)

const HeartSpriteSheet = new SpriteSheet("/static/assets/heart.png", 2, 1)
const HeartSprites = range(0, 2).map(i => new Sprite(HeartSpriteSheet.getFrame(i)))

class Heart extends Entity {
    constructor(scn, num) {
        super(scn, 25 + 35 * num, 25)
        this.num = num
        this.width = this.height = 30
        this.sprite = HeartSprites[0]
    }
    setFull(isFull) {
        this.sprite = HeartSprites[isFull ? 0 : 1]
    }
}

const StarImg = new Img("/static/assets/star.png")
const StarSprite = new Sprite(StarImg)

class Star extends Entity {
    constructor(...args) {
        super(...args)
        this.sprite = StarSprite
        this.width = this.height = 30
        this.undergoGravity = false
        this.undergoWalls = false
        this.scene.nbStars ||= 0
        this.scene.nbStars += 1
    }
    update(time) {
        this.scene.getTeam("hero").forEach(hero => {
            if(utils.checkHit(this, hero)) {
                this.remove()
                this.scene.nbStars -= 1
                if(this.scene.nbStars == 0) this.scene.setStepVictory()
            }
        })
    }
}
Entities.register("star", Star)
