const { values, assign, getPrototypeOf } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import * as utils from './utils.mjs'
const { now, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newTextCanvas, newDomEl, addNewDomEl, importJs, hasKeys, nbKeys } = utils
import { CATALOG } from './catalog.mjs'
import { StateProperty, StateBool, StateNumber, StateEnum, StateIntEnum, StateString, StateObjectRef } from './stateproperty.mjs'
import { AudioEngine } from './audio.mjs'
import PhysicsEngine from './physics.mjs'
import { GraphicsProps, GraphicsEngine } from './graphics.mjs'
// TODO import only if necessary
import { gzip, ungzip } from '../../deps/pako.mjs'

import * as packLib from '../../deps/pack.mjs'
import * as unpackLib from '../../deps/unpack.mjs'
// useRecords: ensure that a Map is packed/unpacked as a Map
const packr = new packLib.Packr({ useRecords: true })
const unpackr = new unpackLib.Unpackr({ useRecords: true })
export function pack(val) { return packr.pack(val)}
export function unpack(val) { return unpackr.unpack(val) }

export const FPS = 30
const CANVAS_MAX_WIDTH = 800
const CANVAS_MAX_HEIGHT = 600
const MAP_DEFAULT_WIDTH = 800
const MAP_DEFAULT_HEIGHT = 600

export const MSG_KEY_PING = 0
export const MSG_KEY_IDENTIFY_CLIENT = 1
export const MSG_KEY_JOIN_GAME = 2
export const MSG_KEY_STATE = 3
export const MSG_KEY_GAME_INSTRUCTION = 4
export const MSG_KEY_GAME_REINIT = 5
export const MSG_KEY_GAME_STOPPED = 6

export const GAME_INSTR_START = 0
export const GAME_INSTR_RESTART = 1
export const GAME_INSTR_STOP = 2
export const GAME_INSTR_PAUSE = 3
export const GAME_INSTR_UNPAUSE = 4
export const GAME_INSTR_STATE = 5

const STATE_TYPE_FULL = "F"
const STATE_TYPE_INPUT = "I"

const IS_SERVER_ENV = (typeof window === 'undefined')
export const HAS_TOUCH = (!IS_SERVER_ENV) && (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0))

const SEND_PING_PERIOD = 3
const SEND_STATE_PERIOD = 1
const RESEND_INPUT_STATE_PERIOD = .5


class None {}
const Image = (!IS_SERVER_ENV && window.Image) || None

/**
 * Represents an image that can be loaded.
 * @param {string} src The source of the image.
 */
export class Img extends Image {
    constructor(src, doLoad=false) {
        super()
        this._src = src
        this.unloaded = true
        if(doLoad) this.load()
    }

    /**
     * Loads the image.
     * @returns {Promise<void>}
     */
    async load() {
        if(IS_SERVER_ENV) return
        this._loadPrm ||= new Promise((ok, ko) => {
            this.src = this._src
            this.onload = () => { this.unloaded = false; ok() }
            this.onerror = () => { this.unloaded = false; ko() }
        })
        return await this._loadPrm
    }
}

/**
 * Represents an audio that can be loaded.
 * @param {string} src The source of the audio.
 */
export class Aud {
    constructor(src) {
        this.src = src
        this.unloaded = true
    }
    /**
     * Loads the audio.
     * @returns {Promise<void>}
     */
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


// MAP

/**
 * Represents a game map.
 */
export class GameMap {
    constructor() {
        this.perspective = "2Dside"
        this.versions = {
            "std": "v1",
        }
        this.heros = [{
            key: "std:Nico"
        }]
        this.scenes = {}
    }

    /**
     * Exports the map as a binary format.
     * @returns {Uint8Array} The binary data.
     */
    exportAsBinary() {
        const outScns = {}
        for(let scnId in this.scenes) {
            outScns[scnId] = this.scenes[scnId]
        }
        const outObj = {
            hs: this.heros,
            ss: outScns,
        }
        const outPack = pack(outObj)
        const outZip = compress(outPack)
        return outZip
    }
    /**
     * Exports the map as a safe base64 string.
     * @returns {Promise<string>} The base64 string.
     */
    async exportAsSafeBase64() {
        const outBin = this.exportAsBinary()
        const outSB64 = await binToSafeB64(outBin)
        return outSB64
    }

