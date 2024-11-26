const { assign } = Object
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, addToLoads, checkAllLoadsDone, checkHit, sumTo, newCanvas } = utils
import { GameCommon, SceneCommon, Entity, Entities, Sprite, Hero, now, FPS } from './game.mjs'


// BUILDER //////////////////////////

export class GameBuilder extends GameCommon {

    constructor(parentEl, map, kwargs) {
        super(parentEl, map, kwargs)
        
        this.setMode("move")

        this.initTouches()
    }

    initGameScene() {
        this.gameScene = new BuilderScene(this)
        this.syncSize()
    }

    play() {
        if(this.gameLoop) return
        const beginTime = now()
        this.gameLoop = setInterval(() => {
            this.update()
            this.mayDraw()
        }, 1000 / FPS)
    }

    stop() {
        if(this.gameLoop) clearInterval(this.gameLoop)
        this.gameLoop = null
    }

    update() {
        super.update()
        const touch = this.touches[0]
        this.prevTouchIsDown = Boolean(touch) && touch.isDown
    }

    setMode(mode, modeKey = null) {
        this.mode = mode
        this.modeKey = modeKey
        if(mode == "move") this.canvas.style.cursor = "move"
        else this.canvas.style.cursor = "cell"
        this.gameScene.syncMode()
    }
}


class BuilderScene extends SceneCommon {
    constructor(...args) {
        super(...args)
        this.initHeros()
    }

    initHeros() {
        const mapHeros = this.game.map.heros
        for(let heroDef of mapHeros) {
            const { keys, x, y } = heroDef
            const cls = Entities[keys[0]]
            this.entities.add(new cls(this, x, y))
        }
    }

    setPosAndSize(x, y, width, height) {
        super.setPosAndSize(x, y, width, height)
        this.syncGrid()
    }

    syncGrid() {
        this.grid ||= new Entity(this)
        const { width, height } = this.game.map
        this.grid.x = width / 2
        this.grid.y = height / 2
        this.grid.width = width
        this.grid.height = height
        const can = newCanvas(width, height)
        const ctx = can.getContext("2d")
        ctx.strokeStyle = "lightgrey"
        const addLine = (x1, y1, x2, y2) => {
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
        }
        const boxSize = 20, nbCols = ceil(width/boxSize), nbRows = ceil(height/boxSize)
        for(let x=1; x<nbCols; ++x) addLine(boxSize*x, 0, boxSize*x, height)
        for(let y=1; y<nbRows; ++y) addLine(0, boxSize*y, width, boxSize*y)
        this.grid.sprite = new Sprite(can)
    }

    syncMode() {
        const { mode, modeKey } = this.game
        this.prevTouchX = null
        this.prevTouchY = null
        if(this.draftEntity) {
            this.draftEntity.remove()
            this.draftEntity = null
        }
        if(mode == "entity") {
            this.draftEntity = this.addEntity(0, 0, modeKey)
            this.draftEntity.spriteVisibility = 0
        }
    }

    update() {
        super.update()
        const { mode } = this.game
        this.updateDraftEntity()
        if(mode == "move") this.updateMove()
        else if(mode == "wall") this.addPointedWall()
        else if(mode == "erase") this.erasePointedEntityOrWall()
        else if(mode == "entity") this.addPointedEntity()
    }

    updateDraftEntity() {
        if(!this.draftEntity) return
        const { mode } = this.game
        const touch = this.game.touches[0]
        if(touch) {
            this.draftEntity.spriteVisibility = .5
            if(mode == "entity") {
                this.draftEntity.x = touch.x
                this.draftEntity.y = touch.y
            } else if(mode == "wall") {
                this.draftEntity.x2 = touch.x
                this.draftEntity.y2 = touch.y
            }
        } else {
            this.draftEntity.spriteVisibility = 0
        }
    }

