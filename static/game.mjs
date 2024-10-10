const { assign } = Object
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, checkHit, sumTo, newCanvas, Touches } = utils

export const FPS = 60
const CANVAS_MAX_WIDTH = 800
const CANVAS_MAX_HEIGHT = 600
const MAP_BOX_DEFAULT_SIZE = 20
const MAP_DEFAULT_NB_COLS = 40
const MAP_DEFAULT_NB_ROWS = 25
const GRAVITY = 1000

export const MSG_KEY_LENGTH = 3
export const MSG_KEYS = {
  JOIN_GAME: 'JOI',
  IDENTIFY_CLIENT: 'IDC',
  GAME_STATE: 'STT',
  PLAYER_INPUT: 'INP',
  GAME_INSTRUCTION: 'GMI',
//   GAME_OVER: 'GOV',
}

const IS_SERVER_ENV = (typeof window === 'undefined')
const SEND_STATE_PERIOD = 1
const SEND_INPUT_STATE_PERIOD = .5


// MAP

export class GameMap {
    constructor() {
        this.boxSize = MAP_BOX_DEFAULT_SIZE
        this.nbCols = MAP_DEFAULT_NB_COLS
        this.nbRows = MAP_DEFAULT_NB_ROWS
        this.walls = []
        this.heros = []
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
            h: this.heros,
            e: this.entities,
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
        this.heros = inObj.h
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
            if(can) can._loading = true
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

    static {
        assign(this.prototype, {
            width: 10,
            height: 10,
            dirX: 1,
            dirY: 1,
        })
    }

    constructor(scn, x, y) {
        this.x = x
        this.y = y
        this.scene = scn
        this.game = scn.game
        this.spriteVisible = true
        this.scaleSprite = Entity.spriteFit
    }

    update(dt) {}

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

    checkHitTouches() {
        let { left, width, top, height } = this.getHitBox()
        left += this.scene.x
        top += this.scene.y
        for(let touch of this.game.touches) {
            const { x: touchX, y: touchY } = touch
            if(left<=touchX && left+width>touchX && top<=touchY && top+height>touchY) return true
        }
        return false
    }

    remove() {
        this.removed = true
    }

    getState() {
        const state = this.state ||= {}
        state.key = this.constructor.key
        state.x = this.x
        state.y = this.y
        if(this.hasOwnProperty("dirX")) state.dirX = this.dirX
        if(this.hasOwnProperty("dirY")) state.dirY = this.dirY
        return state
    }

    setState(state) {
        this.x = state.x
        this.y = state.y
        if(state.dirX !== undefined) this.dirX = state.dirX
        if(state.dirY !== undefined) this.dirY = state.dirY
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

export const Entities = {}
Entities.register = function(key, cls) {
    cls.key = key
    this[key] = cls
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
        if(this.game.isServerEnv) return
        const canvas = newTextCanvas(text, this.textArgs)
        this.width = canvas.width
        this.height = canvas.height
        this.sprite = new Sprite(canvas)
    }
}

class CenteredText extends Text {
    constructor(scn, text, kwargs) {
        super(scn, text, 0, 0, kwargs)
    }
    drawTo(ctx) {
        this.x = this.scene.width / 2
        this.y = this.scene.height / 2
        super.drawTo(ctx)
    }
}

export class Group {

    constructor(owner) {
        this.x = 0
        this.y = 0
        this.owner = owner
        this.game = owner.game
        this.items = {}
        this.lastAutoId = 0
    }

    nextAutoId() {
        this.lastAutoId += 1
        return this.lastAutoId
    }

    get(entId) {
        return this.items[entId]
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
        for(let id in items) if(items[id].removed) delete items[id]
    }

    update(dt) {
        this.cleanRemoved()
        this.forEach(ent => ent.update(dt))
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
            if((isFull || item._isStateToSend) && !item.removed) {
                res[key] = item.getState(isFull)
                delete item._isStateToSend
            }
        }
        return (isFull || hasKeys(res)) ? res : null
    }

    setState(state, isFull) {
        const { items } = this
        if(state) {
            const ClassDefs = this.getClassDefs()
            for(let key in state) {
                let ent = items[key]
                if(!ent) {
                    const cls = ClassDefs[state[key].key]
                    ent = this.add(new cls(this.owner))
                }
                ent.setState(state[key], isFull)
            }
            if(isFull) for(let key in items) if(!state[key]) items[key].remove()
        } else if(isFull) for(let key in items) items[key].remove()
    }
}

class EntityGroup extends Group {
    getClassDefs() {
        return Entities
    }
}

export class GameCommon {

