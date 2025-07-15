const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, checkHit, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, importJs } = utils
import { AudioEngine } from './audio.mjs'
import PhysicsEngine from './physics.mjs'

export const FPS = 30
const CANVAS_MAX_WIDTH = 800
const CANVAS_MAX_HEIGHT = 600
const MAP_DEFAULT_WIDTH = 800
const MAP_DEFAULT_HEIGHT = 600

export const MSG_KEY_LENGTH = 3
export const MSG_KEYS = {
    PING: "PNG",
    IDENTIFY_CLIENT: 'IDC',
    JOIN_GAME: 'JOI',
    STATE: 'STT',
    GAME_INSTRUCTION: 'GMI',
}

const STATE_TYPE_FULL = "F"
const STATE_TYPE_INPUT = "I"

const IS_SERVER_ENV = (typeof window === 'undefined')
export const HAS_TOUCH = (!IS_SERVER_ENV) && (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0))

const SEND_PING_PERIOD = 3
const SEND_STATE_PERIOD = 1
const RESEND_INPUT_STATE_PERIOD = .5


// CATALOG

export async function importAndPreload(path) {
    const mod = await import(path)
    if(mod.CATALOG) await mod.CATALOG.preloadAssets()
    return mod
}

class None {}
const Image = (!IS_SERVER_ENV && window.Image) || None
export class Img extends Image {
    constructor(src) {
        super()
        this._src = src
        this.unloaded = true
    }
    async load() {
        if(IS_SERVER_ENV) return
        const loadPrm = this._loadPrm ||= new Promise((ok, ko) => {
            this.src = this._src
            this.onload = () => { this.unloaded = false; ok() }
            this.onerror = () => { this.unloaded = false; ko() }
        })
        return await loadPrm
    }
}

export class Aud {
    constructor(src) {
        this.src = src
        this.unloaded = true
    }
    async load() {
        if(IS_SERVER_ENV) return
        const loadPrm = this._loadPrm ||= new Promise(async (ok, ko) => {
            const res = await fetch(this.src, { cache: 'force-cache' })
            this.raw = await res.arrayBuffer()
            this.unloaded = false
            ok()
        })
        return await loadPrm
    }
}

export class Catalog {
    constructor() {
        this.mods = {}
        this.actors = {}
        this.scenes = {}
    }
    async addModuleCatalogs(paths) {
        for(let path of paths) this.mods[path] = null
        const modPrms = paths.map(path => import(path))
        const mods = await Promise.all(modPrms)
        const addItems = (path, modItems, items) => {
            for(let key in modItems) {
                const item = { ...modItems[key] }
                item.path = path
                items[key] = item
            }
        }
        for(let i in paths) {
            const path = paths[i], mod = mods[i]
            addItems(path, mod.CATALOG.actors, this.actors)
            addItems(path, mod.CATALOG.scenes, this.scenes)
        }
    }
    async preload(paths) {
        const mods = await Promise.all(paths.map(p => import(p)))
        for(let i=0; i<paths.length; ++i) this.mods[paths[i]] = mods[i]
        await Promise.all(mods.map(m => m.CATALOG).filter(l => l).map(l => l.preloadAssets()))
        return mods
    }
    async preloadAll() {
        return await this.preload(Object.keys(this.mods))
    }
    getActorClass(key) {
        const actCat = this.actors[key]
        const mod = this.mods[actCat.path]
        return mod[actCat.name]
    }
}

export class ModuleCatalog {
    constructor() {
        this.actors = {}
        this.scenes = {}
        this.assets = []
    }
    registerActor(key, kwargs) {
        return target => {
            target.KEY = key
            const actCat = this.actors[key] = {}
            actCat.name = target.name
            actCat.label = kwargs?.label ?? key
            actCat.icon = kwargs?.icon ?? null
            actCat.showInBuilder = kwargs?.showInBuilder ?? true
            return target
        }
    }
    registerScene(key, kwargs) {
        return target => {
            target.KEY = key
            const scnCat = this.scenes[key] = {}
            scnCat.name = target.name
            scnCat.showInBuilder = kwargs?.showInBuilder ?? true
            return target
        }
    }
    registerImage(path) {
        const img =  new Img(path)
        this.assets.push(img)
        return img
    }
    registerAudio(path) {
        const aud = new Aud(path)
        this.assets.push(aud)
        return aud
    }
    async preloadAssets() {
        if(IS_SERVER_ENV) return
        await Promise.all(this.assets.map(a => a.load()))
    }
}

export const CATALOG = new ModuleCatalog()


// MAP

export class GameMap {
    constructor() {
        this.scenes = { "0": {
            key: "catch_all_stars",
            width: MAP_DEFAULT_WIDTH,
            height: MAP_DEFAULT_HEIGHT,
        }}
    }