    /**
     * Imports a map from a safe base64 string.
     * @param {string} inSB64 The base64 string.
     */
    async importFromSafeBase64(inSB64) {
        const inBin = await safeB64ToBin(inSB64)
        this.importFromBinary(inBin)
    }
    /**
     * Imports a map from a binary format.
     * @param {Uint8Array} inZip The binary data.
     */
    importFromBinary(inZip) {
        const inPack = decompress(inZip)
        const inObj = unpack(inPack)
        this.heros = inObj.hs
        const scns = this.scenes = {}
        for(let scnId in inObj.ss) {
            scns[scnId] = inObj.ss[scnId]
        }
    }
}

/**
 * Compresses data.
 * @param {Uint8Array} bytes The data to compress.
 * @returns {Uint8Array} The compressed data.
 */
function compress(bytes) {
    return gzip(new Uint8Array(bytes))
}

/**
 * Decompresses data.
 * @param {Uint8Array} compressedBytes The data to decompress.
 * @returns {Uint8Array} The decompressed data.
 */
function decompress(compressedBytes) {
    return ungzip(new Uint8Array(compressedBytes))
}

const BIN_AS_B64_DATA_URL_PREFIX = "data:application/octet-stream;base64,"

/**
 * Converts binary data to a safe base64 string.
 * @param {Uint8Array} bytes The binary data.
 * @returns {Promise<string>} The base64 string.
 */
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

/**
 * Converts a safe base64 string to binary data.
 * @param {string} sb64 The base64 string.
 * @returns {Promise<ArrayBuffer>} The binary data.
 */
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


/**
 * Represents a sprite sheet.
 * @param {HTMLImageElement} img The image of the sprite sheet.
 * @param {number} nbCols The number of columns.
 * @param {number} nbRows The number of rows.
 */
export class SpriteSheet {
    constructor(img, nbCols, nbRows) {
        this.img = img
        this.nbCols = nbCols
        this.nbRows = nbRows
        this.imgs = []
        if(IS_SERVER_ENV) return
        this.unloaded = true
        this.initImgs()
    }
    /**
     * Initializes the images of the sprite sheet.
     */
    initImgs() {
        if(!this.unloaded) return
        const { img, nbRows, nbCols } = this
        if(img.unloaded) return
        const frameWidth = floor(img.width / nbCols)
        const frameHeight = floor(img.height / nbRows)
        for (let j = 0; j < nbRows; ++j) for (let i = 0; i < nbCols; ++i) {
            const can = document.createElement("canvas")
            can.width = frameWidth
            can.height = frameHeight
            can.getContext("2d").drawImage(img, ~~(-i * frameWidth), ~~(-j * frameHeight))
            this.imgs[i + j*nbCols] = can
        }
        this.unloaded = false
    }
    /**
     * Returns an image from the sprite sheet.
     * @param {number} num The number of the image.
     * @param {boolean} loop Whether to loop.
     * @returns {HTMLCanvasElement} The image.
     */
    get(num, loop = false) {
        this.initImgs()
        const { imgs } = this, nbImgs = imgs.length
        if(nbImgs == 0) return null
        if(loop) num = num % nbImgs
        else if(num >= nbImgs) return null
        return imgs[num]
    }
}


// CATEGORY //////////////////////////

/**
 * Represents a category.
 */
export class Category {
    /**
     * Appends a category to a target.
     * @param {string} cat The category to append.
     * @returns {function(object):object} The decorator.
     */
    static append(cat) {
        return target => {
            target.CATEGORY = (target.CATEGORY ?? "/") + cat + "/"
        }
    }
}

export class Dependencies {

    static init() {
        return target => {
            target.load = async function() {
                if(!this.DEPENDENCIES) return
                await Promise.all(this.DEPENDENCIES.map(dep => dep.load()))
            }
        }
    }

    /**
     * Appends a dependency to a target.
     * @param {string} cat The dependency to append.
     * @returns {function(object):object} The decorator.
     */
    static add(...deps) {
        return target => {
            if(!target.hasOwnProperty('DEPENDENCIES')) target.DEPENDENCIES = [...(target.DEPENDENCIES ?? [])]
            for(let dep of deps) target.DEPENDENCIES.push(dep)
        }
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
@StateNumber.define("angle")
@StateIntEnum.define("dirY", { default: 1, options: { '1': "Up", '-1': "Down"} })
@StateIntEnum.define("dirX", { default: 1, options: { '1': "Right", '-1': "Left"} })
@StateNumber.define("z", { precision: .1, showInBuilder: true })
@StateNumber.define("y", { precision: .1, showInBuilder: true })
@StateNumber.define("x", { precision: .1, showInBuilder: true })
@Dependencies.init()
export class GameObject {

    // static STATE_PROPS = new Map()  // already done by x/y/z/... state props
    // static LINK_TRIGGERS = new Map()  // already done by isRemoved/reactRemove links
    // static LINK_REACTIONS = new Map()  // same...
    static MIXINS = new Map()

    static {
        assign(this.prototype, {
            width: 10,
            height: 10,
            color: null,
            visibility: 1,
            removed: false,
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
            if(kwargs.color !== undefined) this.color = kwargs.color
            if(kwargs.visibility !== undefined) this.visibility = kwargs.visibility
        }
        this.constructor.STATE_PROPS.forEach(prop => prop.initObject(this, kwargs))
        this.constructor.MIXINS.forEach(mixin => mixin.init.call(this, kwargs))
    }
    
    getKey() {
        return this.key ?? this.constructor.KEY
    }

    getPriority() {
        return 0
    }

    update() {
        this.constructor.MIXINS.forEach(mixin => mixin.update.call(this))
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
            const trigObj = objLink.triggerObject
            let msg = trigObj[objLink.triggerKey]()
            if(typeof msg == "boolean") msg = msg ? 1 : 0
            if(typeof msg == "number") {
                const _msg = this._linkResp ||= new LinkMessage()
                _msg.value = msg
                msg = _msg
            }
            msg.triggerObject = trigObj
            this[objLink.reactionKey](msg)
        }
    }

    reactRemove(msg) {
        if(msg.value > .5) this.remove()
    }

    getState(isInitState=false) {
        const state = {}
        state.key = this.getKey()
        const id = this.id
        if(id !== undefined) state.id = id
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

    draw(drawer) {
        const props = this.getGraphicsProps()
        if(props) drawer.draw(props)
    }

    getGraphicsProps() {
        const { color } = this
        const img = this.getBaseImg()
        if(!color && !img) return null
        const props = new GraphicsProps()
        props.color = color
        props.img = img
        props.x = this.x
        props.y = this.y
        props.width = this.width ?? 50
        props.height = this.height ?? 50
        props.dirX = this.dirX
        props.dirY = this.dirY
        props.angle = this.angle
        props.order = this.z
        props.visibility = this.visibility
        return props
    }

    getBaseImg() {}
}


GameObject.StateProperty = class extends StateProperty {
    initObjectClassProp(cls) {
        cls.prototype[this.key] = this.nullableWith ?? null
    }
    constructor(key, kwargs) {
        super(key, kwargs)
        this.filter = kwargs?.filter
    }
    getObjectPropState(obj) {
        const val = obj[this.key]
        if(val === (this.nullableWith ?? null)) return null
        return val.getState()
    }
    setObjectPropFromState(obj, valState) {
        const { key } = this
        if(!valState) return valState = this.nullableWith ?? null
        let objVal = obj[key]
        if(!objVal || objVal.getKey() != valState.key) {
            const { map } = obj.game
            const cls = CATALOG.getObject(map.perspective, map.versions, valState.key).cls
            const scn = (obj instanceof SceneCommon) ? obj : obj.scene
            objVal = new cls(scn)
            obj[key] = objVal
        }
        objVal.setState(valState)
    }
    initObject(obj, kwargs) {
        super.initObject(obj, kwargs)
        if(!obj.hasOwnProperty(this.key) && this.defaultStateValue) {
            this.setObjectPropFromState(obj, this.defaultStateValue)
        }
    }
    createObjectInput(obj) {
        const wrapperEl = newDomEl("div", {
            style: {
                display: "flex",
                flexDirection: "column",
                gap: ".2em",
            }
        })
        const superWrapperEl = super.createObjectInput(obj)
        const inputEl = superWrapperEl.querySelector("dmg-object-selector")
        wrapperEl.appendChild(superWrapperEl)
        const stateEl = this.createObjectStateInput(obj)
        wrapperEl.appendChild(stateEl)
        inputEl.addEventListener("change", () => {
            this.syncObjectFromInput(inputEl, obj)
            stateEl.showAndInit(obj[this.key])
        })
        return wrapperEl
    }
    createObjectBaseInput(obj) {
        const objVal = obj[this.key]
        const { map } = obj.game
        const inputEl = addNewDomEl(inputEl, "dmg-object-selector")
        inputEl.init("object", map.perspective, map.versions, true, this.filter)
        if(objVal) inputEl.setSelectedObject(objVal.getKey())
        return inputEl
    }
    createObjectStateInput(obj) {
        const objVal = obj[this.key]
        const stateEl = newDomEl("dmg-object-state", {
            style: { display: "none" }
        })
        stateEl.showAndInit = objVal => {
            stateEl.style.display = ""
            stateEl.initObject(objVal)
        }
        if(objVal) stateEl.showAndInit(objVal)
        return stateEl
    }
    syncObjectFromInput(inputEl, obj) {
        const objKey = inputEl.value
        this.setObjectPropFromState(obj, { key: objKey })
    }
}


export class Text extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.textArgs = kwargs
        this.updateText(kwargs?.text ?? "")
    }

    updateText(text) {
        this.text = text
        this.initBaseImg()
    }

    initBaseImg() {
        const img = this._baseImg = newTextCanvas(this.text, this.textArgs)
        this.width = img?.width ?? 0
        this.height = img?.height ?? 0
    }

    getBaseImg() {
        return this._baseImg
    }
}

class CenteredText extends Text {

