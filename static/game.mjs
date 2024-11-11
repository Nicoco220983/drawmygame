const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, checkHit, sumTo, newCanvas } = utils
import PhysicsEngine from './physics.mjs'

export const FPS = 30
const CANVAS_MAX_WIDTH = 800
const CANVAS_MAX_HEIGHT = 600
// const MAP_BOX_DEFAULT_SIZE = 20
// const MAP_DEFAULT_NB_COLS = 40
// const MAP_DEFAULT_NB_ROWS = 25
const MAP_DEFAULT_WIDTH = 800
const MAP_DEFAULT_HEIGHT = 600

const GRAVITY = 1000

export const MSG_KEY_LENGTH = 3
export const MSG_KEYS = {
    PING: "PNG",
    JOIN_GAME: 'JOI',
    IDENTIFY_CLIENT: 'IDC',
    GAME_STATE: 'STT',
    PLAYER_INPUT: 'INP',
    GAME_INSTRUCTION: 'GMI',
//   GAME_OVER: 'GOV',
}

const IS_SERVER_ENV = (typeof window === 'undefined')
export const HAS_TOUCH = (!IS_SERVER_ENV) && (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0))

const SEND_PING_PERIOD = 3
const SEND_STATE_PERIOD = 1
const RESEND_INPUT_STATE_PERIOD = .5


// MAP

export class GameMap {
    constructor() {
        this.width = MAP_DEFAULT_WIDTH
        this.height = MAP_DEFAULT_HEIGHT
        this.walls = []
        this.heros = []
        this.entities = []
    }

