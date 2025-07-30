
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
const { assign } = Object
import { Sprite, GameObject, Text, GameObjectGroup, ModuleCatalog } from "./game.mjs"
import { cachedTransform, newCanvas, cloneCanvas, colorizeCanvas } from "./utils.mjs"

export const CATALOG = new ModuleCatalog()


export class JoypadScene {

    constructor(game) {
        this.scene = this
        this.game = game
        this.x = 0
        this.y = 0
        this.width = 800
        this.height = floor(this.width * 9 / 16)
        this.visible = true
        this.backgroundColor = "black"
        this.backgroundAlpha = 1
        if(!this.game.isServerEnv) {
            this.canvas = document.createElement("canvas")
            this.canvas.width = this.width
            this.canvas.height = this.height
        }
        this.game.initTouches()
        this.buttons = new GameObjectGroup(this)
    }

    getSizeAndPos() {
        return this.game.scenesSizeAndPos.joypad
    }

    update() {
        this.buttons.update()
    }

    onTouch() {
        this.buttons.forEach(but => but.checkClick())
    }
 
    addButton(kwargs) {
        return this.buttons.add(Button, kwargs)
    }

    newPauseScene() {
        return null
    }

    draw() {
        const { width, height, canvas } = this
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if(this.backgroundColor) {
            ctx.fillStyle = this.backgroundColor
            ctx.globalAlpha = this.backgroundAlpha
            ctx.fillRect(0, 0, width, height)
            ctx.globalAlpha = 1
        }
        this.drawTo(ctx)
    }

    drawTo(ctx) {
        this.buttons.drawTo(ctx)
    }
}


export class JoypadGameScene extends JoypadScene {

    update() {
        super.update()
        this.syncLocalPlayerButtons()
    }

    syncLocalPlayerButtons() {
        const hero = this.game.scenes.game.getHero(this.game.localPlayerId)
        if(hero && hero == this._lastHeroSynced) return
        this.buttons.clear()
        if(!hero) return
        this.addPauseButton()
        hero.initJoypadButtons(this)
        this._lastHeroSynced = hero
    }

    addPauseButton() {
        this.pauseButton = this.addButton({ x:this.width/2, y:40, width: 200, height: 60, text: "PAUSE" })
        this.pauseButton.onClickUp = () => this.game.pause(true)
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
        this.startButton = this.addButton({ x:width/2, y:height/2, width: 300, height: 100, text: "START" })
        this.startButton.onClickUp = () => this.game.startGame()
    }
}


class JoypadPauseScene extends JoypadScene {

    constructor(game) {
        super(game)
        this.backgroundColor = "lightgrey"
        this.backgroundAlpha = .5
        this.notifs = new GameObjectGroup(this)
        this.pauseText = this.notifs.add(Text, {
            text: "PAUSE",
            font: "bold 50px arial",
            fillStyle: "white",
        })
        this.initButtons()
        this.syncObjectsPos()
    }

    initButtons() {
        this.resumeButton = this.addButton({ width: 300, height: 100, text: "RESUME" })
        this.resumeButton.onClickUp = () => this.game.pause(false)
        this.restartButton = this.addButton({ width: 300, height: 100, text: "RESTART" })
        this.restartButton.onClickUp = () => this.game.restartGame()
    }

    update() {
        super.update()
        this.syncObjectsPos()
    }

    syncObjectsPos() {
        const { width, height } = this
        assign(this.pauseText, { x: floor(width/2), y: floor(height/6) })
        assign(this.resumeButton, { x: floor(width/2), y:floor(height/2) })
        assign(this.restartButton, { x: floor(width/2), y:floor(height/2)+120 })
    }

    drawTo(ctx) {
        super.drawTo(ctx)
        this.notifs.drawTo(ctx)
    }
}


const BurronImg = CATALOG.addImage("/static/core/assets/button_colorable.png")

class Button extends GameObject {

    constructor(scn, kwargs) {
        super(scn, kwargs)
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
            if(isDown) this.onClickDown()
            else this.onClickUp()
        }
    }

    onClickDown() {
        if(this.inputKey) this.game.setInputKey(this.inputKey, true)
    }

    onClickUp() {
        if(this.inputKey) this.game.setInputKey(this.inputKey, false)
    }

    getSprite() {
        if(BurronImg.unloaded) return
        let img = BurronImg
        const { game } = this
        const localPlayer = game.players[game.localPlayerId]
        const color = localPlayer ? localPlayer.color : null
        const numCol = this.isDown ? 1 : 0
        img = cachedTransform(img, numCol, () => {
            return cloneCanvas(img, { col:[numCol,2] })
        })
        img = cachedTransform(img, color, () => {
            const res = cloneCanvas(img)
            return color ? colorizeCanvas(res, color) : res
        })
        const sizeRatio = this.width/this.height
        const sprite = cachedTransform(img, sizeRatio, () => {
            if(sizeRatio == 1) return new Sprite(cloneCanvas(img))
            const { width:iw, height:ih } = img, iw2 = ceil(iw/2)
            const rw = ceil(ih * sizeRatio), rh = ih
            const res = newCanvas(rw, rh), ctx = res.getContext("2d")
            ctx.drawImage(img, 0, 0, iw2, ih, 0, 0, iw2, ih)
            ctx.drawImage(img, iw2, 0, iw2, ih, rw-iw2, 0, iw2, ih)
            for(let x=iw2; x<rw-iw2; ++x) ctx.drawImage(img, iw2, 0, 1, ih, x, 0, 1, ih)
            return new Sprite(res)
        })
        return sprite
    }
    
    createTextSprite() {
        const fontSize = floor(this.height/2)
        return new Text(this.scene, null, {
            text: this.text,
            fillStyle: "white",
            font: `bold ${fontSize}px serif`,
        })
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
            const textSprite = this.textSprite ||= this.createTextSprite()
            const img = textSprite.getImg(
                ~~(this.width * .5),
                ~~(this.width * .5 / textSprite.width * textSprite.height),
                1, 1, 1,
            )
            ctx.drawImage(img, ~~(this.x - img.width/2), ~~(this.y - img.height/2))
        }
    }
}