    getGraphicsProps() {
        const { viewWidth, viewHeight } = this.scene
        const props = super.getGraphicsProps()
        props.x = viewWidth / 2
        props.y = viewHeight / 2
        return props
    }
}

export class GameObjectGroup {

    constructor(scn, kwargs) {
        this.scene = scn
        this.game = scn.game
        this.init(kwargs)
    }

    init(kwargs) {
        const { scene } = this, { chunkSize } = scene
        this.nbChunksX = (chunkSize == Infinity) ? 1 : ceil(scene.width / chunkSize)
        this.nbChunksY = (chunkSize == Infinity) ? 1 : ceil(scene.height / chunkSize)
        this.chunks = new Map()
        this.objMap = new Map()
        this._nextAutoStatefulObjId = 0
        this._nextAutoStatelessObjId = -1
        this.x = kwargs?.x ?? 0
        this.y = kwargs?.y ?? 0
        if(kwargs?.onAdd) this.onAdd = kwargs.onAdd
    }

    getChunkId(obj) {
        const { x, y } = obj
        const { nbChunksX } = this, { chunkSize } = this.scene
        const res = floor(x / chunkSize) + nbChunksX * floor(y / chunkSize)
        return res
    }

    getChunk(chunkId) {
        const { chunks } = this
        let res = chunks.get(chunkId)
        if(res === undefined) {
            res = []
            chunks.set(chunkId, res)
        }
        return res
    }

    nextAutoId(cls) {
        if(cls.STATEFUL) {
            const res = this._nextAutoStatefulObjId
            this._nextAutoStatefulObjId += 1
            return res
        } else {
            const res = this._nextAutoStatelessObjId
            this._nextAutoStatelessObjId -= 1
            return res
        }
    }

    syncAutoId(objId) {
        objId = parseInt(objId)
        if(objId >= 0) {
            this._nextAutoStatefulObjId = max(this._nextAutoStatefulObjId, objId+1)
        } else {
            this._nextAutoStatelessObjId = min(this._nextAutoStatelessObjId, objId-1)
        }
    }

    add(cls, kwargs) {
        kwargs ||= {}
        let obj
        if(typeof cls === 'string') {
            obj = this.scene.createObjectFromKey(cls, kwargs)
        } else {
            obj = new cls(this.scene, kwargs)
        }
        if(obj.id === undefined) obj.id = this.nextAutoId(obj.constructor)
        else this.syncAutoId(obj.id)
        this.objMap.set(obj.id, obj)
        this.getChunk(this.getChunkId(obj)).push(obj)
        this.onAdd(obj)
        return obj
    }

