
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
const { assign } = Object
import { GraphicsEngine, GraphicsProps } from "./graphics.mjs"
import { GameObject, Text, GameObjectGroup, ModuleCatalog } from "./game.mjs"
import { cachedTransform, newCanvas, cloneCanvas, colorizeCanvas, newTextCanvas } from "./utils.mjs"

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
        this.viewWidth = this.width
        this.viewHeight = this.height
        this.backgroundColor = "black"
        this.backgroundAlpha = 1
        if(!this.game.isServerEnv) {
            this.canvas = document.createElement("canvas")
            this.canvas.width = this.width
            this.canvas.height = this.height
            this.graphicsEngine = new GraphicsEngine(this)
        }
        this.game.initTouches()
        this.buttons = new GameObjectGroup(this)
    }

    isPausable() {
        return false
    }

    pause(val) {
        if(!this.isPausable()) return
        this.paused = val
    }

    update() {
        this.syncPosSize()
        this.buttons.update()
    }

    syncPosSize() {
        const { x, y, viewWidth, viewHeight } = this.game.scenesPosSizes.joypad
        assign(this, { x, y, viewWidth, viewHeight })
    }

    onTouch() {
        this.buttons.forEach(but => but.checkClick())
    }
 
    addButton(kwargs) {
        return this.buttons.add(JoypadButton, kwargs)
    }

    createPauseScene() {
        return new JoypadPauseScene(this.game)
    }

    draw() {
        const { viewWidth, viewHeight } = this
        const can = this.canvas
        can.width = viewWidth
        can.height = viewHeight
        const ctx = can.getContext("2d")
        ctx.reset()
        const drawer = this.graphicsEngine
        this.drawBackground(drawer)
        this.buttons.draw(drawer)
        return can
    }
    
    drawBackground(drawer) {
        drawer.draw(this.getBackgroundGraphicsProps())
    }

    getBackgroundGraphicsProps() {
        const props = this._backgroundGraphicsProps ||= new GraphicsProps()
        props.color = this.backgroundColor
        props.width = this.viewWidth
        props.height = this.viewHeight
        props.visibility = this.backgroundAlpha
        return props
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
        this.syncPosSize()
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

    draw() {
        const res = super.draw()
        const drawer = this.graphicsEngine
        this.notifs.draw(drawer)
        return res
    }
}


const BurronImg = CATALOG.registerImage("/static/core/v1/assets/button_colorable.png")

class JoypadButton extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.inputKey = kwargs?.inputKey
        this.isDown = false
        this.disabled = kwargs?.disabled
        this.text = kwargs?.text
        this.icon = kwargs?.icon
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

    draw(drawer) {
        if(this.disabled) return
        super.draw(drawer)
        if(this.icon) {
            const iconProps = this._iconGraphicsProps ||= new GraphicsProps()
            iconProps.img = this.icon
            iconProps.x = this.x
            iconProps.y = this.y
            iconProps.width = this.width*.5
            iconProps.height = this.height*.5
            iconProps.draw(drawer)
        }
        if(this.text) {
            const textProps = this._textGraphicsProps ||= new GraphicsProps({
                img: this.createTextImg(this.text)
            })
            textProps.x = this.x
            textProps.y = this.y
            textProps.width = this.width*.5
            textProps.height = this.width*.5/textProps.img.width*textProps.img.height,
            textProps.draw(drawer)
        }
    }

    getBaseImg() {
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
        img = cachedTransform(img, sizeRatio, () => {
            if(sizeRatio == 1) return cloneCanvas(img)
            const { width:iw, height:ih } = img, iw2 = ceil(iw/2)
            const rw = ceil(ih * sizeRatio), rh = ih
            const res = newCanvas(rw, rh), ctx = res.getContext("2d")
            ctx.drawImage(img, 0, 0, iw2, ih, 0, 0, iw2, ih)
            ctx.drawImage(img, iw2, 0, iw2, ih, rw-iw2, 0, iw2, ih)
            for(let x=iw2; x<rw-iw2; ++x) ctx.drawImage(img, iw2, 0, 1, ih, x, 0, 1, ih)
            return res
        })
        return img
    }
    
    createTextImg(text) {
        const fontSize = floor(this.height/2)
        return newTextCanvas(text, {
            fillStyle: "white",
            font: `bold ${fontSize}px serif`,
        })
    }
}
