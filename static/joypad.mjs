
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
const { assign } = Object
import * as utils from './utils.mjs'
import { Sprite, SpriteSheet, Entity, Text, EntityGroup, Entities, range, ModuleLibrary } from "./game.mjs"
import { cachedTransform, cloneCanvas, colorizeCanvas } from "./utils.mjs"

export const LIB = new ModuleLibrary()


export class JoypadScene {

    constructor(game) {
        this.scene = this
        this.game = game
        this.x = 0
        this.y = 0
        this.width = 800
        this.height = floor(this.width * 9 / 16)
        this.visible = true
        // this.pointer = null
        if(!this.game.isServerEnv) {
            this.canvas = document.createElement("canvas")
            this.canvas.width = this.width
            this.canvas.height = this.height
        }
        this.game.initTouches()
        this.buttons = new EntityGroup(this)
        this.syncSizeAndPos()
    }

    getPriority() {
        return 0
    }

    syncSizeAndPos() {
        assign(this, this.game.scenesSizeAndPos.joypad)
    }

    syncLocalPlayerButtons() {
        const hero = this.game.scenes.game.getHero(this.game.localPlayerId)
        if(hero && hero == this._lastHeroSynced) return
        this.buttons.clear()
        if(!hero) return
        hero.initJoypadButtons(this)
        this._lastHeroSynced = hero
    }

    newButton(kwargs) {
        return this.buttons.new(Button, kwargs)
    }

    update() {
        this.syncLocalPlayerButtons()
        this.buttons.update()
    }

    onTouch() {
        this.buttons.forEach(but => but.checkClick())
    }

    draw() {
        const { width, height, canvas } = this
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx.fillStyle = "black"
        ctx.fillRect(0, 0, width, height)
        this.drawTo(ctx)
    }

    drawTo(ctx) {
        this.buttons.drawTo(ctx)
    }

    newPauseScene() {
        return new JoypadPauseScene(this.game)
    }
}


export class JoypadWaitingScene extends JoypadScene {
    update() {
        super.update()
        this.initStartButton()
    }
    initStartButton() {
        const { game, width, height } = this, { localPlayerId } = game
        if(!localPlayerId || !game.players[localPlayerId] || this.startButton) return
        const size = height * .45
        this.startButton = this.newButton({ x:width/2, y:height/2, size, text: "START" })
        this.startButton.onClick = () => this.game.startGame()
    }
    syncLocalPlayerButtons() {}
}


class JoypadPauseScene extends JoypadScene {
    constructor(game) {
        super(game)
        this.backgroundColor = "lightgrey"
        this.backgroundAlpha = .5
        this.notifs = new EntityGroup(this)
        this.pauseText = this.notifs.new(Text, {
            text: "PAUSE",
            font: "bold 50px arial",
            fillStyle: "black",
        })
    }
    initResumeButton() {
        const { game, width, height } = this, { localPlayerId } = game
        if(!localPlayerId || !game.players[localPlayerId] || this.startButton) return
        const size = height * .45
        this.resumeButton = this.newButton({ x:width/2, y:height/2, size, text: "RESUME" })
        this.resumeButton.onClick = () => this.game.pauseGame(false)
    }
    update() {
        assign(this.pauseText, { x: this.width/2, y: this.height/4 })
    }
    drawTo(ctx) {
        this.notifs.drawTo(ctx)
    }
}


const BurronImg = LIB.addImage("/static/assets/button_colorable.png")
const ButtonSpriteSheets = {
    spritesheets: {},
    get: function(color) {
        return this.spritesheets[color] ||= new SpriteSheet((async () => {
            if(color) img = colorizeCanvas(cloneCanvas(BurronImg), color)
            return BurronImg
        })(), 2, 1)
    },
}

class Button extends Entity {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.inputKey = kwargs && kwargs.inputKey
        this.isDown = false
        this.disabled = kwargs && kwargs.disabled
        this.text = kwargs && kwargs.text
        this.icon = kwargs && kwargs.icon
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
        if(this.inputKey) this.game.setInputKey(this.inputKey, this.isDown)
    }

    getSprite() {
        const { game } = this
        const localPlayer = game.players[game.localPlayerId]
        const color = localPlayer ? localPlayer.color : null
        let img = BurronImg
        const numCol = this.isDown ? 1 : 0
        img = cachedTransform(img, numCol, () => {
            return cloneCanvas(img, { col:[numCol,2] })
        })
        img = cachedTransform(img, color, () => {
            const res = cloneCanvas(img)
            return color ? colorizeCanvas(res, color) : res
        })
        const sizeRatio = this.width / this.height
        const sprite = cachedTransform(img, sizeRatio, () => {
            if(sizeRatio == 1) return new Sprite(cloneCanvas(img))
            const res = newCanvas(ceil(img.height * sizeRatio), img.height)
            const ctx = res.getContext("2d")
            ctx.drawImage(img, 0, 0, img.width/2, img.height, 0, 0, img.width/2, img.height)
            ctx.drawImage(img, img.width/2, 0, img.width/2, img.height, res.width - img.width/2, 0, img.width/2, img.height)
            for(let i=img.width/2+1; i<res.width - img.width/2; ++i) {
                ctx.drawImage(img, img.width/2, 0, 1, img.height, img.width/2 + i, 0, 1, img.height)
            }
            return new Sprite(res)
        })
        return sprite
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
        if(this.text) {
            const textSprite = this.textSprite ||= this.newTextSprite()
            const img = textSprite.getImg(
                ~~(this.width * .5),
                ~~(this.width * .5 / textSprite.width * textSprite.height),
                1, 1, 1,
            )
            ctx.drawImage(img, ~~(this.x - img.width/2), ~~(this.y - img.height/2))
        }
    }
    newTextSprite() {
        return new Text(this.group, null, {
            text: this.text,
            fillStyle: "white",
        })
    }
}
