const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, checkHit, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl } = utils
import { loadAud, AudioEngine } from './audio.mjs'
import PhysicsEngine from './physics.mjs'

export const FPS = 30
const CANVAS_MAX_WIDTH = 800
const CANVAS_MAX_HEIGHT = 600
const MAP_DEFAULT_WIDTH = 800
const MAP_DEFAULT_HEIGHT = 600

const GRAVITY = 1000

export const MSG_KEY_LENGTH = 3
export const MSG_KEYS = {
    PING: "PNG",
    IDENTIFY_CLIENT: 'IDC',
    JOIN_GAME: 'JOI',
    STATE: 'STT',
    GAME_INSTRUCTION: 'GMI',
//   GAME_OVER: 'GOV',
}

const STATE_TYPE_FULL = "F"
const STATE_TYPE_INPUT = "I"

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
        //this.attrs = {}
        this.walls = []
        this.heros = []
        this.entities = []
        this.events = []
    }

    async exportAsBinary() {
        const outObj = {
            w: this.width,
            h: this.height,
            //a: this.attrs,
            ws: this.walls,
            hs: this.heros,
            ents: this.entities,
            evts: this.events,
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
        this.entities = inObj.ents
        this.events = inObj.evts
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

export function loadImg(src) {
    return new Promise((ok, ko) => {
        //if(IS_SERVER_ENV) return
        const img = new Image()
        img.src = src
        img.onload = () => ok(img)
        img.onerror = () => ko(`load error: ${src}`)
    })
}

export class Sprite {
    constructor(src) {
        if(typeof src === "string") src = loadImg(src)  
        if(src instanceof Promise) src.then(img => this.baseImg = img)
        else this.baseImg = src
        this.transImgs = {}
    }
    getImg(width, height, dirX, dirY, visibility) {
        const key = `${width}:${height}:${dirX}:${dirY}:${visibility}`
        let res = this.transImgs[key]
        if(res) return res
        const { baseImg } = this
        if(!baseImg || baseImg._loading) return null // TODO: deprecate it
        const { width: baseWidth, height: baseHeight } = baseImg
        const resImg = newCanvas(width, height)
        const ctx = resImg.getContext("2d")
        ctx.translate(dirX >= 0 ? 0 : width, dirY >= 0 ? 0 : height)
        ctx.scale(width/baseWidth * dirX, height/baseHeight * dirY)
        ctx.globalAlpha = visibility
        ctx.drawImage(baseImg, 0, 0)
        this.transImgs[key] = resImg
        return resImg
    }
}


export class SpriteSheet {
    constructor(src, nbCols, nbRows) {
        this.sprites = []
        for(let i=0; i<nbCols*nbRows; ++i) this.sprites.push(new Sprite())
        if(typeof src === "string") src = loadImg(src)  
        if(src instanceof Promise) src.then(img => this.initSprites(img, nbCols, nbRows))
        else this.initSprites(src, nbCols, nbRows)
    }
    initSprites(img, nbCols, nbRows) {
        const frameWidth = floor(img.width / nbCols)
        const frameHeight = floor(img.height / nbRows)
        for (let j = 0; j < nbRows; ++j) for (let i = 0; i < nbCols; ++i) {
            const can = document.createElement("canvas")
            can.width = frameWidth
            can.height = frameHeight
            can.getContext("2d").drawImage(img, ~~(-i * frameWidth), ~~(-j * frameHeight))
            this.get(i + j*nbCols).baseImg = can
        }
    }
    get(num, loop = false) {
        const { sprites } = this
        if(loop) num = num % sprites.length
        else if(num >= sprites.length) return null
        return sprites[num]
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
            speedX: 0,
            speedY: 0,
            speedResX: 0,
            speedResY: 0,
            undergoPhysic: true,
            undergoGravity: true,
            undergoWalls: true,
            spriteVisibility: 1,
            spriteDx: 0,
            spriteDy: 0,
        })
    }

    constructor(group, id, kwargs) {
        this.group = group
        this.scene = group.scene
        this.game = group.game
        this.id = id
        if(kwargs) {
            if(kwargs.x !== undefined) this.x = kwargs.x
            if(kwargs.y !== undefined) this.y = kwargs.y
            if(kwargs.dirX !== undefined) this.dirX = kwargs.dirX
            if(kwargs.dirY !== undefined) this.dirY = kwargs.dirY
            if(kwargs.speedX !== undefined) this.speedX = kwargs.speedX
            if(kwargs.speedY !== undefined) this.speedY = kwargs.speedY
        }
    }

    getPriority() {
        return 0
    }

    update() {}

    drawTo(ctx) {
        const img = this.getImg()
        if(img) ctx.drawImage(img, ~~(this.x + this.spriteDx - img.width/2), ~~(this.y + this.spriteDy - img.height/2))
    }

    scaleSprite(sprite) {
        this.spriteFit(sprite)
    }

    getSprite() {
        return this.sprite // TODO: return null when this.sprite deprecated
    }

    getImg() {
        if(this.spriteVisibility === 0) return
        const sprite = this.getSprite()
        if(!sprite || !sprite.baseImg) return
        this.scaleSprite(sprite)
        return sprite.getImg(
            this.spriteWidth,
            this.spriteHeight,
            this.dirX,
            this.dirY,
            this.spriteVisibility,
        )
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
            const { isDown, x: touchX, y: touchY } = touch
            if(isDown && left<=touchX && left+width>touchX && top<=touchY && top+height>touchY) return true
        }
        return false
    }

    remove() {
        this.removed = true
    }

    getState() {
        const state = this.state ||= {}
        state.id = this.id
        state.key = this.constructor.key
        state.x = this.x
        state.y = this.y
        if(this.hasOwnProperty("dirX")) state.dirX = this.dirX
        if(this.hasOwnProperty("dirY")) state.dirY = this.dirY
        if(this.hasOwnProperty("speedX")) state.speedX = this.speedX
        if(this.hasOwnProperty("speedY")) state.speedY = this.speedY
        return state
    }

    setState(state) {
        this.x = state.x
        this.y = state.y
        if(state.dirX !== undefined) this.dirX = state.dirX
        else delete this.dirX
        if(state.dirY !== undefined) this.dirY = state.dirY
        else delete this.dirY
        if(state.speedX !== undefined) this.speedX = state.speedX
        else delete this.speedX
        if(state.speedY !== undefined) this.speedY = state.speedY
        else delete this.speedY
    }

    addMenuInputs(menu) {
        const xInput = menu.addInput("position", "x", "number", this.x)
        xInput.onchange = () => menu.updateState("x", parseInt(xInput.value))
        const yInput = menu.addInput("position", "y", "number", this.y)
        yInput.onchange = () => menu.updateState("y", parseInt(yInput.value))
        const dirXInput = newDomEl("select")
        dirXInput.appendChild(newDomEl("option", {
            value: "1",
            text: "Right",
        }))
        dirXInput.appendChild(newDomEl("option", {
            value: "-1",
            text: "Left",
        }))
        dirXInput.value = this.dirX.toString()
        menu.addInput("position", "dirX", dirXInput)
        dirXInput.onchange = () => menu.updateState("dirX", parseInt(dirXInput.value))
    }

    spriteFit(sprite) {
        const { width, height } = this
        const { width: baseWidth, height: baseHeight } = sprite.baseImg
        if(width * baseHeight > baseWidth * height){
            this.spriteWidth = ~~(baseWidth*height/baseHeight)
            this.spriteHeight = height
        } else {
            this.spriteWidth = width
            this.spriteHeight = ~~(baseHeight*width/baseWidth)
        }
    }
    
    spriteFill(sprite) {
        const { width, height } = this
        const { width: baseWidth, height: baseHeight } = sprite.baseImg
        if(width * baseHeight < baseWidth * height){
            this.spriteWidth = ~~(baseWidth*height/baseHeight)
            this.spriteHeight = height
        } else {
            this.spriteWidth = width
            this.spriteHeight = ~~(baseHeight*width/baseWidth)
        }
    }
    
    spriteFitWidth(sprite) {
        const { width } = this
        const { width: baseWidth, height: baseHeight } = sprite.baseImg
        this.spriteWidth = width
        this.spriteHeight = ~~(baseHeight*width/baseWidth)
    }
    
    spriteFitHeight(sprite) {
        const { height } = this
        const { width: baseWidth, height: baseHeight } = sprite.baseImg
        this.spriteWidth = ~~(baseWidth*height/baseHeight)
        this.spriteHeight = height
    }
}

