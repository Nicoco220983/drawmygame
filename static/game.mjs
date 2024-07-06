const { assign } = Object
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, addToLoads, checkAllLoadsDone, checkHit, sumTo, newCanvas } = utils

const FPS = 60
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
        const outBin = await this.exportAsSafeBase64()
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

function range(start, end) {
    const res = []
    for(let i=start; i<end; ++i) res.push(i)
    return res
}

export const Loads = []

function _waitLoad(load) {
    return new Promise((ok, ko) => {
        const __waitLoad = () => {
            if (load.loaded) return ok()
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
class Img extends Image {
    constructor(src) {
        super()
        this.src = src
        Loads.push(this)
        this.onload = () => this.loaded = true
        this.onerror = () => this.loadError = `load error: ${src}`
    }
}

class SpriteSheet {
    constructor(src, nbCols, nbRows, kwargs) {
        this.src = src
        this.nbCols = nbCols
        this.nbRows = nbRows
        this.frames = []
        assign(this, kwargs)
        if(!IS_SERVER_ENV) this.load()
    }
    async load() {
        if (this.loaded) return
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
        }
        this.loaded = true
    }
    getFrame(num) {
        const frames = this.frames
        while (frames.length <= num) frames.push(newCanvas(0, 0))
        return frames[num]
    }
}

class Sprite {
    constructor(img) {
        this.baseImg = img
        this.transImgs = {}
    }
    getImg(width, height, dirX, dirY) {
        const key = `${width}:${height}:${dirX}:${dirY}`
        let res = this.transImgs[key]
        if(res) return res
        const { baseImg } = this
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

class Entity {

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
        if(img) ctx.drawImage(img, ~~(this.x - this.width/2), ~~(this.y - this.height/2))
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

    toState() {
        const state = this.state ||= {}
        state.x = this.x
        state.y = this.y
        return state
    }

    fromState(state) {
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

// class Group extends Array {

//     constructor(scn) {
//         super()
//         this.x = 0
//         this.y = 0
//         this.scene = scn
//         this.game = scn.game
//     }

//     add(item) {
//         this.push(item)
//         return item
//     }

//     cleanRemoved() {
//         let j = 0
//         this.forEach((item, i) => {
//             if(item.removed) return
//             if(i !== j) this[j] = item
//             j++
//         })
//         this.length = j
//     }

//     update(time) {
//         this.forEach(ent => ent.update(time))
//     }

//     drawTo(gameCtx) {
//         this.cleanRemoved()
//         const x = ~~this.x, y = ~~this.y
//         gameCtx.translate(x, y)
//         this.forEach(ent => ent.drawTo(gameCtx))
//         gameCtx.translate(-x, -y)
//     }
// }

class Group {

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

    toState() {
        const { items } = this
        const res = {}
        for(let key in items) res[key] = items[key].toState()
        return res
    }

    fromState(state) {
        const { items } = this
        for(let key in state) items[key].fromState(state[key])
        for(let key in items) if(!state[key]) items[key].remove()
    }

    getInputState() {
        const res = {}
        const { items } = this
        for(let key in items) {
            const item = items[key]
            const inputState = item.getInputState && item.getInputState()
            res[key] = inputState
        }
        return res
    }

    setInputState(inputState) {
        const { items } = this
        for(let key in inputState) items[key].setInputState(inputState[key])
    }
}

class GameCommon {

    constructor(wrapperEl, map) {
        this.isServerEnv = IS_SERVER_ENV
        if(!this.isServerEnv) {
            this.canvas = document.createElement("canvas")
            this.offscreenCanvas = document.createElement("canvas")
            assign(this.canvas.style, {
                outline: "2px solid grey"
            })
            wrapperEl.appendChild(this.canvas)
        }

        this.game = this
        this.map = map

        this.syncSize()
    }

    setMainScene(scn) {
        if(this.mainScene !== undefined) this.mainScene.remove()
        this.mainScene = scn
    }

    update(time) {
        this.mainScene.update(time)
    }

    draw() {
        if(this.isServerEnv) return
        const bkgCtx = this.offscreenCanvas.getContext("2d")
        bkgCtx.fillStyle = "white"
        bkgCtx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height)
        this.drawTo(bkgCtx)
        const ctx = this.canvas.getContext("2d")
        ctx.drawImage(this.offscreenCanvas, 0, 0)
    }

    drawTo(ctx) {
        this.mainScene.drawTo(ctx)
    }

    syncSize() {
        const width = min(this.map.width, CANVAS_MAX_WIDTH)
        const height = min(this.map.height, CANVAS_MAX_HEIGHT)
        assign(this, { width, height })
        if(!this.isServerEnv) {
            assign(this.canvas, { width, height })
            assign(this.offscreenCanvas, { width, height })
        }
        if(this.mainScene) this.mainScene.syncSize()
    }
}

export class GameBuilder extends GameCommon {

    constructor(wrapperEl, map) {
        super(wrapperEl, map)
        
        self.mode = 'move'
        self.modeKey = null
        this.syncMode()

        this.pointer = utils.newPointer(this)
        this.pointer.prevIsDown = false

        this.setMainScene(new BuilderScene(this))
    }

    play() {
        const beginTime = Date.now() / 1000
        setInterval(() => {
            this.update(Date.now() / 1000 - beginTime)
            this.draw()
        }, 1000 / FPS)
    }

    update(time) {
        super.update(time)
        this.pointer.prevIsDown = this.pointer.isDown
    }

    syncMode() {
        const { mode } = this
        if(mode == "move") this.canvas.style.cursor = "move"
        else this.canvas.style.cursor = "cell"
    }
}

class SceneCommon {

    constructor(game) {
        this.game = game
        this.x = 0
        this.y = 0
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
        ent.key = key
        return ent
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

class BuilderScene extends SceneCommon {

    syncSize() {
        super.syncSize()
        this.syncGrid()
    }

    syncGrid() {
        this.grid ||= new Entity(this)
        this.grid.x = this.width / 2
        this.grid.y = this.height / 2
        this.grid.width = this.width
        this.grid.height = this.height
        const can = newCanvas(this.width, this.height)
        const ctx = can.getContext("2d")
        ctx.strokeStyle = "lightgrey"
        const addLine = (x1, y1, x2, y2) => {
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
        }
        const { nbCols, nbRows, boxSize, width, height } = this.game.map
        for(let x=1; x<nbCols; ++x) addLine(boxSize*x, 0, boxSize*x, height)
        for(let y=1; y<nbRows; ++y) addLine(0, boxSize*y, width, boxSize*y)
        this.grid.sprite = new Sprite(can)
    }

    update(time) {
        const { mode } = this.game
        if(mode == "move") this.updateMove()
        else if(mode == "wall") this.updateWall()
        else if(mode == "erase") this.eraseEntity()
        else if(mode == "entity") this.updateEntity()
    }

    updateMove() {
        const { pointer, map } = this.game
        if(pointer.isDown) {
            if(!this.moveOrig) this.moveOrig = {
                pointerX: pointer.x,
                pointerY: pointer.y,
                thisX: this.x,
                thisY: this.y,
            }
            this.x = this.moveOrig.thisX + pointer.x - this.moveOrig.pointerX
            this.x = min(0, max(this.game.width - map.width, this.x))
            this.y = this.moveOrig.thisY + pointer.y - this.moveOrig.pointerY
            this.y = min(0, max(this.game.height - map.height, this.y))
        } else {
            this.moveOrig = null
        }
    }

    updateWall() {
        const { pointer } = this.game
        const { boxSize, walls } = this.game.map
        if(pointer.isDown) {
            const boxX = floor((pointer.x - this.x) / boxSize)
            const boxY = floor((pointer.y - this.y) / boxSize)

            const prevWallKey = walls[boxX][boxY]
            if(this.currentWallKey === null) this.currentWallKey = prevWallKey ? 0 : "W"
            // case delete
            if(this.currentWallKey === 0) {
                if(prevWallKey !== null) {
                    walls[boxX][boxY] = null
                    this.walls.forEach(w => {
                        if(w.boxX == boxX && w.boxY == boxY) w.remove()
                    })
                }
                return
            }
            // case new box
            if(prevWallKey !== null && this.currentWallKey == prevWallKey) return
            this.addWall(boxX, boxY, this.currentWallKey)
            walls[boxX][boxY] = this.currentWallKey
        } else {
            this.currentWallKey = null
        }
    }

    eraseEntity() {
        const { pointer, map } = this.game
        if(pointer.isDown && !pointer.prevIsDown) {
            const x = pointer.x - this.x
            const y = pointer.y - this.y
            this.entities.forEach(ent  => {
                const { left, width, top, height } = ent.getHitBox()
                if(left <= x && left+width >= x && top <= y && top+height >= y) {
                    ent.remove()
                    map.entities.splice(map.entities.indexOf(ent.mapRef), 1)
                }
            })
        }
    }

    updateEntity() {
        const { pointer, modeKey } = this.game
        if(pointer.isDown && !pointer.prevIsDown) {
            const x = pointer.x - this.x
            const y = pointer.y - this.y
            const ent = this.addEntity(x, y, modeKey)
            ent.mapRef = { x, y, key: modeKey }
            this.game.map.entities.push(ent.mapRef)
        }
    }

    drawTo(ctx) {
        this.walls.drawTo(ctx)
        this.grid.drawTo(ctx)
        this.entities.drawTo(ctx)
    }
}


// GAME //////////////////////////

export class Game extends GameCommon {

    constructor(wrapperEl, map, kwargs) {
        super(wrapperEl, map)

        this.players = {}

        this.setMainScene(new GameScene(this))

        this.sendState = (kwargs && kwargs.sendState) || null
        this.lastSendStateTime = -SEND_STATE_PERIOD

        this.sendInputState = (kwargs && kwargs.sendInputState) || null
        this.lastSendInputStateTime = -SEND_INPUT_STATE_PERIOD

        this.keysPressed = {}
        if(!this.isServerEnv) {
            document.addEventListener('keydown', evt => {this.keysPressed[evt.key] = true})
            document.addEventListener('keyup', evt => delete this.keysPressed[evt.key])
        }    
    }

    play() {
        const beginTime = Date.now() / 1000
        setInterval(() => {
            const time = Date.now() / 1000 - beginTime
            this.update(time)
            if(this.sendState && time > this.lastSendStateTime + SEND_STATE_PERIOD) {
                this.sendState(this.toState())
                this.lastSendStateTime = time
            }
            if(this.sendInputState) {
                const inputStateStr = this.getInputState()
                if(this.prevInputStateStr || time > this.lastSendInputStateTime + SEND_INPUT_STATE_PERIOD) {
                    this.sendInputState(inputStateStr)
                    this.prevInputStateStr = inputStateStr
                    this.lastSendInputStateTime = time
                }
            }
            this.draw()
        }, 1000 / FPS)
    }

    addPlayer(wsId, kwargs) {
        this.players[wsId] = kwargs
    }

    toState() {
        const state = this.state ||= {}
        state.players = this.players
        state.main = this.mainScene.toState()
        return JSON.stringify(state)
    }

    fromState(stateStr) {
        const state = JSON.parse(stateStr)
        this.mainScene.fromState(state.main)
    }

    getInputState() {
        const inputState = this.inputState ||= {}
        inputState.main = this.mainScene.getInputState()
        return JSON.stringify(inputState)
    }

    setInputState(inputStateStr) {
        const inputState = JSON.parse(inputStateStr)
        this.mainScene.setInputState(inputState.main)
    }
}

export class GameScene extends SceneCommon {
    constructor(game) {
        super(game)
        this.notifs = new Group(this)
        this.entities.forEach(ent => { if(ent instanceof Hero) this.initHero(ent) })
        this.step = "GAME"
    }

    initHero(hero) {
        this.hero = hero
        this.hearts = new Group(this)
        for(let i=0; i<hero.life; ++i)
            this.hearts.add(new Heart(this, i))
    }

    syncHearts() {
        if(!this.hearts) return
        this.hearts.forEach(heart => {
            heart.setFull(heart.num < this.hero.life)
        })
    }

    update(time) {
        this.applyPhysics(time)
        this.entities.forEach(e => e.update(time))
    }

    drawTo(ctx) {
        this.walls.drawTo(ctx)
        this.entities.drawTo(ctx)
        if(this.hearts) this.hearts.drawTo(ctx)
        this.notifs.drawTo(ctx)
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

    toState() {
        const state = this.state ||= {}
        state.entities = this.entities.toState()
        return state
    }

    fromState(state) {
        this.entities.fromState(state.entities)
    }

    getInputState() {
        const inputState = this.inputState ||= {}
        inputState.entities = this.entities.getInputState()
        return inputState
    }

    setInputState(inputState) {
        this.entities.setInputState(inputState.entities)
    }
}

// ENTITIES ///////////////////////////////////

const Entities = {}


class DynamicEntity extends Entity {
    constructor(scn, x, y) {
        super(scn, x, y)
        this.speedX = this.speedY = 0
        this.speedResX = this.speedResY = 0
        this.undergoGravity = true
        this.undergoWalls = true
    }

    toState() {
        const state = super.toState()
        state.speedX = this.speedX
        state.speedY = this.speedY
        return state
    }

    fromState(state) {
        super.fromState(state)
        this.speedX = state.speedX
        this.speedY = state.speedY
    }
}

class Hero extends DynamicEntity {
    constructor(...args) {
        super(...args)
        this.life = 3
        this.damageLastTime = -3
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

    toState() {
        const state = super.toState()
        state.life = this.life
        return state
    }

    fromState(state) {
        super.fromState(state)
        this.life = state.life
    }

    getInputState() {
        return this.inputState
    }

    setInputState(inputState) {
        this.inputState = inputState
    }
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
        if(this.game.isServerEnv || this.life <= 0) return
        const { keysPressed } = this.game
        this.inputState ||= {}
        if(keysPressed["ArrowRight"]) this.inputState.walkX = 1
        else if(keysPressed["ArrowLeft"]) this.inputState.walkX = -1
        else this.inputState.walkX = 0
        this.inputState.jump = (this.speedResY < 0 && keysPressed["ArrowUp"])
    }

    applyInputState(time) {
        const { inputState } = this
        if(!inputState) return
        if(inputState.walkX > 0) this.speedX = sumTo(this.speedX, 1000/FPS, 300)
        else if(inputState.walkX < 0) this.speedX = sumTo(this.speedX, 1000/FPS, -300)
        else this.speedX = sumTo(this.speedX, 500, 0)
        if(inputState.jump) this.speedY = -500
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

    toState() {
        const state = super.toState()
        state.dirX = this.dirX
        return state
    }

    fromState(state) {
        super.fromState(state)
        this.dirX = state.dirX
    }
}
Entities["nico"] = Nico


const ZombiSpriteSheet = new SpriteSheet("/static/assets/zombi.png", 8, 1)
const ZombiSprites = range(0, 8).map(i => new Sprite(ZombiSpriteSheet.getFrame(i)))

class Zombi extends DynamicEntity {
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
        const { hero } = this.scene
        if(hero && utils.checkHit(this, hero)) hero.damage(1, this)
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
Entities["zombi"] = Zombi

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
        const { hero } = this.scene
        if(hero && utils.checkHit(this, hero)) {
            this.remove()
            this.scene.nbStars -= 1
            if(this.scene.nbStars == 0) this.scene.setStepVictory()
        }
    }
}
Entities["star"] = Star