    constructor(parentEl, map) {
        this.isServerEnv = IS_SERVER_ENV
        if(!this.isServerEnv) {
            this.parentEl = parentEl
            this.canvas = document.createElement("canvas")
            assign(this.canvas.style, {
                outline: "2px solid grey"
            })
            parentEl.appendChild(this.canvas)
        }

        this.time = 0
        this.game = this
        this.map = map

        this.syncSize()
    }

    initPointer() {
        if(this.pointer) return
        this.pointer = utils.newPointer(this)
        this.pointer.prevIsDown = false
    }

    initTouches() {
        if(this.touches) return
        this.touches = new Touches(this)
    }

    update(dt) {
        this.time += dt
        if(this.mainScene) this.mainScene.update(dt)
        if(this.joypadScene) this.joypadScene.update(dt)
    }

    draw() {
        if(this.isServerEnv) return
        if(this.mainScene) this.mainScene.draw()
        if(this.joypadScene) this.joypadScene.draw()
        const ctx = this.canvas.getContext("2d")
        if(this.mainScene) ctx.drawImage(this.mainScene.canvas, 0, this.mainScene.y)
        if(this.joypadScene) ctx.drawImage(this.joypadScene.canvas, 0, this.joypadScene.y)
    }

    syncSize() {
        const width = min(this.map.width, CANVAS_MAX_WIDTH)
        const height169 = floor(width * 9 / 16)
        const mainSceneVisible = Boolean(this.mainScene) && this.mainScene.visible
        const joypadSceneVisible = Boolean(this.joypadScene)
        if(mainSceneVisible) this.mainScene.setPosAndSize(
            0,
            0,
            width,
            min(this.map.height, CANVAS_MAX_HEIGHT),
        )
        if(joypadSceneVisible) this.joypadScene.setPosAndSize(
            0,
            mainSceneVisible ? this.mainScene.height : 0,
            width,
            height169,
        )
        const height = max(height169, (mainSceneVisible ? this.mainScene.height : 0) + (joypadSceneVisible ? this.joypadScene.height : 0))
        assign(this, { width, height })
        if(!this.isServerEnv) {
            assign(this.parentEl.style, { width: `${width}px`, height: `${height}px` })
            assign(this.canvas, { width, height })
            const gameIsMoreLandscapeThanScreen = ((width / window.innerWidth) / (height / window.innerHeight)) >= 1
            assign(this.canvas.style, {
                width: gameIsMoreLandscapeThanScreen ? "100%" : null,
                height: gameIsMoreLandscapeThanScreen ? null : "100%",
                aspectRatio: width / height,
            })
        }
    }

    requestFullscreen() {
        this.parentEl.requestFullscreen()
    }
}

export class SceneCommon {

    constructor(game) {
        this.game = game
        this.x = 0
        this.y = 0
        this.viewX = 0
        this.viewY = 0
        this.width = 100
        this.height = 100
        this.visible = true
        this.time = 0
        this.pointer = null
        if(!this.game.isServerEnv) {
            this.canvas = document.createElement("canvas")
        }
        this.walls = new EntityGroup(this)
        this.entities = new EntityGroup(this)
        this.heros = {}
        this.initWalls()
        this.initEntities()
    }

    setPosAndSize(x, y, width, height) {
        assign(this, { x, y, width, height })
        if(this.canvas) {
            this.canvas.width = width
            this.canvas.height = height
        }
    }