export const Entities = {}
Entities.register = function(key, cls) {
    cls.key = key
    this[key] = cls
}


export class EntityRefs extends Set {
    constructor(refGroup) {
        super()
        this.refGroup = refGroup
        this.scene = refGroup.scene
        this.game = refGroup.game
    }
    clearRemoved() {
        const { refGroup } = this
        for(let id of this) {
            const ent = refGroup.get(id)
            if(!ent || ent.removed) this.delete(id)
        }
    }
    forEach(next) {
        const { refGroup } = this
        for(let id of this) {
            const ent = refGroup.get(id)
            if(!ent || ent.removed) this.delete(id)
            else next(ent)
        }
    }
    getState() {
        const state = this.state |= []
        state.length = 0
        this.forEach(ent => state.push(ent.id))
        return state
    }
    setState(state) {
        for(let id of state) this.add(id)
        if(state.length < this.size) {
            for(let id of this)
                if(state.indexOf(id)<0)
                    this.delete(id)
        }
    }
}


export const Events = {}
Events.register = function(key, cls) {
   cls.key = key
   this[key] = cls
}


export class Event {
    constructor(owner, initState) {
        this.owner = owner
        this.game = owner.game
        const trigger = this.trigger = {}
        if(initState) {
            if(initState.and !== undefined) trigger.and = initState.and
            if(initState.or !== undefined) trigger.or = initState.or
            if(initState.not !== undefined) trigger.not = initState.not
            if(initState.maxExecs !== undefined) trigger.maxExecs = initState.maxExecs
            if(initState.prevExecOlder !== undefined) trigger.prevExecOlder = initState.prevExecOlder
        }
        this.iteration = 0
        this.nbExecs = 0
        this.prevExecIt = -Infinity
    }
    update() {
        if(this.checkTrigger(this.trigger)) this.executeAction()
        this.iteration += 1
    }
    checkTrigger(trigger) {
        if(trigger.and !== undefined) {
            for(let c of trigger.and) if(!this.checkTrigger(c)) return false
            return true
        } else if(trigger.or !== undefined) {
            for(let c of trigger.or) if(this.checkTrigger(c)) return true
            return false
        } else if(trigger.not !== undefined) {
            return !this.checkTrigger(trigger.not)
        } else if(trigger.maxExecs !== undefined) {
            return this.nbExecs < trigger.maxExecs
        } else if(trigger.prevExecOlder !== undefined) {
            const prevExecAge = (this.iteration - this.prevExecIt) * this.game.dt
            return prevExecAge >= trigger.prevExecOlder
        }
    }
    executeAction() {
        this.nbExecs += 1
        this.prevExecIt = this.iteration
    }
    getInitState() {
        const state = this._initState ||= {}
        state.key = this.constructor.key
        if(this.trigger.and !== undefined) state.and = this.trigger.and
        else delete state.and
        if(this.trigger.or !== undefined) state.or = this.trigger.or
        else delete state.or
        if(this.trigger.not !== undefined) state.not = this.trigger.not
        else delete state.not
        if(this.trigger.maxExecs !== undefined) state.maxExecs = this.trigger.maxExecs
        else delete state.maxExecs
        if(this.trigger.prevExecOlder !== undefined) state.prevExecOlder = this.trigger.prevExecOlder
        else delete state.prevExecOlder
        return state
    }
    getState() {
        const state = this._state ||= {}
        state.it = this.iteration
        if(this.nbExecs > 0) state.ne = this.nbExecs
        else state.ne
        if(this.prevExecIt >= 0) state.peit = this.prevExecIt
        else delete state.peit
        return state
    }
    setState(state) {
        this.iteration = state.it
        if(state.ne === undefined) this.nbExecs = 0
        else this.nbExecs = state.ne
        if(state.peit === undefined) this.prevExecIt = -Infinity
        else this.prevExecIt = state.peit
    }
    addMenuInputs(menu) {
        // const xInput = menu.addInput("position", "x", "number", this.x)
        // xInput.onchange = () => menu.updateState("x", parseInt(xInput.value))
    }
}


export class SpawnEntityEvent extends Event {
    constructor(scn, initState) {
        super(scn, initState)
        this.scene = scn
        if(initState) {
            if(initState.state !== undefined) this.entState = initState.state
            if(initState.nbEnts !== undefined) this.trigger.nbEnts = initState.nbEnts
            if(initState.prevEntFur !== undefined) this.trigger.prevEntFurther = initState.prevEntFur
        }
        this.spawnedEntities = new EntityRefs(scn.entities)
        this.prevSpawnedEntity = null
    }
    checkTrigger(trigger) {
        if(trigger.nbEnts !== undefined) {
            return this.spawnedEntities.size < trigger.nbEnts
        } else if(trigger.prevEntFurther !== undefined) {
            if(this.prevSpawnedEntity == null) return true
            const { x: prevEntX, y: prevEntY } = this.prevSpawnedEntity
            const { x: stateX, y: stateY } = this.entState
            return hypot(prevEntX-stateX, prevEntY-stateY) > trigger.prevEntFurther
        } else {
            return super.checkTrigger(trigger)
        }
    }
    update() {
        this.clearRemoved()
        super.update()
    }
    clearRemoved() {
        this.spawnedEntities.clearRemoved()
        if(this.prevSpawnedEntity && this.prevSpawnedEntity.removed) this.prevSpawnedEntity = null
    }
    executeAction() {
        super.executeAction()
        const ent = this.scene.newEntity(this.entState.key)
        ent.setState(this.entState)
        this.spawnedEntities.add(ent.id)
        this.prevSpawnedEntity = ent
    }
    getInitState() {
        const state = super.getInitState()
        if(this.entState !== undefined) state.state = this.entState
        else delete state.state
        if(this.trigger.nbEnts !== undefined) state.nbEnts = this.trigger.nbEnts
        if(this.trigger.prevEntFurther !== undefined) state.prevEntFur = this.trigger.prevEntFurther
        else delete state.nbEnts
        return state
    }
    getState() {
        const state = super.getState()
        state.ents = this.spawnedEntities.toState()
    }
    setState(state) {
        super.setState(state)
        this.spawnedEntities.setState(state.ents)
    }
}
Events.register("ent", SpawnEntityEvent)


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
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.textArgs = kwargs
        this.updateText(kwargs.text)
    }

    updateText(text) {
        if(this.game.isServerEnv) return
        const canvas = newTextCanvas(text, this.textArgs)
        this.width = canvas.width
        this.height = canvas.height
        this.sprite = new Sprite(canvas)
    }

    getSprite() {
        return this.sprite
    }
}

class CenteredText extends Text {
    drawTo(ctx) {
        this.x = this.scene.width / 2
        this.y = this.scene.height / 2
        super.drawTo(ctx)
    }
}

export class EntityGroup {

    constructor(scene) {
        this.x = 0
        this.y = 0
        this.scene = scene
        this.game = scene.game
        this.entArr = []
        this.entMap = new Map()
        this._lastAutoId = 0
    }