    async exportAsBinary() {
        const outObj = {
            w: this.width,
            h: this.height,
            ws: this.walls,
            hs: this.heros,
            es: this.entities,
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
        this.width = inObj.w
        this.height = inObj.h
        this.walls = inObj.ws
        this.heros = inObj.hs
        this.entities = inObj.es
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

export function range(start, end) {
    const res = []
    for(let i=start; i<end; ++i) res.push(i)
    return res
}

const _round = Math.round
export function round(val, precision = 1) {
    return _round(val / precision) * precision
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

export class SpriteSheet {
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

    update() {}

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
        else delete this.dirX
        if(state.dirY !== undefined) this.dirY = state.dirY
        else delete this.dirY
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
    canvas.width = max(1, metrics.width)
    canvas.height = max(1, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
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
        this._lastAutoId = 0
    }

    nextAutoId() {
        this._lastAutoId += 1
        let res = this._lastAutoId.toString()
        // be sure that client & leader generate different ids
        if(this.game.mode == MODE_CLIENT) res += 'C'
        return res
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

    hasKeys() {
        return hasKeys(this.items)
    }

    forEach(next) {
        const { items } = this
        for(let id in items) next(items[id])
    }

    cleanRemoved() {
        const { items } = this
        for(let id in items) if(items[id].removed) delete items[id]
    }

    update() {
        this.cleanRemoved()
        this.forEach(ent => ent.update())
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
        for(let id in items) {
            const item = items[id]
            if((isFull || item._isStateToSend) && !item.removed) {
                res[id] = item.getState(isFull)
                delete item._isStateToSend
            }
        }
        return (isFull || hasKeys(res)) ? res : null
    }

    setState(state, isFull) {
        const { items } = this
        if(state) {
            const ClassDefs = this.getClassDefs()
            for(let id in state) {
                let item = items[id]
                if(!item) {
                    const { key } = state[id]
                    if(!key) console.warning("Item state without key:", state[id])
                    else {
                        const cls = ClassDefs[key]
                        if(!cls) console.warning("Unknown key from state:", state[id])
                        else item = this.add(id, new cls(this.owner))
                    }
                }
                if(item) item.setState(state[id])
            }
            if(isFull) for(let id in items) if(!state[id]) items[id].remove()
        } else if(isFull) for(let id in items) items[id].remove()
    }
}

class EntityGroup extends Group {
    getClassDefs() {
        return Entities
    }
}

export const MODE_LOCAL = 0
export const MODE_SERVER = 1
export const MODE_CLIENT = 2

export class GameCommon {

    constructor(parentEl, map, kwargs) {
        this.mode = (kwargs &&kwargs.mode) || MODE_LOCAL
        this.isServerEnv = IS_SERVER_ENV
        if(!this.isServerEnv) {
            this.parentEl = parentEl
            this.canvas = document.createElement("canvas")
            this.canvas.setAttribute('tabindex', '0')
            assign(this.canvas.style, {
                outline: "2px solid grey"
            })
            parentEl.appendChild(this.canvas)
        }

        this.game = this
        this.iteration = -1
        this.time = 0
        this.fps = FPS
        this.dt = 1/this.fps
        this.map = map
        this.isDebugMode = kwargs && kwargs.debug == true

        this.initGameScene()
        this.syncSize()
    }

    // pure abstract
    // initGameScene()

    // initPointer() {
    //     if(this.pointer) return
    //     this.pointer = utils.newPointer(this)
    //     this.pointer.prevIsDown = false
    // }

    initTouches() {
        if(this.touches) return
        this.touches = []

        const el = this.game.canvas
        const _updTouches = evtTouches => {
            this.touches.length = 0
            const rect = el.getBoundingClientRect()
            for(let evtTouch of evtTouches) {
                this.touches.push({
                    x: (evtTouch.clientX - rect.left) * el.width / rect.width,
                    y: (evtTouch.clientY - rect.top) * el.height / rect.height,
                })
            }
            this.onTouch()
        }

        if(HAS_TOUCH) {
            el.addEventListener("touchmove", evt => _updTouches(evt.touches))
            el.addEventListener("touchstart", evt => _updTouches(evt.touches))
            document.addEventListener("touchend", evt => _updTouches(evt.touches))
        } else {
            let isDown = false
            el.addEventListener("mousemove", evt => _updTouches(isDown ? [evt] : []))
            el.addEventListener("mousedown", evt => { isDown = true; _updTouches([evt]) })
            document.addEventListener("mouseup", evt => { isDown = false; _updTouches([]) })
        }
    }

    onTouch() {
        if(this.joypadScene) this.joypadScene.onTouch()
    }

    update() {
        this.iteration += 1
        this.time = this.iteration * this.dt
        if(this.gameScene.visible) this.gameScene.update()
        if(this.joypadScene) this.joypadScene.update()
    }

    mayDraw() {
        this.drawing ||= false
        if(!this.drawing) {
            this.drawing = true
            window.requestAnimationFrame(() => {
                this.draw()
                this.drawing = false
            })
        }
    }

    draw() {
        if(this.gameScene.visible) this.gameScene.draw()
        if(this.joypadScene) this.joypadScene.draw()
        const ctx = this.canvas.getContext("2d")
        if(this.gameScene.visible) ctx.drawImage(this.gameScene.canvas, 0, this.gameScene.y)
        if(this.joypadScene) ctx.drawImage(this.joypadScene.canvas, 0, this.joypadScene.y)
        return ctx
    }

    syncSize() {
        const width = min(this.map.width, CANVAS_MAX_WIDTH)
        const height169 = floor(width * 9 / 16)
        if(this.gameScene.visible) this.gameScene.setPosAndSize(
            0,
            0,
            width,
            min(this.map.height, CANVAS_MAX_HEIGHT),
        )
        if(this.joypadScene) this.joypadScene.setPosAndSize(
            0,
            this.gameScene.visible ? this.gameScene.height : 0,
            width,
            height169,
        )
        const height = max(height169, (this.gameScene.visible ? this.gameScene.height : 0) + (this.joypadScene ? this.joypadScene.height : 0))
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

    log(...args) {
        console.log(this.iteration, (((now() - this.startTime) / this.dt) - this.iteration).toFixed(1), ...args)
        if(this.onLog) this.onLog(...args)
    }

    pushMetric(key, val, maxNb) {
        const metrics = this.metrics ||= {}
        const keyMetrics = metrics[key] ||= []
        keyMetrics.push(val)
        if(keyMetrics.length > maxNb) keyMetrics.splice(0, keyMetrics.length- maxNb)
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
        this.color = "white"
        this.iteration = -1
        this.time = 0
        // this.pointer = null
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
        const { walls } = this.game.map
        walls.forEach(w => this.addWall(w.x1, w.y1, w.x2, w.y2))
    }

    initEntities() {
        this.game.map.entities.forEach(e => this.addEntity(e.x, e.y, e.key))
    }

    addWall(x1, y1, x2, y2) {
        return this.walls.add(new Wall(this, x1, y1, x2, y2))
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

    update() {
        this.iteration += 1
        this.time = this.iteration * this.game.dt
        // this.syncPointer()
    }

    // syncPointer() {
    //     const gamePointer = this.game.pointer
    //     if(!gamePointer) return
    //     const thisPointer = this.pointer ||= {}
    //     thisPointer.isDown = gamePointer.isDown
    //     thisPointer.prevIsDown = gamePointer.prevIsDown
    //     thisPointer.x = gamePointer.x - this.x
    //     thisPointer.y = gamePointer.y - this.y
    // }

    draw() {
        const ctx = this.canvas.getContext("2d")
        ctx.reset()
        if(this.color) {
            ctx.fillStyle = "white"
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        }
        this.drawTo(ctx)
    }
}

// const wallSprite = new Sprite(newCanvas(10, 10, "black"))
// const platformSprite = new Sprite(newCanvas(10, 10, "lightgrey"))

class Wall extends Entity {
    constructor(scn, x1, y1, x2, y2, key) {
        super(scn)
        this.x1 = x1
        this.y1 = y1
        this.x2 = x2
        this.y2 = y2
        this.key = key
    }
    drawTo(ctx) {
        ctx.lineWidth = 5
        ctx.strokeStyle = "dark"
        ctx.beginPath()
        ctx.moveTo(this.x1, this.y1)
        ctx.lineTo(this.x2, this.y2)
        ctx.stroke()
    }
}


// GAME //////////////////////////

export class Game extends GameCommon {

    constructor(parentEl, map, playerId, kwargs) {
        super(parentEl, map, kwargs)

        // this.pointer = null

        this.players = {}
        this.localPlayerId = playerId

        this.lag = 0
        this.sendPing = (kwargs && kwargs.sendPing) || null
        this.sendState = (kwargs && kwargs.sendState) || null
        this.sendInputState = (kwargs && kwargs.sendInputState) || null
        this.onLog = (kwargs && kwargs.onLog) || null

        this.keysPressed = {}
        if(this.mode != MODE_SERVER) {
            const onKey = (evt, val) => {
                if(document.activeElement !== this.canvas) return
                this.setInputKey(evt.key, val)
                evt.stopPropagation()
                evt.preventDefault()
            }
            document.addEventListener('keydown', evt => onKey(evt, true))
            document.addEventListener('keyup', evt => onKey(evt, false))
        }

        if(this.isDebugMode) this.showDebugScene()

        this.physicEngine = new PhysicsEngine(this)
        this.physicGravity = GRAVITY
    }

    play() {
        if(this.gameLoop) return
        this.startTime = now()
        this.updateGameLoop()
    }

    updateGameLoop() {
        const startTime = now()
        if(this.mode == MODE_LOCAL) {
            this.setLocalHeroInputState(this.getInputState())
        } else {
            this.setInputStateFromReceived()
        }
        const updStartTime = now()
        this.update()
        if(this.isDebugMode) this.pushMetric("updateDur", now() - updStartTime, this.fps * 5)
        if(this.mode == MODE_CLIENT) this.maySendPing()
        if(this.mode == MODE_SERVER) this.getAndMaySendState()
        if(this.mode != MODE_SERVER) this.mayDraw()
        const updDur = now() - startTime
        this.gameLoop = setTimeout(() => this.updateGameLoop(), max(0, 1000 * (this.dt - updDur)))
    }

    stop() {
        if(this.gameLoop) clearTimeout(this.gameLoop)
        this.gameLoop = null
    }

    initGameScene(scnId) {
        if(scnId === undefined) scnId = max(0, this.iteration)
        this.gameScene = new GameScene(this, scnId)
        this.syncSize()
    }

    showGameScene(visible) {
        if(visible == this.gameScene.visible) return
        this.gameScene.visible = visible
        this.syncSize()
    }

    showDebugScene() {
        this.debugScene = new DebugScene(this)
        this.syncSize()
    }

    syncSize() {
        super.syncSize()
        if(this.debugScene) {
            const { width, height } = this.game
            this.debugScene.setPosAndSize(0, 0, width, height)
        }
    }

    update() {
        if(!this.receivedStates) this.updateGame()
        else this.updateGameUsingReceivedStates()
        if(this.joypadScene) this.joypadScene.update()
        if(this.debugScene) this.debugScene.update()
    }

    updateGame() {
        this.iteration += 1
        this.time = this.iteration * this.dt
        if(this.gameScene.visible) this.gameScene.update()
    }

    updateGameUsingReceivedStates() {
        const targetIteration = this.iteration + 1
        const states = this.receivedStates
        // received full state
        let lastFullStateIdx = null
        for(let i=0; i<states.length; ++i) if(states[i]._isFull) lastFullStateIdx = i
        if(lastFullStateIdx !== null) {
            this.setState(states[lastFullStateIdx])
            this.lastFullStateIteration = this.iteration
            states.splice(0, lastFullStateIdx+1)
            this.cleanHistoryStates()
            this.storeHistoryState()
            const acceptableIteration = targetIteration - 1
            if(this.iteration >= acceptableIteration) return
        }
        // received partial states
        if(this.lastFullStateIteration === undefined) return
        let numState = 0, nbStates = states.length
        for(; numState < nbStates; ++numState) {
            const state = states[numState]
            if(state.it < this.lastFullStateIteration) continue
            if(!state._setDone) break
        }
        while(this.iteration < targetIteration) {
            const state = (numState < nbStates) ? states[numState] : null
            if(state && state.it < this.iteration) this.restoreHistoryState(state.it)
            else if(!state || state.it > this.iteration) this.updateGame()
            if(state && state.it == this.iteration) { this.setState(state); state._setDone=true; numState+=1 }
            this.storeHistoryState()
        }
    }

    cleanHistoryStates() {
        this.historyStates = {}
    }

    storeHistoryState() {
        this.historyStates ||= {}
        this.historyStates[this.iteration] = this.getState(true)
    }

    restoreHistoryState(it) {
        if(this.isDebugMode) this.log("restoreHistoryState", this.iteration, it)
        const state = JSON.parse(this.historyStates[it])
        this.setState(state)
    }

    draw() {
        const drawStartTime = now()
        const ctx = super.draw()
        if(this.isDebugMode) this.pushMetric("drawDur", now() - drawStartTime, this.fps * 5)
        if(this.debugScene) {
            this.debugScene.draw()
            ctx.drawImage(this.debugScene.canvas, 0, 0)
        }
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
        if(this.mode != MODE_CLIENT) this.gameScene.addHero(playerId)
        if(this.joypadScene && playerId === this.localPlayerId) this.joypadScene.syncLocalPlayerButtons()
    }

    rmPlayer(playerId) {
        const player = this.players[playerId]
        if(!player) return
        this.gameScene.rmHero(playerId)
        delete this.players[playerId]
    }

    isKeyPressed(key) {
        return this.keysPressed[key]
    }

    setInputKey(key, val) {
        if(Boolean(this.keysPressed[key]) === val) return
        this.keysPressed[key] = val
        if(this.mode == MODE_CLIENT) this.getAndSendInputState(true)
    }

    getAndSendInputState(checkPrev) {
        const hero = this.gameScene.getHero(this.localPlayerId)
        if(!hero) return
        const inputState = hero.getInputState()
        if(checkPrev) {
            this.previnputStateStr ||= ""
            const inputStateStr = (inputState && hasKeys(inputState)) ? JSON.stringify(inputState) : ""
            if(this.previnputStateStr == inputStateStr) return
            this.previnputStateStr = inputStateStr
        }
        const inputStateWiTime = this.inputStateWiTime ||= {}
        inputStateWiTime.t = now()
        if(inputState && hasKeys(inputState)) inputStateWiTime.is = inputState
        else delete inputStateWiTime.is
        const inputStateWiTimeStr = JSON.stringify(inputStateWiTime)
        if(this.isDebugMode) this.log("sendInputState", inputStateWiTimeStr)
        this.sendInputState(inputStateWiTimeStr)
        if(this.resendInputStateTimeout) clearTimeout(this.resendInputStateTimeout)
        this.resendInputStateTimeout = inputStateWiTime.is ? setTimeout(() => this.getAndSendInputState(false), RESEND_INPUT_STATE_PERIOD * 1000) : null
    }

    maySendPing() {
        this.pingLastTime ||= -SEND_PING_PERIOD
        this.waitingPing ||= false
        const nowS = now()
        if(!this.waitingPing && nowS > this.pingLastTime + SEND_PING_PERIOD) {
            this.sendPing()
            this.pingLastTime = nowS
            this.waitingPing = true
        }
    }

    receivePing() {
        this.pushMetric("lag", now() - this.pingLastTime, 5)
        this.waitingPing = false
    }

    getState(isFull) {
        this.fullState ||= { _isFull: true }
        this.partialState ||= {}
        const state = isFull ? this.fullState : this.partialState
        state.it = this.iteration
        if(isFull) state.players = this.players
        state.main = this.gameScene.getState(isFull)
        return (isFull || state.main) ? JSON.stringify(state) : null
    }

    receiveState(stateStr) {
        const state = JSON.parse(stateStr)
        if(this.isDebugMode) this.log("receiveState", state._isFull ? "Full" : "Partial", stateStr)
        const receivedStates = this.receivedStates ||= []
        receivedStates.push(state)
        if(receivedStates.length >= 2) receivedStates.sort((a, b) => a.it - b.it)
    }

    setState(state) {
        const isFull = state._isFull || false
        if(isFull) this.iteration = state.it
        if(state.players) for(let playerId in state.players) this.addPlayer(playerId, state.players[playerId])
        if(state.main) {
            if(isFull && state.main.id != this.gameScene.id)
                this.restart(state.main.id)
            this.gameScene.setState(state.main, isFull)
        }
    }

    getAndMaySendState() {
        this.lastSendStateTime ||= -SEND_STATE_PERIOD
        if(this.time > this.lastSendStateTime + SEND_STATE_PERIOD) {
            const stateStr = this.getState(true)
            this.sendState(stateStr)
            if(this.isDebugMode) this.log("sendState", stateStr)
            this.lastSendStateTime = this.time
        } else {
            const stateStr = this.getState(false)
            if(stateStr) {
                this.sendState(stateStr)
                if(this.isDebugMode) this.log("sendState", stateStr)
            }
        }
    }

    getInputState() {
        const hero = this.gameScene.getHero(this.localPlayerId)
        if(!hero) return
        return hero.getInputState()
    }

    setLocalHeroInputState(inputState) {
        const hero = this.gameScene.getHero(this.localPlayerId)
        if(hero) hero.setInputState(inputState)
    }

    receivePlayerInputState(playerId, inputStateWiTimeStr) {
        if(this.isDebugMode) this.log("receivePlayerInputState", playerId, inputStateWiTimeStr)
        const receivedInputStates = this.receivedInputStates ||= {}
        const playerReceivedInputStates = receivedInputStates[playerId] ||= []
        const inputStateWiTime = JSON.parse(inputStateWiTimeStr)
        inputStateWiTime.localTime = now()
        inputStateWiTime.duration = RESEND_INPUT_STATE_PERIOD
        if(playerReceivedInputStates.length > 0) {
            const prevInputStateWiTime = playerReceivedInputStates[playerReceivedInputStates.length-1]
            prevInputStateWiTime.duration = inputStateWiTime.t - prevInputStateWiTime.t
        }
        playerReceivedInputStates.push(inputStateWiTime)
    }

    setInputStateFromReceived() {
        const _now = now()
        const receivedInputStates = this.receivedInputStates ||= {}
        for(let playerId in receivedInputStates) {
            const hero = this.gameScene.getHero(playerId)
            if(!hero) continue
            const playerReceivedInputStates = receivedInputStates[playerId]
            if(playerReceivedInputStates.length == 0) continue
            while(playerReceivedInputStates.length > 0) {
                const inputStateWiTime = playerReceivedInputStates[0]
                if(_now - inputStateWiTime.localTime > inputStateWiTime.duration) playerReceivedInputStates.shift()
                else break
            }
            let inputStateWiTime = null, inputState = null
            if(playerReceivedInputStates.length > 0) {
                inputStateWiTime = playerReceivedInputStates[0]
                inputState = inputStateWiTime.is
            }
            if(!inputState) {
                hero.setInputState(null)
                playerReceivedInputStates.shift()
            } else {
                if(!inputStateWiTime.setDone) {
                    hero.setInputState(inputState)
                    inputStateWiTime.setDone = true
                }
            }
        }
    }

    async showJoypadScene(val) {
        if(val == Boolean(this.joypadScene)) return
        if(val) {
            const joypadMod = await import("./joypad.mjs")
            if(this.joypadScene) return
            // this.initPointer()
            // this.initTouches()
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
        this.initHerosSpawnPos()
    }

    initEntities() {
        if(this.game.mode == MODE_CLIENT) return  // entities are init by first full state
        this.game.map.entities.forEach(mapEnt => {
            const { x, y, key } = mapEnt
            this.addEntity(x, y, key)
        })
        for(let playerId in this.game.players) this.addHero(playerId)
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
        if(hero) for(let i=0; i<hero.life; ++i)
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

    update() {
        const { step, entities } = this
        const { physicEngine, dt } = this.game
        super.update()
        if(step == "GAME" || step == "GAMEOVER") {
            physicEngine.apply(dt, entities)
            entities.update()
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

    initHerosSpawnPos() {
        const { heros } = this.game.map
        if(!heros || heros.length == 0) return
        const { x, y } = heros[0]
        this.setHerosSpawnPos(x, y)
    }

    setHerosSpawnPos(x, y) {
        this.herosSpawnX = floor(x)
        this.herosSpawnY = floor(y)
    }

    getState(isFull) {
        this.fullState ||= {}
        this.partialState ||= {}
        const state = isFull ? this.fullState : this.partialState
        state.it = this.iteration
        if(isFull) {
            state.id = this.id
            state.step = this.step
            state.hsx = this.herosSpawnX
            state.hsy = this.herosSpawnY
        }
        const ent = state.entities = this.entities.getState(isFull)
        return (isFull || ent) ? state : null
    }

    setState(state, isFull) {
        this.iteration = state.it
        if(isFull) {
            this.step = state.step
            this.setHerosSpawnPos(state.hsx, state.hsy)
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
        else delete this.speedX
        if(state.speedY !== undefined) this.speedY = state.speedY
        else delete this.speedY
    }
}


export class LivingEntity extends DynamicEntity {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.life = 1
        this.iteBeforeDamageable = 0
        this.iteBeforeRm = null
    }

    update() {
        this.iteration += 1
        const { life } = this
        const { iteration, step } = this.scene
        const { dt } = this.game
        this.undergoWalls = (life > 0)
        if(step != "GAME" || life == 0 || this.isDamageable()) this.spriteVisible = true
        else this.spriteVisible = floor(iteration * dt * 100) % 2 == 0
        if(this.iteBeforeRm != null) {
            if(this.iteBeforeRm <= 0) this.remove()
            this.iteBeforeRm -= 1
        }
        this.iteBeforeDamageable -= 1
    }

    isDamageable() {
        return this.iteBeforeDamageable <= 0
    }

    makeNotDamageable() {
        this.iteBeforeDamageable = ceil(0.5 * this.game.fps)
    }

    takeDamage(val, damager, force) {
        if(this.life == 0) return
        if(!force && !this.isDamageable()) return
        this.life = max(0, this.life - val)
        // this.scene.syncHearts()
        if(this.life == 0) {
            this.onKill(damager)
        } else {
            if(val > 0) this.makeNotDamageable()
            if(damager) {
                this.speedY = -200
                this.speedX = 200 * ((this.x > damager.x) ? 1 : -1)
            }
        }
    }

    onKill(killer) {
        this.iteBeforeRm = ceil(3 * this.game.fps)
        if(killer) {
            this.speedY = -500
            this.speedX = 100 * ((this.x < killer.x) ? -1 : 1)
        }
    }

    getState() {
        const state = super.getState()
        state.life = this.life
        if(this.iteBeforeDamageable > 0) state.itd = this.iteBeforeDamageable
        else delete state.itd
        if(this.iteBeforeRm !== null) state.itr = this.iteBeforeRm
        else delete state.itr
        return state
    }

    setState(state) {
        super.setState(state)
        this.life = state.life
        this.iteBeforeDamageable = state.itd || 0
        this.iteBeforeRm = state.itr !== undefined ? state.itr : null
    }
}


export class Hero extends LivingEntity {
    constructor(scn, x, y, playerId) {
        super(scn, x, y)
        this.team = "hero"
        this.life = 3
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

    update() {
        super.update()
        if(this.extras) this.extras.update()
    }

    makeNotDamageable() {
        this.iteBeforeDamageable = ceil(3 * this.game.fps)
    }

    takeDamage(val, damager, force) {
        super.takeDamage(val, damager, force)
        this.scene.syncHearts()
    }

    getState() {
        const state = super.getState()
        state.playerId = this.playerId
        const inputState = this.inputState
        if(inputState && hasKeys(inputState)) state.ist = inputState
        else delete state.ist
        const extras = this.extras
        if(extras && extras.hasKeys()) state.extras = this.extras.getState(true)
        else delete state.extras
        return state
    }

    setState(state) {
        super.setState(state)
        this.setPlayerId(state.playerId)
        this.inputState = state.ist
        if(this.extras || state.extras) {
            this.extras ||= new ExtraGroup(this)
            this.extras.setState(state.extras)
        }
    }

    getInputState() {
        const inputState = this._inputState ||= {}
        const extrasState = this.extras && this.extras.getInputState()
        if(extrasState && hasKeys(extrasState)) inputState.extras = extrasState
        else delete inputState.extras
        return inputState
    }

    setInputState(inputState) {
        const extras = this.extras
        if(extras) extras.setInputState(inputState && inputState.extras)
        if(inputState) delete inputState.extras
        this.inputState = inputState
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

const ArrosSpriteSheet = new SpriteSheet("/static/assets/arrows.png", 4, 1)
const ArrowsSprites = range(0, 4).map(i => new Sprite(ArrosSpriteSheet.getFrame(i)))

class Nico extends Hero {
    constructor(scn, x, y, playerId) {
        super(scn, x, y, playerId)
        this.width = this.height = 50
        this.sprite = NicoStandingSprite
    }

    update() {
        const { iteration } = this.scene
        const { dt } = this.game
        super.update()
        // inputs
        this.applyInputState()
        // display
        if(this.speedResY == 0) this.sprite = NicoJumpingSprite
        else if(this.speedX == 0) this.sprite = NicoStandingSprite
        else this.sprite = NicoRunningSprites[floor((iteration * dt * 6) % 3)]
        // fall
        if(this.y > this.game.map.height + 100) {
            this.takeDamage(1, null, true)
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

    applyInputState() {
        const { dt } = this.game
        if(this.life == 0) return
        const { inputState } = this
        if(!inputState || !inputState.walkX) this.speedX = sumTo(this.speedX, 2000 * dt, 0)
        else if(inputState.walkX > 0) {
            this.dirX = 1
            this.speedX = sumTo(this.speedX, 1000 * dt, 300)
        } else if(inputState.walkX < 0) {
            this.dirX = -1
            this.speedX = sumTo(this.speedX, 1000 * dt, -300)
        }
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
        const { herosSpawnX, herosSpawnY } = this.scene
        this.x = herosSpawnX
        this.y = herosSpawnY
        this.speedX = 0
        this.speedY = 0
    }

    static initJoypadButtons(joypadScn) {
        let col = joypadScn.addColumn()
        joypadScn.extraButton = col.addButton({ key: " ", disabled: true })
        col.addButton({ key: "ArrowLeft", icon: ArrowsSprites[3] })
        col = joypadScn.addColumn()
        col.addButton({ key: "ArrowUp", icon: ArrowsSprites[0] })
        col.addButton({ key: "ArrowRight", icon: ArrowsSprites[1] })
    }

    addExtra(extra) {
        super.addExtra(extra)
        if(extra.isMainExtra && this.game.joypadScene) {
            const extraButton = this.game.joypadScene.extraButton
            extraButton.disabled = false
            extraButton.icon = extra.sprite
        }
    }
}
Entities.register("nico", Nico)


class Enemy extends LivingEntity {
    constructor(...args) {
        super(...args)
        this.team = "enemy"
    }
    onKill() {
        this.scene.entities.add(new SmokeExplosion(this.scene, this.x, this.y))
        this.remove()
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

    update() {
        super.update()
        const { dt } = this.game
        const { iteration } = this.scene
        const { walls } = this.game.map
        // move
        if(this.speedX != 0 && (-this.speedResX / this.speedX) > .5) this.dirX *= -1
        if(this.speedResY < 0) {
            // const { left, width, top, height } = this.getHitBox()
            // const wallAheadBy = ceil((top + height - 1) / boxSize)
            // const wallAheadBx = (this.dirX > 0) ? ceil((left + width / 2) / boxSize) : floor((left + width / 2) / boxSize)
            // if(wallAheadBx<0 || wallAheadBx>=nbCols || wallAheadBy<0 || wallAheadBy>=nbRows || walls[wallAheadBx][wallAheadBy] === null) this.dirX *= -1
            this.speedX = this.dirX * 20
        }
        // anim
        this.sprite = ZombiSprites[floor((iteration * dt * 6) % 8)]
        // attack
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) hero.takeDamage(1, this)
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

    update() {
        super.update()
        const { dt } = this.game
        const { iteration } = this.scene
        const { width } = this.game.map
        // move
        if((this.speedResX * this.dirX < 0) || (this.x < 0 && this.dirX < 0) || (this.x > width && this.dirX > 0)) this.dirX *= -1
        this.speedX = this.dirX * 3000 * dt
        // anim
        this.sprite = BatSprites[floor((iteration * dt * 6) % 4)]
        // attack
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) hero.takeDamage(1, this)
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

    update() {
        const { dt } = this.game
        const { height } = this.game.map
        // move
        this.speedX = 0
        let dirY = (this.speedY > 0) ? 1 : -1
        if((this.speedResY * dirY < 0) || (this.y < 0 && dirY < 0) || (this.y > height && dirY > 0)) dirY *= -1
        this.speedY = (dirY > 0 ? 5000 : -1000) * dt
        // attack
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) hero.takeDamage(1, this)
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


class Extra extends Entity {
    constructor(owner, x, y) {
        const scn = owner.scene
        super(scn, x, y)
        this.owner = owner
    }

    getHitBox() {
        const { x, y, width, height } = this
        const { x: oX, y: oY, dirX, dirY } = this.owner
        return {
            left: (x * dirX) + oX - width/2,
            width,
            top: (y * dirY) + oY - height/2,
            height,
        }
    }

    getState() {
        const state = this.state ||= {}
        state.key = this.constructor.key
        const inputState = this.inputState
        if(inputState && hasKeys(inputState)) state.ist = inputState
        else delete state.ist
        return state
    }

    setState(state) {
        this.inputState = state.ist
    }

    getInputState() {
        const inputState = this._inputState ||= {}
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

    setState(state) {
        super.setState(state, true)
    }

    getInputState() {
        const { items } = this
        if(!hasKeys(items)) return null
        const res = {}
        for(let key in items) {
            const item = items[key]
            let state = item.removed ? null : item.getInputState()
            if(state && hasKeys(state)) res[key] = state
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


const SwordSprite = new Sprite(new Img("/static/assets/sword.png"))

class SwordItem extends Entity {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.width = this.height = 40
        this.sprite = SwordSprite
        this.respawnDur = 2
        this.lastAddAge = this.respawnDur * this.game.fps
    }
    update() {
        this.spriteVisible = this.lastAddAge >= this.respawnDur * this.game.fps
        if(this.spriteVisible) {
            for(let hero of this.scene.getTeam("hero")) {
                if(checkHit(this, hero)) {
                    hero.addExtra(new SwordExtra(hero))
                    this.lastAddAge = 0
                    break
                }
            }
        }
        this.lastAddAge += 1
    }
    getState() {
        const state = super.getState()
        state.ada = this.lastAddAge
        return state
    }
    setState(state) {
        super.setState(state)
        this.lastAddAge = state.ada
    }
}
Entities.register("sword", SwordItem)


const SWORD_ATTACK_PERIOD = .5

const SwordSlashSpriteSheet = new SpriteSheet("/static/assets/slash.png", 3, 2)
const SwordSlashSprites = range(0, 6).map(i => new Sprite(SwordSlashSpriteSheet.getFrame(i)))

class SwordExtra extends Extra {
    constructor(owner) {
        super(owner, 0, 0)
        this.isMainExtra = true
        this.lastAttackAge = ceil(SWORD_ATTACK_PERIOD * this.game.fps)
        this.syncSprite()
        this.removeSimilarExtras()
    }
    update() {
        const { inputState } = this
        let attacking = this.lastAttackAge < (SWORD_ATTACK_PERIOD * this.game.fps)
        if(!attacking && inputState && inputState.attack) {
            this.lastAttackAge = 0
            attacking = true
        }
        this.syncSprite()
        if(this.lastAttackAge == 3) { // TODO: 3 as long as input state sync is a bit buggy
            for(let enem of this.scene.getTeam("enemy")) {
                if(checkHit(this, enem)) this.attackEnemy(enem)
            }
            for(let hero of this.scene.getTeam("hero")) {
                if(this.owner == hero) continue
                if(checkHit(this, hero)) this.attackHero(hero)
            }
        }
        this.lastAttackAge += 1
    }
    attackEnemy(enem) {
        enem.takeDamage(1, this.owner)
    }
    attackHero(hero) {
        hero.takeDamage(0, this.owner)
    }
    syncSprite() {
        const ratioSinceLastAttack = this.lastAttackAge / (SWORD_ATTACK_PERIOD * this.game.fps)
        if(ratioSinceLastAttack <= 1) {
            this.sprite = SwordSlashSprites[floor(6*ratioSinceLastAttack)]
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
        state.laa = this.lastAttackAge
        return state
    }
    setState(state) {
        super.setState(state)
        this.lastAttackAge = state.laa
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


const BombSpriteSheet = new SpriteSheet("/static/assets/bomb.png", 2, 1)
const BombSprites = range(0, 2).map(i => new Sprite(BombSpriteSheet.getFrame(i)))

class BombItem extends Entity {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.width = this.height = 40
        this.sprite = BombSprites[0]
        this.respawnDur = 2
        this.lastAddAge = this.respawnDur * this.game.fps
    }
    update() {
        this.spriteVisible = this.lastAddAge >= this.respawnDur * this.game.fps
        if(this.spriteVisible) {
            for(let hero of this.scene.getTeam("hero")) {
                if(checkHit(this, hero)) {
                    hero.addExtra(new BombExtra(hero))
                    this.lastAddAge = 0
                    break
                }
            }
        }
        this.lastAddAge += 1
    }
    getState() {
        const state = super.getState()
        state.ada = this.lastAddAge
        return state
    }
    setState(state) {
        super.setState(state)
        this.lastAddAge = state.ada
    }
}
Entities.register("bombIt", BombItem)


class BombExtra extends Extra {
    constructor(owner) {
        super(owner, 0, 0)
        this.width = this.height = 40
        this.isMainExtra = true
        this.sprite = BombSprites[0]
        this.removeSimilarExtras()
    }
    update() {
        const { inputState } = this
        if(inputState && inputState.attack) {
            const bomb = this.scene.entities.add(new Bomb(this.scene, this.owner.x, this.owner.y))
            bomb.speedX = this.owner.dirX * 200
            bomb.speedY = -500
            this.remove()
        }
    }
    removeSimilarExtras() {
        if(!this.owner.extras) return
        this.owner.extras.forEach(extra2 => {
            if(extra2.isMainExtra) extra2.remove()
        })
    }
    getInputState() {
        const inputState = super.getInputState()
        const { game } = this
        if(game.isKeyPressed(" ")) inputState.attack = true
        else delete inputState.attack
        return inputState
    }
}
Extras.register("bomb", BombExtra)


class Bomb extends DynamicEntity {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.width = this.height = 40
        this.itToLive = 3 * this.game.fps
        this.syncSprite()
    }
    update() {
        const { dt } = this.game
        if(this.speedResY  < 0) this.speedX = sumTo(this.speedX, 500 * dt, 0)
        if(this.itToLive <= 0) {
            this.scene.entities.add(new Explosion(this.scene, this.x, this.y))
            this.remove()
        }
        this.syncSprite()
        this.itToLive -= 1
    }
    syncSprite() {
        this.sprite = BombSprites[floor(pow(3 - (this.itToLive / this.game.fps), 2)*2) % 2]
    }
    getState() {
        const state = super.getState()
        state.ttl = this.itToLive
        return state
    }
    setSTate(state) {
        super.setState(state)
        this.itToLive = state.ttl
    }
}
Entities.register("bomb", Bomb)


const ExplosionSpriteSheet = new SpriteSheet("/static/assets/explosion.png", 8, 6)
const ExplosionSprites = range(0, 46).map(i => new Sprite(ExplosionSpriteSheet.getFrame(i)))

class Explosion extends Entity {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.width = this.height = 300
        this.iteration = 0
    }
    update() {
        super.update()
        if(this.iteration == 0) this.checkEntitiesToDamage()
        const age = this.iteration/this.game.fps
        if(age >= 1) return this.remove()
        this.sprite = ExplosionSprites[floor(age*46)]
        this.iteration += 1
    }
    checkEntitiesToDamage() {
        const { x, y } = this
        const radius2 = pow(150, 2)
        const _checkOne = ent => {
            const dx = x - ent.x, dy = y - ent.y
            if(dx*dx+dy*dy < radius2) ent.takeDamage(1, this)
        }
        this.scene.getTeam("hero").forEach(_checkOne)
        this.scene.getTeam("enemy").forEach(_checkOne)
    }
    getState() {
        const state = super.getState()
        state.it = this.iteration
        return state
    }
    setState(state) {
        super.setState(state)
        this.iteration = state.it
    }
}
Entities.register("explos", Explosion)



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
    update() {
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



const CheckpointImg = new Img("/static/assets/checkpoint.png")
const CheckpointSprite = new Sprite(CheckpointImg)

class Checkpoint extends Entity {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.sprite = CheckpointSprite
        this.width = this.height = 40
        this.undergoGravity = false
        this.undergoWalls = false
    }
    update() {
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) {
                this.remove()
                this.scene.herosSpawnX = this.x
                this.scene.herosSpawnY = this.y
            }
        })
    }
}
Entities.register("checkpt", Checkpoint)


const SmokeExplosionSpriteSheet = new SpriteSheet("/static/assets/smoke_explosion.png", 4, 1)
const SmokeExplosionSprites = range(0, 4).map(i => new Sprite(SmokeExplosionSpriteSheet.getFrame(i)))

class SmokeExplosion extends Entity {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.width = this.height = 100
        this.undergoGravity = false
        this.undergoWalls = false
        this.iteration = 0
    }
    update() {
        this.iteration += 1
        const time = this.iteration * this.game.dt
        if(time > .5) { this.remove(); return }
        this.sprite = SmokeExplosionSprites[floor(time/.5*4)]
    }
    getState() {
        const state = super.getState()
        state.it = this.iteration
        return state
    }
    setState(state) {
        super.setState(state)
        this.iteration = state.it
    }
}
Entities.register("smokee", SmokeExplosion)


class DebugScene extends SceneCommon {
    constructor(game) {
        super(game)
        this.color = null
        const fontArgs = {
            font: "20px arial",
            fillStyle: "grey"
        }
        this.updDurTxt = new Text(this, "", this.game.width - 90, 15, fontArgs)
        this.drawDurTxt = new Text(this, "", this.game.width - 90, 40, fontArgs)
        this.lagTxt = new Text(this, "", this.game.width - 90, 65, fontArgs)
    }
    update() {
        const { metrics } = this.game
        if(metrics) {
            const updDurMts = metrics["updateDur"]
            if(updDurMts) this.updDurTxt.updateText(`Upd: ${arrAvg(updDurMts).toFixed(3)} / ${arrMax(updDurMts).toFixed(3)}`)
            const drawDurMts = metrics["drawDur"]
            if(drawDurMts) this.drawDurTxt.updateText(`Draw: ${arrAvg(drawDurMts).toFixed(3)} / ${arrMax(drawDurMts).toFixed(3)}`)
            const lagMts = metrics["lag"]
            if(lagMts) this.lagTxt.updateText(`Lag: ${arrAvg(lagMts).toFixed(3)} / ${arrMax(lagMts).toFixed(3)}`)
        }
    }
    drawTo(ctx) {
        this.updDurTxt.drawTo(ctx)
        this.drawDurTxt.drawTo(ctx)
        this.lagTxt.drawTo(ctx)
    }
}

function arrAvg(arr) {
    let sum = 0, nb = arr.length
    if(nb === 0) return 0
    for(let v of arr) sum += v
    return sum / nb
}

function arrMax(arr) {
    let res = 0
    for(let v of arr) if(v > res) res = v
    return res
}