    setView(viewX, viewY) {
        const { width: mapWidth, height: mapHeight } = this.game.map
        const { width, height } = this
        this.viewX = max(0, min(mapWidth-width, viewX))
        this.viewY = max(0, min(mapHeight-height, viewY))
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

    syncHero(hero) {
        if(hero.removed) {
            delete this.heros[hero.playerId]
            if(hero === this.localHero) this.setLocalHero(null)
        } else {
            this.heros[hero.playerId] = hero
            if(hero !== this.localHero && hero.playerId === this.game.localPlayerId) this.setLocalHero(hero)
        }
    }

    setLocalHero(hero) {
        this.localHero = hero
    }

    update(dt) {
        this.time += dt
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
        ctx.reset()
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

    constructor(parentEl, map, playerId, kwargs) {
        super(parentEl, map)

        this.pointer = null

        this.players = {}
        this.localPlayerId = playerId

        this.initGameScene()

        this.sendState = (kwargs && kwargs.sendState) || null
        this.sendInputState = (kwargs && kwargs.sendInputState) || null

        this.keyboardKeysPressed = {}
        this.joypadKeysPressed = {}
        if(!this.isServerEnv) {
            document.addEventListener('keydown', evt => {this.keyboardKeysPressed[evt.key] = true})
            document.addEventListener('keyup', evt => delete this.keyboardKeysPressed[evt.key])
        }
    }

    play() {
        if(this.gameLoop) return
        let prevTime = now()
        this.gameLoop = setInterval(() => {
            const nowTime = now()
            const dt = nowTime - prevTime
            prevTime = nowTime
            let inputState = null
            if(!this.isServerEnv) {
                inputState = this.getInputState()
                if(!this.sendInputState) this.setLocalHeroInputState(inputState)
            }
            this.update(dt)
            if(this.sendState) this.getAndMaySendState()
            if(this.sendInputState) this.maySendInputState(inputState)
            this.draw()
        }, 1000 / FPS)
    }

    stop() {
        if(this.gameLoop) clearInterval(this.gameLoop)
        this.gameLoop = null
    }

    initGameScene(scnId) {
        if(scnId === undefined) scnId = this.time
        this.mainScene = new GameScene(this, scnId)
        this.syncSize()
        for(let playerId in this.players) this.mainScene.addHero(playerId)
    }

    showGameScene(visible) {
        if(visible == this.mainScene.visible) return
        this.mainScene.visible = visible
        this.syncSize()
    }

    restart(scnId) {
        this.initGameScene(scnId)
        this.lastSendStateTime = -SEND_STATE_PERIOD
    }

    addPlayer(playerId, kwargs) {
        if(this.players[playerId] === undefined) {
            const player = kwargs
            if(!player.hero) {
                const defaultHero = this.map.heros[0]
                if(defaultHero) player.hero = {
                    x: defaultHero.x,
                    y: defaultHero.y,
                    key: defaultHero.keys[0],
                }
            }
            this.players[playerId] = player
        }
        if(this.mainScene) this.mainScene.addHero(playerId)
        if(this.joypadScene && playerId === this.localPlayerId) this.joypadScene.syncLocalPlayerButtons()
    }

    rmPlayer(playerId) {
        const player = this.players[playerId]
        if(!player) return
        if(this.mainScene) this.mainScene.rmHero(playerId)
        delete this.players[playerId]
    }

    isKeyPressed(key) {
        return this.keyboardKeysPressed[key] || this.joypadKeysPressed[key]
    }

    setJoypadKeyPressed(key, val) {
        this.joypadKeysPressed[key] = val
    }

    getState(isFull) {
        this.fullState ||= { _isFull: true }
        this.partialState ||= {}
        const state = isFull ? this.fullState : this.partialState
        if(isFull) state.players = this.players
        state.main = this.mainScene.getState(isFull)
        return (isFull || state.main) ? JSON.stringify(state) : null
    }

    receiveState(stateStr) {
        console.log("TMP receiveState", stateStr)
        const state = JSON.parse(stateStr)
        const isFull = state._isFull || false
        if(state.players) for(let playerId in state.players) this.addPlayer(playerId, state.players[playerId])
        if(state.main && this.mainScene) {
            if(isFull && state.main.id != this.mainScene.id)
                this.restart(state.main.id)
            this.mainScene.setState(state.main, isFull)
        }
    }

    getAndMaySendState() {
        this.lastSendStateTime ||= -SEND_STATE_PERIOD
        if(this.time > this.lastSendStateTime + SEND_STATE_PERIOD) {
            this.sendState(this.getState(true))
            this.lastSendStateTime = this.time
        } else {
            const stateStr = this.getState(false)
            if(stateStr) this.sendState(stateStr)
        }
    }

    getInputState() {
        const hero = this.mainScene.getHero(this.localPlayerId)
        if(!hero) return
        return hero.getInputState()
    }

    maySendInputState(inputState) {
        this.lastSendInputStateTime ||= -SEND_INPUT_STATE_PERIOD
        const inputStateStr = (inputState && hasKeys(inputState)) ? JSON.stringify(inputState) : ""
        if(this.prevInputStateStr != inputStateStr || (inputStateStr && this.time > this.lastSendInputStateTime + SEND_INPUT_STATE_PERIOD)) {
            console.log("TMP sendInputState", inputStateStr)
            this.sendInputState(inputStateStr)
            this.prevInputStateStr = inputStateStr
            this.lastSendInputStateTime = this.time
        }
    }

    setLocalHeroInputState(inputState) {
        const hero = this.mainScene && this.mainScene.getHero(this.localPlayerId)
        if(hero) hero.setInputState(inputState)
    }

    receivePlayerInputState(playerId, inputStateStr) {
        const hero = this.mainScene && this.mainScene.getHero(playerId)
        if(!hero) return
        const inputState = inputStateStr ? JSON.parse(inputStateStr) : null
        hero.setInputState(inputState)
    }

    async showJoypadScene(val) {
        if(val == Boolean(this.joypadScene)) return
        if(val) {
            const joypadMod = await import("./joypad.mjs")
            if(this.joypadScene) return
            this.initPointer()
            this.initTouches()
            const { JoypadScene } = joypadMod
            this.joypadScene = new JoypadScene(this)
        } else {
            this.joypadScene = null
        }
        this.syncSize()
    }
}

export class GameScene extends SceneCommon {
    constructor(game, scnId) {
        super(game)
        this.id = scnId
        this.step = "GAME"
        this.notifs = new EntityGroup(this)
        this.initVictoryNotifs()
        this.initGameOverNotifs()
        this.time = 0
    }

    initEntities() {
        this.game.map.entities.forEach(mapEnt => {
            const { x, y, key } = mapEnt
            this.addEntity(x, y, key)
        })
    }

    addHero(playerId) {
        const player = this.game.players[playerId]
        if(!player) return
        if(this.getHero(playerId)) return
        const { hero: heroDef } = player
        if(!heroDef) return
        const { x, y, key } = heroDef
        const cls = Entities[key]
        const heroId = this.entities.nextAutoId()
        const hero = this.entities.add(heroId, new cls(this, x, y, playerId))
        hero._isStateToSend = true
        return heroId
    }

    getHero(playerId) {
        return this.heros[playerId]
    }

    rmHero(playerId) {
        const hero = this.getHero(playerId)
        if(hero) hero.remove()
    }

    setLocalHero(hero) {
        super.setLocalHero(hero)
        this.hearts ||= new EntityGroup(this)
        this.hearts.forEach(h => h.remove())
        for(let i=0; i<hero.life; ++i)
            this.hearts.add(new Heart(this, i))
    }

    syncHearts() {
        if(!this.hearts) return
        this.hearts.forEach(heart => {
            heart.setFull(heart.num < this.localHero.life)
        })
    }

    checkHeros() {
        const { heros } = this
        let nbHeros = 0, nbHerosAlive = 0
        for(let playerId in heros) {
            const hero = heros[playerId]
            nbHeros += 1
            if(hero.life > 0) nbHerosAlive += 1
        }
        if(this.step == "GAME" && nbHeros > 0 && nbHerosAlive == 0) this.step = "GAMEOVER"
    }

    update(dt) {
        const { step } = this
        super.update(dt)
        if(step == "GAME" || step == "GAMEOVER") {
            this.applyPhysics(dt)
            this.entities.update(dt)
            this.checkHeros()
        }
        this.updateView()
    }

    drawTo(ctx) {
        ctx.translate(~~-this.viewX, ~~-this.viewY)
        this.walls.drawTo(ctx)
        this.entities.drawTo(ctx)
        ctx.translate(~~this.viewX, ~~this.viewY)
        if(this.hearts) this.hearts.drawTo(ctx)
        this.notifs.drawTo(ctx)
        if(this.step == "VICTORY") this.victoryNotifs.drawTo(ctx)
        if(this.step == "GAMEOVER") this.gameOverNotifs.drawTo(ctx)
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

    applyPhysics(dt) {
        const { nbRows, nbCols, boxSize, walls } = this.game.map
        const { getHitBox } = utils
        this.entities.forEach(ent => {
            // gravity
            if(ent.undergoGravity) ent.speedY += GRAVITY * dt
            // speed & collisions
            const { left: entX, top: entY, width: entW, height: entH } = getHitBox(ent)
            const dx = ent.speedX * dt, dy = ent.speedY * dt
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

    updateView() {
        const { heros } = this
        if(!hasKeys(heros)) return
        if(this.localHero) {
            this.setView(
                this.localHero.x - this.width/2,
                this.localHero.y - this.height/2,
            )
        } else {
            let sumX = 0, sumY = 0, nbHeros = 0
            for(let playerId in heros) {
                const hero = heros[playerId]
                sumX += hero.x
                sumY += hero.y
                nbHeros += 1
            }
            this.setView(
                sumX / nbHeros - this.width/2,
                sumY / nbHeros - this.height/2,
            )
        }
    }

    initVictoryNotifs() {
        this.victoryNotifs = new EntityGroup(this)
        this.victoryNotifs.add(new CenteredText(
            this,
            "VICTORY !",
            { font: "100px serif" },
        ))
    }

    initGameOverNotifs() {
        this.gameOverNotifs = new EntityGroup(this)
        this.gameOverNotifs.add(new CenteredText(
            this,
            "GAME OVER",
            { font: "100px serif" },
        ))
    }

    getState(isFull) {
        this.fullState ||= {}
        this.partialState ||= {}
        const state = isFull ? this.fullState : this.partialState
        if(isFull) {
            state.id = this.id
            state.time = this.time
            state.step = this.step
        }
        const ent = state.entities = this.entities.getState(isFull)
        return (isFull || ent) ? state : null
    }

    setState(state, isFull) {
        if(isFull) {
            this.time = state.time
            this.step = state.step
        }
        this.entities.setState(state.entities, isFull)
    }
}

// ENTITIES ///////////////////////////////////

class DynamicEntity extends Entity {

    static {
        assign(this.prototype, {
            speedX: 0,
            speedY: 0,
            speedResX: 0,
            speedResY: 0,
            undergoGravity: true,
            undergoWalls: true,
        })
    }

    getState() {
        const state = super.getState()
        if(this.hasOwnProperty("speedX")) state.speedX = this.speedX
        if(this.hasOwnProperty("speedY")) state.speedY = this.speedY
        return state
    }

    setState(state) {
        super.setState(state)
        if(state.speedX !== undefined) this.speedX = state.speedX
        if(state.speedY !== undefined) this.speedY = state.speedY
    }
}


export class LivingEntity extends DynamicEntity {
    constructor(scn, x, y, playerId) {
        super(scn, x, y)
        this.life = 1
        this.time = 0
        this.damageLastTime = -3
    }

    update(dt) {
        this.time += dt
        this.undergoWalls = (this.life > 0)
        // if(this.life == 0) this.rotation += 4 * PI * dt
        if(this.scene.step != "GAME" || this.life == 0 || this.isDamageable()) this.spriteVisible = true
        else this.spriteVisible = floor(this.time * 100) % 2 == 0
        if(this.rmTime && this.time > this.rmTime) this.remove()
    }

    isDamageable() {
        return (this.damageLastTime + .5) < this.time
    }

    onDamage(val, damager, force) {
        if(this.life == 0) return
        if(!force && !this.isDamageable()) return
        this.life = max(0, this.life - val)
        // this.scene.syncHearts()
        if(this.life == 0) {
            this.onKill(damager)
        } else {
            this.damageLastTime = this.time
            if(damager) {
                this.speedY = -200
                this.speedX = 200 * ((this.x > damager.x) ? 1 : -1)
            }
        }
    }

    onKill(killer) {
        this.rmTime = this.time + 3
        if(killer) {
            this.speedY = -500
            this.speedX = 100 * ((this.x < killer.x) ? -1 : 1)
        }
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
}


export class Hero extends LivingEntity {
    constructor(scn, x, y, playerId) {
        super(scn, x, y)
        this.team = "hero"
        this.life = 3
        this.time = 0
        if(playerId !== undefined) this.setPlayerId(playerId)
    }

    setPlayerId(playerId) {
        if(playerId === this.playerId) return
        this.playerId = playerId
        this.scene.syncHero(this)
    }

    isLocalHero() {
        return this === this.scene.localHero
    }

    update(dt) {
        super.update(dt)
        if(this.extras) this.extras.update(dt)
    }

    isDamageable() {
        return (this.damageLastTime + 3) < this.time
    }

    onDamage(val, damager, force) {
        super.onDamage(val, damager, force)
        this.scene.syncHearts()
    }

    getState() {
        const state = super.getState()
        state.playerId = this.playerId
        state.inputState = this.inputState
        if(this.extras) state.extras = this.extras.getState(true)
        return state
    }

    setState(state) {
        super.setState(state)
        this.setPlayerId(state.playerId)
        this.inputState = state.inputState
        if(this.extras || state.extras) {
            this.extras ||= new ExtraGroup(this)
            this.extras.setState(state.extras, true)
        }
    }

    getInputState() {
        const inputState = this.inputState ||= {}
        const extras = this.extras
        if(extras) inputState.extras = extras.getInputState()
        return inputState
    }

    setInputState(inputState) {
        this.inputState = inputState
        const extras = this.extras
        if(extras) extras.setInputState(inputState && inputState.extras)
        this.inputStateTime = now()
        this._isStateToSend = true
    }

    static initJoypadButtons(joypadScn) {}

    addExtra(extra) {
        const extras = this.extras ||= new ExtraGroup(this)
        extras.add(extra)
    }

    drawTo(ctx) {
        super.drawTo(ctx)
        if(this.extras) {
            ctx.translate(~~this.x, ~~this.y)
            ctx.scale(this.dirX, this.dirY)
            this.extras.drawTo(ctx)
            ctx.scale(this.dirX, this.dirY)
            ctx.translate(~~-this.x, ~~-this.y)
        }
    }

    remove() {
        super.remove()
        this.scene.syncHero(this)
    }
}


const NicoSpriteSheet = new SpriteSheet("/static/assets/nico_full.png", 4, 1)
const NicoStandingSprite = new Sprite(NicoSpriteSheet.getFrame(0))
const NicoRunningSprites = range(1, 4).map(i => new Sprite(NicoSpriteSheet.getFrame(i)))
const NicoJumpingSprite = new Sprite(NicoSpriteSheet.getFrame(1))

class Nico extends Hero {
    constructor(scn, x, y, playerId) {
        super(scn, x, y, playerId)
        this.width = this.height = 50
        this.sprite = NicoStandingSprite
    }

    update(dt) {
        super.update(dt)
        // inputs
        this.applyInputState(dt)
        // display
        if(this.speedX > 0) this.dirX = 1
        else if(this.speedX < 0) this.dirX = -1
        if(this.speedResY == 0) this.sprite = NicoJumpingSprite
        else if(this.speedX == 0) this.sprite = NicoStandingSprite
        else this.sprite = NicoRunningSprites[floor((this.time * 6) % 3)]
        // fall
        if(this.y > this.game.map.height + 100) {
            this.onDamage(1, null, true)
            if(this.life > 0) this.respawn()
        }
    }

    getInputState() {
        const { game } = this
        const inputState = super.getInputState()
        if(game.isKeyPressed("ArrowRight")) inputState.walkX = 1
        else if(game.isKeyPressed("ArrowLeft")) inputState.walkX = -1
        else delete inputState.walkX
        if(game.isKeyPressed("ArrowUp")) inputState.jump = true
        else delete inputState.jump
        return inputState
    }

    applyInputState(dt) {
        if(this.life == 0) return
        const { inputState } = this
        if(!inputState || !inputState.walkX) this.speedX = sumTo(this.speedX, 2000 * dt, 0)
        else if(inputState.walkX > 0) this.speedX = sumTo(this.speedX, 1000 * dt, 300)
        else if(inputState.walkX < 0) this.speedX = sumTo(this.speedX, 1000 * dt, -300)
        if(inputState && inputState.jump && this.speedResY < 0) this.speedY = -500
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
        const player = this.game.players[this.playerId]
        const { x, y } = player.hero
        this.x = x
        this.y = y
        this.speedX = 0
        this.speedY = 0
    }

    static initJoypadButtons(joypadScn) {
        joypadScn.addButtons([
            { key: "ArrowLeft" },
            { key: "ArrowUp" },
            { key: "ArrowRight" },
        ])
    }
}
Entities.register("nico", Nico)


class Enemy extends LivingEntity {
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

    update(dt) {
        super.update(dt)
        const { time } = this.scene
        const { nbRows, nbCols, boxSize, walls } = this.game.map
        // move
        if(this.speedResX * this.dirX < 0) this.dirX *= -1
        if(this.speedResY < 0) {
            const { left, width, top, height } = this.getHitBox()
            const wallAheadBy = ceil((top + height - 1) / boxSize)
            const wallAheadBx = (this.dirX > 0) ? ceil((left + width / 2) / boxSize) : floor((left + width / 2) / boxSize)
            if(wallAheadBx<0 || wallAheadBx>=nbCols || wallAheadBy<0 || wallAheadBy>=nbRows || walls[wallAheadBx][wallAheadBy] === null) this.dirX *= -1
            this.speedX = this.dirX * 2000 * dt
        }
        // anim
        this.sprite = ZombiSprites[floor((time * 6) % 8)]
        // attack
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) hero.onDamage(1, this)
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


const BatSpriteSheet = new SpriteSheet("/static/assets/bat.png", 4, 1)
const BatSprites = range(0, 4).map(i => new Sprite(BatSpriteSheet.getFrame(i)))

class Bat extends Enemy {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.width = 80
        this.height = 40
        this.sprite = BatSprites[0]
        this.scaleSprite = Entity.spriteFitHeight
        this.undergoGravity = false
    }

    update(dt) {
        const { time } = this.scene
        const { width } = this.game.map
        // move
        if((this.speedResX * this.dirX < 0) || (this.x < 0 && this.dirX < 0) || (this.x > width && this.dirX > 0)) this.dirX *= -1
        this.speedX = this.dirX * 5000 * dt
        // anim
        this.sprite = BatSprites[floor((time * 6) % 4)]
        // attack
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) hero.onDamage(1, this)
        })
    }

    getHitBox() {
        return {
            left: this.x - 30,
            width: 60,
            top: this.y - 10,
            height: 20,
        }
    }
}
Entities.register("bat", Bat)


const SpiderSprite = new Sprite(new Img("/static/assets/spider.png"))

class Spider extends Enemy {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.width = this.height = 45
        this.sprite = SpiderSprite
        this.scaleSprite = Entity.spriteFitHeight
        this.undergoGravity = false
    }

    update(dt) {
        const { time } = this.scene
        const { height } = this.game.map
        // move
        let dirY = (this.speedY > 0) ? 1 : -1
        if((this.speedResY * dirY < 0) || (this.y < 0 && dirY < 0) || (this.y > height && dirY > 0)) dirY *= -1
        this.speedY = (dirY > 0 ? 10000 : -2000) * dt
        // attack
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) hero.onDamage(1, this)
        })
    }
}
Entities.register("spider", Spider)


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


const SwordSprite = new Sprite(new Img("/static/assets/sword.png"))

class SwordItem extends Entity {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.width = this.height = 40
        this.sprite = SwordSprite
        this.respawnDur = 2
        this.addLastTime = -this.respawnDur
    }
    update(dt) {
        this.spriteVisible = (this.scene.time >= this.addLastTime + this.respawnDur)
        if(!this.spriteVisible) return
        for(let hero of this.scene.getTeam("hero")) {
            if(checkHit(this, hero)) {
                hero.addExtra(new SwordExtra(hero))
                this.addLastTime = this.scene.time
                break
            }
        }
    }
}
Entities.register("sword", SwordItem)