    nextAutoId() {
        this._lastAutoId += 1
        let res = this._lastAutoId.toString()
        // be sure that client & leader generate different ids
        if(this.game.mode == MODE_CLIENT) res += 'C'
        return res
    }

    new(cls, kwargs) {
        const id = this.nextAutoId()
        if(typeof cls === 'string') cls = Entities[cls]
        const ent = new cls(this, id, kwargs)
        this.entMap.set(id, ent)
        this.entArr.push(ent)
        return ent
    }

    get(id) {
        return this.entMap.get(id)
    }

    // add(ent) {
    //     if(ent.id === undefined) { ent.id = this.nextAutoId() }
    //     this.entMap.set(ent.id, ent)
    //     this.entArr.push(ent)
    //     return ent
    // }

    forEach(next) {
        this.entArr.forEach(ent => {
            if(!ent.removed) next(ent)
        })
    }

    clearRemoved() {
        const { entArr, entMap } = this
        let idx = 0, nbEnts = entArr.length
        while(idx < nbEnts) {
            const ent = entArr[idx]
            if(ent.removed) {
                entArr.splice(idx, 1)
                entMap.delete(ent.id)
                nbEnts -= 1
            } else {
                idx += 1
            }
        }
    }

    clear() {
        this.forEach(item => item.remove())
        super.clear()
    }

    update() {
        this.clearRemoved()
        this.sortEntities()
        this.forEach(ent => ent.update())
    }

    sortEntities() {
        this.entArr.sort((a, b) => (b.getPriority() - a.getPriority()))
    }

    drawTo(gameCtx) {
        this.clearRemoved()
        const x = ~~this.x, y = ~~this.y
        gameCtx.translate(x, y)
        this.forEach(ent => ent.drawTo(gameCtx))
        gameCtx.translate(-x, -y)
    }

    getState() {
        const state = this._state ||= []
        state.length = 0
        this.forEach(ent => state.push(ent.getState()))
        return state
    }

    setState(state) {
        const { entArr, entMap } = this
        entArr.length = 0
        if(state) {
            for(let entState of state) {
                let { id } = entState
                let ent = entMap.get(id)
                if(!ent) {
                    const cls = Entities[entState.key]
                    ent = new cls(this, id)
                    entMap.set(ent.id, ent)
                }
                ent.setState(entState)
                entArr.push(ent)
            }
            if(entMap.size != entArr.length) {
                entMap.clear()
                for(let ent of entArr) entMap.set(ent.id, ent)
            }
        } else this.clear()
    }
}

export const MODE_LOCAL = 0
export const MODE_SERVER = 1
export const MODE_CLIENT = 2

export class GameCommon {

