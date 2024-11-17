
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'
import { loadImg, Sprite, SpriteSheet, Entity, Group, Entities, range } from "./game.mjs"
import { cloneCanvas, colorizeCanvas } from "./utils.mjs"


export class JoypadScene {

    constructor(game) {
        this.scene = this
        this.game = game
        this.x = 0
        this.y = 0
        // this.pointer = null
        if(!this.game.isServerEnv) {
            this.canvas = document.createElement("canvas")
        }
        this.game.initTouches()
        this.buttons = new ButtonsRow(this)
        this.syncLocalPlayerButtons()
    }

    setPosAndSize(x, y, width, height) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        if(this.canvas) {
            this.canvas.width = width
            this.canvas.height = height
        }
        this.buttons.x = floor(width / 2)
        this.buttons.y = floor(height / 2)
        this.buttons.width = width
        this.buttons.height = height
        this.buttons.syncPosAndSize()
    }

    syncLocalPlayerButtons() {
        const localPlayer = this.game.players[this.game.localPlayerId]
        if(!localPlayer) return
        const heroKey = localPlayer.hero.key
        if(heroKey == this.heroKey) return
        this.heroKey = heroKey
        this.removeButtons()
        const heroCls = Entities[heroKey]
        heroCls.initJoypadButtons(this)
    }
    addRow() {
        return this.buttons.addRow()
    }
    addColumn() {
        return this.buttons.addColumn()
    }
    addButton(desc) {
        return this.buttons.addButton(desc)
    }

    removeButtons() {
        this.buttons.remove()
    }

    update() {
        // this.syncPointer()
        this.buttons.update()
    }

    onTouch() {
        this.checkBoutonsHit()
    }

    checkBoutonsHit() {
        this.buttons.checkHit()
    }

    draw() {
        const ctx = this.canvas.getContext("2d")
        ctx.fillStyle = "black"
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        this.drawTo(ctx)
    }

    drawTo(ctx) {
        this.buttons.drawTo(ctx)
    }
}

class ButtonsGroup {
    constructor(owner) {
        this.owner = owner
        this.scene = owner.scene
        this.game = owner.game
        this.x = 0
        this.y = 0
        this.width = 100
        this.height = 100
        this.items = []
    }
    forEach(next) {
        for(let item of this.items) next(item)
    }
    addRow() {
        const res = new ButtonsRow(this)
        this.items.push(res)
        this.syncPosAndSize()
        return res
    }
    addColumn() {
        const res = new ButtonsColumn(this)
        this.items.push(res)
        this.syncPosAndSize()
        return res
    }
    addButton(desc) {
        const res = new Button(this.scene, desc)
        this.items.push(res)
        this.syncPosAndSize()
        return res
    }
    // pure abstract
    // syncPosAndSize() {}
    update() {
        this.forEach(b => b.update())
    }
    checkHit() {
        this.forEach(b => b.checkHit())
    }
    drawTo(ctx) {
        this.forEach(b => b.drawTo(ctx))
    }
    remove() {
        this.forEach(b => b.remove())
        this.items.length = 0
    }
}

class ButtonsRow extends ButtonsGroup {
    syncPosAndSize() {
        const { x, y, width, height, items } = this
        const nbItems = items.length
        const itemWidth = floor(width / nbItems)
        for(let i=0; i<nbItems; ++i) {
            const item = items[i]
            item.x = floor(x - width * .5 + itemWidth * (i + .5))
            item.y = y
            item.width = itemWidth
            item.height = height
            if(item.syncPosAndSize) item.syncPosAndSize()
        }
    }
}

class ButtonsColumn extends ButtonsGroup {
    syncPosAndSize() {
        const { x, y, width, height, items } = this
        const nbItems = items.length
        const itemHeight = floor(height / nbItems)
        for(let i=0; i<nbItems; ++i) {
            const item = items[i]
            item.x = x
            item.y = floor(y - height * .5 + itemHeight * (i + .5))
            item.width = width
            item.height = itemHeight
            if(item.syncPosAndSize) item.syncPosAndSize()
        }
    }
}


const BurronImgPrm = loadImg("/static/assets/button_colorable.png")
const ButtonSpriteSheets = {
    spritesheets: {},
    get: function(color) {
        return this.spritesheets[color] ||= new SpriteSheet((async () => {
            let img = await BurronImgPrm
            if(color) img = colorizeCanvas(cloneCanvas(img), color)
            return img
        })(), 2, 1)
    },
}

class Button extends Entity {
    constructor(scn, desc) {
        super(scn)
        this.key = desc.key
        this.isDown = false
        this.disabled = desc.disabled
        this.icon = desc.icon
    }

    checkHit() {
        if(this.disabled) return
        const isDown = this.checkHitTouches()
        if(isDown != this.isDown) {
            this.isDown = isDown
            this.game.setInputKey(this.key, isDown)
        }
    }

    getSprite() {
        const localPlayer = this.game.players[this.game.localPlayerId]
        const color = localPlayer ? localPlayer.color : null
        return ButtonSpriteSheets.get(color)[this.isDown ? 1 : 0]
    }

    drawTo(ctx) {
        if(this.disabled) return
        super.drawTo(ctx)
        if(this.icon) {
            const iconImg = this.icon.getImg(
                ~~(this.spriteWidth * .5),
                ~~(this.spriteHeight * .5),
                this.dirX,
                this.dirY,
            )
            if(iconImg && iconImg.width>0 && iconImg.height>0) ctx.drawImage(iconImg, ~~(this.x - iconImg.width/2), ~~(this.y - iconImg.height/2))
        }
    }
}