class Extra extends Entity {
    constructor(owner, x, y) {
        const scn = owner.scene
        super(scn, x, y)
        this.owner = owner
    }

    getHitBox() {
        const { x, y, width, height } = this
        const { x: oX, y: oY } = this.owner
        return {
            left: x + oX - width/2,
            width,
            top: y + oY - height/2,
            height,
        }
    }

    getState() {
        const state = this.state ||= {}
        state.key = this.constructor.key
        if(this.hasOwnProperty("x")) state.x = this.x
        if(this.hasOwnProperty("y")) state.y = this.y
        if(this.hasOwnProperty("dirX")) state.dirX = this.dirX
        if(this.hasOwnProperty("dirY")) state.dirY = this.dirY
        return state
    }

    setState(state) {
        if(state.x !== undefined) this.x = state.x
        if(state.y !== undefined) this.y = state.y
        if(state.dirX !== undefined) this.dirX = state.dirX
        if(state.dirY !== undefined) this.dirY = state.dirY
    }

    getInputState() {
        const inputState = this.inputState ||= {}
        return inputState
    }
    
    setInputState(inputState) {
        this.inputState = inputState
        this.inputStateTime = now()
    }
}

export const Extras = {}
Extras.register = function(key, cls) {
    cls.key = key
    this[key] = cls
}