    constructor(parentEl, map, kwargs) {
        this.mode = (kwargs && kwargs.mode) || MODE_LOCAL
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

    initTouches() {
        if(this.touches) return
        this.touches = []

        const el = this.game.canvas
        const _updTouches = (isDown, evtTouches) => {
            this.touches.length = 0
            const rect = el.getBoundingClientRect()
            for(let evtTouch of evtTouches) {
                this.touches.push({
                    isDown,
                    x: (evtTouch.clientX - rect.left) * el.width / rect.width,
                    y: (evtTouch.clientY - rect.top) * el.height / rect.height,
                })
            }
            this.onTouch()
        }

        if(HAS_TOUCH) {
            el.addEventListener("touchmove", evt => _updTouches(true, evt.touches))
            el.addEventListener("touchstart", evt => _updTouches(true, evt.touches))
            document.addEventListener("touchend", evt => _updTouches(true, evt.touches))
        } else {
            let isDown = false
            el.addEventListener("mousemove", evt => _updTouches(isDown, [evt]))
            el.addEventListener("mousedown", evt => { isDown = true; _updTouches(isDown, [evt]) })
            document.addEventListener("mouseup", evt => { isDown = false; _updTouches(isDown, [evt]) })
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
        this._drawing ||= false
        if(!this._drawing) {
            if(this.iteration == this._lastDrawIteration) return
            this._drawing = true
            this._lastDrawIteration = this.iteration
            window.requestAnimationFrame(() => {
                this.draw()
                this._drawing = false
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
        if(this.joypadScene) this.joypadScene.setPos(
            0,
            this.gameScene.visible ? this.gameScene.height : 0,
        )
        const height = max(height169, (this.gameScene.visible ? this.gameScene.height : 0) + (this.joypadScene ? this.joypadScene.height : 0))
        assign(this, { width, height })
        if(!this.isServerEnv) {
            assign(this.parentEl.style, { width: `${width}px`, height: `${height}px` })
            assign(this.canvas, { width, height })
            this.syncCanvasAspectRatio()
            window.addEventListener("resize", () => this.syncCanvasAspectRatio())
        }
    }

    syncCanvasAspectRatio() {
        const { width, height } = this
        const gameIsMoreLandscapeThanScreen = ((width / window.innerWidth) / (height / window.innerHeight)) >= 1
        assign(this.canvas.style, {
            width: gameIsMoreLandscapeThanScreen ? "100%" : null,
            height: gameIsMoreLandscapeThanScreen ? null : "100%",
            aspectRatio: width / height,
        })
    }

    isFullscreened() {
        return document.fullscreenElement == this.parentEl
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
        this.iteration = 0
        this.time = 0
        if(!this.game.isServerEnv) {
            this.canvas = document.createElement("canvas")
        }
        this.walls = new EntityGroup(this)
        this.entities = new EntityGroup(this)
        this.heros = {}
        this.initWalls()
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
        walls.forEach(w => {
            const { x1, y1, x2, y2 } = w
            this.newWall({ x1, y1, x2, y2 })
        })
    }

    newWall(kwargs) {
        return this.walls.new(Wall, kwargs)
    }

    newEntity(key, kwargs) {
        return this.entities.new(key, kwargs)
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

    update() {}

    draw() {
        const ctx = this.canvas.getContext("2d")
        ctx.reset()
        if(this.color) {
            ctx.fillStyle = "white"
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        }
        this.drawTo(ctx)
    }

    drawTo(ctx) {
        ctx.translate(~~-this.viewX, ~~-this.viewY)
        this.walls.drawTo(ctx)
        this.entities.drawTo(ctx)
        ctx.translate(~~this.viewX, ~~this.viewY)
    }
}

export class Wall extends Entity {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.x1 = kwargs.x1
        this.y1 = kwargs.y1
        this.x2 = kwargs.x2
        this.y2 = kwargs.y2
        this.key = kwargs.key
    }
    drawTo(ctx) {
        ctx.lineWidth = 5
        ctx.strokeStyle = "dark"
        ctx.beginPath()
        ctx.moveTo(this.x1, this.y1)
        ctx.lineTo(this.x2, this.y2)
        ctx.globalAlpha = this.spriteVisibility
        ctx.stroke()
        ctx.globalAlpha = 1
    }
}


// GAME //////////////////////////

export class Game extends GameCommon {

    constructor(parentEl, map, playerId, kwargs) {
        super(parentEl, map, kwargs)

        this.players = {}
        this.localPlayerId = playerId

        this.lag = 0
        this.sendPing = (kwargs && kwargs.sendPing) || null
        this.sendStates = (kwargs && kwargs.sendStates) || null
        this.onLog = (kwargs && kwargs.onLog) || null

        this.inputStates = []
        if(this.mode != MODE_LOCAL) {
            this.statesToSend = []
            this.receivedStates = []
            this.receivedAppliedStates = []
        }

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

        this.audioEngine = new AudioEngine(this)
        
        this.physicEngine = new PhysicsEngine(this)
        this.physicGravity = GRAVITY
    }

    play() {
        if(this.gameLoop) return
        this.startTime = now()
        this.gameLoop = setInterval(() => this.updateGameLoop(), 1000 * this.dt)
    }

    updateGameLoop() {
        if(this.updating) return
        this._updating = true
        const { mode } = this
        const updStartTime = now()
        this.update()
        if(this.isDebugMode) this.pushMetric("updateDur", now() - updStartTime, this.fps * 5)
        if(mode != MODE_LOCAL) this.getAndMaySendStates()
        if(mode != MODE_SERVER) this.mayDraw()
        if(this.isDebugMode && mode == MODE_CLIENT) this.maySendPing()
        this.updating = false
    }

    stop() {
        if(this.gameLoop) clearInterval(this.gameLoop)
        this.gameLoop = null
    }

    initGameScene(scnId, visible=true) {
        if(scnId === undefined) scnId = max(0, this.iteration)
        this.gameScene = new GameScene(this, scnId)
        this.showGameScene(visible, true)
    }

    showGameScene(visible, force=false) {
        if(!force && visible == this.gameScene.visible) return
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
        if(this.mode == MODE_LOCAL) this.updateGame()
        else this.updateGameApplyingReceivedStates()
        if(this.joypadScene) this.joypadScene.update()
        if(this.debugScene) this.debugScene.update()
    }

    updateGame() {
        this.iteration += 1
        this.time = this.iteration * this.dt
        this.applyInputStates()
        if(this.gameScene.visible) this.gameScene.update()
    }

    applyInputStates() {
        for(const inputState of this.inputStates) {
            const hero = this.gameScene.getHero(inputState.pid)
            if(hero) hero.setInputState(inputState.is)
        }
        this.inputStates.length = 0
    }

    updateGameApplyingReceivedStates() {
        const { receivedStates, receivedAppliedStates } = this
        let targetIteration = this.iteration + 1
        while(this.iteration < targetIteration) {
            while(receivedStates.length > 0) {
                const state = receivedStates[0]
                if(state.t == STATE_TYPE_FULL) {
                    this.setState(state)
                    const newTargetIteration = max(this.iteration, targetIteration - 1)
                    if(newTargetIteration != targetIteration) {
                        if(this.isDebugMode) this.log("Fix iteration", targetIteration, "=>", newTargetIteration)
                        targetIteration = newTargetIteration
                    }
                } else if(state.it >= targetIteration) break
                if(state.t == STATE_TYPE_INPUT) this.inputStates.push(state)
                receivedAppliedStates.push(state)
                receivedStates.shift()
            }
            if(this.iteration < targetIteration) this.updateGame()
        }
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
        this.initGameScene(scnId, this.gameScene.visible)
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
                    key: defaultHero.key,
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

    getFirstPlayerId() {
        let firstPlayerId = null, firstPlayer = null
        const { players } = this
        for(let playerId in players) {
            const player = players[playerId]
            if(firstPlayerId === null || player.num < firstPlayer.num) {
                firstPlayerId = playerId
                firstPlayer = player
            }
        }
        return firstPlayerId
    }

    isKeyPressed(key) {
        return this.keysPressed[key]
    }

    setInputKey(key, val) {
        if(Boolean(this.keysPressed[key]) === val) return
        this.keysPressed[key] = val
        this.getAndMayPushLocalHeroInputState()
    }

    getAndMayPushLocalHeroInputState() {
        const localHero = this.gameScene.getHero(this.localPlayerId)
        if(!localHero) return
        let inputState = localHero.getInputState()
        if(!inputState || !hasKeys(inputState)) inputState = null
        const inputStateWiIt = {
            t: STATE_TYPE_INPUT,
            pid: this.localPlayerId,
            it: this.iteration,
            is: inputState
        }
        if(this.mode != MODE_CLIENT) {
            this.inputStates.push(inputStateWiIt)
        } else {
            this.statesToSend.push(inputStateWiIt)
            this._inputStateSendCount ||= 0
            const inputStateSendCount = this._inputStateSendCount += 1
            if(inputState) setTimeout(() => {
                if(this._inputStateSendCount != inputStateSendCount) return
                this.getAndMayPushLocalHeroInputState()
            }, RESEND_INPUT_STATE_PERIOD * 1000)
        }
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
        this.fullState ||= { t: STATE_TYPE_FULL }
        this.partialState ||= {}
        const state = isFull ? this.fullState : this.partialState
        state.it = this.iteration
        if(isFull) state.players = this.players
        state.game = this.gameScene.getState(isFull)
        return (isFull || state.game) ? state : null
    }

    setState(state) {
        const isFull = (state.t == STATE_TYPE_FULL)
        if(isFull) this.iteration = state.it
        if(state.players) for(let playerId in state.players) this.addPlayer(playerId, state.players[playerId])
        if(state.game) {
            if(isFull && state.game.id != this.gameScene.id)
                this.restart(state.game.id)
            this.gameScene.setState(state.game, isFull)
        }
    }

    // server only
    getAndMaySendStates() {
        const { receivedAppliedStates, statesToSend } = this
        if(this.mode == MODE_SERVER) {
            // full state
            this._lastSendFullStateTime ||= -SEND_STATE_PERIOD
            if(this.time > this._lastSendFullStateTime + SEND_STATE_PERIOD) {
                const stateStr = this.getState(true)
                statesToSend.push(stateStr)
                this._lastSendFullStateTime = this.time
            }
            // forward
            while(receivedAppliedStates.length > 0) {
                statesToSend.push(...receivedAppliedStates)
                receivedAppliedStates.length = 0
            }
        }
        if(statesToSend.length > 0) {
            const statesToSendStr = JSON.stringify(statesToSend)
            if(this.isDebugMode) this.log("sendStates", statesToSendStr)
            this.sendStates(statesToSendStr)
            statesToSend.length = 0
        }
    }

    receiveStatesFromPlayer(playerId, statesStr) {
        if(this.isDebugMode) this.log("receiveStatesFromPlayer", playerId, statesStr)
        const states = JSON.parse(statesStr)
        for(let state of states) {
            if(state.pid != playerId) continue
            if(state.t == STATE_TYPE_INPUT) this.handleInputStateFromPlayer(state)
            this.addReceivedState(state)
        }
    }

    handleInputStateFromPlayer(inputStateWiIt) {
        // fix iteration
        const receivedInputStatePrevDit = this._receivedInputStatePrevDit ||= {}
        const playerId = inputStateWiIt.pid, clientIt = inputStateWiIt.it, prevDit = receivedInputStatePrevDit[playerId] || 0
        inputStateWiIt.it = this.iteration
        if(prevDit !== 0) inputStateWiIt.it = max(inputStateWiIt.it, clientIt + prevDit)
        if(inputStateWiIt.is) receivedInputStatePrevDit[playerId] = max(prevDit, this.iteration - clientIt)
        else delete receivedInputStatePrevDit[playerId]
        // schedule input state stop
        this._lastReceivedInputStateCount ||= 0
        const lastReceivedInputStateCount = this._lastReceivedInputStateCount += 1
        if(inputStateWiIt.is) setTimeout(() => {
            if(lastReceivedInputStateCount != this._lastReceivedInputStateCount) return
            this.addReceivedState({
                t: STATE_TYPE_INPUT,
                pid: inputStateWiIt.pid,
                it: this.iteration,
                is: null
            })
        }, RESEND_INPUT_STATE_PERIOD * 2 * 1000)
    }

    receiveStatesFromLeader(statesStr) {
        if(this.isDebugMode) this.log("receiveStatesFromLeader", statesStr)
        const { receivedStates } = this
        this._lastFullStateIt ||= 0
        const states = JSON.parse(statesStr)
        for(let state of states) {
            this.addReceivedState(state)
            if(state.t == STATE_TYPE_FULL) {
                this._lastFullStateIt = state.it
                for(let state2 of this.receivedAppliedStates) this.addReceivedState(state2)
                this.receivedAppliedStates.length = 0
            }
        }
        receivedStates.splice(0, receivedStates.findLastIndex(s => (s.it < this._lastFullStateIt)) + 1)
    }

    addReceivedState(state) {
        const { receivedStates } = this
        receivedStates.push(state)
        const getOrder = s => (s.it + ((s.t == STATE_TYPE_INPUT) ? .5 : 0))
        if(receivedStates.length >= 2) receivedStates.sort((a, b) => getOrder(a) - getOrder(b))
    }

    async showJoypadScene(val) {
        if(val == Boolean(this.joypadScene)) return
        if(val) {
            const joypadMod = await import("./joypad.mjs")
            if(this.joypadScene) return
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
        this.initHeros()
        this.initEntities()
        this.initEvents()
    }

    initHeros() {
        if(this.game.mode == MODE_CLIENT) return  // entities are init by first full state
        for(let playerId in this.game.players) this.addHero(playerId)
    }

    initEntities() {
        this.game.map.entities.forEach(entState => {
            const ent = this.newEntity(entState.key)
            ent.setState(entState)
        })
    }

    initEvents() {
        this.events = []
        this.game.map.events.forEach(evtState => {
            let evt = new Events[evtState.key](this, evtState)
            this.events.push(evt)
        })
    }

    addHero(playerId) {
        const player = this.game.players[playerId]
        if(!player) return
        if(this.getHero(playerId)) return
        const { hero: heroDef } = player
        if(!heroDef) return
        const { x, y, key } = heroDef
        const hero = this.newEntity(key, { x, y, playerId })
        return hero.id
    }

    getHero(playerId) {
        return this.heros[playerId]
    }

    getFirstHero() {
        const firstPlayerId = this.game.getFirstPlayerId()
        if(firstPlayerId === null) return null
        return this.heros[firstPlayerId]
    }

    rmHero(playerId) {
        const hero = this.getHero(playerId)
        if(hero) hero.remove()
    }

    checkHeros() {
        const { heros } = this
        let nbHeros = 0, nbHerosAlive = 0
        for(let playerId in heros) {
            const hero = heros[playerId]
            nbHeros += 1
            if(hero.lives !== 0) nbHerosAlive += 1
        }
        const firstHero = this.getFirstHero()
        if(firstHero && this.step == "GAME" && firstHero.lives <= 0) this.step = "GAMEOVER"
    }

    update() {
        const { step, entities, events } = this
        const { physicEngine, dt } = this.game
        super.update()
        this.iteration += 1
        this.time = this.iteration * this.game.dt
        if(step == "GAME" || step == "GAMEOVER") {
            events.forEach(evt => evt.update())
            physicEngine.apply(dt, entities)
            entities.update()
            this.checkHeros()
        }
        this.updateView()
    }

    drawTo(ctx) {
        super.drawTo(ctx)
        this.notifs.drawTo(ctx)
        if(this.step == "VICTORY") this.victoryNotifs.drawTo(ctx)
        if(this.step == "GAMEOVER") this.gameOverNotifs.drawTo(ctx)
    }

    getTeam(team) {
        const teams = this._teams ||= {}
        const teamsIts = this._teamsIts ||= {}
        if(teamsIts[team] != this.iteration) {
            const teamEnts = teams[team] ||= []
            teamEnts.length = 0
            this.entities.forEach(ent => {
                const entTeam = ent.team
                if(entTeam && entTeam.startsWith(team)) teamEnts.push(ent)
            })
            teamsIts[team] = this.iteration
        }
        return teams[team]
    }

    getCollectables(team) {
        const collectables = this._collectables ||= {}
        const collectablesIts = this._collectablesIt ||= {}
        if(collectablesIts[team] != this.iteration) {
            const teamCols = collectables[team] ||= []
            teamCols.length = 0
            this.entities.forEach(ent => {
                if(ent.isCollectableBy && ent.isCollectableBy(team)) teamCols.push(ent)
            })
            collectablesIts[team] = this.iteration
        }
        return collectables[team]

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
        this.victoryNotifs.new(
            CenteredText,
            {
                text: "VICTORY !",
                font: "100px serif",
            },
        )
    }

    initGameOverNotifs() {
        this.gameOverNotifs = new EntityGroup(this)
        this.gameOverNotifs.new(
            CenteredText,
            {
                text: "GAME OVER",
                font: "100px serif",
            },
        )
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

export class LivingEntity extends Entity {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.health = (kwargs && kwargs.health !== undefined) ? kwargs.health : this.getMaxHealth()
        this.lastDamageAge = null
    }

    getMaxHealth() {
        return 1
    }

    update() {
        const { iteration, step } = this.scene
        const { dt } = this.game
        const hasHealth = this.health > 0
        this.undergoWalls = hasHealth
        if(step != "GAME" || !hasHealth || this.isDamageable()) this.spriteVisibility = 1
        else this.spriteVisibility = (floor(iteration * dt * 100) % 2 == 0) ? 1 : 0
        this.mayRemove()
        if(this.lastDamageAge !== null) this.lastDamageAge += 1
    }

    isDamageable() {
        const { lastDamageAge } = this
        return lastDamageAge === null || lastDamageAge > ceil(0.5 * this.game.fps)
    }

    mayTakeDamage(val, damager, force) {
        if(this.health <= 0) return
        if(!force && !this.isDamageable()) return
        this.takeDamage(val, damager)
    }

    takeDamage(val, damager) {
        if(val > 0) this.lastDamageAge = 0
        this.health = max(0, this.health - val)
        if(this.health == 0) {
            this.onKill(damager)
        } else if(damager) {
            this.speedY = -200
            this.speedX = 200 * ((this.x > damager.x) ? 1 : -1)
        }
    }

    onKill(killer) {
        if(killer) {
            this.speedY = -500
            this.speedX = 100 * ((this.x < killer.x) ? -1 : 1)
        }
    }

    getState() {
        const state = super.getState()
        state.hea = this.health
        if(this.lastDamageAge !== null) state.lda = this.lastDamageAge
        else delete state.lda
        return state
    }

    setState(state) {
        super.setState(state)
        this.health = state.hea
        if(state.lda === undefined) this.lastDamageAge = null
        else this.lastDamageAge = state.lda
    }

    mayRemove() {
        if(this.health <= 0 && this.lastDamageAge > ceil(3 * this.game.fps)) {
            this.remove()
        }
    }
}


export class Hero extends LivingEntity {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.team = "hero"
        this.lives = (kwargs && kwargs.lives !== undefined) ? kwargs.lives : 3
        if(kwargs && kwargs.playerId !== undefined) this.setPlayerId(kwargs.playerId)
    }

    setPlayerId(playerId) {
        if(playerId === this.playerId) return
        this.playerId = playerId
        this.scene.syncHero(this)
    }

    isLocalHero() {
        return this === this.scene.localHero
    }

    initExtras() {
        const extras = this.extras ||= new EntityRefs(this.scene.entities)
        return extras
    }

    addExtra(extra) {
        const extras = this.initExtras()
        extras.add(extra.id)
    }

    dropExtra(extra) {
        const extras = this.extras
        if(extras) extras.delete(extra.id)
    }

    getMaxHealth() {
        return 3
    }

    isDamageable() {
        const { lastDamageAge } = this
        return lastDamageAge === null || lastDamageAge > ceil(3 * this.game.fps)
    }

    update() {
        super.update()
        this.checkCollectablesHit()
        this.updateHearts()
        this.mayResurect()
    }

    checkCollectablesHit() {
        this.scene.getCollectables(this.team).forEach(col => {
            if(checkHit(this, col)) col.onCollected(this)
        })
    }

    mayResurect() {
        if(this.health > 0 || this.lastDamageAge < this.game.fps) return
        if(this.lives > 0) this.lives -= 1
        if(this.lives > 0) {
            this.health = this.getMaxHealth()
            this.respawn()
        }
    }

    updateHearts() {
        if(this.playerId != this.game.localPlayerId) return
        const { lives, health } = this
        const { notifs } = this.scene
        const livesHearts = this.livesHearts ||= []
        for(let i=livesHearts.length; i<lives; ++i)
            livesHearts.push(notifs.new(LifeHeartNotif, { num: i }))
        const healthHearts = this.healthHearts ||= []
        for(let i=healthHearts.length; i<health; ++i)
            healthHearts.push(notifs.new(HealthHeartNotif, { num: i }))
        livesHearts.forEach(heart => {
            heart.x = 20 + heart.num * 35
            heart.y = 20
            heart.setFull(heart.num < lives)
        })
        healthHearts.forEach(heart => {
            heart.x = 15 + heart.num * 23
            heart.y = (livesHearts.length > 0) ? 50 : 15
            heart.setFull(heart.num < health)
        })
    }

    getState() {
        const state = super.getState()
        state.pid = this.playerId
        state.liv = this.lives
        const inputState = this.inputState
        if(inputState && hasKeys(inputState)) state.ist = inputState
        else delete state.ist
        const extras = this.extras
        if(extras && extras.size > 0) {
            const stExtras = state.extras ||= []
            stExtras.length = 0
            for(let exId of extras) stExtras.push(exId)
        } else if(state.extras) state.extras.length = 0
        return state
    }

    setState(state) {
        super.setState(state)
        this.setPlayerId(state.pid)
        this.lives = state.liv
        this.inputState = state.ist
        if(this.extras || state.extras) {
            const extras = this.initExtras()
            extras.clear()
            for(let exId of state.extras) extras.add(exId)
        }
    }

    getInputState() {
        const inputState = this._inputState ||= {}
        return inputState
    }

    setInputState(inputState) {
        this.inputState = inputState
        this.inputStateTime = now()
        this._isStateToSend = true
    }

    initJoypadButtons(joypadScn) {}

    respawn() {
        const { herosSpawnX, herosSpawnY } = this.scene
        this.x = herosSpawnX
        this.y = herosSpawnY
        this.speedX = 0
        this.speedY = 0
    }

    mayRemove() {
        if(this.lives <= 0 && this.lastDamageAge > ceil(3 * this.game.fps)) {
            this.remove()
        }
    }

    remove() {
        super.remove()
        this.scene.syncHero(this)
        if(this.livesHearts) {
            this.livesHearts.forEach(h => h.remove())
            delete this.livesHearts
        }
        if(this.healthHearts) {
            this.healthHearts.forEach(h => h.remove())
            delete this.healthHearts
        }
    }
}


const NicoImgPrm = loadImg("/static/assets/nico_full.png")
const NicoColorableImgPrm = loadImg("/static/assets/nico_full_colorable.png")
const NicoSpriteSheets = {
    spritesheets: {},
    get: function(color) {
        return this.spritesheets[color] ||= new SpriteSheet((async () => {
            const img = await NicoImgPrm
            if(!color) return img
            const colorableImg = await NicoColorableImgPrm
            const coloredImg = colorizeCanvas(cloneCanvas(colorableImg), color)
            return addCanvas(cloneCanvas(img), coloredImg)
        })(), 4, 1)
    },
}

const HandSprite = new Sprite("/static/assets/hand.png")
const ArrowsSpriteSheet = new SpriteSheet("/static/assets/arrows.png", 4, 1)

const OuchAudPrm = loadAud("/static/assets/ouch.opus")
const SlashAudPrm = loadAud("/static/assets/slash.opus")
const HandHitAudPrm = loadAud("/static/assets/hand_hit.opus")
const JumpAudPrm = loadAud("/static/assets/jump.opus")
const ItemAudPrm = loadAud("/static/assets/item.opus")

class Nico extends Hero {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = this.height = 50
        this.handDur = ceil(.1 * this.game.fps) 
        this.handRemIt = null
    }

    update() {
        super.update()
        // inputs
        this.applyInputState()
        if(this.handRemIt == this.handDur) this.checkHandHit()
        // fall
        if(this.y > this.game.map.height + 100) {
            this.mayTakeDamage(1, null, true)
            if(this.health > 0) this.respawn()
        }
    }

    checkHandHit() {
        const handHitBox = this.handHitBox ||= {
            width: 25,
            height: 25,
        }
        handHitBox.x = this.x + this.dirX * 28
        handHitBox.y = this.y
        let hasHit = false
        const _checkHit = ent => {
            if(this == ent) return
            if(checkHit(handHitBox, ent)) {
                ent.mayTakeDamage(0, this)
                hasHit = true
            }
        }
        this.scene.getTeam("enemy").forEach(_checkHit)
        this.scene.getTeam("hero").forEach(_checkHit)
        this.game.audioEngine.playSound(hasHit ? HandHitAudPrm : SlashAudPrm)
    }

    getSprite() {
        const { iteration } = this.scene
        const { dt, players } = this.game
        const player = players && players[this.playerId]
        const color = player && player.color
        const spriteSheet = NicoSpriteSheets.get(color)
        if(iteration > 0 && (this.handRemIt || this.speedResY == 0)) return spriteSheet.get(1)
        else if(this.speedX == 0) return spriteSheet.get(0)
        else return spriteSheet.get(1 + floor((iteration * dt * 6) % 3))
    }

    getInputState() {
        const { game } = this
        const inputState = super.getInputState()
        if(game.isKeyPressed("ArrowRight")) inputState.walkX = 1
        else if(game.isKeyPressed("ArrowLeft")) inputState.walkX = -1
        else delete inputState.walkX
        if(game.isKeyPressed("ArrowUp")) inputState.jump = true
        else delete inputState.jump
        if(game.isKeyPressed(" ")) inputState.attack = true
        else delete inputState.attack
        return inputState
    }

    applyInputState() {
        const { dt } = this.game
        if(this.health == 0) return
        const { inputState } = this
        if(!inputState || !inputState.walkX) this.speedX = sumTo(this.speedX, 2000 * dt, 0)
        else if(inputState.walkX > 0) {
            this.dirX = 1
            this.speedX = sumTo(this.speedX, 1000 * dt, 300)
        } else if(inputState.walkX < 0) {
            this.dirX = -1
            this.speedX = sumTo(this.speedX, 1000 * dt, -300)
        }
        if(inputState && inputState.jump && this.speedResY < 0) {
            this.speedY = -500
            this.game.audioEngine.playSound(JumpAudPrm)
        }
        if(this.handRemIt) this.handRemIt -= 1
        if(inputState && inputState.attack) this.attack()
        if(!(inputState && inputState.attack) && this.handRemIt === 0) this.handRemIt = null
    }

    attack() {
        if(this.handRemIt===null) this.handRemIt = this.handDur
    }

    getHitBox() {
        return {
            left: this.x - 20,
            width: 40,
            top: this.y - 25,
            height: 50,
        }
    }

    takeDamage(val, damager) {
        super.takeDamage(val, damager)
        this.game.audioEngine.playSound(OuchAudPrm)
    }

    initJoypadButtons(joypadScn) {
        const { width, height } = joypadScn
        const size = height*.45
        joypadScn.addButton("ArrowLeft", width*.15, height*.27, size, { icon: ArrowsSpriteSheet.get(3) })
        joypadScn.addButton("ArrowRight", width*.3, height*.73, size, { icon: ArrowsSpriteSheet.get(1) })
        joypadScn.addButton("ArrowUp", width*.85, height*.27, size, { icon: ArrowsSpriteSheet.get(0) })
        joypadScn.extraButton = joypadScn.addButton(" ", width*.7, height*.73, size, { icon: HandSprite })
        this.syncJoypadExtraButton()
    }

    syncJoypadExtraButton() {
        const { joypadScene } = this.game
        const extraButton = joypadScene && joypadScene.extraButton
        if(!extraButton) return
        const mainExtra = this.getMainExtra()
        extraButton.icon = mainExtra ? mainExtra.getSprite() : HandSprite
    }

    addExtra(extra) {
        super.addExtra(extra)
        this.syncJoypadExtraButton()
    }

    getMainExtra() {
        const { extras } = this
        if(!extras) return null
        let mainExtra = null
        extras.forEach(extra => {
            if(extra.isMainExtra) mainExtra = extra
        })
        return mainExtra
    }

    getState() {
        const state = super.getState()
        if(this.handRemIt!==null) state.hri = this.handRemIt
        else delete state.hri
        return state
    }

    setState(state) {
        super.setState(state)
        if(this.hri!==undefined) this.handRemIt = this.hri
        else this.handRemIt = null
    }

    drawTo(ctx) {
        if(this.disabled) return
        super.drawTo(ctx)
        if(this.handRemIt && this.spriteWidth>0 && this.spriteHeight>0) {
            const handImg = HandSprite.getImg(
                ~~(this.spriteWidth * .5),
                ~~(this.spriteHeight * .5),
                this.dirX,
                this.dirY,
            )
            if(handImg) ctx.drawImage(handImg, ~~(this.x + handImg.width * (-.5 + this.dirX * 1.1)), ~~(this.y - handImg.height/2))
        }
    }
}
Entities.register("nico", Nico)


const PuffAudPrm = loadAud("/static/assets/puff.opus")

class Enemy extends LivingEntity {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.team = "enemy"
    }
    onKill() {
        const { x, y } = this
        this.scene.newEntity(SmokeExplosion, { x, y })
        this.game.audioEngine.playSound(PuffAudPrm)
        this.remove()
    }
}


const BlobSprite = new Sprite("/static/assets/blob.png")

class BlobEnemy extends Enemy {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = 50
        this.height = 36
        this.lastChangeDirAge = 0
        this.spriteRand = floor(random() * this.game.fps)
    }

    update() {
        super.update()
        const { fps } = this.game
        // move
        if(this.speedX != 0 && this.lastChangeDirAge > fps && abs(this.speedResX) > .8 * 20) {
            this.dirX *= -1
            this.lastChangeDirAge = 0
        }
        if(this.speedResY < 0) {
            this.speedX = this.dirX * 30
        }
        // attack
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) hero.mayTakeDamage(1, this)
        })
        this.lastChangeDirAge += 1
    }

    getSprite() {
        return BlobSprite
    }
    
    scaleSprite(sprite) {
        super.scaleSprite(sprite)
        const { iteration } = this.scene
        const { fps } = this.game
        const angle = 2 * PI * (this.spriteRand + iteration) / fps, cosAngle = cos(angle), sinAngle = sin(angle)
        this.spriteWidth *= (1 + .1 * cosAngle)
        this.spriteHeight *= (1 + .1 * sinAngle)
        this.spriteDy = -this.spriteWidth * .1 * sinAngle / 2
    }

    getHitBox() {
        return {
            left: this.x - 10,
            width: 20,
            top: this.y - 30,
            height: 60,
        }
    }

    getState() {
        const state = super.getState()
        state.cda = this.lastChangeDirAge
        return state
    }

    setState(state) {
        super.setState(state)
        this.lastChangeDirAge = state.cda
    }
}
Entities.register("blob", BlobEnemy)


const GhostSprite = new Sprite("/static/assets/ghost.png")

class Ghost extends Enemy {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = 45
        this.height = 45
        this.undergoGravity = false
        this.spriteRand = floor(random() * this.game.fps)
    }