    onAdd(obj) {}

    get(objId) {
        return this.objMap.get(objId)
    }

    forEach(next) {
        this.objMap.forEach(obj => {
            if(!obj.removed) next(obj)
        })
    }

    update() {
        this.chunks.forEach((chunk, chunkId) => {
            this.sortItems(chunk)
            chunk.forEach(obj => obj.update())
        })
        this.chunks.forEach((chunk, chunkId) => {
            this.cleanChunk(chunkId, chunk)
        })
    }

    cleanChunk(chunkId, chunk) {
        const { objMap } = this
        let idx = 0, nbEnts = chunk.length
        while(idx < nbEnts) {
            const obj = chunk[idx]
            if(obj.removed) {
                // case: removed obj
                chunk.splice(idx, 1); nbEnts -= 1
                objMap.delete(obj.id)
            } else {
                const newChunkId = this.getChunkId(obj)
                if(chunkId != newChunkId) {
                    // case: obj changed chunk
                    chunk.splice(idx, 1); nbEnts -= 1
                    this.getChunk(newChunkId).push(obj)
                } else {
                    // case: default
                    idx += 1
                }
            }
        }
    }

    sortItems(chunk) {
        chunk.sort((a, b) => (b.getPriority() - a.getPriority()))
    }

    draw(drawer) {
        const propss = []
        const objDrawer = this._objDrawer ||= {}
        objDrawer.draw = props => {
            if(!props) return
            props.x += this.x
            props.y += this.y
            propss.push(props)
        }
        this.forEach(obj => obj.draw(objDrawer))
        drawer.draw(...propss)
    }

    getState(isInitState=false) {
        const state = new Map()
        this.chunks.forEach((chunk, chunkId) => {
            const chunkState = []
            state.set(chunkId, chunkState)
            chunk.forEach(obj => {
                if(obj.removed) return
                if(obj.getKey() && (isInitState || obj.constructor.STATEFUL)) {
                    chunkState.push(obj.getState(isInitState))
                }
            })
        })
        return state
    }

    setState(state, isInitState=false) {
        if(!state) {
            this.clear()
            return
        }
        if(isInitState) {
            // initState has only 1 chunk
            const chunkState = state.get(0)
            for(let idx in chunkState) {
                const objState = chunkState[idx]
                const { id: objId } = objState
                this.scene.addObject(`A#${idx}`, { id: objId })
            }
        } else {
            const { objMap } = this
            // store stateful objs ids, and remove them from chunks
            let prevStatefullObjIds = new Set()
            state.forEach((_, chunkId) => {
                const chunk = this.getChunk(chunkId)
                let idx = 0, nbEnts = chunk.length
                while(idx < nbEnts) {
                    const obj = chunk[idx]
                    if(obj.constructor.STATEFUL) {
                        chunk.splice(idx, 1); nbEnts -= 1
                        prevStatefullObjIds.add(obj.id)
                    } else {
                        idx += 1
                    }
                }
            })
            // update/create statefull objs in chunks
            state.forEach((chunkState, chunkId) => {
                const chunk = this.getChunk(chunkId)
                for(let idx in chunkState) {
                    const objState = chunkState[idx]
                    const { id: objId, key } = objState
                    let obj = objMap.get(objId)
                    // case (re-)create obj
                    if(!obj || obj.getKey() != key) {
                        if(obj) obj.remove()
                        obj = this.add(key, { id: objId })
                    }
                    // case update obj
                    else chunk.push(obj)
                    obj.setState(objState, isInitState)
                    prevStatefullObjIds.delete(objId)
                }
            })
            // remove remaining objs in prevStatefullObjIds
            for(let objId of prevStatefullObjIds) {
                const obj = objMap.get(objId)
                obj.remove()
            }
        }
    }