    updateMove() {
        const { touches } = this.game
        const touch = touches[0]
        if(touch && touch.isDown) {
            if(!this.moveOrig) this.moveOrig = {
                touchX: touch.x,
                touchY: touch.y,
                viewX: this.viewX,
                viewY: this.viewY,
            }
            this.setView(
                this.moveOrig.viewX - (touch.x - this.moveOrig.touchX),
                this.moveOrig.viewY - (touch.y - this.moveOrig.touchY),
            )
        } else {
            this.moveOrig = null
        }
    }

    addPointedWall(key) {
        const { touches, prevTouchIsDown } = this.game
        const touch = touches[0]

        if(touch && touch.isDown && !prevTouchIsDown) {
            const touchX = touch.x + this.viewX
            const touchY = touch.y + this.viewY
            if(this.prevTouchX !== null) {
                this.addWallAndSyncMap(this.prevTouchX, this.prevTouchY, touchX, touchY)
            }
            if(!this.draftEntity) {
                this.draftEntity = this.addWall(touchX, touchY, touchX, touchY)
                this.draftEntity.visibility = .5
            } else {
                this.draftEntity.x1 = touchX
                this.draftEntity.y1 = touchY
            }
            this.prevTouchX = touchX
            this.prevTouchY = touchY
        }
    }

    addWallAndSyncMap(x1, y1, x2, y2) {
        const wall = this.addWall(x1, y1, x2, y2)
        wall.mapRef = { x1, y1, x2, y2 }
        this.game.map.walls.push(wall.mapRef)
    }

    removeWallAndSyncMap(wall) {
        wall.remove()
        removeFromArr(this.game.map.walls, wall.mapRef)
    }

    addEntityAndSyncMap(x, y, key) {
        const ent = this.addEntity(x, y, key)
        if(ent instanceof Hero) {
            this.entities.forEach(ent2 => {
                if(ent2 !== ent && ent2 instanceof Hero && ent2 != this.draftEntity)
                    this.removeEntityAndSyncMap(ent2)
            })
            ent.mapRef = { x, y, keys: [key] }
            this.game.map.heros = [ent.mapRef]
        } else {
            ent.mapRef = { x, y, key }
            this.game.map.entities.push(ent.mapRef)
        }
        return ent
    }

    removeEntityAndSyncMap(ent) {
        const { map } = this.game
        ent.remove()
        if(ent instanceof Hero) map.hero = null
        else removeFromArr(map.entities, ent.mapRef)
    }

    erasePointedEntityOrWall() {
        const { touches, prevTouchIsDown } = this.game
        const touch = touches[0]
        if(touch && touch.isDown && !prevTouchIsDown) {
            const x = touch.x + this.viewX, y = touch.y + this.viewY
            // walls
            this.walls.forEach(wall => {
                if(distancePointSegment(x, y, wall.x1, wall.y1, wall.x2, wall.y2) <= 5)
                    this.removeWallAndSyncMap(wall)
            })
            // entities
            this.entities.forEach(ent  => {
                const { left, width, top, height } = ent.getHitBox()
                if(left <= x && left+width >= x && top <= y && top+height >= y) {
                    this.removeEntityAndSyncMap(ent)
                }
            })
        }
    }

    addPointedEntity() {
        const { touches, prevTouchIsDown } = this.game
        const { modeKey } = this.game
        const touch = touches[0]
        if(touch && touch.isDown && !prevTouchIsDown) {
            const x = touch.x + this.viewX
            const y = touch.y + this.viewY
            this.addEntityAndSyncMap(x, y, modeKey)
        }
    }

    drawTo(ctx) {
        ctx.translate(~~-this.viewX, ~~-this.viewY)
        this.walls.drawTo(ctx)
        this.grid.drawTo(ctx)
        this.entities.drawTo(ctx)
    }
}


function removeFromArr(arr, item) {
    arr.splice(arr.indexOf(item), 1)
}


function distancePointSegment(x, y, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    const px = x1 + t * dx, py = y1 + t * dy
    if (t < 0) return sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1))
    else if (t > 1) sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2))
    else return sqrt((x - px) * (x - px) + (y - py) * (y - py))
  }