    update() {
        super.update()
        const { dt } = this.game
        const { iteration } = this.scene
        const { width } = this.game.map
        // move
        if((this.speedResX * this.dirX < 0) || (this.x < 0 && this.dirX < 0) || (this.x > width && this.dirX > 0)) this.dirX *= -1
        this.speedX = sumTo(this.speedX, 1000 * dt, this.dirX * 2000 * dt)
        this.speedY = sumTo(this.speedY, 1000 * dt, 0)
        // attack
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) hero.mayTakeDamage(1, this)
        })
    }

    getSprite() {
        return GhostSprite
    }
    
    scaleSprite(sprite) {
        super.scaleSprite(sprite)
        const { iteration } = this.scene
        const { fps } = this.game
        const angle = 2 * PI * (this.spriteRand + iteration) / fps, cosAngle = cos(angle)
        this.spriteDy = -this.spriteWidth * .1 * cosAngle
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
Entities.register("ghost", Ghost)


const SpikySprite = new Sprite(new Img("/static/assets/spiky.png"))

class Spiky extends Enemy {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = this.height = 45
        this.undergoPhysic = false
        this.spriteRand = floor(random() * this.game.fps)
    }

    update() {
        // attack
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) hero.mayTakeDamage(1, this)
        })
    }

    getSprite() {
        return SpikySprite
    }
    
    scaleSprite(sprite) {
        super.scaleSprite(sprite)
        const { iteration } = this.scene
        const { fps } = this.game
        const angle = PI * (this.spriteRand + iteration) / fps, cosAngle = cos(angle)
        this.spriteDy = -this.spriteWidth * .05 * cosAngle
    }
}
Entities.register("spiky", Spiky)


