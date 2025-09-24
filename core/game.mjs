const { assign, getPrototypeOf } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, checkHit, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, addNewDomEl, importJs } = utils
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
        this.objects = {}
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
            addItems(path, mod.CATALOG.objects, this.objects)
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
    getSceneClass(key) {
        const scnCat = this.scenes[key]
        const mod = this.mods[scnCat.path]
        return mod[scnCat.name]
    }
    getObjectClass(key) {
        const objCat = this.objects[key]
        const mod = this.mods[objCat.path]
        return mod[objCat.name]
    }
}

export class ModuleCatalog {
    constructor() {
        this.objects = {}
        this.scenes = {}
        this.assets = []
    }
    registerObject(key, kwargs) {
        return target => {
            target.KEY = key
            const objCat = this.objects[key] = {}
            objCat.name = target.name
            objCat.category = target.CATEGORY
            objCat.label = kwargs?.label ?? key
            objCat.icon = kwargs?.icon ?? null
            objCat.showInBuilder = kwargs?.showInBuilder ?? true
            objCat.isHero = Hero.isPrototypeOf(target)
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
        this.heros = [{
            key: "nico"
        }]
        this.scenes = { "0": {
            key: "std",
            width: MAP_DEFAULT_WIDTH,
            height: MAP_DEFAULT_HEIGHT,
            objects: [],
            walls: [],
            physicsManager: { key: "physicsmng" },
            attackManager: { key: "attackmng" },
            viewManager: { key: "viewheroscentermng" },
            herosLivesManager: { key : "heroslivesmng" },
        }}
    }

    async exportAsBinary() {
        const outScns = {}
        for(let scnId in this.scenes) {
            outScns[scnId] = this.scenes[scnId]
        }
        const outObj = {
            hs: this.heros,
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
        this.heros = inObj.hs
        const scns = this.scenes = {}
        for(let scnId in inObj.ss) {
            scns[scnId] = inObj.ss[scnId]
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


// CATEGORY //////////////////////////

export class Category {
    static append(cat) {
        return target => {
            target.CATEGORY = (target.CATEGORY ?? "") + cat + "/"
        }
    }
}


// STATE PROPERTY ////////////////////

export class StateProperty {
    static DEFAULT_STATE_VALUE = null

    static define(key, kwargs) {
        return target => {
            if(target.IS_MIXIN) {
                target.addTargetDecorator(this, "define", key, kwargs)
                return target
            }
            //if(target.STATE_PROPS && target.STATE_PROPS.has(key)) throw Error(`StateProperty "${key}" already exists in ${target.name}`)
            const stateProp = new this(key, kwargs)
            stateProp.initObjectClass(target)
            return target
        }
    }
    static modify(key, kwargs) {
        return target => {
            if(target.IS_MIXIN) {
                target.addTargetDecorator(this, "modify", key, kwargs)
                return target
            }
            if(!target.STATE_PROPS || !target.STATE_PROPS.has(key)) throw Error(`StateProperty "${key}" does not exist in ${target.name}`)
            const stateProp = target.STATE_PROPS.get(key)
            const prop2 = Object.create(stateProp)
            prop2.init(kwargs)
            prop2.initObjectClass(target)
            return target
        }
    }
    constructor(key, kwargs) {
        this.key = key
        this.defaultStateValue = this.constructor.DEFAULT_STATE_VALUE
        this.showInBuilder = false
        this.init(kwargs)
    }
    init(kwargs) {
        if(kwargs?.default !== undefined) this.defaultStateValue = kwargs.default
        if(kwargs?.nullableWith !== undefined) this.nullableWith = kwargs.nullableWith
        if(kwargs?.showInBuilder !== undefined) this.showInBuilder = kwargs.showInBuilder
    }
    initObjectClass(cls) {
        if(!cls.hasOwnProperty('STATE_PROPS')) cls.STATE_PROPS = new Map(cls.STATE_PROPS)
        cls.STATE_PROPS.set(this.key, this)
        this.initObjectClassProp(cls)
    }
    initObjectClassProp(cls) {
        this.setObjectPropFromState(cls.prototype, this.defaultStateValue)
    }
    initObject(obj, kwargs) {}
    getObjectPropState(obj) {
        const val = obj[this.key]
        if(val === this.nullableWith ?? null) return null
        else return val
    }
    setObjectPropFromState(obj, valState) {
        const { key } = this
        if(valState === undefined) return delete obj[key]
        if(valState === null) valState = this.nullableWith ?? null
        const protoVal = getPrototypeOf(this)[key]
        if(valState === protoVal) return delete obj[key]
        obj[key] = valState
    }
    syncStateFromObject(obj, state) {
        const { key } = this
        if(!obj.hasOwnProperty(key)) return
        let val = obj[key], protoVal = getPrototypeOf(obj)[key]
        if(val === undefined || val === protoVal) return
        state[key] = this.getObjectPropState(obj)
    }
    syncObjectFromState(state, obj) {
        this.setObjectPropFromState(obj, state[this.key])
    }
    createObjectInput(obj) {
        if(this.nullableWith !== undefined) return this.createNullableInput(obj)
        else return this.createInput(obj)
    }
    createNullableInput(obj) {
        const val = this.getObjectPropState(obj)
        const wrapperEl = newDomEl("div", {
            style: {
                display: "flex",
                flexDirection: "row",
            }
        })
        const nullEl = newDomEl("input", {
            type: "checkbox",
        })
        wrapperEl.appendChild(nullEl)
        if(val === null) nullEl.checked = true
        const nullTxtEl = newDomEl("div", {
            text: this.nullableWith,
        })
        wrapperEl.appendChild(nullTxtEl)
        const valEl = this.createInput(obj)
        wrapperEl.appendChild(valEl)
        const syncEls = () => {
            valEl.style.display = nullEl.checked ? "none" : "block"
            nullTxtEl.style.display = nullEl.checked ? "block" : "none"
        }
        nullEl.addEventListener("change", () => {
            syncEls()
            if(nullEl.checked) this.setObjectPropFromState(obj, null)
            else this.syncObjectFromInput(valEl, obj)
        })
        valEl.addEventListener("change", syncEls)
        syncEls()
        return wrapperEl
    }
    createInput(obj) {
        const val = this.getObjectPropState(obj)
        const inputEl = newDomEl("input", {
            type: "text",
            value: (typeof val === "string") ? val : ""
        })
        inputEl.addEventListener("change", () => this.syncObjectFromInput(inputEl, obj))
        return inputEl
    }
    syncObjectFromInput(inputEl, obj) {
        let val = inputEl.value
        this.setObjectPropFromState(obj, (val == "") ? this.defaultStateValue : val)
    }
}

export class StateBool extends StateProperty {
    static DEFAULT_STATE_VALUE = false

    createInput(obj) {
        const val = this.getObjectPropState(obj)
        const inputEl = newDomEl("input", {
            type: "checkbox",
            checked: Boolean(val),
        })
        inputEl.addEventListener("change", () => this.syncObjectFromInput(inputEl, obj))
        return inputEl
    }
    syncObjectFromInput(inputEl, obj) {
        this.setObjectPropFromState(obj, inputEl.checked)
    }
}

export class StateInt extends StateProperty {
    static DEFAULT_STATE_VALUE = 0

    constructor(key, kwargs) {
        super(key, kwargs)
        this.min = kwargs?.min ?? null
        this.max = kwargs?.max ?? null
    }
    createInput(obj) {
        const val = this.getObjectPropState(obj)
        const inputEl = newDomEl("input", {
            type: "number",
            value: (typeof val === "number") ? val : ""
        })
        inputEl.addEventListener("change", () => this.syncObjectFromInput(inputEl, obj))
        return inputEl
    }
    syncObjectFromInput(inputEl, obj) {
        let val = inputEl.value
        this.setObjectPropFromState(obj, (val == "") ? this.defaultStateValue : parseInt(val))
    }
}

export class StateEnum extends StateProperty {
    constructor(key, kwargs) {
        super(key, kwargs)
        this.options = kwargs.options
    }
    createInput(obj) {
        const { options } = this
        const val = this.getObjectPropState(obj)
        const inputEl = newDomEl("select")
        for(let optVal in options) {
            addNewDomEl(inputEl, "option", {
                value: optVal,
                text: options[optVal],
            })
        }
        inputEl.value = val
        inputEl.addEventListener("change", () => this.syncObjectFromInput(inputEl, obj))
        return inputEl
    }
}

export class StateIntEnum extends StateEnum {
    static DEFAULT_STATE_VALUE = 0

    syncObjectFromInput(inputEl, obj) {
        let val = inputEl.value
        this.setObjectPropFromState(obj, (val == "") ? this.defaultStateValue : parseInt(val))
    }
}


export class StateObjectRef extends StateProperty {
    initObjectClassProp(cls) {}
    getObjectPropState(obj) {
        const val = obj[this.key]
        if(val === this.nullableWith ?? null) return null
        else return val.id
    }
    setObjectPropFromState(obj, valState) {
        const { key } = this
        if(valState === undefined) return delete obj[key]
        if(valState === null) obj[key] = this.nullableWith ?? null
        else obj[key] = obj.scene.objects.get(valState)
    }
}


// OBJECT LINK ///////////////////////

export class LinkTrigger {
    static add(funcName, kwargs) {
        return target => {
            if(target.IS_MIXIN) {
                target.addTargetDecorator(this, "add", funcName, kwargs)
                return target
            }
            const linkTrig = new this(funcName, kwargs)
            linkTrig.initObjectClass(target)
            return target
        }
    }
    constructor(funcName, kwargs) {
        this.funcName = funcName
        this.label = kwargs?.label ?? funcName
        this.isDefault = kwargs?.isDefault ?? false
    }
    initObjectClass(cls) {
        if(!cls.hasOwnProperty('LINK_TRIGGERS')) cls.LINK_TRIGGERS = new Map(cls.LINK_TRIGGERS)
        cls.LINK_TRIGGERS.set(this.funcName, this)
        if(this.isDefault) cls.DEFAULT_LINK_TRIGGER = this.funcName
    }
}

export class LinkReaction {
    static add(funcName, kwargs) {
        return target => {
            if(target.IS_MIXIN) {
                target.addTargetDecorator(this, "add", funcName, kwargs)
                return target
            }
            const linkReact = new this(funcName, kwargs)
            linkReact.initObjectClass(target)
            return target
        }
    }
    constructor(funcName, kwargs) {
        this.funcName = funcName
        this.label = kwargs?.label ?? funcName
        this.isDefault = kwargs?.isDefault ?? false
    }
    initObjectClass(cls) {
        if(!cls.hasOwnProperty('LINK_REACTIONS')) cls.LINK_REACTIONS = new Map(cls.LINK_REACTIONS)
        cls.LINK_REACTIONS.set(this.funcName, this)
        if(this.isDefault) cls.DEFAULT_LINK_REACTION = this.funcName
    }
}

export class LinkMessage {
    constructor(value) {
        this.value = value
    }
}

export class ObjectLink {
    constructor(trigObj, trigKey, reactObj, reactKey, threshold) {
        this.triggerObject = trigObj
        this.triggerKey = trigKey
        this.reactionObject = reactObj
        this.reactionKey = reactKey
        this.threshold = threshold
    }
}


// CORE


@LinkTrigger.add("isRemoved", { isDefault: true })
@LinkReaction.add("reactRemove", { label:"remove", isDefault: true })
@StateIntEnum.define("dirY", { default: 1, options: { '1': "Up", '-1': "Down"} })
@StateIntEnum.define("dirX", { default: 1, options: { '1': "Right", '-1': "Left"} })
@StateInt.define("y", { showInBuilder: true })
@StateInt.define("x", { showInBuilder: true })
export class GameObject {

    static STATEFUL = true

    // static STATE_PROPS = new Map()  // already done by x/y state props
    // static LINK_TRIGGERS = new Map()  // already done by isRemoved/reactRemove links
    // static LINK_REACTIONS = new Map()  // same...
    static MIXINS = new Map()

    static {
        assign(this.prototype, {
            width: 10,
            height: 10,
            spriteVisibility: 1,
            spriteDx: 0,
            spriteDy: 0,
        })
    }

    constructor(scn, kwargs) {
        this.scene = scn
        this.game = scn.game
        this.init(kwargs)
    }

    init(kwargs) {
        if(kwargs) {
            if(kwargs.id !== undefined) this.id = kwargs.id
            if(kwargs.key !== undefined) this.key = kwargs.key
            if(kwargs.x !== undefined) this.x = kwargs.x
            if(kwargs.y !== undefined) this.y = kwargs.y
            if(kwargs.size !== undefined) this.width = this.height = kwargs.size
            if(kwargs.width !== undefined) this.width = kwargs.width
            if(kwargs.height !== undefined) this.height = kwargs.height
            if(kwargs.dirX !== undefined) this.dirX = kwargs.dirX
            if(kwargs.dirY !== undefined) this.dirY = kwargs.dirY
        }
        this.constructor.STATE_PROPS.forEach(prop => prop.initObject(this, kwargs))
        this.constructor.MIXINS.forEach(mixin => mixin.initObject(this, kwargs))
    }
    
    getKey() {
        return this.key ?? this.constructor.KEY
    }

    getPriority() {
        return 0
    }

    update() {
        this.constructor.MIXINS.forEach(mixin => mixin.updateObject(this))
        this.requestLinkMessages()
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
        const scn = this.scene
        let { left, width, top, height } = this.getHitBox()
        left += scn.x
        top += scn.y
        for(let touch of this.game.touches) {
            const { isDown, x: touchX, y: touchY } = touch
            if(isDown && left<=touchX && left+width>touchX && top<=touchY && top+height>touchY) return true
        }
        return false
    }

    remove() {
        this.removed = true
    }

    isRemoved() {
        return Boolean(this.removed)
    }

    addObjectLink(trigObj, trigKey, reactKey, threshold) {
        const objLinks = this.objectLinks ||= []
        if(!trigKey) trigKey = trigObj.constructor.DEFAULT_LINK_TRIGGER
        if(!reactKey) reactKey = this.constructor.DEFAULT_LINK_REACTION
        if(threshold===undefined) threshold = .5
        objLinks.push(new ObjectLink(trigObj, trigKey, this, reactKey, threshold))
    }

    requestLinkMessages() {
        const objLinks = this.objectLinks
        if(!objLinks) return
        for(let objLink of objLinks) {
            let msg = objLink.triggerObject[objLink.triggerKey]()
            if(typeof msg == "boolean") msg = msg ? 1 : 0
            if(typeof msg == "number") {
                const _msg = this._linkResp ||= new LinkMessage()
                _msg.value = msg
                msg = _msg
            }
            this[objLink.reactionKey](msg)
        }
    }

    reactRemove(msg) {
        if(msg.value > .5) this.remove()
    }

    getState(isInitState=false) {
        const state = {}
        state.key = this.getKey()
        if(!isInitState) state.id = this.id
        this.constructor.STATE_PROPS.forEach(prop => prop.syncStateFromObject(this, state))
        this.constructor.MIXINS.forEach(mixin => mixin.syncStateFromObject(this, state))
        return state
    }

    getObjectLinksState() {
        const objLinks = this.objectLinks
        if(!objLinks) return null
        const state = []
        for(let objLink of objLinks) state.push([
            this.id,
            objLink.triggerObject.id,
            objLink.triggerKey,
            objLink.reactionKey,
            objLink.threshold,
        ])
        return state
    }

    setState(state, isInitState=false) {
        this.constructor.STATE_PROPS.forEach(prop => prop.syncObjectFromState(state, this))
        this.constructor.MIXINS.forEach(mixin => mixin.syncObjectFromState(state, this))
    }

    addObjectLinkFromState(objLinkState) {
        const [reactObjId, trigObjId, trigKey, reactKey, threshold] = objLinkState
        const trigObj = this.scene.objects.get(trigObjId)
        this.addObjectLink(trigObj, trigKey, reactKey, threshold)
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


GameObject.StateProperty = class extends StateProperty {
    initObjectClassProp(cls) {
        cls.prototype[this.key] = this.nullableWith
    }
    init(kwargs) {
        super.init(kwargs)
        this.filter = kwargs?.filter
    }
    getObjectPropState(obj) {
        const val = obj[this.key]
        if(!val || val === this.nullableWith) return null
        else return val.getState()
    }
    setObjectPropFromState(obj, valState) {
        const { key } = this
        if(valState === undefined) return delete obj[key]
        if(valState === null) valState = this.nullableWith
        if(!valState) return obj[key] = valState
        let objVal = obj[key]
        if(!objVal || objVal.getKey() != valState.key) {
            const catalog = obj.game.catalog
            const cls = catalog.getObjectClass(valState.key)
            const scn = (obj instanceof SceneCommon) ? obj : obj.scene
            objVal = new cls(scn)
            obj[key] = objVal
        }
        objVal.setState(valState)
    }
    initObjectClass(cls) {
        super.initObjectClass(cls)
        cls.prototype[this.key] = this.nullableWith
    }
    initObject(obj, kwargs) {
        super.initObject(obj, kwargs)
        if(!obj.hasOwnProperty(this.key) && this.defaultStateValue) {
            this.setObjectPropFromState(obj, this.defaultStateValue)
        }
    }
    createInput(obj) {
        const objVal = obj[this.key]
        const { catalog } = obj.game
        const inputEl = newDomEl("div")
        const selectEl = inputEl.selectEl = addNewDomEl(inputEl, "dmg-object-selector")
        let filterFun = null
        if(this.filter) filterFun = obj => filterObject(this.filter, obj)
        selectEl.initCatalog(catalog, filterFun)
        const statesEl = addNewDomEl(inputEl, "dmg-object-state", {
            style: { display: "none" }
        })
        const showObjectStates = objVal => {
            statesEl.style.display = ""
            statesEl.initObject(objVal)
        }
        if(objVal) {
            selectEl.setSelectedObject(objVal.getKey())
            showObjectStates(objVal)
        }
        selectEl.addEventListener("change", () => {
            this.syncObjectFromInput(inputEl, obj)
            showObjectStates(obj[this.key])
        })
        return inputEl
    }
    syncObjectFromInput(inputEl, obj) {
        const objKey = inputEl.selectEl.value
        this.setObjectPropFromState(obj, { key: objKey })
    }
}


export function filterObject(filterDesc, obj) {
    if(filterDesc.category) {
        const objCat = obj.category
        if(!objCat || !objCat.startsWith(filterDesc.category)) return false
    }
    if(filterDesc.and) {
        for(let f of filterDesc.and) if(!filterObject(f, obj)) return false
    }
    if(filterDesc.or) {
        for(let f of filterDesc.or) if(!filterObject(f, obj)) return true
        return false
    }
    if(filterDesc.not) {
        return !filterObject(filterDesc.not, obj)
    }
    return true
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


export class Text extends GameObject {

    init(kwargs) {
        super.init(kwargs)
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
        const { viewWidth, viewHeight } = this.scene
        this.x = viewWidth / 2
        this.y = viewHeight / 2
        super.drawTo(ctx)
    }
}

export class GameObjectGroup {

    constructor(scn, kwargs) {
        this.scene = scn
        this.game = scn.game
        this.init(kwargs)
    }

    init(kwargs) {
        this.statelessObjArr = []
        this.statefulObjArr = []
        this.objMap = new Map()
        this._nextAutoStatefulId = 0
        this._nextAutoStatelessId = -1
        this.x = kwargs?.x ?? 0
        this.y = kwargs?.y ?? 0
        if(kwargs?.onAdd) this.onAdd = kwargs.onAdd
    }

    nextAutoId(cls) {
        if(cls.STATEFUL) {
            const res = this._nextAutoStatefulId.toString()
            this._nextAutoStatefulId += 1
            return res
        } else {
            const res = this._nextAutoStatelessId.toString()
            this._nextAutoStatelessId -= 1
            return res
        }
        // this._lastAutoId += 1
        // let res = this._lastAutoId.toString()
        // // be sure that client & leader generate different ids
        // if(this.game.mode == MODE_CLIENT) res += 'C'
        // return res
    }

    resetStatefulIds() {
        const { statefulObjArr, objMap } = this
        for(let obj of statefulObjArr) objMap.delete(obj.id)
        for(let idx in statefulObjArr) {
            const obj = statefulObjArr[idx]
            obj.id = idx.toString()
            this.objMap.set(obj.id, obj)
        }
        this._nextAutoStatefulId = statefulObjArr.length
    }

    add(cls, kwargs) {
        kwargs ||= {}
        kwargs.id ??= this.nextAutoId(cls)
        let obj
        if(typeof cls === 'string') {
            obj = this.scene.createObjectFromKey(cls, kwargs)
        } else {
            obj = new cls(this.scene, kwargs)
        }
        this.objMap.set(kwargs.id, obj)
        if(obj.constructor.STATEFUL) this.statefulObjArr.push(obj)
        else this.statelessObjArr.push(obj)
        this.onAdd(obj)
        return obj
    }

    onAdd(obj) {}

    get(id) {
        return this.objMap.get(id)
    }

    forEach(next) {
        this.statefulObjArr.forEach(obj => {
            if(!obj.removed) next(obj)
        })
        this.statelessObjArr.forEach(obj => {
            if(!obj.removed) next(obj)
        })
    }

    clearRemoved() {
        const { objMap } = this
        const _clearRemoved = arr => {
            let idx = 0, nbEnts = arr.length
            while(idx < nbEnts) {
                const obj = arr[idx]
                if(obj.removed) {
                    arr.splice(idx, 1)
                    objMap.delete(obj.id)
                    nbEnts -= 1
                } else {
                    idx += 1
                }
            }
        }
        _clearRemoved(this.statefulObjArr)
        _clearRemoved(this.statelessObjArr)
    }

    clear() {
        this.forEach(item => item.remove())
        this.statefulObjArr.length = 0
        this.statelessObjArr.length = 0
        this.objMap.clear()
    }

    update() {
        this.clearRemoved()
        this.sortItems()
        this.forEach(obj => obj.update())
    }

    sortItems() {
        const _sort = arr => arr.sort((a, b) => (b.getPriority() - a.getPriority()))
        _sort(this.statefulObjArr)
        _sort(this.statelessObjArr)
    }

    drawTo(gameCtx) {
        this.clearRemoved()
        const x = ~~this.x, y = ~~this.y
        gameCtx.translate(x, y)
        this.forEach(obj => obj.drawTo(gameCtx))
        gameCtx.translate(-x, -y)
    }

    getState(isInitState=false) {
        const state = this._state ||= []
        state.length = 0
        if(isInitState) this.resetStatefulIds()
        this.statefulObjArr.forEach(obj => {
            state.push(obj.getState(isInitState))
        })
        return state
    }

    setState(state, isInitState=false) {
        const { statefulObjArr, statelessObjArr, objMap } = this
        statefulObjArr.length = 0
        if(state) {
            for(let idx in state) {
                if(isInitState) {
                    this.scene.addObject(`A#${idx}`, { id: idx.toString() })
                } else {
                    const objState = state[idx]
                    let { id, key } = objState
                    let obj = objMap.get(id)
                    if(!obj || obj.key != key) {
                        if(obj) obj.remove()
                        obj = this.add(key, { id })
                    }
                    else statefulObjArr.push(obj)
                    obj.setState(objState, isInitState)
                }
            }
            //if(isInitState) this._lastAutoId = state.length - 1
            if(isInitState) this._nextAutoStatefulId = state.length
            if(objMap.size != statefulObjArr.length + statelessObjArr.length) {
                objMap.clear()
                for(let obj of statefulObjArr) objMap.set(obj.id, obj)
                for(let obj of statelessObjArr) objMap.set(obj.id, obj)
            }
        } else this.clear()
    }
}

GameObjectGroup.prototype.on = on
GameObjectGroup.prototype.off = off
GameObjectGroup.prototype.trigger = trigger


export class ObjectRefs extends Set {
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
            const obj = scene.objects.get(id)
            if(!obj || obj.removed) this.delete(id)
        }
    }
    forEach(next) {
        const { scene } = this
        for(let id of this) {
            const obj = scene.objects.get(id)
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


ObjectRefs.StateProperty = class extends StateProperty {
    initObjectClassProp(cls) {
        cls.prototype[this.key] = this.nullableWith
    }
    initObject(obj, kwargs) {
        super.initObject(obj, kwargs)
        obj[this.key] = new ObjectRefs(obj.scene)
    }
    getObjectPropState(obj) {
        const val = obj[this.key]
        return val.getState()
    }
    setObjectPropFromState(obj, valState) {
        const val = obj[this.key]
        val.setState(valState ?? null)
    }
    createInput(obj) {
        // TODO
    }
}


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

        this.scenesPosSizes = {
            game: { visible:true, x:0, y: 0, viewWidth: 0, viewHeight: 0},
            joypad: { visible: false, x:0, y: 0, viewWidth: 0, viewHeight: 0},
        }
        this.scenes = {
            game: new DefaultScene(this)
        }
        this.gameVisible = true
        this.joypadVisible = false
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

    async loadGameScenes() {
        const scnMapId = "0"
        const scnMap = this.map.scenes[scnMapId]
        await this.loadScenesFromMap(scnMap.key, scnMapId)
    }

    async loadScenesFromMap(scnKey, scnMapId=undefined) {
        const { catalog } = this, scnCat = catalog.scenes[scnKey]
        const  { map } = this.game
        const paths = new Set([scnCat.path])
        map.heros.forEach(heroMap => paths.add(catalog.objects[heroMap.key].path))
        const scnMap = (scnMapId !== undefined) ? map.scenes[scnMapId] : null
        if(scnMap) {
            scnMap.objects.forEach(objMap => paths.add(catalog.objects[objMap.key].path))
        }
        const mods = await catalog.preload(Array.from(paths))
        await this.loadScenes(mods[0][scnCat.name], scnMapId)
    }

    async loadScenes(cls, scnMapId=undefined) {
        const scn = this.createScene(cls)
        if(scnMapId !== undefined) scn.loadMap(scnMapId)
        this.scenes.game = scn
        if(this.joypadVisible) await this.loadJoypadScene()
        this.syncSize()
    }

    async setJoypadSceneVisibility(val) {
        if(val == this.joypadVisible) return
        this.joypadVisible = val
        if(val) await this.loadJoypadScene()
        else delete this.scenes.joypad
        this.syncSize()
    }

    createScene(cls, kwargs) {
        return new cls(this, kwargs)
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
            if(joypadScn) joypadScn.update()
        }
        this.syncPauseScenes()
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
        const can = scn.canvas
        if(can.width == 0 || can.height == 0) return
        ctx.drawImage(can, scn.x, scn.y)
    }

    syncSize() {
        const { gameVisible, joypadVisible } = this
        const { game: gameScn, joypad: joypadScn } = this.scenes
        // game
        const gamePS = this.scenesPosSizes.game
        gamePS.visible = gameVisible
        gamePS.x = 0
        gamePS.y = 0
        gamePS.viewWidth = min(gameScn.width, CANVAS_MAX_WIDTH)
        gamePS.viewHeight = min(gameScn.height, CANVAS_MAX_HEIGHT)
        // joypad
        const joypadPS = this.scenesPosSizes.joypad
        if(joypadVisible && joypadScn) {
            joypadPS.visible = joypadVisible
            joypadPS.x = 0
            joypadPS.y = gameVisible ? gamePS.viewHeight : 0
            joypadPS.viewWidth = gamePS.viewWidth
            joypadPS.viewHeight = floor(gamePS.viewWidth * 9 / 16)
        }
        // game
        const width = gamePS.viewWidth
        const height = max(joypadPS.viewHeight, (gameVisible ? gamePS.viewHeight : 0) + ((joypadVisible && joypadScn) ? joypadPS.viewHeight : 0))
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
        // game
        this.scenes.game.pause(val)
        if(val) this.scenes.pause ||= this.scenes.game.createPauseScene()
        else delete this.scenes.pause
        // joypad
        if(this.scenes.joypad) {
            this.scenes.joypad.pause(val)
            if(val) this.scenes.joypadPause ||= this.scenes.joypad.createPauseScene()
            else delete this.scenes.joypadPause
        }
        // state
        if(this.mode == MODE_CLIENT) return this.sendGameInstruction(val ? "pause" : "unpause")
        if(this.mode == MODE_SERVER) this.getAndSendFullState()
        // sync
        this.syncSize()
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


@StateInt.define("height", { default:600, showInBuilder:true })
@StateInt.define("width", { default:800, showInBuilder:true })
export class SceneCommon {

    // static STATE_PROPS = new Map()  // already done by width & height state props
    static MIXINS = new Map()

    constructor(game, kwargs) {
        this.game = game
        this.init(kwargs)
    }

    init(kwargs) {
        this.x = 0
        this.y = 0
        this.viewX = 0
        this.viewY = 0
        this.viewSpeed = 100
        this.visible = true
        this.viewWidth = this.width
        this.viewHeight = this.height
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
        this.objects = new GameObjectGroup(this, {
            onAdd: obj => this.onAddObject(obj)
        })
        this.visuals = new GameObjectGroup(this)
        this.notifs = new GameObjectGroup(this)
        this.heros = {}
        this.map = null
        this.doCreateObjectMapProto = true
        this.constructor.STATE_PROPS.forEach(prop => prop.initObject(this, kwargs))
        this.constructor.MIXINS.forEach(mixin => mixin.initObject(this, kwargs))
    }

    isPausable() {
        return false
    }

    pause(val) {
        if(!this.isPausable()) return
        this.paused = val
    }

    setView(viewX, viewY) {
        const { viewWidth, viewHeight } = this
        this.viewX = sumTo(this.viewX, this.viewSpeed, viewX)
        this.viewY = sumTo(this.viewY, this.viewSpeed, viewY)
        this.viewX = max(0, min(this.width-viewWidth, this.viewX))
        this.viewY = max(0, min(this.height-viewHeight, this.viewY))
    }

    loadMap(scnMapId) {
        this.mapId = scnMapId
        this.map = this.game.map.scenes[scnMapId]
        this.setState(this.map, true)
        this.initWalls()
    }

    initWalls() {
        const mapWalls = this.map?.walls
        if(!mapWalls) return
        mapWalls.forEach(w => {
            const { x1, y1, x2, y2, key } = w
            this.addWall({ x1, y1, x2, y2, key })
        })
    }

    addWall(kwargs) {
        return this.walls.add(Wall, kwargs)
    }

    addObject(cls, kwargs) {
        return this.objects.add(cls, kwargs)
    }

    onAddObject(obj) {}

    createObjectFromKey(key, kwargs) {
        const mapState = this.getObjectMapState(key)
        let origKey
        if(mapState) {
            origKey = key
            key = mapState.key
        }
        const cls = this.game.catalog.getObjectClass(key)
        let obj
        if(mapState) {
            if(this.doCreateObjectMapProto) {
                const proto = new cls(this)
                proto.setState(mapState, true)
                obj = Object.create(proto)
                obj.init(kwargs)
                obj.key = origKey
            } else {
                obj = new cls(this, kwargs)
                obj.setState(mapState, true)
            }
        } else {
            obj = new cls(this, kwargs)
        }
        return obj
    }
    
    getObjectMapState(key) {
        const dotIdx = key.indexOf('.')
        let props = null
        if(dotIdx >= 0) {
            key = key.substring(0, dotIdx)
            props = key.substring(dotIdx+1).split('.')
        }
        let res = null
        if(key.startsWith('A#')) {
            const mapNum = parseInt(key.substring(2))
            res = this.map.objects[mapNum]
        } else if(key.startsWith('H#')) {
            const mapNum = parseInt(key.substring(2))
            res = this.game.map.heros[mapNum]
        }
        if(props) for(let prop of props) {
            res = res[prop]
        }
        return res
    }

    addVisual(cls, kwargs) {
        return this.visuals.add(cls, kwargs)
    }

    addNotif(cls, kwargs) {
        return this.notifs.add(cls, kwargs)
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
        this.syncPosSize()
        this.updateWorld()
        this.notifs.update()
    }

    syncPosSize() {
        const { x, y, viewWidth, viewHeight } = this.game.scenesPosSizes.game
        assign(this, { x, y, viewWidth, viewHeight })
    }

    updateWorld() {
        this.constructor.MIXINS.forEach(mixin => mixin.updateObject(this))
        this.objects.update()
        this.visuals.update()
    }

    draw() {
        const can = this.canvas
        can.width = this.viewWidth
        can.height = this.viewHeight
        const ctx = can.getContext("2d")
        ctx.reset()
        const backgroundCanvas = this.initBackground()
        if(backgroundCanvas) ctx.drawImage(backgroundCanvas, 0, 0)
        this.drawTo(ctx)
    }

    drawTo(ctx) {
        ctx.translate(~~-this.viewX, ~~-this.viewY)
        this.walls.drawTo(ctx)
        this.objects.drawTo(ctx)
        this.visuals.drawTo(ctx)
        ctx.translate(~~this.viewX, ~~this.viewY)
        this.notifs.drawTo(ctx)
    }

    initBackground() {
        if(this.game.isServerEnv) return
        let { backgroundCanvas: can, viewWidth, viewHeight } = this
        if(!viewWidth || !viewHeight) return
        if(!can || can.width != viewWidth || can.height != viewHeight) {
            can = this.backgroundCanvas = this.buildBackground()
        }
        return can
    }

    buildBackground() {
        const { viewWidth, viewHeight } = this
        const can = document.createElement("canvas")
        assign(can, { width: viewWidth, height: viewHeight })
        const ctx = can.getContext("2d")
        if(this.backgroundColor) {
            ctx.fillStyle = this.backgroundColor
            ctx.globalAlpha = this.backgroundAlpha
            ctx.fillRect(0, 0, viewWidth, viewHeight)
        }
        return can
    }

    async loadJoypadScene() {
        return null
    }

    createPauseScene() {
        return null
    }

    getState(isInitState=false) {
        const state = {}
        state.key = this.constructor.KEY
        if(!isInitState) {
            if(this.mapId) state.map = this.mapId
            if(this.paused) state.paused = true
        } else {
            state.width = this.width
            state.height = this.height
        }
        this.constructor.STATE_PROPS.forEach(prop => prop.syncStateFromObject(this, state))
        this.constructor.MIXINS.forEach(mixin => mixin.syncStateFromObject(this, state))
        return state
    }

    setState(state, isInitState=false) {
        if(!isInitState) {
            this.paused = state.paused === true
        }
        this.constructor.STATE_PROPS.forEach(prop => prop.syncObjectFromState(state, this))
        this.constructor.MIXINS.forEach(mixin => mixin.syncObjectFromState(state, this))
    }
}


export class Wall extends GameObject {

    init(kwargs) {
        this.key = kwargs.key
        this.x1 = kwargs.x1
        this.y1 = kwargs.y1
        this.x2 = kwargs.x2
        this.y2 = kwargs.y2
        this.canBlock = true
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
    onBlock(obj) {}
}


// GAME //////////////////////////

export const GAME_STEP_DEFAULT = 0
export const GAME_STEP_WAITING = 1
export const GAME_STEP_GAMING = 2

export class Game extends GameCommon {

    constructor(parentEl, catalog, map, playerId, kwargs) {
        super(parentEl, catalog, map, kwargs)

        this.step = GAME_STEP_DEFAULT

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
        if(this.isDebugMode) this.setDebugSceneVisibility(true)

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

    setGameSceneVisibility(val) {
        if(val == this.gameVisible) return
        this.gameVisible = val
        const scn = this.scenes.game
        if(!scn) return
        this.syncSize()
    }

    async loadJoypadScene() {
        const joypadScn = await this.scenes.game.loadJoypadScene()
        if(joypadScn) this.scenes.joypad = joypadScn
        else delete this.scenes.joypad
    }

    async loadWaitingScenes() {
        await this.loadScenes(WaitingScene)
    }

    setDebugSceneVisibility(val) {
        if(val) this.debugScene ||= new DebugScene(this)
        else delete this.debugScene
        this.syncSize()
    }

    syncPauseScenes() {
        const { game: gameScn, joypad: joypadScn } = this.scenes
        if(gameScn.paused) {
            this.scenes.pause ||= gameScn.createPauseScene(this)
            this.scenes.joypadPause ||= joypadScn && joypadScn.createPauseScene(this)
        } else {
            delete this.scenes.pause
            delete this.scenes.joypadPause
        }
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
        if(joypadScn && !gameScn.paused) joypadScn.update()
        this.syncPauseScenes()
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
        const gameScn = this.scenes.game
        if(this.players[playerId] === undefined) {
            if(this.map.heros.length > 0) kwargs.heroKey = `H#0`  // TODO: impl hero selection
            this.players[playerId] = kwargs
        }
        if(gameScn.addHero) gameScn.addHero(playerId)
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


@CATALOG.registerScene("default", {
    showInBuilder: false,
})
export class DefaultScene extends SceneCommon {

    buildBackground() {
        const { viewWidth, viewHeight } = this
        const can = document.createElement("canvas")
        assign(can, { width: viewWidth, height: viewHeight })
        const ctx = can.getContext("2d")
        ctx.fillStyle = "black"
        ctx.fillRect(0, 0, viewWidth, viewHeight)
        const text = newTextCanvas("DRAWMYGAME", { fillStyle: "white" })
        ctx.drawImage(text, floor((viewWidth-text.width)/2), floor((viewHeight-text.height)/2))
        return can
    }
}


export class GameScene extends SceneCommon {
    init(kwargs) {
        super.init(kwargs)
        this.step = "GAME"
        this.herosSpawnX = 50
        this.herosSpawnY = 50
        this.scores = {}
        this.seed = floor(random()*1000)
    }

    isPausable() {
        return true
    }

    loadMap(scnMapId) {
        super.loadMap(scnMapId)
        this.initHeros()
        this.physics = new PhysicsEngine(this)
    }

    initHeros() {
        this.initHerosSpawnPos()
        if(this.game.mode == MODE_CLIENT) return  // objects are init by first full state
        for(let playerId in this.game.players) this.addHero(playerId)
    }

    addHero(playerId) {
        const player = this.game.players[playerId]
        if(!player) return
        const prevHero = this.getHero(playerId)
        if(prevHero && !prevHero.removed) return
        const { heroKey } = player
        if(!heroKey) return
        const hero = this.addObject(heroKey, { playerId })
        this.spawnHero(hero)
        return hero
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
        this.physics.apply(dt, this.objects)
        super.updateWorld()
        this.handleHerosOut()
    }

    updateStepGame() {
        this.updateWorld()
    }

    updateStepGameOver() {
        this.updateWorld()
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
            if(hero.y > this.height + 100) {
                this.onHeroOut(hero)
            }
        }
    }

    onHeroOut(hero) {
        hero.onAttack(1, null, true)
        if(hero.getHealth() > 0) this.spawnHero(hero)
    }

    drawTo(ctx) {
        super.drawTo(ctx)
        this.notifs.drawTo(ctx)
        if(this.step == "VICTORY" && this.victoryNotifs) this.victoryNotifs.drawTo(ctx)
        if(this.step == "GAMEOVER" && this.gameOverNotifs) this.gameOverNotifs.drawTo(ctx)
    }

    filterObjects(key, filter) {
        const objsCache = this._filteredObjectsCache ||= new Map()
        if(objsCache.iteration !== this.iteration) {
            objsCache.clear()
            objsCache.iteration = this.iteration
        }
        if(!objsCache.has(key)) {
            const cache = []
            this.objects.forEach(obj => {
                if(filter(obj)) cache.push(obj)
            })
            objsCache.set(key, cache)
        }
        return objsCache.get(key)
    }

    initVictoryNotifs() {
        if(this.victoryNotifs) return
        this.victoryNotifs = new GameObjectGroup(this)
        this.victoryNotifs.add(
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
        this.gameOverNotifs.add(
            CenteredText,
            {
                text: "GAME OVER",
                font: "100px serif",
            },
        )
    }

    initHerosSpawnPos() {
        const points = this.filterObjects("heroSpawnPoints", obj => obj instanceof HeroSpawnPoint)
        if(points.length == 0) return
        const firstPoint = points[0]
        this.setHerosSpawnPos(firstPoint.x, firstPoint.y)
    }

    setHerosSpawnPos(x, y) {
        this.herosSpawnX = floor(x)
        this.herosSpawnY = floor(y)
    }

    async loadJoypadScene() {
        const { JoypadGameScene } = await importAndPreload("./joypad.mjs")
        return new JoypadGameScene(this.game)
    }

    getState(isInitState=false) {
        const state = super.getState(isInitState)
        if(isInitState) {
            state.width = this.width
            state.height = this.height
            state.walls = this.getWallsState()
        } else {
            state.it = this.iteration
            state.step = this.step
            state.hsx = this.herosSpawnX
            state.hsy = this.herosSpawnY
            state.sco = this.scores
            state.seed = this.seed
        }
        state.objects = this.objects.getState(isInitState)
        if(isInitState) state.links = this.getObjectLinksState()
        return state
    }

    getWallsState() {
        const res = []
        this.walls.forEach(wall => {
            if(wall.removed) return
            const { x1, y1, x2, y2, key } = wall
            res.push({ x1, y1, x2, y2, key })
        })
        return res
    }

    getObjectLinksState() {
        const res = []
        this.objects.forEach(obj => {
            const linksState = obj.getObjectLinksState()
            if(linksState) for(let linkState of linksState) res.push(linkState)
        })
        return res
    }

    setState(state, isInitState=false) {
        super.setState(state, isInitState)
        if(!isInitState) {
            this.iteration = state.it
            this.step = state.step
            this.setHerosSpawnPos(state.hsx, state.hsy)
            this.scores = state.sco
            this.seed = state.seed
        }
        this.objects.setState(state.objects, isInitState)
        if(isInitState) this.setObjectLinksFromState(state.links)
    }

    setObjectLinksFromState(state) {
        if(!state) return
        for(let linkState of state) {
            const actionObjId = linkState[0]
            const actionObj = this.objects.get(actionObjId)
            actionObj.addObjectLinkFromState(linkState)
        }
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

    createPauseScene() {
        return new PauseScene(this.game)
    }
}


// MIXIN ///////////////////////////////

export class Mixin {
    static IS_MIXIN = true

    static TARGET_DECORATORS = []
    static addTargetDecorator(cls, funcName, ...args) {
        if(!this.hasOwnProperty('TARGET_DECORATORS')) this.TARGET_DECORATORS = [...this.TARGET_DECORATORS]
        this.TARGET_DECORATORS.push([cls, funcName, args])
    }

    static add(kwargs) {
        return target => {
            if(target.IS_MIXIN) {
                target.addTargetDecorator(this, "add", kwargs)
                return target
            }
            const mixin = new this(kwargs)
            mixin.initObjectClass(target)
            return target
        }
    }

    static addIfAbsent(kwargs) {
        return target => {
            if(target.IS_MIXIN) {
                target.addTargetDecorator(this, "addIfAbsent", kwargs)
                return target
            }
            if(target.MIXINS && target.MIXINS.has(this.KEY)) return
            this.add(kwargs)(target)
        }
    }

    static delete() {
        return target => {
            if(target.IS_MIXIN) {
                target.addTargetDecorator(this, "delete")
                return target
            }
            if(!target.hasOwnProperty('MIXINS')) target.MIXINS = new Map(target.MIXINS)
            target.MIXINS.delete(this.KEY)
        }
    }

    constructor(kwargs) {
        this.init(kwargs)
    }

    init(kwargs) {}

    initObjectClass(cls) {

        if(!cls.hasOwnProperty('MIXINS')) cls.MIXINS = new Map(cls.MIXINS)
        cls.MIXINS.set(this.constructor.KEY, this)

        this.constructor.TARGET_DECORATORS.forEach(deco => {
            const [decoCls, funcName, args] = deco
            decoCls[funcName](...args)(cls)
        })
    }
    initObject(obj, kwargs) {}
    updateObject(obj) {}
    syncStateFromObject(obj, state) {}
    syncObjectFromState(state, obj) {}
}



@LinkReaction.add("reactToggle", { label:"Toggle", isDefault: true })
@StateBool.define("activated", { showInBuilder: true, default: true })
export class ActivableMixin extends Mixin {
    static KEY = "activable"

    initObjectClass(cls) {
        super.initObjectClass(cls)
        const proto = cls.prototype

        proto.origActivated = true

        proto.reactToggle = function(resp) {
            this.activated = (resp.value >= .5) ? (!this.origActivated) : this.origActivated
        }
    }

    initObject(obj, kwargs) {
        super.initObject(obj, kwargs)
        obj.origActivated = obj.activated
    }
}


export class BodyMixin extends Mixin {
    static KEY = "body"

    init(kwargs) {
        super.init(kwargs)
        this.shape = kwargs?.shape ?? "box"
        this.width = kwargs?.width ?? 50
        this.height = kwargs?.height ?? 50
        this.radius = kwargs?.radius ?? 50
    }
}


@BodyMixin.addIfAbsent()
export class HitMixin extends Mixin {
    static KEY = "hit"

    init(kwargs) {
        super.init(kwargs)
        this.oneHitByObject = kwargs?.oneHitByObject ?? false
        this.canHit = kwargs?.canHit ?? true
        this.canBeHit = kwargs?.canBeHit ?? true
    }

    initObjectClass(cls) {
        super.initObjectClass(cls)
        const proto = cls.prototype

        proto.canHitGroup ||= function(group) { return false }
        proto.canBeHitAsGroup ||= function(group) { return false }
        proto.canHitObject ||= function(obj) { return false }
        proto.hit ||= function(obj) {}
    }
}


@StateInt.define("speedY")
@StateInt.define("speedX")
@HitMixin.addIfAbsent()
@BodyMixin.addIfAbsent()
export class PhysicsMixin extends Mixin {
    static KEY = "physics"

    init(kwargs) {
        super.init(kwargs)
        this.canMove = kwargs?.canMove ?? true
        this.affectedByGravity = kwargs?.affectedByGravity ?? this.canMove
        this.canBlock = kwargs?.canBlock ?? false
        this.canGetBlocked = kwargs?.canGetBlocked ?? this.canMove
        this.checkBlockAnyway = kwargs?.checkBlockAnyway ?? false
        this.checkGetBlockedAnyway = kwargs?.checkGetBlockedAnyway ?? false
    }

    initObjectClass(cls) {
        super.initObjectClass(cls)
        const proto = cls.prototype
        proto.canMove = this.canMove
        proto.affectedByGravity = this.affectedByGravity
        proto.canBlock = this.canBlock
        proto.canGetBlocked = this.canGetBlocked
        proto.checkBlockAnyway = this.checkBlockAnyway
        proto.checkGetBlockedAnyway = this.checkGetBlockedAnyway
        proto.speedResX = 0
        proto.speedResY = 0
        proto.onBlock ||= function(obj) {}
        proto.onGetBlocked ||= function(obj) {}

        const origCanHitGroup = proto.canHitGroup
        proto.canHitGroup = function(group) {
            if(group == "physics" && (this.canBlock || this.checkBlockAnyway)) return true
            return origCanHitGroup.call(this, group)
        }
        const origCanBeHitAsGroup = proto.canBeHitAsGroup
        proto.canBeHitAsGroup = function(group) {
            if(group == "physics" && (this.canGetBlocked || this.checkGetBlockedAnyway)) return true
            return origCanBeHitAsGroup.call(this, group)
        }

        proto.canReallyBlockObject = function(obj) {
            return (
                (this.canBlock || this.checkBlockAnyway)
                && (obj.canGetBlocked || obj.checkGetBlockedAnyway)
                && !(this.canBlock && obj.canGetBlocked) // in this case the check is already done by physics engine
            )
        }
        const origCanHitObject = proto.canHitObject
        proto.canHitObject = function(obj) {
            return this.canReallyBlockObject(obj) || origCanHitObject.call(this, obj)
        }

        const origHit = proto.hit
        proto.hit = function(obj) {
            origHit.call(this, obj)
            if(this.canBlock || this.checkBlockAnyway) this.onBlock(obj)
            if(this.canGetBlocked || this.checkGetBlockedAnyway) obj.onGetBlocked(this)
        }
    }

    initObject(obj, kwargs) {
        super.initObject(obj, kwargs)
        if(kwargs?.speedX !== undefined) obj.speedX = kwargs.speedX
        if(kwargs?.speedY !== undefined) obj.speedY = kwargs.speedY
    }

    updateObject(obj) {
        // done by physics engine
    }
}


@StateObjectRef.define("owner")
export class OwnerableMixin extends Mixin {
    static KEY = "ownerable"

    init(kwargs) {
        this.removedWithOwner = kwargs?.removedWithOwner ?? true
    }

    initObjectClass(cls) {
        super.initObjectClass(cls)
        const proto = cls.prototype

        proto.removedWithOwner = this.removedWithOwner
    }

    initObject(obj, kwargs) {
        super.initObject(obj, kwargs)
        obj.owner = kwargs?.owner ?? null
    }

    updateObject(obj) {
        super.updateObject(obj)
        const { owner } = obj
        if(owner && owner.removed) {
            obj.owner = null
            if(obj.removedWithOwner) obj.remove()
        }
    }
}


@StateInt.define("damages")
@StateInt.define("lastDamageAge", { default: Infinity, nullableWith: Infinity })
@ObjectRefs.StateProperty.define("attackedObjects")
@HitMixin.addIfAbsent()
export class AttackMixin extends Mixin {
    static KEY = "health"

    init(kwargs) {
        super.init(kwargs)
        this.canAttack = kwargs?.canAttack ?? true
        this.canGetAttacked = kwargs?.canGetAttacked ?? true
        this.maxHealth = kwargs?.maxHealth ?? 100
        this.attackDamages = kwargs?.attackDamages ?? 0
        this.oneAttackByObject = kwargs?.oneAttackByObject ?? false
        this.graceDuration = kwargs?.graceDuration ?? 0
    }

    initObjectClass(cls) {
        super.initObjectClass(cls)
        const proto = cls.prototype

        proto.canAttack = this.canAttack
        proto.canGetAttacked = this.canGetAttacked
        proto.graceDuration = this.graceDuration
        proto.maxHealth = this.maxHealth
        proto.attackDamages = this.attackDamages

        const origCanHitGroup = proto.canHitGroup
        proto.canHitGroup = function(group) {
            if(group == "health" && this.canAttack && !this.isInGracePeriod()) return true
            return origCanHitGroup.call(this, group)
        }
        const origCanBeHitAsGroup = proto.canBeHitAsGroup
        proto.canBeHitAsGroup = function(group) {
            if(group == "health" && this.canGetAttacked) return true
            return origCanBeHitAsGroup.call(this, group)
        }
        
        proto.getHealth ||= this.objGetHealth
        proto.isInGracePeriod ||= this.objIsInGracePeriod
        proto.oneAttackByObject = this.oneAttackByObject
        proto.canReallyAttackObject = function(obj) {
            if(!this.canAttack) return false
            if(!this.scene.attackManager.canTeamAttack(this.team, obj.team)) return false
            if(this.oneAttackByObject && this.attackedObjects.has(obj.id)) return false
            if(!(obj.canGetAttacked && obj.canGetAttackedByObject(this))) return false
            return this.canAttackObject(obj)
        }
        proto.canGetAttackedByObject ||= function(obj) { return true }
        proto.canAttackObject ||= function(obj) { return true }
        const origCanHitObject = proto.canHitObject
        proto.canHitObject = function(obj) {
            return this.canReallyAttackObject(obj) || origCanHitObject.call(this, obj)
        }

        const origHit = proto.hit
        proto.hit = function(obj) {
            origHit.call(this, obj)
            if(this.canReallyAttackObject(obj)) this.attack(obj)
        }
        proto.attack = this.objAttack
        proto.onAttack ||= function(obj) {}
        proto.getAttacked ||= this.objGetAttacked
        proto.onGetAttacked ||= function(attacker, val) {}
        proto.getAttackOwner ||= this.objGetAttackOwner

        proto.takeDamage ||= this.objTakeDamage
        proto.die ||= this.objDie
        proto.resetOneAttackByObject = this.objResetOneAttackByObject
    }

    updateObject(obj) {
        const { iteration, step } = obj.scene
        const { dt } = obj.game
        if(step != "GAME" || (obj.getHealth() <= 0) || !obj.isInGracePeriod()) obj.spriteVisibility = 1
        else obj.spriteVisibility = (floor(iteration * dt * 100) % 2 == 0) ? 1 : 0
        obj.lastDamageAge += 1
        if(!obj.isInGracePeriod()) obj.lastDamageAge = Infinity
    }

    objGetHealth() {
        return this.maxHealth - this.damages
    }

    objIsInGracePeriod() {
        return this.lastDamageAge < this.graceDuration * this.game.fps
    }

    objAttack(obj) {
        if(this.oneAttackByObject) this.attackedObjects.add(obj.id)
        obj.getAttacked(this.getAttackOwner(), this.attackDamages)
        this.onAttack(obj)
    }

    objGetAttackOwner() {
        return this
    }

    objGetAttacked(attacker, val, force) {
        if(this.getHealth() <= 0) return
        if(!force && this.isInGracePeriod()) return
        if(this.scene.attackManager.canTeamDamage(attacker.team, this.team)) {
            this.takeDamage(val, attacker)
        }
        this.onGetAttacked(attacker, val)
    }

    objTakeDamage(val, attacker) {
        if(val > 0) this.lastDamageAge = 0
        this.damages += val
        //this.trigger("damage", { damager })
        if(this.getHealth() <= 0) {
            this.die(attacker)
        } else if(attacker) {
            this.speedY = -200
            this.speedX = 200 * ((this.x > attacker.x) ? 1 : -1)
        }
    }

    objDie(killer) {
        this.remove()
    }

    objResetOneAttackByObject() {
        this.attackedObjects.clear()
    }
}


@StateProperty.define("ownerId")
@HitMixin.addIfAbsent()
export class CollectMixin extends Mixin {
    static KEY = "collect"

    init(kwargs) {
        super.init(kwargs)
        this.canCollect = kwargs?.canCollect ?? true
        this.canGetCollected = kwargs?.canGetCollected ?? true
        this.origCanGetCollected = this.canGetCollected
    }

    initObjectClass(cls) {
        super.initObjectClass(cls)
        const proto = cls.prototype
        proto.canCollect = this.canCollect
        proto.canGetCollected = this.canGetCollected

        const origCanHitGroup = proto.canHitGroup
        proto.canHitGroup = function(group) {
            if(group == "collect" && this.canCollect) return true
            return origCanHitGroup.call(this, group)
        }
        const origCanBeHitAsGroup = proto.canBeHitAsGroup
        proto.canBeHitAsGroup = function(group) {
            if(group == "collect" && this.canGetCollected) return true
            return origCanBeHitAsGroup.call(this, group)
        }
        
        proto.canReallyCollectObject = function(obj) {
            if(!this.canCollect) return false
            if(!(obj.canGetCollected && obj.canGetCollectedByObject(this))) return false
            return this.canCollectObject(obj)
        }
        proto.canGetCollectedByObject ||= function(obj) { return true }
        proto.canCollectObject ||= function(obj) { return true }
        const origCanHitObject = proto.canHitObject
        proto.canHitObject = function(obj) {
            return this.canReallyCollectObject(obj) || origCanHitObject.call(this, obj)
        }

        const origHit = proto.hit
        proto.hit = function(obj) {
            origHit.call(this, obj)
            if(this.canReallyCollectObject(obj)) this.collect(obj)
        }
        proto.collect = this.objCollect
        proto.onCollect ||= function(obj) {}
        proto.getCollected ||= this.objGetCollected
        proto.onGetCollected ||= function(collector) {}
        proto.getOwner = this.objGetOwner
        proto.drop = this.objDrop
        proto.onDrop ||= function() {}
        const origRemove = proto.remove
        proto.remove = function() {
            origRemove.call(this)
            this.drop()
        }
    }

    updateObject(obj) {
        if(this.origCanGetCollected) obj.canGetCollected = (obj.ownerId === null)
    }

    objCollect(obj) {
        if(obj.getCollected) obj.getCollected(this)
        this.onCollect(obj)
    }

    objGetCollected(collector) {
        this.ownerId = collector.id
        this.onGetCollected(collector)
    }

    objGetOwner() {
        const { ownerId } = this
        if(ownerId === null) return null
        return this.scene.objects.get(ownerId)
    }

    objDrop() {
        if(!this.ownerId) return
        this.ownerId = null
        this.onDrop()
    }
}


// OBJECTS ///////////////////////////////////


@StateInt.define("lastSpawnIt", { default: -Infinity })
@CollectMixin.add({
    canCollect: true,
    canGetCollected: false,
})
@AttackMixin.add({
    canAttack: false,
    canGetAttacked: true,
    graceDuration: 2,
})
@Category.append("hero")
export class Hero extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.team = "hero"
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
        const extras = this.extras ||= new ObjectRefs(this.scene)
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

    update() {
        super.update()
        this.updateSpawnEffect()
    }

    updateSpawnEffect() {
        const { lastSpawnIt } = this
        const { iteration } = this.scene
        const { fps } = this.game
        if(lastSpawnIt + fps > iteration) {
            if(!this._spawnEnt) this._spawnEnt = this.addSpawnEffect()
        } else {
            delete this._spawnEnt
            this.lastSpawnIt = -Infinity
        }
    }

    addSpawnEffect() {
        return this.scene.addVisual(Pop, {
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
        return state
    }

    setState(state) {
        super.setState(state)
        this.setPlayerId(state.pid)
        this.inputState = state.ist
        if(this.extras || state.extras) {
            const extras = this.initExtras()
            extras.clear()
            if(state.extras) for(let exId of state.extras) extras.add(exId)
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

    spawn(x, y) {
        this.x = x + floor((random()-.5) * 50)
        this.y = y
        this.speedX = 0
        this.speedY = -200
        this.lastSpawnIt = this.scene.iteration
    }

    remove() {
        super.remove()
        this.scene.syncHero(this)
    }
}


export const PuffAud = CATALOG.registerAudio("/static/core/assets/puff.opus")


const SmokeExplosionSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/core/assets/smoke_explosion.png"), 4, 1)

@CATALOG.registerObject("smokee", {
    showInBuilder: false
})
@StateInt.define("iteration")
export class SmokeExplosion extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 100
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

    init(kwargs) {
        super.init(kwargs)
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

@AttackMixin.add()
@Category.append("npc/enemy")
export class Enemy extends GameObject {

    // in case Enemy if added HitMixin
    canHitCategory(cat) {
        return cat.startsWith("hero/")
    }

    die() {
        const { x, y } = this
        this.scene.addVisual(SmokeExplosion, { x, y })
        this.game.audio.playSound(PuffAud)
        this.remove()
    }
}


export const ItemAud = CATALOG.registerAudio("/static/core/assets/item.opus")

@StateProperty.define("ownerId")
@HitMixin.add({
    canHit: false,
})
@Category.append("item/collectable")
export class Collectable extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.canBeCollected = true
        this.ownerId = kwargs?.ownerId ?? null
        this.spriteRand = floor(random() * this.game.fps)
    }

    update() {
        super.update()
        this.canBeHit = (this.ownerId == null)
    }

    getOwner() {
        const { ownerId } = this
        if(ownerId === null) return null
        return this.scene.objects.get(ownerId)
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

@CollectMixin.add({
    canCollect: false,
    canGetCollected: true,
})
@Category.append("extra")
export class Extra extends GameObject {

    getPriority() {
        const owner = this.getOwner()
        if(owner) return owner.getPriority() - 1
        else super.getPriority()
    }

    onGetCollected(owner) {
        owner.addExtra(this)
    }

    onDrop() {
        const owner = this.getOwner()
        if(owner) owner.dropExtra(this)
    }
}


class PauseScene extends SceneCommon {

    init(kwargs) {
        super.init(kwargs)
        this.backgroundColor = "lightgrey"
        this.backgroundAlpha = .5
        this.pauseText = this.addNotif(Text, {
            text: "PAUSE",
            font: "bold 50px arial",
            fillStyle: "black",
        })
        this.syncPosSize()
        this.syncTextPos()
    }

    update() {
        this.syncPosSize()
        this.syncTextPos()
    }

    syncTextPos() {
        assign(this.pauseText, { x: this.viewWidth/2, y: this.viewHeight/2 })
    }

    drawTo(ctx) {
        this.notifs.drawTo(ctx)
    }
}


export class PlayerIcon extends GameObject {
    init(kwargs) {
        super.init(kwargs)
        this.playerId = kwargs.playerId
        this.strokeColor = kwargs?.strokeColor ?? "black"
        this.initSprite()
    }
    initSprite() {
        if(IS_SERVER_ENV) return
        const { playerId } = this
        const player = this.game.players[playerId]
        const can = document.createElement("canvas")
        can.width = can.height = 36
        const ctx = can.getContext("2d")
        ctx.beginPath()
        ctx.arc(floor(can.width/2), floor(can.height/2), 15, 0, 2 * PI)
        ctx.strokeStyle = this.strokeColor
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.fillStyle = player.color
        ctx.fill()
        this.sprite = new Sprite(can)
    }
    getSprite() {
        return this.sprite
    }
}


export class PlayerText extends Text {
    init(kwargs) {
        super.init(kwargs)
        this.playerId = kwargs.playerId
    }
    update() {
        const { playerId } = this
        const player = this.game.players[playerId]
        this.text = player.name
    }
}


@CATALOG.registerScene("waiting", {
    showInBuilder: false,
})
export class WaitingScene extends SceneCommon {

    init(kwargs) {
        super.init(kwargs)
        this.backgroundColor = "black"
        this.playerObjs = new Map()
        this.initTitleText()
        this.initQrcodeSprite()
    }

    initTitleText() {
        const titleTxt = this.addNotif(Text, {
            text: "WAITING PLAYERS",
            font: "bold 50px arial",
            fillStyle: "white",
        })
        titleTxt.syncPos = () => {
            titleTxt.x = this.viewWidth/2
            titleTxt.y = this.viewHeight/6
        }
        hackMethod(titleTxt, "update", 0, evt => titleTxt.syncPos())
        titleTxt.syncPos()
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

    update() {
        this.notifs.update()
        this.syncPlayerObjs()
        this.playerObjs.forEach(objs => objs.update())
    }

    syncPlayerObjs() {
        const { playerObjs, viewWidth, viewHeight } = this
        const { players } = this.game
        // add & place players
        let numPlayer = 0
        for(let playerId in players) {
            const grp = this.initPlayerObjGroup(playerId)
            grp.x = viewWidth/2
            grp.y = viewHeight/3 + (numPlayer * 40)
            numPlayer += 1
        }
        // rm removed players
        for(let playerId in playerObjs)
            if(!(playerId in players))
                playerObjs.remove(playerId)
    }

    initPlayerObjGroup(playerId) {
        const { game, playerObjs } = this
        let grp = playerObjs.get(playerId)
        if(!grp) {
            grp = new GameObjectGroup(this)
            playerObjs.set(playerId, grp)
            grp.add(PlayerIcon, { x: 15, y: 15, playerId, width: 30, height: 30, strokeColor: "white" })
            const txt = grp.add(PlayerText, { y: 15, playerId, font: "bold 30px arial", fillStyle: "white" })
            txt.sync = () => {
                txt.x = 35 + txt.width/2
                txt.updateText(game.players[playerId]?.name ?? "")
            }
            txt.sync()
            hackMethod(txt, "update", 0, evt => txt.sync())
        }
        return grp
    }

    drawTo(ctx) {
        this.notifs.drawTo(ctx)
        this.playerObjs.forEach(objs => objs.drawTo(ctx))
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


class DebugScene extends SceneCommon {

    init(kwargs) {
        super.init(kwargs)
        this.backgroundColor = null
        const fontArgs = {
            font: "20px arial",
            fillStyle: "grey"
        }
        this.syncPosSize()
        this.updDurTxt = this.addNotif(Text, assign({ x:this.game.width - 90, y:15 }, fontArgs))
        this.drawDurTxt = this.addNotif(Text, assign({ x:this.game.width - 90, y:40 }, fontArgs))
        this.lagTxt = this.addNotif(Text, assign({ x:this.game.width - 90, y:65 }, fontArgs))
    }

    update() {
        this.syncPosSize()
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

    init(kwargs) {
        super.init(kwargs)
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
    init(kwargs) {
        super.init(kwargs)
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


@CATALOG.registerObject("hero", {
    label: "Hero",
    icon: PopImg,
})
export class HeroSpawnPoint extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 50
    }

    getSprite() {
        return PopSprite
    }
}


@CATALOG.registerObject("spawn", {
    label: "ObjectSpawner",
    icon: PopImg,
})
@ObjectRefs.StateProperty.define("spawnedObjects")
@StateInt.define("lastSpawnIt", { default: -Infinity })
@StateInt.define("nbSpawn")
@StateInt.define("maxLiving", { default: 10, nullableWith: Infinity, showInBuilder: true })
@StateInt.define("max", { default:Infinity, nullableWith: Infinity, showInBuilder: true })
@StateInt.define("period", { default:1, showInBuilder: true })
@GameObject.StateProperty.define("model", { showInBuilder: true })
@ActivableMixin.add()
export class ObjectSpawner extends GameObject {
    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 50
    }
    update() {
        super.update()
        this.spawnedObjects.update()
        if(this.nbSpawn >= this.max && this.spawnedObjects.size == 0) this.remove()
        this.maySpawnObject()
    }
    maySpawnObject() {
        if(!this.activated) return
        if(this.nbSpawn >= this.max) return
        if(this.scene.iteration < this.lastSpawnIt + ceil(this.period * this.game.fps)) return
        if(this.spawnedObjects.size >= this.maxLiving) return
        this.spawnObject()
    }
    spawnObject() {
        const { scene, model } = this
        if(!model) return
        const obj = scene.addObject(model.getKey())
        const state = {
            ...model.getState(),
            x: this.x,
            y: this.y,
        }
        obj.setState(state)
        this.nbSpawn += 1
        this.spawnedObjects.add(obj.id)
        this.lastSpawnIt = scene.iteration
        scene.addVisual(Pop, { x:this.x, y:this.y })
        return obj
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


class HackEvent {
    constructor(inputArgs) {
        this.inputArgs = inputArgs
        this.returnValue = undefined
        this.continue = true
    }
    stopPropagation() {
        this.continue = false
    }
}


class Hack {
    constructor(obj, methodName, hackFun) {
        this.obj = obj
        this.methodName = methodName
        this.hackFun = hackFun
        this.removed = false
    }

    remove() {
        if(this.removed) return
        const { obj, methodName, hackFun } = this
        const hacks = obj[methodName]?.hacks
        if(!hacks) return
        const idx = hacks.indexOf(hackFun)
        if(idx < 0) return
        hacks.splice(idx, 1)
        obj[methodName].hackPriorities.splice(idx, 1)
        this.removed = true
    }
}


export function hackMethod(obj, methodName, priority, hackFun) {
    if(obj[methodName].hacks === undefined) {
        const origMethod = obj[methodName]
        const hacks = [], hackPriorities = []
        obj[methodName] = function(...args) {
            const evt = new HackEvent(args)
            let idx=0, nbHacks=hacks.length
            for(; idx<nbHacks; ++idx) {
                if(hackPriorities[idx] < 0) break
                hacks[idx](evt)
                if(!evt.continue) return evt.returnValue
            }
            evt.returnValue = origMethod.apply(obj, evt.inputArgs)
            for(; idx<nbHacks; ++idx) {
                hacks[idx](evt)
                if(!evt.continue) return evt.returnValue
            }
            return evt.returnValue
        }
        obj[methodName].hacks = hacks
        obj[methodName].hackPriorities = hackPriorities
    }
    const hacks = obj[methodName].hacks
    const hackPriorities = obj[methodName].hackPriorities
    let idx
    for(idx in hacks) if(hackPriorities[idx] < priority) break
    hacks.splice(idx, 0, hackFun)
    hackPriorities.splice(idx, 0, priority)
    return new Hack(obj, methodName, hackFun)
}