    clear() {
        this.forEach(item => item.remove())
        this.chunks.clear()
        this.objMap.clear()
    }
}


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
    // nullableWith is not implemented here
    initObjectClassProp(cls) {}
    initObject(obj, kwargs) {
        super.initObject(obj, kwargs)
        obj[this.key] = new ObjectRefs(obj.scene)
    }
    getObjectPropState(obj) {
        const val = obj[this.key]
        if(val.size == 0) return undefined
        else return val.getState()
    }
    setObjectPropFromState(obj, valState) {
        const val = obj[this.key]
        val.setState(valState ?? null)
    }
    createObjectBaseInput(obj) {
        // TODO
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
        this.gameLoop = null
        this.iteration = -1
        this.time = 0
        this.fps = FPS
        this.dt = 1/this.fps
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
                try {
                    if(now() >= this.nextFrameTime) {
                        this.updateGameLoop()
                        this.nextFrameTime = max(now(), this.nextFrameTime + 1/this.fps)
                    }
                    tryUpdateGameLoop()
                } catch(err) {
                    console.error(err)
                    // gracefully stop game to not kill server
                    this.stop()
                }
            }, 5)
        }
        tryUpdateGameLoop()
    }

    stop() {
        if(!this.gameLoop) return
        clearTimeout(this.gameLoop)
        this.gameLoop = null
        this.onStop()
    }

    onStop() {
        // to be replaced by game owner
    }

    async loadGameScenes() {
        const scnMapId = "0"
        const scnMap = this.map.scenes[scnMapId]
        await this.loadScenesFromMap(scnMap.key, scnMapId)
    }

    async loadScenesFromMap(scnKey, scnMapId=undefined, scnId=undefined) {
        const { map } = this
        const { perspective, versions } = map
        const scnMap = (scnMapId !== undefined) ? map.scenes[scnMapId] : null
        const objKeysSet = new Set()
        if(scnMap?.objects) scnMap.objects.forEach(objsChunkMap => {
            for(let objMap of objsChunkMap) objKeysSet.add(objMap.key)
        })
        if(map.heros) for(let heroCat of map.heros) objKeysSet.add(heroCat.key)
        const objKeys = Array.from(objKeysSet)
        await Promise.all([
            CATALOG.fetchScenes(perspective, versions, [scnKey]),
            CATALOG.fetchObjects(perspective, versions, objKeys),
        ])
        await Promise.all([
            CATALOG.loadScenes(perspective, versions, [scnKey]),
            CATALOG.loadObjects(perspective, versions, objKeys),
        ])
        await this.loadScenes(scnKey, scnMapId, scnId)
    }

    async loadScenes(cls, scnMapId=undefined, scnId=undefined) {
        const scn = this.createScene(cls, { id: scnId })
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
        const { map } = this.game
        this._nextSceneId ||= 0
        if(kwargs?.id !== undefined) this._nextSceneId = kwargs.id
        else {
            kwargs ||= {}
            kwargs.id = this._nextSceneId
        }
        if(typeof cls === 'string') cls = CATALOG.getScene(map.perspective, map.versions, cls).cls
        const scn = new cls(this, kwargs)
        this._nextSceneId += 1
        return scn
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
        const { game:gameScn, pause:pauseScn, joypad:joypadScn, joypadPause:joypadPauseScn } = this.scenes
        this.drawScene(gameScn)
        this.drawScene(pauseScn)
        this.drawScene(joypadScn)
        this.drawScene(joypadPauseScn)
    }

    drawScene(scn) {
        if(!scn || !scn.visible) return
        const can = scn.draw()
        if(can.width == 0 || can.height == 0) return
        this.canvas.getContext("2d").drawImage(can, scn.x, scn.y)
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
        if(this.mode == MODE_CLIENT) return this.sendGameInstruction(val ? GAME_INSTR_PAUSE : GAME_INSTR_UNPAUSE)
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


@StateNumber.define("gridSize", { default:50, showInBuilder:true })
@StateNumber.define("height", { default:600, showInBuilder:true })
@StateNumber.define("width", { default:800, showInBuilder:true })
@Dependencies.init()
export class SceneCommon {

    // static STATE_PROPS = new Map()  // already done by width & height state props
    static MIXINS = new Map()

    constructor(game, kwargs) {
        this.game = game
        this.init(kwargs)
    }

    init(kwargs) {
        this.id = kwargs?.id
        this.visible = true
        this.chunkSize = kwargs?.chunkSize ?? 1000
        this.x = 0
        this.y = 0
        this.viewX = 0
        this.viewY = 0
        this.viewSpeed = 100
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
            this.graphicsEngine = new GraphicsEngine(this)
        }
        this.objects = new GameObjectGroup(this, {
            onAdd: obj => this.onAddObject(obj)
        })
        this.visuals = new GameObjectGroup(this)
        this.notifs = new GameObjectGroup(this)
        this.heros = {}
        this.map = null
        this.doCreateObjectMapProto = true
        this.constructor.STATE_PROPS.forEach(prop => prop.initObject(this, kwargs))
        this.constructor.MIXINS.forEach(mixin => mixin.init.call(this, kwargs))
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
    }

    addObject(cls, kwargs) {
        return this.objects.add(cls, kwargs)
    }

    onAddObject(obj) {}

    createObjectFromKey(key, kwargs) {
        const { map } = this.game
        const mapState = this.getObjectMapState(key)
        let origKey
        if(mapState) {
            origKey = key
            key = mapState.key
        }
        const cls = CATALOG.getObject(map.perspective, map.versions, key).cls
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
            // initState has only 1 chunk
            res = this.map.objects.get(0)[mapNum]
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
        const { visible, x, y, viewWidth, viewHeight } = this.game.scenesPosSizes.game
        assign(this, { visible, x, y, viewWidth, viewHeight })
    }

    updateWorld() {
        this.constructor.MIXINS.forEach(mixin => mixin.update.call(this))
        this.objects.update()
        this.visuals.update()
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

    draw() {
        const can = this.canvas
        can.width = this.viewWidth
        can.height = this.viewHeight
        const ctx = can.getContext("2d")
        ctx.reset()
        const drawer = this.graphicsEngine
        this.drawBackground(drawer)
        this.objects.x = -this.viewX
        this.objects.y = -this.viewY
        this.objects.draw(drawer)
        this.visuals.x = -this.viewX
        this.visuals.y = -this.viewY
        this.visuals.draw(drawer)
        this.notifs.draw(drawer)
        return can
    }

    drawBackground(drawer) {
        drawer.draw(this.getBackgroundGraphicsProps())
    }

    getBackgroundGraphicsProps() {
        const props = this._backgroundGraphicsProps ||= new GraphicsProps()
        props.color = this.backgroundColor
        props.x = this.viewWidth/2
        props.y = this.viewHeight/2
        props.width = this.viewWidth
        props.height = this.viewHeight
        props.visibility = this.backgroundAlpha
        return props
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
        state.id = this.id
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


// GAME //////////////////////////

export const GAME_STEP_DEFAULT = 0
export const GAME_STEP_WAITING = 1
export const GAME_STEP_GAMING = 2

export class Game extends GameCommon {

    constructor(parentEl, map, playerId, kwargs) {
        super(parentEl, map, kwargs)

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
        await this.loadScenes("std:WaitingScene")
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
        super.draw()
        if(this.isDebugMode) this.pushMetric("drawDur", now() - drawStartTime, this.fps * 5)
        this.drawScene(this.debugScene)
    }

    async startGame() {
        if(this.mode == MODE_CLIENT) return this.sendGameInstruction(GAME_INSTR_START)
        if(this.scenes.game instanceof GameScene) return
        await this.loadGameScenes()
        if(this.mode == MODE_SERVER) this.getAndSendFullState()
    }

    async restartGame() {
        if(this.mode == MODE_CLIENT) return this.sendGameInstruction(GAME_INSTR_RESTART)
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
        const { id: scnId, map: scnMapId, key: scnMapKey } = gameState
        if(gameScn.id != scnId || gameScn.mapId != scnMapId || gameScn.constructor.KEY != scnMapKey) {
            await this.loadScenesFromMap(scnMapKey, scnMapId, scnId)
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
            if(this.isDebugMode) this.log("sendStates", statesToSend)
            this.sendStates(pack(statesToSend))
            statesToSend.length = 0
        }
    }

    getAndSendFullState() {
        const state = this.getState()
        this.statesToSend.length = 0
        this.statesToSend.push(state)
        this._lastSendFullStateTime = this.time
    }

    receiveStatesFromPlayer(playerId, statesBin) {
        const states = unpack(statesBin)
        if(this.isDebugMode) this.log("receiveStatesFromPlayer", playerId, states)
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

    receiveStatesFromLeader(statesBin) {
        const { receivedStates } = this
        this._lastFullStateIt ||= 0
        const states = unpack(statesBin)
        if(this.isDebugMode) this.log("receiveStatesFromLeader", states)
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
        this.scores = new Map()
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
        scores.set(playerId, (scores.get(playerId) ?? 0) + val)
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

    draw() {
        const res = super.draw()
        const drawer = this.graphicsEngine
        this.notifs.draw(drawer)
        if(this.step == "VICTORY" && this.victoryNotifs) this.victoryNotifs.draw(drawer)
        if(this.step == "GAMEOVER" && this.gameOverNotifs) this.gameOverNotifs.draw(drawer)
        return res
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

    initHerosSpawnPos() {}

    setHerosSpawnPos(x, y) {
        this.herosSpawnX = floor(x)
        this.herosSpawnY = floor(y)
    }

    getState(isInitState=false) {
        const state = super.getState(isInitState)
        if(isInitState) {
            state.width = this.width
            state.height = this.height
        } else {
            state.it = this.iteration
            state.step = this.step
            state.hsx = this.herosSpawnX
            state.hsy = this.herosSpawnY
            state.sco = {}
            this.scores.forEach((val, pid) => state.sco[pid] = floor(val))
            state.seed = this.seed
        }
        state.objects = this.objects.getState(isInitState)
        if(isInitState) state.links = this.getObjectLinksState()
        return state
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
            this.scores.clear()
            for(let pid in state.sco) this.scores.set(pid, state.sco[pid])
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
            mixin.initClass(target, mixin.initKwargs)
            return target
        }
    }

    static modify(kwargs) {
        return target => {
            if(target.IS_MIXIN) {
                target.addTargetDecorator(this, "modify", kwargs)
                return target
            }
            const key = this.KEY
            if(!target.MIXINS || !target.MIXINS.has(key)) throw Error(`Mixin "${key}" does not exist in ${target.name}`)
            const parentMixin = target.MIXINS.get(key)
            const mixin = new this({
                ...parentMixin.initKwargs,
                ...kwargs,
            })
            mixin.initClass(target, mixin.initKwargs)
            return target
        }
    }

    static addIfAbsent(kwargs) {
        return target => {
            if(target.IS_MIXIN) {
                target.addTargetDecorator(this, "addIfAbsent", kwargs)
                return target
            }
            const key = this.KEY
            const parentMixin = target.MIXINS && target.MIXINS.has(key)
            if(parentMixin) this.modify(kwargs)(target)
            else this.add(kwargs)(target)
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
        this.initKwargs = kwargs
    }

    initClass(cls, kwargs) {

        if(!cls.hasOwnProperty('MIXINS')) cls.MIXINS = new Map(cls.MIXINS)
        cls.MIXINS.set(this.constructor.KEY, this)

        this.constructor.TARGET_DECORATORS.forEach(deco => {
            const [decoCls, funcName, args] = deco
            decoCls[funcName](...args)(cls, kwargs)
        })
    }
    init(kwargs) {}
    update() {}
    syncStateFromObject(obj, state) {}  // TODO: useful ?
    syncObjectFromState(state, obj) {}
}



@LinkReaction.add("reactToggle", { label:"Toggle", isDefault: true })
@StateBool.define("activated", { showInBuilder: true, default: true })
export class ActivableMixin extends Mixin {
    static KEY = "activable"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.origActivated = true

        proto.reactToggle = this.reactToggle
    }

    init(kwargs) {
        super.init(kwargs)
        this.origActivated = this.activated
    }

    reactToggle(resp) {
        this.activated = (resp.value >= .5) ? (!this.origActivated) : this.origActivated
    }
}


export class BodyMixin extends Mixin {
    static KEY = "body"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.shape = kwargs?.shape ?? "box"
        proto.width = kwargs?.width ?? 50
        proto.height = kwargs?.height ?? 50
        proto.radius = kwargs?.radius ?? 50

        proto.getBodyPolygon ||= this.getBodyPolygon
    }

    getBodyPolygon() {
        const pol = this._bodyPolygons ||= []
        pol.length = 0
        if(this.shape == "box") {
            const { x, y, width, height } = this
            const hWidth = width/2, hHeight = height/2
            const xMin = x-hWidth, yMin = y-hHeight, xMax = x+hWidth, yMax = y+hHeight
            pol.push(
                xMin, yMin,
                xMax, yMin,
                xMax, yMax,
                xMin, yMax,
            )
        }
        return pol
    }
}


@BodyMixin.addIfAbsent()
export class HitMixin extends Mixin {
    static KEY = "hit"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.canHitGroup ||= function(group) { return false }
        proto.canBeHitAsGroup ||= function(group) { return false }
        proto.canHitObject ||= function(obj) { return false }
        proto.hit ||= function(obj, details) {}

        proto.getHitProps ||= this.getHitProps
    }

    getHitProps(dt) {
        const props = this._hitProps ||= {}
        props.polygon = this.getBodyPolygon()
        props.dx = (this.speedX ?? 0) * dt
        props.dy = (this.speedY ?? 0) * dt
        props.uniDirX = props.uniDirY = null
        return props
    }
}


@StateNumber.define("speedY")
@StateNumber.define("speedX")
@HitMixin.addIfAbsent()
@BodyMixin.addIfAbsent()
export class PhysicsMixin extends Mixin {
    static KEY = "physics"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.canMove = kwargs?.canMove ?? true
        proto.affectedByGravity = kwargs?.affectedByGravity ?? proto.canMove
        proto.canBlock = kwargs?.canBlock ?? false
        proto.canGetBlocked = kwargs?.canGetBlocked ?? proto.canMove
        proto.checkBlockAnyway = kwargs?.checkBlockAnyway ?? false
        proto.checkGetBlockedAnyway = kwargs?.checkGetBlockedAnyway ?? false
        proto.physicsBounciness = kwargs?.physicsBounciness ?? 0
        proto.physicsStaticFriction = kwargs?.physicsStaticFriction ?? Infinity
        proto.physicsDynamicFriction = kwargs?.physicsDynamicFriction ?? Infinity

        proto.onBlock ||= function(obj, details) {}
        proto.onGetBlocked ||= function(obj, details) {}

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
        proto.hit = function(obj, details) {
            origHit.call(this, obj, details)
            if((this.canBlock || this.checkBlockAnyway) && obj.canGetBlocked) this.onBlock(obj, details)
            if((obj.canGetBlocked || obj.checkGetBlockedAnyway) && this.canBlock) obj.onGetBlocked(this, details)
        }
    }

    init(kwargs) {
        super.init(kwargs)
        if(kwargs?.speedX !== undefined) this.speedX = kwargs.speedX
        if(kwargs?.speedY !== undefined) this.speedY = kwargs.speedY
    }

    update() {
        // done by physics engine
    }
}


@StateObjectRef.define("owner")
export class OwnerableMixin extends Mixin {
    static KEY = "ownerable"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.removedWithOwner = kwargs?.removedWithOwner ?? true
    }

    init(kwargs) {
        super.init(kwargs)
        this.owner = kwargs?.owner ?? null
    }

    update() {
        super.update()
        const { owner } = this
        if(owner && owner.removed) {
            this.owner = null
            if(this.removedWithOwner) this.remove()
        }
    }
}


class AttackProps {

    static {
        assign(this.prototype, {
            damages: 0,
            knockback: 0,
            knockbackAngle: 0,
        })
    }

    constructor(attacker, kwargs) {
        this.attacker = attacker
        assign(this, kwargs)
    }
}


@HitMixin.addIfAbsent()
@StateNumber.define("damages")
@StateProperty.define("attackAges")
export class AttackMixin extends Mixin {
    static KEY = "attack"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.canAttack = kwargs?.canAttack ?? true
        proto.canGetAttacked = kwargs?.canGetAttacked ?? true
        proto.maxHealth = kwargs?.maxHealth ?? 100
        proto.attackDamages = kwargs?.attackDamages ?? 0
        proto.attackKnockback = kwargs?.attackKnockback ?? 0
        proto.attackPeriod = kwargs?.attackPeriod ?? 1
        proto.getDamagedAge = Infinity

        const origCanHitGroup = proto.canHitGroup
        proto.canHitGroup = function(group) {
            if(group == "health" && this.canAttack) return true
            return origCanHitGroup.call(this, group)
        }
        const origCanBeHitAsGroup = proto.canBeHitAsGroup
        proto.canBeHitAsGroup = function(group) {
            if(group == "health" && this.canGetAttacked) return true
            return origCanBeHitAsGroup.call(this, group)
        }
        
        proto.getHealth ||= this.getHealth
        const canReallyAttackObject = function(obj) {
            if(!this.canAttack) return false
            if(!this.scene.attackManager.canTeamAttack(this.team, obj.team)) return false
            const { attackPeriod, attackAges } = this
            if(attackPeriod != 0 && attackAges) {
                const attackAge = attackAges[obj.id]
                if(attackAge !== undefined && attackAge <= attackPeriod * this.game.fps) return false
            }
            if(!(obj.canGetAttacked && obj.canGetAttackedByObject(this))) return false
            return this.canAttackObject(obj)
        }
        proto.canGetAttackedByObject ||= function(obj) { return true }
        proto.canAttackObject ||= function(obj) { return true }
        const origCanHitObject = proto.canHitObject
        proto.canHitObject = function(obj) {
            return canReallyAttackObject.call(this, obj) || origCanHitObject.call(this, obj)
        }

        const origHit = proto.hit
        proto.hit = function(obj, details) {
            origHit.call(this, obj, details)
            if(canReallyAttackObject.call(this, obj)) this.attack(obj)
        }
        proto.getAttackProps ||= AttackMixin.getAttackProps
        proto.attack = this.attack
        proto.onAttack ||= function(obj, props) {}
        proto.getAttacked ||= this.getAttacked
        proto.onGetAttacked ||= function(props) {}

        proto.getDamaged ||= this.getDamaged
        proto.die ||= this.die

        const origGetGraphicsProps = proto.getGraphicsProps
        proto.getGraphicsProps = function() {
            const props = origGetGraphicsProps.call(this)
            if(this.getDamagedAge <= 5) props.colorize = "red"
            return props
        }
    }

    update() {
        const { attackPeriod, attackAges } = this
        if(attackPeriod != 0 && attackAges) {
            const attackPeriodIt = attackPeriod * this.game.fps
            let atLeastOneId = false
            for(let id in attackAges) {
                const age = attackAges[id]
                if(age > attackPeriodIt) delete attackAges[id]
                else {
                    attackAges[id] = age + 1
                    atLeastOneId = true
                }
            }
            if(!atLeastOneId) this.attackAges = null
        }
        this.getDamagedAge += 1
    }

    getHealth() {
        return this.maxHealth - this.damages
    }

    attack(obj) {
        if(this.attackPeriod != 0) {
            const attackAges = this.attackAges ||= {}
            attackAges[obj.id] = 0
        }
        const props = this.getAttackProps(obj)
        obj.getAttacked(props)
        this.onAttack(obj, props)
    }

    getAttacked(props) {
        if(this.getHealth() <= 0) return
        const { attacker, damages } = props
        if(this.scene.attackManager.canTeamDamage(attacker.team, this.team)) {
            this.getDamaged(damages, props)
        }
        const knockback = props?.knockback
        if(knockback) {
            const knockbackAngle = props.knockbackAngle * PI / 180
            this.speedX = knockback * cos(knockbackAngle)
            this.speedY = knockback * sin(knockbackAngle)
        }
        this.onGetAttacked(props)
    }

    getDamaged(damages, props) {
        this.damages += damages
        this.getDamagedAge = 0
        const attacker = props?.attacker
        if(this.getHealth() <= 0) {
            this.die(attacker)
        } else if(attacker) {
            this.speedY = -200
            this.speedX = 200 * ((this.x > attacker.x) ? 1 : -1)
        }
    }

    die(killer) {
        this.remove()
    }
}