class Collectable extends Entity {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.undergoPhysic = false
        this.spriteRand = floor(random() * this.game.fps)
        this.owner = null
    }

    isCollectableBy(team) {
        return !this.owner && team.startsWith("hero")
    }

    onCollected(owner) {
        this.playCollectedSound()
        this.owner = owner
    }

    drop() {
        this.owner = null
    }

    playCollectedSound() {
        this.game.audioEngine.playSound(ItemAudPrm)
    }
    
    scaleSprite(sprite) {
        super.scaleSprite(sprite)
        if(this.owner) {
            this.spriteDy = 0
        } else {
            const { iteration } = this.scene
            const { fps } = this.game
            const angle = PI * (this.spriteRand + iteration) / fps, cosAngle = cos(angle)
            this.spriteDy = -this.spriteWidth * .05 * cosAngle
        }
    }
}


const HeartImgPrm = loadImg("/static/assets/colorable_heart.png")
const HeartSpriteSheets = {
    spritesheets: {},
    get: function(color) {
        return this.spritesheets[color] ||= new SpriteSheet((async () => {
            const img = await HeartImgPrm
            if(!color) return img
            return colorizeCanvas(cloneCanvas(img), color)
        })(), 2, 1)
    },
}

class Heart extends Collectable {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = this.height = 30
        this.undergoPhysic = false
        this.spriteRand = floor(random() * this.game.fps)
    }

    onCollected(hero) {
        super.onCollected(hero)
        this.remove()
        if(hero.health < hero.getMaxHealth()) {
            hero.health = hero.getMaxHealth()
        } else {
            hero.lives += 1
        }
    }

    getSprite() {
        return HeartSpriteSheets.get("red").get(0)
    }
    
    scaleSprite(sprite) {
        super.scaleSprite(sprite)
        const { iteration } = this.scene
        const { fps } = this.game
        const angle = PI * (this.spriteRand + iteration) / fps, cosAngle = cos(angle)
        this.spriteDy = -this.spriteWidth * .05 * cosAngle
    }
}
Entities.register("heart", Heart)