    async exportAsBinary() {
        const outScns = {}
        for(let scnId in this.scenes) {
            const scnState = this.scenes[scnId]
            outScns[scnId] = {
                key: scnState.key,
                w: scnState.width,
                h: scnState.height,
                ws: scnState.walls,
                hs: scnState.heros,
                acts: scnState.actors,
                evts: scnState.events,
            }
        }
        const outObj = {
            ss: outScns,
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
        const scns = this.scenes = {}
        for(let scnId in inObj.ss) {
            const inScn = inObj.ss[scnId]
            const scn = scns[scnId] = {}
            scn.key = inScn.key
            scn.width = inScn.w
            scn.height = inScn.h
            scn.walls = inScn.ws
            scn.heros = inScn.hs
            scn.actors = inScn.acts
            scn.events = inScn.evts
        }
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
    if (IS_SERVER_ENV) { // || 'DecompressionStream' in window) {
        return decompressUsingDecompressionStream(compressedBytes)
    } else {
        // Safari does not support DecompressionStream yet
        return decompressUsingPako(compressedBytes)
    }
}

async function decompressUsingDecompressionStream(compressedBytes) {
  const stream = new Blob([compressedBytes]).stream()
  const decompressedStream = stream.pipeThrough(new DecompressionStream("gzip"))
  const chunks = []
  for await (const chunk of decompressedStream)
    chunks.push(chunk)
  const stringBytes = await concatUint8Arrays(chunks)
  return new TextDecoder().decode(stringBytes)
}

async function concatUint8Arrays(uint8arrays) {
  const blob = new Blob(uint8arrays)
  const buffer = await blob.arrayBuffer()
  return new Uint8Array(buffer)
}

async function decompressUsingPako(compressedBytes) {
    const { ungzip } = await import('../deps/pako.mjs')
    const decompressedBytes = ungzip(new Uint8Array(compressedBytes))
    return new TextDecoder().decode(decompressedBytes)
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

export function hasKeys(obj) {
    for(let _ in obj) return true
    return false
}

export function nbKeys(obj) {
    let res = 0
    for(let _ in obj) res += 1
    return res
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
        if(!baseImg || baseImg.unloaded || baseImg.width==0 || baseImg.height==0) return null // TODO: deprecate it
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
    constructor(img, nbCols, nbRows) {
        this.img = img
        this.nbCols = nbCols
        this.nbRows = nbRows
        this.sprites = []
        if(IS_SERVER_ENV) return
        this.unloaded = true
        //if(typeof src === "string") src = loadImg(src)  
        //if(src instanceof Promise) src.then(img => this.initSprites(img, nbCols, nbRows))
        this.initSprites()
    }
    initSprites() {
        if(!this.unloaded) return
        const { img, nbRows, nbCols } = this
        if(img.unloaded) return
        for(let i=0; i<nbCols*nbRows; ++i) this.sprites.push(new Sprite())
        const frameWidth = floor(img.width / nbCols)
        const frameHeight = floor(img.height / nbRows)
        for (let j = 0; j < nbRows; ++j) for (let i = 0; i < nbCols; ++i) {
            const can = document.createElement("canvas")
            can.width = frameWidth
            can.height = frameHeight
            can.getContext("2d").drawImage(img, ~~(-i * frameWidth), ~~(-j * frameHeight))
            this.sprites[i + j*nbCols].baseImg = can
        }
        this.unloaded = false
    }
    get(num, loop = false) {
        this.initSprites()
        const { sprites } = this
        if(loop) num = num % sprites.length
        else if(num >= sprites.length) return null
        return sprites[num]
    }
}


// BUILDER //////////////////////////

export const INIT_STATE = 1 << 0
export const UPD_STATE = 1 << 1


export function defineStateProperty(type, cls, key, kwargs) {
    return target => {
        if((type & INIT_STATE) === INIT_STATE) {
            if(!target.hasOwnProperty('INIT_STATE_PROPS')) target.INIT_STATE_PROPS = Array.from(target.INIT_STATE_PROPS ?? [])
            target.INIT_STATE_PROPS.push(new cls(key, kwargs))
        }
        if((type & UPD_STATE) === UPD_STATE) {
            if(!target.hasOwnProperty('UPD_STATE_PROPS')) target.UPD_STATE_PROPS = Array.from(target.UPD_STATE_PROPS ?? [])
            target.UPD_STATE_PROPS.push(new cls(key, kwargs))
        }
        return target
    }
}


export class StateProperty {
    static DEFAULT_VALUE = null

    constructor(key, kwargs) {
        this.key = key
        this.shortKey = kwargs?.shortKey ?? key
        this.defaultValue = kwargs?.default ?? this.constructor.DEFAULT_VALUE
    }
    toState(act, state) {
        const val = act[this.key]
        if(val !== this.defaultValue) state[this.shortKey] = val
    }
    fromState(act, state) {
        const val = state[this.shortKey]
        act[this.key] = (val === undefined) ? this.defaultValue : val
    }
    toInput(act) {
        const inputEl = newDomEl("input", {
            value: act[this.key]
        })
        return inputEl
    }
    fromInput(act, inputEl) {
        act[this.key] = inputEl.value
    }
}

export class StateInt extends StateProperty {
    static DEFAULT_VALUE = 0

    constructor(key, kwargs) {
        super(key, kwargs)
        this.min = kwargs?.min ?? null
        this.max = kwargs?.max ?? null
    }
    toInput(act) {
        const inputEl = super.toInput(act)
        inputEl.type = "number"
        if(this.min !== null) inputEl.min = this.min
        if(this.max !== null) inputEl.max = this.max
        return inputEl
    }
    fromInput(act, inputEl) {
        act[this.key] = parseInt(inputEl.value)
    }
}

export class StateEnum extends StateProperty {
    constructor(key, kwargs) {
        super(key, kwargs)
        this.options = kwargs.options
    }
    toInput(act) {
        const { options } = this
        const inputEl = newDomEl("select")
        for(let optVal in options) {
            inputEl.appendChild(newDomEl("option", {
                value: optVal,
                text: options[optVal],
            }))
        }
        inputEl.value = act[this.key]
        return inputEl
    }
}

export class StateIntEnum extends StateEnum {
    static DEFAULT_VALUE = 0

    fromInput(act, inputEl) {
        act[this.key] = parseInt(inputEl.value)
    }
}

export class StateActorKey extends StateProperty {
    toInput(act) {
        const inputEl = newDomEl("dmg-actor-selector")
        inputEl.setCatalog(act.game.catalog)
        const val = act[this.key]
        if(val) inputEl.setSelectedActor(val)
        return inputEl
    }
}


export class Component {
    static INIT_STATE_PROPS = []
    static UPD_STATE_PROPS = []

    init(act, kwargs) {}
    update(act) {}
    getInitState(act, state) {
        for(let prop of this.constructor.INIT_STATE_PROPS) prop.toState(act, state)
    }
    setInitState(act, state) {
        for(let prop of this.constructor.INIT_STATE_PROPS) prop.fromState(act, state)
    }
    getState(act, state) {
        for(let prop of this.constructor.UPD_STATE_PROPS) prop.toState(act, state)
    }
    setState(act, state) {
        for(let prop of this.constructor.UPD_STATE_PROPS) prop.fromState(act, state)
    }
}


export function addComponent(comp, kwargs) {
    return target => {
        if(!target.hasOwnProperty('COMPONENTS')) target.COMPONENTS = new Map(target.COMPONENTS)
        target.COMPONENTS.set(comp.KEY, new comp(kwargs))
        return target
    }
}


@defineStateProperty(INIT_STATE | UPD_STATE, StateInt, "speedX", { shortKey:"sx" })
@defineStateProperty(INIT_STATE | UPD_STATE, StateInt, "speedY", { shortKey:"sy" })
export class PhysicsComponent extends Component {
    static KEY = "physics"

    constructor(kwargs) {
        super()
        this.affectedByGravity = kwargs?.affectedByGravity ?? true
        this.blockedByWalls = kwargs?.blockedByWalls ?? true
    }
    init(act, kwargs) {
        act.physicsComponent = this
        act.speedX = kwargs?.speedX ?? 0
        act.speedY = kwargs?.speedY ?? 0
        act.speedResX = 0
        act.speedResY = 0
        if(kwargs?.affectedByGravity !== undefined) this.affectedByGravity = kwargs.affectedByGravity
        if(kwargs?.blockedByWalls !== undefined) this.blockedByWalls = kwargs.blockedByWalls
    }
    update(act) {
        // done by physics engine
    }
}


@defineStateProperty(INIT_STATE | UPD_STATE, StateInt, "x")
@defineStateProperty(INIT_STATE | UPD_STATE, StateInt, "y")
@defineStateProperty(INIT_STATE | UPD_STATE, StateIntEnum, "dirX", { shortKey: "dx", default: 1, options: { '1': "Right", '-1': "Left"}})
@defineStateProperty(INIT_STATE | UPD_STATE, StateIntEnum, "dirY", { shortKey: "dy", default: 1, options: { '1': "Up", '-1': "Down"}})
export class GameObject {

    static COMPONENTS = new Map()

    static {
        assign(this.prototype, {
            width: 10,
            height: 10,
            dirX: 1,
            dirY: 1,
            spriteVisibility: 1,
            spriteDx: 0,
            spriteDy: 0,
        })
    }

    constructor(scn, kwargs) {
        this.scene = scn
        this.game = scn.game
        this.id = kwargs?.id ?? null
        if(kwargs) {
            if(kwargs.x !== undefined) this.x = kwargs.x
            if(kwargs.y !== undefined) this.y = kwargs.y
            if(kwargs.size !== undefined) this.width = this.height = kwargs.size
            if(kwargs.width !== undefined) this.width = kwargs.width
            if(kwargs.height !== undefined) this.height = kwargs.height
            if(kwargs.dirX !== undefined) this.dirX = kwargs.dirX
            if(kwargs.dirY !== undefined) this.dirY = kwargs.dirY
        }
        this.constructor.COMPONENTS.forEach(comp => comp.init(this, kwargs))
    }

    getPriority() {
        return 0
    }

    update() {
        this.constructor.COMPONENTS.forEach(comp => comp.update(this))
    }

    drawTo(ctx) {
        const img = this.getImg()
        if(img && img.width>0 && img.height>0) ctx.drawImage(img, ~~(this.x + this.spriteDx - img.width/2), ~~(this.y + this.spriteDy - img.height/2))
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

    getInitState() {
        const state = {}
        state.key = this.constructor.KEY
        for(let prop of this.constructor.INIT_STATE_PROPS) prop.toState(this, state)
        this.constructor.COMPONENTS.forEach(comp => comp.getInitState(this, state))
        return state
    }

    setInitState(state) {
        for(let prop of this.constructor.INIT_STATE_PROPS) prop.fromState(this, state)
        this.constructor.COMPONENTS.forEach(comp => comp.setInitState(this, state))
    }

    // TODO: rename this getUpdState
    getState() {
        const state = {}
        state.id = this.id
        state.key = this.constructor.KEY
        for(let prop of this.constructor.UPD_STATE_PROPS) prop.toState(this, state)
        this.constructor.COMPONENTS.forEach(comp => comp.getState(this, state))
        return state
    }

    setState(state) {
        for(let prop of this.constructor.UPD_STATE_PROPS) prop.fromState(this, state)
        this.constructor.COMPONENTS.forEach(comp => comp.setState(this, state))
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

function on(trigKey, nextKey, next) {
    const events = this._events ||= {}
    const trigNexts = events[trigKey] ||= {}
    trigNexts[nextKey] = next
}

function off(trigKey, nextKey) {
    const events = this._events ||= {}
    const trigNexts = events[trigKey] ||= {}
    delete trigNexts[nextKey]
}

function trigger(trigKey, kwargs) {
    const events = this._events
    if(events === undefined) return
    const trigNexts = events[trigKey]
    if(trigNexts === undefined) return
    for(let nextKey in trigNexts) {
        trigNexts[nextKey].call(this, kwargs)
    }
}

GameObject.prototype.on = on
GameObject.prototype.off = off
GameObject.prototype.trigger = trigger


export class ActorRefs extends Set {
    constructor(scn) {
        super()
        this.scene = scn
        this.game = scn.game
    }
    update() {
        this.clearRemoved()
    }
    clearRemoved() {
        const { scene } = this
        for(let id of this) {
            const obj = scene.actors.get(id)
            if(!obj || obj.removed) this.delete(id)
        }
    }
    forEach(next) {
        const { scene } = this
        for(let id of this) {
            const obj = scene.actors.get(id)
            if(!obj || obj.removed) this.delete(id)
            else next(obj)
        }
    }
    getState() {
        if(this.size == 0) return null
        const state = []
        this.forEach(obj => state.push(obj.id))
        return state
    }
    setState(state) {
        if(state === null) return this.clear()
        for(let id of state) this.add(id)
        if(state.length < this.size) {
            for(let id of this)
                if(state.indexOf(id)<0)
                    this.delete(id)
        }
    }
}


ActorRefs.StateProperty = class extends StateProperty {
    toState(act, state) {
        const propState = act[this.key].getState()
        if(propState !== null) state[this.shortKey] = propState
    }
    fromState(act, state) {
        const propState = state[this.shortKey] ?? null
        act[this.key].setState(propState)
    }
    toInput(act) {
        // TODO
    }
    fromInput(act, inputEl) {
        // TODO
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


export class SpawnActorEvent extends Event {
    constructor(scn, initState) {
        super(scn, initState)
        this.scene = scn
        if(initState) {
            if(initState.state !== undefined) this.actState = initState.state
            if(initState.nbActs !== undefined) this.trigger.nbActs = initState.nbActs
            if(initState.prevActFur !== undefined) this.trigger.prevActFurther = initState.prevActFur
        }
        this.spawnedActors = new ActorRefs(scn)
        this.prevSpawnedActor = null
    }
    checkTrigger(trigger) {
        if(trigger.nbActs !== undefined) {
            return this.spawnedActors.size < trigger.nbActs
        } else if(trigger.prevActFurther !== undefined) {
            if(!this.prevSpawnedActor) return true
            const { x: prevActX, y: prevActY } = this.prevSpawnedActor
            const { x: stateX, y: stateY } = this.actState
            return hypot(prevActX-stateX, prevActY-stateY) > trigger.prevActFurther
        } else {
            return super.checkTrigger(trigger)
        }
    }
    update() {
        this.clearRemoved()
        super.update()
    }
    clearRemoved() {
        this.spawnedActors.clearRemoved()
        if(this.prevSpawnedActor && this.prevSpawnedActor.removed) this.prevSpawnedActor = null
    }
    executeAction() {
        super.executeAction()
        const act = this.scene.newActor(this.actState.key)
        act.setInitState(this.actState)
        this.spawnedActors.add(act.id)
        this.prevSpawnedActor = act
    }
    getInitState() {
        const state = super.getInitState()
        if(this.actState !== undefined) state.state = this.actState
        else delete state.state
        if(this.trigger.nbActs !== undefined) state.nbActs = this.trigger.nbActs
        else delete state.nbActs
        if(this.trigger.prevActFurther !== undefined) state.prevActFur = this.trigger.prevActFurther
        else delete state.prevActFur
        return state
    }
    getState() {
        const state = super.getState()
        state.acts = this.spawnedActors.getState()
        if(this.prevSpawnedActor) state.pse = this.prevSpawnedActor.id
        else delete state.pse
        return state
    }
    setState(state) {
        super.setState(state)
        this.spawnedActors.setState(state.acts)
        if(state.pse!==undefined) this.prevSpawnedActor = this.scene.actors.get(state.pse) || null
        else this.prevSpawnedActor = null
    }
}
Events.register("act", SpawnActorEvent)


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

export class Text extends GameObject {
    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.textArgs = kwargs
        this.updateText(kwargs.text)
    }

    updateText(text) {
        if(this.game.isServerEnv) return
        if(this.text == text) return
        this.text = text
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

export class GameObjectGroup {

    constructor(scn) {
        this.x = 0
        this.y = 0
        this.scene = scn
        this.game = scn.game
        this.objArr = []
        this.objMap = new Map()
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
        kwargs ||= {}
        kwargs.id ??= this.nextAutoId()
        if(typeof cls === 'string') cls = this.game.catalog.getActorClass(cls)
        const obj = new cls(this.scene, kwargs)
        this.objMap.set(kwargs.id, obj)
        this.objArr.push(obj)
        this.trigger("new", obj)
        return obj
    }

    get(id) {
        return this.objMap.get(id)
    }

    forEach(next) {
        this.objArr.forEach(obj => {
            if(!obj.removed) next(obj)
        })
    }

    clearRemoved() {
        const { objArr, objMap } = this
        let idx = 0, nbEnts = objArr.length
        while(idx < nbEnts) {
            const obj = objArr[idx]
            if(obj.removed) {
                objArr.splice(idx, 1)
                objMap.delete(obj.id)
                nbEnts -= 1
            } else {
                idx += 1
            }
        }
    }

    clear() {
        this.forEach(item => item.remove())
        this.objArr.length = 0
        this.objMap.clear()
    }

    update() {
        this.clearRemoved()
        this.sortItems()
        this.forEach(obj => obj.update())
    }

    sortItems() {
        this.objArr.sort((a, b) => (b.getPriority() - a.getPriority()))
    }

    drawTo(gameCtx) {
        this.clearRemoved()
        const x = ~~this.x, y = ~~this.y
        gameCtx.translate(x, y)
        this.forEach(obj => obj.drawTo(gameCtx))
        gameCtx.translate(-x, -y)
    }

    getState() {
        const state = this._state ||= []
        state.length = 0
        this.forEach(act => {
            if(act.constructor.KEY) state.push(act.getState())
        })
        return state
    }

    setState(state) {
        const { objArr, objMap } = this
        objArr.length = 0
        if(state) {
            for(let actState of state) {
                let { id } = actState
                let act = objMap.get(id)
                if(!act) {
                    const cls = this.game.catalog.getActorClass(actState.key)
                    act = new cls(this.scene, { id })
                    objMap.set(act.id, act)
                }
                act.setState(actState)
                objArr.push(act)
                this.trigger("new", act)
            }
            if(objMap.size != objArr.length) {
                objMap.clear()
                for(let act of objArr) objMap.set(act.id, act)
            }
        } else this.clear()
    }
}

GameObjectGroup.prototype.on = on
GameObjectGroup.prototype.off = off
GameObjectGroup.prototype.trigger = trigger


export const MODE_LOCAL = 0
export const MODE_SERVER = 1
export const MODE_CLIENT = 2

export class GameCommon {

    constructor(parentEl, catalog, map, kwargs) {
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
        this.catalog = catalog
        this.map = map
        this.isDebugMode = kwargs && kwargs.debug == true

        this.scenesSizeAndPos = {
            game: { x:0, y:0, width:0, height:0 },
            joypad: { x:0, y:0, width:0, height:0 },
        }
        this.scenes = {}
        this.scenes.game = new DefaultScene(this)
        this.syncSize()
    }

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
        const { joypad: joypadScn, joypadPause: joypadPauseScn } = this.scenes
        if(joypadPauseScn) joypadPauseScn.onTouch()
        else if(joypadScn) joypadScn.onTouch()
    }

    run() {
        if(this.gameLoop) return
        this.startTime = this.nextFrameTime = now()
        const tryUpdateGameLoop = () => {
            this.gameLoop = setTimeout(() => {
                if(now() >= this.nextFrameTime) {
                    this.updateGameLoop()
                    this.nextFrameTime = max(now(), this.nextFrameTime + 1/this.fps)
                }
                tryUpdateGameLoop()
            }, 5)
        }
        tryUpdateGameLoop()
    }

    stop() {
        if(this.gameLoop) clearTimeout(this.gameLoop)
        this.gameLoop = null
    }

    updateGameLoop() {
        const { mode } = this
        this.update()
        if(mode != MODE_SERVER) this.mayDraw()
    }

    update() {
        this.iteration += 1
        this.time = this.iteration * this.dt
        const { game: gameScn, joypad: joypadScn } = this.scenes
        if(!gameScn.paused) {
            gameScn.update()
            delete this.scenes.pause
        } else {
            this.scenes.pause ||= gameScn.newPauseScene()
        }
        if(joypadScn) {
            if(!gameScn.paused) {
                joypadScn.update()
                delete this.scenes.joypadPause
            } else {
                this.scenes.joypadPause ||= joypadScn.newPauseScene()
            }
        }
        const { pause: pauseScn, joypadPause: joypadPauseScn } = this.scenes
        if(pauseScn) pauseScn.update()
        if(joypadPauseScn) joypadPauseScn.update()
    }

    mayDraw() {
        this._drawing ||= false
        if(this._drawing) return
        this._drawing = true
        window.requestAnimationFrame(() => {
            this.draw()
            this._drawing = false
        })
    }

    draw() {
        const { game:gameScn, pause:pauseScn, joypad:joypadScn, joypadPause: joypadPauseScn } = this.scenes
        const ctx = this.canvas.getContext("2d")
        this.drawScene(ctx, gameScn)
        this.drawScene(ctx, pauseScn)
        this.drawScene(ctx, joypadScn)
        this.drawScene(ctx, joypadPauseScn)
        return ctx
    }

    drawScene(ctx, scn) {
        if(!scn || !scn.visible) return
        scn.draw()
        ctx.drawImage(scn.canvas, scn.x, scn.y)
    }

    syncSize() {
        const scnMap = this.map.scenes["0"]
        const width = min(scnMap.width, CANVAS_MAX_WIDTH)
        const height169 = floor(width * 9 / 16)
        const { game: gameScn } = this.scenes
        const { joypadVisible } = this
        const { game: gameSP, joypad: joypadSP } = this.scenesSizeAndPos
        gameSP.x = 0
        gameSP.y = 0
        gameSP.width = width
        gameSP.height = min(scnMap.height, CANVAS_MAX_HEIGHT)
        joypadSP.x = 0
        joypadSP.y = gameScn.visible ? gameSP.height : 0
        joypadSP.width = width
        joypadSP.height = height169
        for(let scnId in this.scenes) {
            const scn = this.scenes[scnId]
            if(scn) scn.syncSizeAndPos()
        }
        const height = max(height169, (gameScn.visible ? gameSP.height : 0) + (joypadVisible ? joypadSP.height : 0))
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

    requestFullscreen(orientation) {
        this.parentEl.requestFullscreen()
        if (orientation!==undefined && screen.orientation && screen.orientation.lock) {
            screen.orientation.lock(orientation).catch(console.error)
        }
        this.focus()
    }

    focus() {
        this.canvas.focus()
    }

    hasFocus() {
        return document.activeElement === this.canvas
    }

    pause(val) {
        if(this.mode == MODE_CLIENT) return this.sendGameInstruction(val ? "pause" : "unpause")
        this.scenes.game.pause(val)
        if(this.scenes.joypad) this.scenes.joypad.pause(val)
        if(this.mode == MODE_SERVER) this.getAndSendFullState()
    }

    togglePause() {
        this.pause(!this.scenes.game.paused)
    }

    // TODO: remove me
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
        this.viewSpeed = 100
        this.width = 0
        this.height = 0
        this.visible = true
        this.backgroundColor = "white"
        this.backgroundAlpha = 1
        this.iteration = 0
        this.time = 0
        this.paused = false
        if(!this.game.isServerEnv) {
            this.backgroundCanvas = null
            this.canvas = document.createElement("canvas")
        }
        this.walls = new GameObjectGroup(this)
        this.actors = new GameObjectGroup(this)
        this.visuals = new GameObjectGroup(this)
        this.notifs = new GameObjectGroup(this)
        this.heros = {}
        this.syncSizeAndPos()
        this.map = null
    }

    isPausable() {
        return false
    }

    pause(val) {
        if(!this.isPausable()) return
        this.paused = val
    }

    loadMap(scnMapId) {
        this.mapId = scnMapId
        this.map = this.game.map.scenes[scnMapId]
        this.initWalls()
        this.initActors()
    }

    syncSizeAndPos() {
        assign(this, this.game.scenesSizeAndPos.game)
    }

    setView(viewX, viewY) {
        const { width: mapWidth, height: mapHeight } = this.map
        const { width, height } = this
        this.viewX = sumTo(this.viewX, this.viewSpeed, viewX)
        this.viewY = sumTo(this.viewY, this.viewSpeed, viewY)
        this.viewX = max(0, min(mapWidth-width, this.viewX))
        this.viewY = max(0, min(mapHeight-height, this.viewY))
    }

    initWalls() {
        const mapWalls = this.map?.walls
        if(!mapWalls) return
        mapWalls.forEach(w => {
            const { x1, y1, x2, y2, key } = w
            this.newWall({ x1, y1, x2, y2, key })
        })
    }

    newWall(kwargs) {
        return this.walls.new(Wall, kwargs)
    }

    initActors() {
        const mapActs = this.map?.actors
        if(!mapActs) return
        mapActs.forEach(actState => {
            const act = this.newActor(actState.key)
            act.setInitState(actState)
        })
    }

    newActor(cls, kwargs) {
        return this.actors.new(cls, kwargs)
    }

    newVisual(cls, kwargs) {
        return this.visuals.new(cls, kwargs)
    }

    newNotif(cls, kwargs) {
        return this.notifs.new(cls, kwargs)
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
        this.updateWorld()
        this.notifs.update()
    }

    updateWorld() {
        this.actors.update()
        this.visuals.update()
    }

    draw() {
        const can = this.canvas
        can.width = this.width
        can.height = this.height
        const ctx = can.getContext("2d")
        ctx.reset()
        const backgroundCanvas = this.initBackground()
        if(backgroundCanvas) ctx.drawImage(backgroundCanvas, 0, 0)
        this.drawTo(ctx)
    }

    drawTo(ctx) {
        ctx.translate(~~-this.viewX, ~~-this.viewY)
        this.walls.drawTo(ctx)
        this.actors.drawTo(ctx)
        this.visuals.drawTo(ctx)
        ctx.translate(~~this.viewX, ~~this.viewY)
        this.notifs.drawTo(ctx)
    }

    initBackground() {
        if(this.game.isServerEnv) return
        let { width, height, backgroundCanvas: can } = this
        if(!can || can.width != width || can.height != height) {
            can = this.backgroundCanvas = this.buildBackground()
        }
        return can
    }

    buildBackground() {
        const { width, height } = this
        const can = document.createElement("canvas")
        assign(can, { width, height })
        const ctx = can.getContext("2d")
        if(this.backgroundColor) {
            ctx.fillStyle = this.backgroundColor
            ctx.globalAlpha = this.backgroundAlpha
            ctx.fillRect(0, 0, width, height)
        }
        return can
    }

    async loadJoypadScene() {
        return null
    }

    newPauseScene() {
        return null
    }

    getState() {
        const state = {}
        state.key = this.constructor.KEY
        if(this.mapId) state.map = this.mapId
        if(this.paused) state.paused = true
        return state
    }

    setState(state) {
        this.paused = state.paused === true
    }
}


export class Wall extends GameObject {
    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.x1 = kwargs.x1
        this.y1 = kwargs.y1
        this.x2 = kwargs.x2
        this.y2 = kwargs.y2
        this.key = kwargs.key
    }
    drawTo(ctx) {
        ctx.lineWidth = 5
        ctx.strokeStyle = (this.key == "platform") ? "grey" : "black"
        ctx.beginPath()
        ctx.moveTo(this.x1, this.y1)
        ctx.lineTo(this.x2, this.y2)
        ctx.globalAlpha = this.spriteVisibility
        ctx.stroke()
        ctx.globalAlpha = 1
    }
}


// GAME //////////////////////////

export const GAME_STEP_DEFAULT = 0
export const GAME_STEP_WAITING = 1
export const GAME_STEP_GAMING = 2

export class Game extends GameCommon {

    constructor(parentEl, catalog, map, playerId, kwargs) {
        super(parentEl, catalog, map, kwargs)

        this.step = GAME_STEP_DEFAULT

        this.joypadVisible = false

        this.players = {}
        this.localPlayerId = playerId

        this.lag = 0
        this.sendPing = (kwargs && kwargs.sendPing) || null
        this.sendStates = (kwargs && kwargs.sendStates) || null
        this.sendGameInstruction = (kwargs && kwargs.sendGameInstruction) || null
        this.onLog = (kwargs && kwargs.onLog) || null

        this.inputStates = []
        if(this.mode != MODE_LOCAL) {
            this.statesToSend = []
            this.receivedStates = []
            this.receivedAppliedStates = []
        }

        this.initKeyListeners()
        if(this.isDebugMode) this.showDebugScene()

        this.audio = new AudioEngine(this)
        //this.graphics = new GraphicsEngine(this)
    }

    initKeyListeners() {
        this.keysPressed = {}
        if(this.mode != MODE_SERVER) {
            const onKey = (evt, val) => {
                if(!this.hasFocus()) return
                this.setInputKey(evt.key, val)
                if(val===false && evt.key=="o") this.togglePause()
                evt.stopPropagation()
                evt.preventDefault()
            }
            document.addEventListener('keydown', evt => onKey(evt, true))
            document.addEventListener('keyup', evt => onKey(evt, false))
        }
    }

    showGameScene(visible) {
        const scn = this.scenes.game
        if(!scn) return
        scn.visible = visible
        this.syncSize()
    }

    async loadScenesFromMap(scnKey, scnMapId=undefined) {
        const { catalog } = this, scnCat = catalog.scenes[scnKey]
        const scnMap = (scnMapId !== undefined) ? this.game.map.scenes[scnMapId] : null
        const paths = new Set([scnCat.path])
        if(scnMap) {
            scnMap.actors.forEach(actMap => paths.add(catalog.actors[actMap.key].path))
            scnMap.heros.forEach(heroMap => paths.add(catalog.actors[heroMap.key].path))
        }
        const mods = await catalog.preload(Array.from(paths))
        await this.loadScenes(mods[0][scnCat.name], scnMapId)
    }

    async loadScenes(cls, scnMapId=undefined) {
        const scn = new cls(this)
        if(scnMapId !== undefined) scn.loadMap(scnMapId)
        this.scenes.game = scn
        if(this.joypadVisible) await this.loadJoypadScene()
    }

    async loadJoypadScene() {
        const joypadScn = await this.scenes.game.loadJoypadScene()
        if(joypadScn) this.scenes.joypad = joypadScn
        else delete this.scenes.joypad
    }

    async loadWaitingScenes() {
        await this.loadScenes(WaitingScene)
    }

    async loadGameScenes() {
        const scnMapId = "0"
        const scnMap = this.map.scenes[scnMapId]
        await this.loadScenesFromMap(scnMap.key, scnMapId)
    }

    showDebugScene() {
        this.debugScene = new DebugScene(this)
        //this.syncSize()
    }

    syncSize() {
        super.syncSize()
        if(this.debugScene) this.debugScene.syncSizeAndPos()
    }

    updateGameLoop() {
        super.updateGameLoop()
        const { mode } = this
        const updStartTime = now()
        if(this.isDebugMode) this.pushMetric("updateDur", now() - updStartTime, this.fps * 5)
        if(mode != MODE_LOCAL) this.getAndMaySendStates()
        if(this.isDebugMode && mode == MODE_CLIENT) this.maySendPing()
    }

    update() {
        // TODO solve code duplication with GameCommon
        const { game: gameScn, joypad: joypadScn } = this.scenes
        if(this.mode == MODE_LOCAL) this.updateGame()
        else this.updateGameApplyingReceivedStates()
        if(!gameScn.paused) {
            delete this.scenes.pause
        } else {
            this.scenes.pause ||= gameScn.newPauseScene()
        }
        if(joypadScn) {
            if(!gameScn.paused) {
                joypadScn.update()
                delete this.scenes.joypadPause
            } else {
                this.scenes.joypadPause ||= joypadScn.newPauseScene()
            }
        }
        const { pause: pauseScn, joypadPause: joypadPauseScn } = this.scenes
        if(pauseScn) pauseScn.update()
        if(joypadPauseScn) joypadPauseScn.update()
        if(this.debugScene) this.debugScene.update()
    }

    updateGame() {
        const { game: scn } = this.scenes
        if(scn.paused) return
        this.iteration += 1
        this.time = this.iteration * this.dt
        this.applyInputStates()
        if(scn.visible) scn.update()
    }

    applyInputStates() {
        for(const inputState of this.inputStates) {
            const hero = this.scenes.game.getHero(inputState.pid)
            if(hero) hero.setInputState(inputState.is)
        }
        this.inputStates.length = 0
    }

    updateGameApplyingReceivedStates() {
        const { receivedStates, receivedAppliedStates } = this
        let targetIteration = this.iteration + 1
        // full state
        let lastReceivedFullState = null
        for(let i=receivedStates.length-1; i>=0; i--) {
            const state = receivedStates[0]
            if(state.t == STATE_TYPE_FULL) {
                lastReceivedFullState = state
                receivedStates.splice(0, i+1)
                break
            }
        }
        if(lastReceivedFullState !== null) {
            this.setState(lastReceivedFullState)
            const newTargetIteration = max(this.iteration, targetIteration - 1)
            if(newTargetIteration != targetIteration) {
                if(this.isDebugMode) this.log("Fix iteration", targetIteration, "=>", newTargetIteration)
                targetIteration = newTargetIteration
            }
        }
        // other states
        if(this.scenes.game.paused) return
        while(this.iteration < targetIteration) {
            while(receivedStates.length > 0) {
                const state = receivedStates[0]
                if(state.it >= targetIteration) break
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
        this.drawScene(ctx, this.debugScene)
    }

    async startGame() {
        if(this.mode == MODE_CLIENT) return this.sendGameInstruction("start")
        if(this.scenes.game instanceof GameScene) return
        await this.loadGameScenes()
        if(this.mode == MODE_SERVER) this.getAndSendFullState()
    }

    async restartGame() {
        if(this.mode == MODE_CLIENT) return this.sendGameInstruction("restart")
        if(!(this.scenes.game instanceof GameScene)) return
        await this.loadGameScenes()
        if(this.mode == MODE_SERVER) this.getAndSendFullState()
    }

    addPlayer(playerId, kwargs) {
        if(this.players[playerId] === undefined) {
            this.players[playerId] = kwargs
        }
        const gameScn = this.scenes.game
        if(gameScn.newHero) gameScn.newHero(playerId)
        if(this.mode == MODE_SERVER) this.getAndSendFullState()
    }

    rmPlayer(playerId) {
        const player = this.players[playerId]
        if(!player) return
        const gameScn = this.scenes.game
        if(gameScn.rmHero) gameScn.rmHero(playerId)
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
        const gameScn = this.scenes.game
        if(!gameScn.getHero) return 
        const localHero = gameScn.getHero(this.localPlayerId)
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

    getState() {
        const state = { t: STATE_TYPE_FULL }
        state.it = this.iteration
        state.step = this.step
        state.players = this.players
        const gameScn = this.scenes.game
        state.game = gameScn.getState()
        return state
    }

    async setState(state) {
        this.iteration = state.it
        this.step = state.step
        this.players = state.players
        let gameScn = this.scenes.game, gameState = state.game
        const { map: scnMapId, key: scnMapKey } = gameState
        if(gameScn.mapId != scnMapId || gameScn.constructor.KEY != scnMapKey) {
            await this.loadScenesFromMap(scnMapKey, scnMapId)
            gameScn = this.scenes.game
        }
        gameScn.setState(gameState)
    }

    // server only
    getAndMaySendStates() {
        const { receivedAppliedStates, statesToSend } = this
        if(this.mode == MODE_SERVER) {
            // full state
            this._lastSendFullStateTime ||= -Infinity
            if(this.time > this._lastSendFullStateTime + SEND_STATE_PERIOD) {
                this.getAndSendFullState()
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

    getAndSendFullState() {
        const state = this.getState()
        this.statesToSend.length = 0
        this.statesToSend.push(state)
        this._lastSendFullStateTime = this.time
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

    async setJoypadVisibility(val) {
        if(val == this.joypadVisible) return
        this.joypadVisible = val
        if(val) await this.loadJoypadScene()
        else delete this.scenes.joypad
        this.syncSize()
    }

    async initQrcodeImg() {
        if(IS_SERVER_ENV) return
        let { qrcodeImg } = this
        if(!qrcodeImg) {
            await importJs('../static/deps/qrcode.min.js')
            const wrapperEl = document.createElement("div")
            const url = URL.parse(window.location)
            url.searchParams.set("game", "0")
            url.searchParams.set("joypad", "1")
            new QRCode(wrapperEl, {
                text: url.toString(),
                width: 256,
                height: 256,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            })
            qrcodeImg = this.qrcodeImg = wrapperEl.children[0]
        }
        return qrcodeImg
    }
}


@CATALOG.registerScene("default")
export class DefaultScene extends SceneCommon {

    buildBackground() {
        const { width, height } = this
        const can = document.createElement("canvas")
        assign(can, { width, height })
        const ctx = can.getContext("2d")
        ctx.fillStyle = "black"
        ctx.fillRect(0, 0, width, height)
        const text = newTextCanvas("DRAWMYGAME", { fillStyle: "white" })
        ctx.drawImage(text, floor((width-text.width)/2), floor((height-text.height)/2))
        return can
    }
}


export class GameScene extends SceneCommon {
    constructor(game) {
        super(game)
        this.step = "GAME"
        this.scores = {}
        this.seed = floor(random()*1000)
    }

    isPausable() {
        return true
    }

    loadMap(scnMapId) {
        super.loadMap(scnMapId)
        this.initHeros()
        this.initEvents()
        this.physics = new PhysicsEngine(this)
    }

    initHeros() {
        this.initHerosSpawnPos()
        if(this.game.mode == MODE_CLIENT) return  // actors are init by first full state
        for(let playerId in this.game.players) this.newHero(playerId)
    }

    initEvents() {
        this.events = []
        const mapEvts = this.map?.events
        if(!mapEvts) return
        mapEvts.forEach(evtState => {
            let evt = new Events[evtState.key](this, evtState)
            this.events.push(evt)
        })
    }

    newHero(playerId) {
        const player = this.game.players[playerId]
        if(!player) return
        if(this.getHero(playerId)) return
        const heroInitState = this.map?.heros && this.map.heros[0]
        if(!heroInitState) return
        const hero = this.newActor(heroInitState.key, { playerId })
        hero.setInitState(heroInitState)
        this.spawnHero(hero)
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

    // checkHeros() {
    //     const { heros } = this
    //     let nbHeros = 0, nbHerosAlive = 0
    //     for(let playerId in heros) {
    //         const hero = heros[playerId]
    //         nbHeros += 1
    //         if(hero.lives !== 0) nbHerosAlive += 1
    //     }
    //     const firstHero = this.getFirstHero()
    //     if(firstHero && this.step == "GAME" && firstHero.lives <= 0) this.step = "GAMEOVER"
    // }

    spawnHero(hero) {
        hero.spawn(this.herosSpawnX, this.herosSpawnY)
    }

    incrScore(playerId, val) {
        const { scores } = this
        if(scores[playerId] === undefined) scores[playerId] = 0
        scores[playerId] = scores[playerId] + val
   }

    update() {
        const { step } = this
        this.iteration += 1
        this.time = this.iteration * this.game.dt
        if(step == "GAME") this.updateStepGame()
        else if(step == "GAMEOVER") this.updateStepGameOver()
        else if(step == "VICTORY") this.updateStepVictory()
        this.notifs.update()
    }

    updateWorld() {
        const { dt } = this.game
        this.events.forEach(evt => evt.update())
        this.physics.apply(dt, this.actors)
        super.updateWorld()
        this.handleHerosOut()
        this.handleHerosDeath()
    }

    updateStepGame() {
        this.updateWorld()
        this.updateView()
    }

    updateStepGameOver() {
        this.updateWorld()
        this.updateView()
        this.initGameOverNotifs()
    }

    updateStepVictory() {
        this.initVictoryNotifs()
    }

    handleHerosOut() {
        if(!this.onHeroOut) return
        const { heros } = this
        for(let playerId in heros) {
            const hero = heros[playerId]
            if(hero.y > this.map.height + 100) {
                this.onHeroOut(hero)
            }
        }
    }

    onHeroOut(hero) {
        hero.mayTakeDamage(1, null, true)
        if(hero.health > 0) this.spawnHero(hero)
    }

    handleHerosDeath() {
        if(!this.onHeroDeath) return
        const { heros } = this
        for(let playerId in heros) {
            const hero = heros[playerId]
            if(hero.health <= 0) {
                this.onHeroDeath(hero)
            }
        }
    }

    onHeroDeath(hero) {
        const { heros } = this
        if(hero.lives > 1) {
            hero.lives -= 1
            this.spawnHero(hero)
        } else {
            let nbLivingHeros = 0
            for(let playerId in heros) {
                const hero2 = heros[playerId]
                if(hero2.lives > 0) nbLivingHeros += 1
            }
            if(this.step == "GAME" && nbLivingHeros == 0) this.step = "GAMEOVER"
        }
    }

    updateView() {
        const { heros, localHero } = this
        if(!hasKeys(heros)) return
        if(localHero) {
            this.setView(
                localHero.x - this.width/2,
                localHero.y - this.height/2,
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

    drawTo(ctx) {
        super.drawTo(ctx)
        this.notifs.drawTo(ctx)
        if(this.step == "VICTORY" && this.victoryNotifs) this.victoryNotifs.drawTo(ctx)
        if(this.step == "GAMEOVER" && this.gameOverNotifs) this.gameOverNotifs.drawTo(ctx)
    }

    filterActors(key, filter) {
        const actsCache = this._filteredActorsCache ||= new Map()
        if(actsCache.iteration !== this.iteration) {
            actsCache.clear()
            actsCache.iteration = this.iteration
        }
        if(!actsCache.has(key)) {
            actsCache.set(key, this.actors.objArr.filter(filter))
        }
        return actsCache.get(key)
    }

    getTeam(team) {
        return this.filterActors(`team:${team}`, act => {
            const actTeam = act.team
            return actTeam && actTeam.startsWith(team)
        })
    }

    initVictoryNotifs() {
        if(this.victoryNotifs) return
        this.victoryNotifs = new GameObjectGroup(this)
        this.victoryNotifs.new(
            CenteredText,
            {
                text: "VICTORY !",
                font: "100px serif",
            },
        )
    }

    initGameOverNotifs() {
        if(this.gameOverNotifs) return
        this.gameOverNotifs = new GameObjectGroup(this)
        this.gameOverNotifs.new(
            CenteredText,
            {
                text: "GAME OVER",
                font: "100px serif",
            },
        )
    }

    initHerosSpawnPos() {
        const heros = this.map?.heros
        if(!heros || heros.length == 0) return
        const { x, y } = heros[0]
        this.setHerosSpawnPos(x, y)
    }

    setHerosSpawnPos(x, y) {
        this.herosSpawnX = floor(x)
        this.herosSpawnY = floor(y)
    }

    async loadJoypadScene() {
        const { JoypadGameScene } = await importAndPreload("./joypad.mjs")
        return new JoypadGameScene(this.game)
    }

    getState() {
        const state = super.getState()
        state.it = this.iteration
        state.step = this.step
        state.hsx = this.herosSpawnX
        state.hsy = this.herosSpawnY
        state.sco = this.scores
        state.acts = this.actors.getState()
        state.evts = this.events.map(e => e.getState())
        state.seed = this.seed
        return state
    }

    setState(state) {
        super.setState(state)
        this.iteration = state.it
        this.step = state.step
        this.setHerosSpawnPos(state.hsx, state.hsy)
        this.scores = state.sco
        this.actors.setState(state.acts)
        for(let i in state.evts) this.events[i].setState(state.events[i])
        this.seed = state.seed
    }

    rand(key) {
        let seed = 0
        for(let i=0; i<key.length; ++i) {
            seed = ((seed << 5) - seed) + key.charCodeAt(i)
        }
        seed = (seed + this.iteration + this.seed) & 0x7FFFFFFF
        if(seed === 0) seed = 1
        const a = 1103515245
        const c = 12345
        const m = 2147483647
        seed = (a * seed + c) % m
        return seed / m
    }

    newPauseScene() {
        return new PauseScene(this.game)
    }
}


export class FocusFirstHeroScene extends GameScene {
    update() {
        super.update()
        this.updateHerosPos()
    }
    updateHerosPos() {
        const { heros } = this
        const firstHero = this.getFirstHero()
        if(!firstHero) return
        const { x:fhx, y:fhy } = firstHero
        const { width, height } = this.game
        for(let playerId in heros) {
            if(playerId === firstHero.playerId) continue
            const hero = heros[playerId]
            const dx = hero.x - fhx, dy = hero.y - fhy
            if(dx < -width || dx > width || dy < -height || dy > height) {
                this.spawnHero(hero)
            }
        }
    }
    onHeroDeath(hero) {
        if(hero.lives > 1) {
            hero.lives -= 1
            this.spawnHero(hero)
        } else {
            const firstHero = this.getFirstHero()
            if(this.step == "GAME" && firstHero.lives <= 0) this.step = "GAMEOVER"
        }
    }
    updateView() {
        const { heros, localHero } = this
        if(!hasKeys(heros)) return
        if(localHero) {
            this.setView(
                localHero.x - this.width/2,
                localHero.y - this.height/2,
            )
        } else {
            const firstHero = this.getFirstHero()
            if(firstHero) this.setView(
                firstHero.x - this.width/2,
                firstHero.y - this.height/2,
            )
        }
    }
    spawnHero(hero) {
        const firstHero = this.getFirstHero()
        let spawnX, spawnY
        if(!firstHero || hero === firstHero) {
            spawnX = this.herosSpawnX
            spawnY = this.herosSpawnY
        } else {
            spawnX = firstHero.x
            spawnY = firstHero.y
        }
        hero.spawn(spawnX, spawnY)
    }
}


// ACTORS ///////////////////////////////////

@defineStateProperty(INIT_STATE | UPD_STATE, StateInt, "health", { shortKey: "hea", default: Infinity })
@defineStateProperty(UPD_STATE, StateInt, "lastDamageAge", { shortKey: "lda", default: null })
export class LivingGameObject extends GameObject {
    
    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.health = (kwargs && kwargs.health !== undefined) ? kwargs.health : this.getMaxHealth()
        this.lastDamageAge = null
    }

    getMaxHealth() {
        return 1
    }

    update() {
        const { iteration, step } = this.scene
        const { dt } = this.game
        if(step != "GAME" || (this.health <= 0) || this.isDamageable()) this.spriteVisibility = 1
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
        this.trigger("damage", { damager })
        if(this.health == 0) {
            this.onDeath(damager)
        } else if(damager) {
            this.speedY = -200
            this.speedX = 200 * ((this.x > damager.x) ? 1 : -1)
        }
    }

    onDeath(killer) {
        if(killer) {
            this.speedY = -500
            this.speedX = 100 * ((this.x < killer.x) ? -1 : 1)
        }
        this.trigger("death", { killer })
    }

    mayRemove() {
        if(this.health <= 0 && this.lastDamageAge > ceil(3 * this.game.fps)) {
            this.remove()
        }
    }
}


@defineStateProperty(INIT_STATE | UPD_STATE, StateInt, "lives", { shortKey: "liv", default: Infinity })
@defineStateProperty(UPD_STATE, StateInt, "lastSpawnIt", { shortKey: "lsi", default: -Infinity })
export class Hero extends LivingGameObject {

    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.team = "hero"
        this.lives = (kwargs && kwargs.lives !== undefined) ? kwargs.lives : 3
        if(kwargs && kwargs.playerId !== undefined) this.setPlayerId(kwargs.playerId)
        this.lastSpawnIt = -Infinity
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
        const extras = this.extras ||= new ActorRefs(this.scene)
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
        this.updateSpawnEffect()
    }

    checkCollectablesHit() {
        const { team } = this
        const collectables = this.scene.filterActors("collectables", act => {
            return act instanceof Collectable
        })
        collectables.forEach(col => {
            if(col.isCollectableBy(team) && checkHit(this, col)) col.onCollected(this)
        })
    }

    updateHearts() {
        if(this.playerId != this.game.localPlayerId) return
        const { scene, lives, health } = this
        let livesHearts
        if(lives !== Infinity) {
            livesHearts = this.livesHearts ||= []
            for(let i=livesHearts.length; i<lives; ++i)
                livesHearts.push(scene.newNotif(LifeHeartNotif, { num: i }))
            livesHearts.forEach(heart => {
                heart.x = 20 + heart.num * 35
                heart.y = 20
                heart.setFull(heart.num < lives)
            })
        }
        if(health !== Infinity) {
            const healthHearts = this.healthHearts ||= []
            for(let i=healthHearts.length; i<health; ++i)
                healthHearts.push(scene.newNotif(HealthHeartNotif, { num: i }))
            healthHearts.forEach(heart => {
                heart.x = 15 + heart.num * 23
                heart.y = (livesHearts && livesHearts.length > 0) ? 50 : 15
                heart.setFull(heart.num < health)
            })
        }
    }

    updateSpawnEffect() {
        const { lastSpawnIt } = this
        const { iteration } = this.scene
        const { fps } = this.game
        if(lastSpawnIt + fps > iteration) {
            if(!this._spawnEnt) this._spawnEnt = this.newSpawnEffect()
        } else {
            delete this._spawnEnt
            this.lastSpawnIt = -Infinity
        }
    }

    newSpawnEffect() {
        return this.scene.newVisual(Pop, {
            x: this.x,
            y: this.y,
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
        // if(this.lastSpawnIt === -Infinity) delete state.lsi
        // else state.lsi = this.lastSpawnIt
        return state
    }

    setState(state) {
        super.setState(state)
        this.setPlayerId(state.pid)
        // this.lives = state.liv
        this.inputState = state.ist
        if(this.extras || state.extras) {
            const extras = this.initExtras()
            extras.clear()
            if(state.extras) for(let exId of state.extras) extras.add(exId)
        }
        // if(state.lsi) this.lastSpawnIt = state.lsi
        // else this.lastSpawnIt = -Infinity
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

    spawn(x, y) {
        this.x = x + floor((random()-.5) * 50)
        this.y = y
        this.speedX = 0
        this.speedY = -200
        this.lastSpawnIt = this.scene.iteration
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


export const PuffAud = CATALOG.registerAudio("/static/core/assets/puff.opus")


const SmokeExplosionSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/core/assets/smoke_explosion.png"), 4, 1)

@CATALOG.registerActor("smokee", {
    showInBuilder: false
})
@defineStateProperty(UPD_STATE, StateInt, "iteration", { shortKey: "it" })
export class SmokeExplosion extends GameObject {

    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.width = this.height = 100
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
}


const PopImg = CATALOG.registerImage("/static/core/assets/pop.png")
const PopSprite = new Sprite(PopImg)
const PopAud = CATALOG.registerAudio("/static/core/assets/pop.opus")

class Pop extends GameObject {
    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.width = this.height = 10
        this.duration = floor(this.game.fps * .25)
        this.remIt = this.duration
    }
    update() {
        if(!this._soundPlayed) {
            this.game.audio.playSound(PopAud)
            this._soundPlayed = true
        }
        this.width = this.height = 10 + 100 * (1 - this.remIt/this.duration)
        this.remIt -= 1
        if(this.remIt <= 0) this.remove()
    }
    getSprite() {
        return PopSprite
    }
}


export class Enemy extends LivingGameObject {
    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.team = "enemy"
    }
    onDeath() {
        const { x, y } = this
        this.scene.newVisual(SmokeExplosion, { x, y })
        this.game.audio.playSound(PuffAud)
        this.remove()
    }
}


export const ItemAud = CATALOG.registerAudio("/static/core/assets/item.opus")

@defineStateProperty(UPD_STATE, StateProperty, "ownerId", { shortKey: "own", default: null })
export class Collectable extends GameObject {

    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.spriteRand = floor(random() * this.game.fps)
        this.ownerId = null
    }

    getOwner() {
        const { ownerId } = this
        if(ownerId === null) return null
        return this.scene.actors.get(ownerId)
    }

    isCollectableBy(team) {
        return !this.ownerId && team.startsWith("hero")
    }

    onCollected(owner) {
        this.playCollectedSound()
        this.ownerId = owner.id
    }

    drop() {
        this.ownerId = null
    }

    playCollectedSound() {
        this.game.audio.playSound(ItemAud)
    }
    
    scaleSprite(sprite) {
        super.scaleSprite(sprite)
        if(this.ownerId !== null) {
            this.spriteDy = 0
        } else {
            const { iteration } = this.scene
            const { fps } = this.game
            const angle = PI * (this.spriteRand + iteration) / fps, cosAngle = cos(angle)
            this.spriteDy = -this.spriteWidth * .05 * cosAngle
        }
    }
}


const HeartImg = CATALOG.registerImage("/static/core/assets/colorable_heart.png")
export const HeartSpriteSheets = {
    spritesheets: {},
    get: function(color) {
        return this.spritesheets[color] ||= new SpriteSheet((() => {
            if(!color) return HeartImg
            return colorizeCanvas(cloneCanvas(HeartImg), color)
        })(), 2, 1)
    },
}


class LifeHeartNotif extends GameObject {
    constructor(scn, kwargs) {
        super(scn, kwargs)
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
    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.width = this.height = 20
        this.color = "pink"
    }
}

export class Extra extends Collectable {
    getPriority() {
        const owner = this.getOwner()
        if(owner) return owner.getPriority() - 1
        else super.getPriority()
    }
    onCollected(owner) {
        super.onCollected(owner)
        owner.addExtra(this)
    }
    drop() {
        const owner = this.getOwner()
        if(owner) owner.dropExtra(this)
        super.drop()
    }
}


class PauseScene extends SceneCommon {
    constructor(game) {
        super(game)
        this.backgroundColor = "lightgrey"
        this.backgroundAlpha = .5
        this.pauseText = this.newNotif(Text, {
            text: "PAUSE",
            font: "bold 50px arial",
            fillStyle: "black",
        })
        this.syncTextPos()
    }
    update() {
        this.syncTextPos()
    }
    syncTextPos() {
        assign(this.pauseText, { x: this.width/2, y: this.height/2 })
    }
    drawTo(ctx) {
        this.notifs.drawTo(ctx)
    }
}


class PlayerText extends GameObject {
    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.player = kwargs.player
        this.initSprite()
    }
    initSprite() {
        if(IS_SERVER_ENV) return
        const { player } = this
        const text = newTextCanvas(player.name, {
            font: "30px arial",
            fillStyle: "white",
        })
        const can = document.createElement("canvas")
        this.width = can.width = text.width + 40
        this.height = can.height = 35
        const ctx = can.getContext("2d")
        ctx.beginPath()
        ctx.arc(floor(can.height/2), floor(can.height/2), 15, 0, 2 * PI)
        ctx.strokeStyle = "white"
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.fillStyle = player.color
        ctx.fill()
        ctx.drawImage(text, 40, floor((can.height-text.height)/2))
        this.sprite = new Sprite(can)
    }
    getSprite() {
        return this.sprite
    }
}


@CATALOG.registerScene("waiting")
export class WaitingScene extends SceneCommon {

    constructor(game) {
        super(game)
        this.backgroundColor = "black"
        this.playerTxts = []
        this.initTitleText()
        this.initQrcodeSprite()
    }

    update() {
        this.syncPlayerTexts()
        this.syncTextPositions()
    }

    initTitleText() {
        this.titleTxt = this.newNotif(Text, {
            text: "WAITING PLAYERS",
            font: "bold 50px arial",
            fillStyle: "white",
        })
        this.syncTextPositions()
    }

    async initQrcodeSprite() {
        if(IS_SERVER_ENV) return
        let qrcodeSprite = this.qrcodeSprite
        if(!qrcodeSprite) {
            const qrcodeImg = await this.game.initQrcodeImg()
            const can = newCanvas(ceil(qrcodeImg.width*1.2), ceil(qrcodeImg.height*1.2))
            const ctx = can.getContext("2d")
            ctx.fillStyle = "white"
            ctx.fillRect(0, 0, can.width, can.height)
            ctx.drawImage(qrcodeImg, floor((can.width-qrcodeImg.width)/2), floor((can.height-qrcodeImg.height)/2))
            qrcodeSprite = this.qrcodeSprite = new Sprite(can)
        }
        return qrcodeSprite
    }

    syncPlayerTexts() {
        const { playerTxts } = this
        const { players } = this.game
        for(let playerId in players) {
            const player = players[playerId]
            let playerTxt = playerTxts[playerId]
            // add new players
            if(playerTxt === undefined) {
                playerTxt = playerTxts[playerId] = this.newNotif(PlayerText, { player })
                playerTxt.playerId = playerId
            }
        }
        // rm removed players
        for(let idx in playerTxts) {
            const playerTxt = playerTxts[idx]
            if(!playerTxt) continue
            if(!players[playerTxt.playerId]) {
                playerTxt.remove()
                playerTxts[idx] = null
            }
        }
    }

    syncTextPositions() {
        const { playerTxts, width, height } = this
        // title
        assign(this.titleTxt, { x: width/2, y: height/6 })
        // players
        let numPlayer = 0
        for(let idx in playerTxts) {
            const playerTxt = playerTxts[idx]
            if(!playerTxt) continue
            assign(playerTxt, { x: width/2+playerTxt.width/2, y: height/3 + (numPlayer * 40) })
            numPlayer += 1
        }
    }

    drawTo(ctx) {
        this.notifs.drawTo(ctx)
        if(this.qrcodeSprite) {
            const qrcodeImg = this.qrcodeSprite.getImg(200, 200, 1, 1)
            if(qrcodeImg) ctx.drawImage(qrcodeImg, 60, ~~((this.height - qrcodeImg.height)/2))
        }
    }

    async loadJoypadScene() {
        const { JoypadWaitingScene } = await importAndPreload("./joypad.mjs")
        return new JoypadWaitingScene(this.game)
    }
}


export class VictoryScene extends SceneCommon {
    constructor(game) {
        super(game)
        this.backgroundColor = "lightgrey"
        this.backgroundAlpha = .5
        this.victoryText = this.newNotif(Text, {
            text: "VICTORY",
            font: "bold 50px arial",
            fillStyle: "black",
        })
    }
    update() {
        assign(this.victoryText, { x: this.width/2, y: this.height/2 })
    }
    drawTo(ctx) {
        this.notifs.drawTo(ctx)
    }
}


export class DefeatScene extends SceneCommon {
    constructor(game) {
        super(game)
        this.backgroundColor = "lightgrey"
        this.backgroundAlpha = .5
        this.defeatText = this.newNotif(Text, {
            text: "DEFEAT",
            font: "bold 50px arial",
            fillStyle: "black",
        })
    }
    update() {
        assign(this.defeatText, { x: this.width/2, y: this.height/2 })
    }
    drawTo(ctx) {
        this.notifs.drawTo(ctx)
    }
}


class DebugScene extends SceneCommon {
    constructor(game) {
        super(game)
        this.backgroundColor = null
        const fontArgs = {
            font: "20px arial",
            fillStyle: "grey"
        }
        this.updDurTxt = this.newNotif(Text, assign({ x:this.game.width - 90, y:15 }, fontArgs))
        this.drawDurTxt = this.newNotif(Text, assign({ x:this.game.width - 90, y:40 }, fontArgs))
        this.lagTxt = this.newNotif(Text, assign({ x:this.game.width - 90, y:65 }, fontArgs))
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


export class ScoresBoard extends GameObject {
    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.scores = kwargs.scores
        this.width = 300
        this.headerHeight = 80
        this.lineHeight = 40
        this.height = this.headerHeight + nbKeys(this.game.players) * this.lineHeight
    }
    getSprite() {
        const sprite = this.sprite ||= new Sprite(
            this.buildCanvas()
        )
        return sprite
    }
    buildCanvas() {
        const can = document.createElement("canvas")
        can.width = this.width
        can.height = this.height
        this.drawBackground(can)
        this.drawScores(can)
        return can
    }
    drawBackground(can) {
        const { width, height } = can
        const ctx = can.getContext("2d")
        ctx.fillStyle = "lightgrey"
        ctx.globalAlpha = .8
        ctx.fillRect(0, 0, width, height)
        ctx.globalAlpha = 1
        ctx.strokeStyle = "black"
        ctx.lineWidth = 1
        ctx.strokeRect(0, 0, width, height)
    }
    drawScores(can) {
        const { headerHeight, lineHeight, scores } = this
        const { width } = can
        const { players } = this.game
        const ctx = can.getContext("2d")
        const fontHeight = floor(lineHeight *.7)
        const fontArgs = {
            font: `${fontHeight}px arial`,
            fillStyle: "black"
        }
        const titleCan = newTextCanvas("Scores:", {
            ...fontArgs,
            font: `bold ${fontHeight}px arial`,
        })
        ctx.drawImage(titleCan, (width-titleCan.width)/2, lineHeight/4)
        const sortedPlayerScores = Object.keys(players).map(pid => [pid, scores[pid] || 0]).sort((a, b) => b[1] - a[1])
        for(let i in sortedPlayerScores) {
            const [playerId, score] = sortedPlayerScores[i]
            const playerName = players[playerId].name
            const lineCan = newTextCanvas(`${playerName}: ${score}`, fontArgs)
            ctx.drawImage(lineCan, (width-lineCan.width)/2, headerHeight + i * lineHeight)
        }
    }
}


export class CountDown extends Text {
    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.duration = kwargs && kwargs.duration || 3
        this.startIt = this.scene.iteration
        this.syncText()
    }
    update() {
        const { iteration } = this.scene
        const { fps } = this.game
        if((iteration - this.startIt)/fps > this.duration) this.remove()
        this.syncText()
    }
    syncText() {
        const { iteration } = this.scene
        const { fps } = this.game
        this.updateText(ceil((this.duration - (iteration - this.startIt)/fps)))
    }
}


@CATALOG.registerActor("spawn", {
    label: "ActorSpawner",
    icon: PopImg,
})
@defineStateProperty(INIT_STATE | UPD_STATE, StateActorKey, "actorKey", { shortKey: "act" })
@defineStateProperty(INIT_STATE | UPD_STATE, StateInt, "period")
@defineStateProperty(INIT_STATE | UPD_STATE, StateInt, "max")
@defineStateProperty(INIT_STATE | UPD_STATE, StateInt, "maxLiving", { shortKey: "mxl", default: Infinity })
@defineStateProperty(UPD_STATE, StateInt, "nbSpawn", { shortKey:"nbs" })
@defineStateProperty(UPD_STATE, StateInt, "lastSpawnIt", { shortKey:"lsi", default: -Infinity })
@defineStateProperty(UPD_STATE, ActorRefs.StateProperty, "spawnedActors", { shortKey:"acts" })
export class ActorSpawner extends GameObject {
    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.width = this.height = 50
        this.actorKey = null
        this.period = 1
        this.max = 1
        this.maxLiving = Infinity
        this.nbSpawn = 0
        this.lastSpawnIt = -Infinity
        this.spawnedActors = new ActorRefs(this.scene)
    }
    update() {
        this.spawnedActors.update()
        if(this.nbSpawn >= this.max && this.spawnedActors.size == 0) this.remove()
        this.maySpawnActor()
    }
    maySpawnActor() {
        if(this.nbSpawn >= this.max) return
        if(this.scene.iteration < this.lastSpawnIt + ceil(this.period * this.game.fps)) return
        if(this.spawnedActors.size >= this.maxLiving) return
        this.spawnActor()
    }
    spawnActor() {
        const act = this.scene.newActor(this.actorKey, {
            x: this.x,
            y: this.y,
        })
        this.nbSpawn += 1
        this.spawnedActors.add(act.id)
        this.lastSpawnIt = this.scene.iteration
        this.scene.newVisual(Pop, { x:this.x, y:this.y })
        return act
    }
    getSprite() {
        return PopSprite
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