AttackMixin.getAttackProps = function(obj) {
    const props = this._attackProps ||= new AttackProps(this, {
        damages: this.attackDamages,
        knockback: this.attackKnockback,
        knockbackAngle : atan2(obj.y-this.y, obj.x-this.x) * 180 / PI
    })
    return props
}


@HitMixin.addIfAbsent()
@OwnerableMixin.addIfAbsent()
export class CollectMixin extends Mixin {
    static KEY = "collect"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.canCollect = kwargs?.canCollect ?? true
        proto.canGetCollected = kwargs?.canGetCollected ?? true

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
        
        const canReallyCollectObject = function(obj) {
            if(!this.canCollect) return false
            if(obj.owner) return false
            if(!(obj.canGetCollected && obj.canGetCollectedByObject(this))) return false
            return this.canCollectObject(obj)
        }
        proto.canGetCollectedByObject ||= function(obj) { return true }
        proto.canCollectObject ||= function(obj) { return true }
        const origCanHitObject = proto.canHitObject
        proto.canHitObject = function(obj) {
            return canReallyCollectObject.call(this, obj) || origCanHitObject.call(this, obj)
        }

        const origHit = proto.hit
        proto.hit = function(obj, details) {
            origHit.call(this, obj, details)
            if(canReallyCollectObject.call(this, obj)) this.collect(obj)
        }
        proto.collect = this.collect
        proto.onCollect ||= function(obj) {}
        proto.getCollected ||= this.getCollected
        proto.onGetCollected ||= function(collector) {}
        proto.drop = this.drop
        proto.onDrop ||= function(owner) {}
        const origRemove = proto.remove
        proto.remove = function() {
            origRemove.call(this)
            this.drop()
        }
    }

    collect(obj) {
        if(obj.getCollected) obj.getCollected(this)
        this.onCollect(obj)
    }

    getCollected(collector) {
        this.owner = collector
        this.onGetCollected(collector)
    }

    drop() {
        const { owner } = this
        if(!owner) return
        this.owner = null
        this.onDrop(owner)
    }
}