class LifeHeartNotif extends Entity {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.num = kwargs.num
        this.width = this.height = 30
        this.color = "red"
    }
    setFull(isFull) {
        this.isFull = isFull
    }
    getSprite() {
        return HeartSpriteSheets.get(this.color).get(this.isFull ? 0 : 1)
    }
}

class HealthHeartNotif extends LifeHeartNotif {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = this.height = 20
        this.color = "pink"
    }
}

class Extra extends Collectable {
    getPriority() {
        if(this.owner) return this.owner.getPriority() - 1
        else super.getPriority()
    }
    onCollected(owner) {
        super.onCollected(owner)
        owner.addExtra(this)
    }
    drop() {
        this.owner.dropExtra(this)
        super.drop()
    }
}


const SWORD_ATTACK_PERIOD = .5

const SwordSlashSpriteSheet = new SpriteSheet("/static/assets/slash.png", 3, 2)
const SwordSprite = new Sprite(new Img("/static/assets/sword.png"))

const SwordHitAudPrm = loadAud("/static/assets/sword_hit.opus")

class Sword extends Extra {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = this.height = 40
        this.sprite = SwordSprite
        this.isMainExtra = true
        this.lastAttackAge = Infinity
    }
    update() {
        super.update()
        const { owner } = this
        if(owner) {
            this.dirX = owner.dirX
            this.y = owner.y
            if(this.isAttacking()) {
                this.x = owner.x + 40 * owner.dirX
                this.width = this.height = 60
            } else {
                this.x = owner.x + 25 * this.owner.dirX
                this.width = this.height = 40
            }
            if(this.lastAttackAge == 0) this.checkHit()
            this.lastAttackAge += 1
        }
    }
    isAttacking() {
        return this.lastAttackAge < (SWORD_ATTACK_PERIOD * this.game.fps)
    }
    attack() {
        if(this.isAttacking()) return
        this.lastAttackAge = 0
    }
    checkHit() {
        const { owner } = this
        let hasHit = false
        const _checkHit = ent => {
            if(owner === ent) return
            if(checkHit(this, ent)) {
                this.hit(ent)
                hasHit = true
            }
        }
        this.scene.getTeam("hero").forEach(_checkHit)
        this.scene.getTeam("enemy").forEach(_checkHit)
        this.game.audioEngine.playSound(hasHit ? SwordHitAudPrm : SlashAudPrm)
    }
    hit(ent) {
        const damage = ent.team == this.team ? 0 : 1
        ent.mayTakeDamage(damage, this.owner)
    }
    onCollected(owner) {
        super.onCollected(owner)
        this.lastAttackAge = Infinity
        this.dropOwnerSimilarExtras()
        owner.attack = () => this.attack()
    }
    drop() {
        delete this.owner.attack
        super.drop()
        this.remove() // TMP: until non-infinite-collect managed
    }
    dropOwnerSimilarExtras() {
        if(!this.owner.extras) return
        this.owner.extras.forEach(extra => {
            if(this!=extra && extra.isMainExtra) extra.srop()
        })
    }
    getSprite() {
        const ratioSinceLastAttack = this.lastAttackAge / (SWORD_ATTACK_PERIOD * this.game.fps)
        if(this.owner && ratioSinceLastAttack <= 1) {
            return SwordSlashSpriteSheet.get(floor(6*ratioSinceLastAttack))
        } else {
            return SwordSprite
        }
    }
    getState() {
        const state = super.getState()
        if(this.lastAttackAge == Infinity) delete state.laa
        else state.laa = this.lastAttackAge
        return state
    }
    setState(state) {
        super.setState(state)
        if(state.laa === undefined) this.lastAttackAge = Infinity
        else this.lastAttackAge = state.laa
    }
}
Entities.register("sword", Sword)


