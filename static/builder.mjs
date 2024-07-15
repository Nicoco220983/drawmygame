const { assign } = Object
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, addToLoads, checkAllLoadsDone, checkHit, sumTo, newCanvas } = utils
import { GameCommon, SceneCommon, Entity, Sprite, Hero, now, FPS } from './game.mjs'


// BUILDER //////////////////////////

export class GameBuilder extends GameCommon {

    constructor(wrapperEl, map) {
        super(wrapperEl, map)
        
        self.mode = 'move'
        self.modeKey = null
        this.syncMode()

        // this.initPointer()
        this.initTouches()

        this.addBuilderScene()
    }

    addBuilderScene() {
        this.mainScene = new BuilderScene(this)
        this.syncSize()
    }

    play() {
        const beginTime = now()
        setInterval(() => {
            this.update(now() - beginTime)
            this.draw()
        }, 1000 / FPS)
    }

    update(time) {
        super.update(time)
        this.prevHasTouches = this.touches.length > 0
    }

    syncMode() {
        const { mode } = this
        if(mode == "move") this.canvas.style.cursor = "move"
        else this.canvas.style.cursor = "cell"
    }
}


class BuilderScene extends SceneCommon {

    setPosAndSize(x, y, width, height) {
        super.setPosAndSize(x, y, width, height)
        this.syncGrid()
    }

    syncGrid() {
        this.grid ||= new Entity(this)
        const { nbCols, nbRows, boxSize, width, height } = this.game.map
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
        for(let x=1; x<nbCols; ++x) addLine(boxSize*x, 0, boxSize*x, height)
        for(let y=1; y<nbRows; ++y) addLine(0, boxSize*y, width, boxSize*y)
        this.grid.sprite = new Sprite(can)
    }

    update(time) {
        super.update(time)
        const { mode } = this.game
        if(mode == "move") this.updateMove()
        else if(mode == "wall") this.updateWall()
        else if(mode == "erase") this.removePointedEntity()
        else if(mode == "entity") this.updateEntity()
    }

    updateMove() {
        const { map, touches } = this.game
        if(touches.length > 0) {
            const touch = touches[0]
            if(!this.moveOrig) this.moveOrig = {
                touchX: touch.x,
                touchY: touch.y,
                thisX: this.x,
                thisY: this.y,
            }
            this.x = this.moveOrig.thisX + touch.x - this.moveOrig.touchX
            this.x = min(0, max(this.width - map.width, this.x))
            this.y = this.moveOrig.thisY + touch.y - this.moveOrig.touchY
            this.y = min(0, max(this.height - map.height, this.y))
        } else {
            this.moveOrig = null
        }
    }

    updateWall() {
        const { touches } = this.game
        const { boxSize, walls } = this.game.map
        if(touches.length > 0) {
            const touch = touches[0]
            const boxX = floor((touch.x - this.x) / boxSize)
            const boxY = floor((touch.y - this.y) / boxSize)

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

    addEntity(x, y, key) {
        const ent = super.addEntity(x, y, key)
        if(ent instanceof Hero) this.entities.forEach(ent2 => {
            if(ent2 != ent && ent2 instanceof Hero) this.removeEntity(ent2)
        })
        return ent
    }

    removeEntity(ent) {
        const { map } = this.game
        ent.remove()
        map.entities.splice(map.entities.indexOf(ent.mapRef), 1)
    }

    removePointedEntity() {
        const { touches, prevHasTouches } = this.game
        if(touches.length > 0 && !prevHasTouches) {
            const touch = touches[0]
            const x = touch.x - this.x
            const y = touch.y - this.y
            this.entities.forEach(ent  => {
                const { left, width, top, height } = ent.getHitBox()
                if(left <= x && left+width >= x && top <= y && top+height >= y) {
                    this.removeEntity(ent)
                }
            })
        }
    }

    updateEntity() {
        const { touches, prevHasTouches } = this.game
        const { modeKey } = this.game
        if(touches.length > 0 && !prevHasTouches) {
            const touch = touches[0]
            const x = touch.x - this.x
            const y = touch.y - this.y
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