// OBJECTS ///////////////////////////////////

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

    draw() {
        const can = this.canvas
        can.width = this.viewWidth
        can.height = this.viewHeight
        const ctx = can.getContext("2d")
        ctx.reset()
        const drawer = this.graphicsEngine
        this.drawBackground(drawer)
        this.notifs.draw(drawer)
        return this.canvas
    }
}


export class PlayerIcon extends GameObject {
    init(kwargs) {
        super.init(kwargs)
        this.playerId = kwargs.playerId
        this.strokeColor = kwargs?.strokeColor ?? "black"
    }

    getBaseImg() {
        let baseImg = this._baseImg
        if(baseImg) return baseImg
        const { playerId } = this
        const player = this.game.players[playerId]
        baseImg = this._baseImg = document.createElement("canvas")
        baseImg.width = baseImg.height = 36
        const ctx = baseImg.getContext("2d")
        ctx.beginPath()
        ctx.arc(floor(baseImg.width/2), floor(baseImg.height/2), 15, 0, 2 * PI)
        ctx.strokeStyle = this.strokeColor
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.fillStyle = player.color
        ctx.fill()
        return baseImg
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
        if(player) this.text = player.name
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
    
    draw() {
        const can = this.canvas
        can.width = this.viewWidth
        can.height = this.viewHeight
        const ctx = can.getContext("2d")
        ctx.reset()
        const drawer = this.graphicsEngine
        this.updDurTxt.draw(drawer)
        this.drawDurTxt.draw(drawer)
        this.lagTxt.draw(drawer)
        return this.canvas
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