const BombSpriteSheet = new SpriteSheet("/static/assets/bomb.png", 2, 1)

class Bomb extends Extra {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = this.height = 40
        this.itToLive = null
    }
    isCollectableBy(team) {
        if(this.itToLive !== null) return false
        return super.isCollectableBy(team)
    }
    onCollected(hero) {
        super.onCollected(hero)
        this.dropOwnerSimilarExtras()
        hero.attack = () => this.attack()
    }
    drop() {
        delete this.owner.attack
        super.drop()
    }
    dropOwnerSimilarExtras() {
        if(!this.owner.extras) return
        this.owner.extras.forEach(extra => {
            if(this!=extra && extra.isMainExtra) extra.drop()
        })
    }
    update() {
        const { dt } = this.game
        const { owner, x, y } = this
        if(!owner) {
            if(this.itToLive !== null) {
                this.undergoPhysic = true
                if(this.speedResY < 0) this.speedX = sumTo(this.speedX, 500 * dt, 0)
                if(this.itToLive <= 0) {
                    this.scene.newEntity(Explosion, { x, y })
                    this.remove()
                }
                this.itToLive -= 1
            }
        } else {
            this.x = this.owner.x
            this.y = this.owner.y
        }
    }
    attack() {
        this.speedX = this.owner.dirX * 200
        this.speedY = -500
        this.itToLive = 3 * this.game.fps
        this.drop()
    }
    getSprite() {
        const { itToLive } = this
        if(itToLive === null) return BombSpriteSheet.get(0)
        return BombSpriteSheet.get(floor(pow(3 - (itToLive / this.game.fps), 2)*2) % 2)
    }
    scaleSprite(sprite) {
        if(this.itToLive !== null) this.spriteDy = 0
        else super.scaleSprite(sprite)
    }
    getState() {
        const state = super.getState()
        if(this.itToLive === null) delete state.ttl
        else state.ttl = this.itToLive
        return state
    }
    setState(state) {
        super.setState(state)
        if(state.ttl === undefined) this.itToLive = null
        else this.itToLive = state.ttl
    }
}
Entities.register("bomb", Bomb)


const ExplosionSpriteSheet = new SpriteSheet("/static/assets/explosion.png", 8, 6)

class Explosion extends Entity {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = this.height = 300
        this.iteration = 0
        this.undergoPhysic = false
    }
    update() {
        super.update()
        if(this.iteration == 0) this.checkEntitiesToDamage()
        const age = this.iteration/this.game.fps
        if(age >= 1) return this.remove()
        this.iteration += 1
    }
    checkEntitiesToDamage() {
        const { x, y } = this
        const radius2 = pow(150, 2)
        const _checkOne = ent => {
            const dx = x - ent.x, dy = y - ent.y
            if(dx*dx+dy*dy < radius2) ent.mayTakeDamage(1, this)
        }
        this.scene.getTeam("hero").forEach(_checkOne)
        this.scene.getTeam("enemy").forEach(_checkOne)
    }
    getSprite() {
        return ExplosionSpriteSheet.get(floor(
            this.iteration / this.game.fps * 8 * 6
        ))
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


const StarSprite = new Sprite("/static/assets/star.png")

class Star extends Collectable {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = this.height = 30
        this.undergoPhysic = false
        this.scene.nbStars ||= 0
        this.scene.nbStars += 1
    }
    onCollected(hero) {
        super.onCollected(hero)
        this.remove()
        this.scene.nbStars -= 1
        if(this.scene.step == "GAME" && this.scene.nbStars == 0) this.scene.step = "VICTORY"
    }
    getSprite() {
        return StarSprite
    }
}
Entities.register("star", Star)



const CheckpointSprite = new Sprite("/static/assets/checkpoint.png")

class Checkpoint extends Collectable {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = this.height = 40
        this.undergoPhysic = false
    }
    onCollected(hero) {
        super.onCollected(hero)
        this.remove()
        this.scene.herosSpawnX = this.x
        this.scene.herosSpawnY = this.y
    }
    getSprite() {
        return CheckpointSprite
    }
}
Entities.register("checkpt", Checkpoint)


const SmokeExplosionSpriteSheet = new SpriteSheet("/static/assets/smoke_explosion.png", 4, 1)

class SmokeExplosion extends Entity {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = this.height = 100
        this.undergoPhysic = false
        this.iteration = 0
    }
    update() {
        this.iteration += 1
        const time = this.iteration * this.game.dt
        if(time > .5) { this.remove(); return }
    }
    getSprite() {
        const time = this.iteration * this.game.dt
        return SmokeExplosionSpriteSheet.get(floor(time/.5*4))
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
