
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
const { assign } = Object
import * as utils from './utils.mjs'
import { loadImg, Sprite, SpriteSheet, Entity, EntityGroup, Entities, range } from "./game.mjs"
import { cloneCanvas, colorizeCanvas } from "./utils.mjs"


export class JoypadScene {

    constructor(game) {
        this.scene = this
        this.game = game
        this.x = 0
        this.y = 0
        this.width = 800
        this.height = floor(this.width * 9 / 16)
        // this.pointer = null
        if(!this.game.isServerEnv) {
            this.canvas = document.createElement("canvas")
            this.canvas.width = this.width
            this.canvas.height = this.height
        }
        this.game.initTouches()
        this.buttons = new EntityGroup(this)
        this.syncLocalPlayerButtons()
    }

    setPos(x, y) {
        this.x = x
        this.y = y
    }

    syncLocalPlayerButtons() {
        const hero = this.game.gameScene.getHero(this.game.localPlayerId)
        if(hero && hero == this._lastHeroSynced) return
        this.buttons.clear()
        if(!hero) return
        hero.initJoypadButtons(this)
        this._lastHeroSynced = hero
    }

    addButton(key, x, y, size, kwargs) {
        return this.buttons.add(new Button(this, key, x, y, size, kwargs))
    }

    update() {
        this.buttons.update()
    }

    onTouch() {
        this.buttons.forEach(but => but.checkClick())
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
    constructor(scn, key, x, y, size, kwargs) {
        super(scn, x, y)
        this.key = key
        this.width = this.height = size
        this.isDown = false
        assign(this, kwargs)
    }

    checkClick() {
        if(this.disabled) return
        const isDown = this.checkHitTouches()
        if(isDown != this.isDown) {
            this.isDown = isDown
            this.onClick()
        }
    }

    onClick() {
        this.game.setInputKey(this.key, this.isDown)
    }

    getSprite() {
        const localPlayer = this.game.players[this.game.localPlayerId]
        const color = localPlayer ? localPlayer.color : null
        return ButtonSpriteSheets.get(color).get(this.isDown ? 1 : 0)
    }

    drawTo(ctx) {
        if(this.disabled) return
        super.drawTo(ctx)
        if(this.icon && this.spriteWidth>0 && this.spriteHeight>0) {
            const iconImg = this.icon.getImg(
                ~~(this.spriteWidth * .5),
                ~~(this.spriteHeight * .5),
                this.dirX,
                this.dirY,
            )
            if(iconImg) ctx.drawImage(iconImg, ~~(this.x - iconImg.width/2), ~~(this.y - iconImg.height/2))
        }
    }
}