class ExtraGroup extends Group {
    getClassDefs() {
        return Extras
    }

    getInputState() {
        const { items } = this
        const res = {}
        for(let key in items) {
            const item = items[key]
            if(!item.removed) res[key] = item.getInputState()
        }
        return hasKeys(res) ? res : null
    }

    setInputState(state) {
        const { items } = this
        for(let key in items) {
            items[key].setInputState(state && state[key])
        }
    }
}


const SWORD_ATTACK_PERIOD = .5

const SwordSlashSpriteSheet = new SpriteSheet("/static/assets/slash.png", 3, 2)
const SwordSlashSprites = range(0, 6).map(i => new Sprite(SwordSlashSpriteSheet.getFrame(i)))

class SwordExtra extends Extra {
    constructor(owner) {
        super(owner, 0, 0)
        this.isMainExtra = true
        this.lastAttackTime = -SWORD_ATTACK_PERIOD
        this.syncSprite()
        this.removeSimilarExtras()
    }
    update(dt) {
        const { inputState } = this
        if(inputState && inputState.attack && this.owner.time - this.lastAttackTime > SWORD_ATTACK_PERIOD) {
            this.lastAttackTime = this.owner.time
        }
        this.syncSprite()
        if(this.owner.time - this.lastAttackTime < SWORD_ATTACK_PERIOD) {
            for(let enem of this.scene.getTeam("enemy")) {
                if(checkHit(this, enem)) enem.onDamage(1, this.owner)
            }
        }
    }
    syncSprite() {
        const timeSinceLastAttack = this.owner.time - this.lastAttackTime
        if(timeSinceLastAttack < SWORD_ATTACK_PERIOD) {
            this.sprite = SwordSlashSprites[floor(timeSinceLastAttack/SWORD_ATTACK_PERIOD*6)]
            this.x = 40
            this.width = this.height = 60
        } else {
            this.sprite = SwordSprite
            this.x = 25
            this.width = this.height = 40
        }
    }
    removeSimilarExtras() {
        if(!this.owner.extras) return
        this.owner.extras.forEach(extra2 => {
            if(extra2.isMainExtra) extra2.remove()
        })
    }
    getState() {
        const state = super.getState()
        state.lat = this.lastAttackTime
        return state
    }
    setState(state) {
        super.setState(state)
        this.lastAttackTime = state.lat
    }
    getInputState() {
        const inputState = super.getInputState()
        const { game } = this
        if(game.isKeyPressed(" ")) inputState.attack = true
        else delete inputState.attack
        return inputState
    }
}
Extras.register("sword", SwordExtra)


const StarImg = new Img("/static/assets/star.png")
const StarSprite = new Sprite(StarImg)

class Star extends Entity {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.sprite = StarSprite
        this.width = this.height = 30
        this.undergoGravity = false
        this.undergoWalls = false
        this.scene.nbStars ||= 0
        this.scene.nbStars += 1
    }
    update(dt) {
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) {
                this.remove()
                this.scene.nbStars -= 1
                if(this.scene.step == "GAME" && this.scene.nbStars == 0) this.scene.step = "VICTORY"
            }
        })
    }
}
Entities.register("star", Star)
