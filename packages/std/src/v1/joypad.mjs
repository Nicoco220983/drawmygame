
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
const { assign } = Object
import {
    cachedTransform, newCanvas, cloneCanvas, colorizeCanvas, newTextCanvas,
    Dependencies, GameObject, Text, GameObjectGroup, Img, Scene,
    getCachedTexture, pixiHelpers,
    dist2,
} from "../../../core/v1/index.mjs"


const ButtonSpriteSheetImg = new Img("/static/catalogs/std/v1/2Dside/assets/button_spritesheet.png")
const ButtonColorableSpriteSheetImg = new Img("/static/catalogs/std/v1/2Dside/assets/button_colorable.png")


@Dependencies.add(ButtonSpriteSheetImg, ButtonColorableSpriteSheetImg)
export class BaseJoypadButton extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.inputKey = kwargs?.inputKey
        this.disabled = kwargs?.disabled
        this.text = kwargs?.text
        this.icon = kwargs?.icon
    }

    syncHitTouches(hitTouches) {}

    getButtonImg() {
        const { game } = this
        if (ButtonSpriteSheetImg.unloaded || ButtonColorableSpriteSheetImg.unloaded) return
        let img = ButtonSpriteSheetImg, colorImg = ButtonColorableSpriteSheetImg
        const localPlayer = game.players[game.localPlayerId]
        const color = localPlayer ? localPlayer.color : null
        const numCol = this.isDown ? 1 : 0
        colorImg = cachedTransform(colorImg, numCol, () => {
            return cloneCanvas(colorImg, { col: [numCol, 2] })
        })
        colorImg = cachedTransform(colorImg, color, () => {
            const res = cloneCanvas(colorImg)
            return color ? colorizeCanvas(res, color) : res
        })
        img = cachedTransform(img, numCol, () => {
            const res = cloneCanvas(img, { col: [numCol, 2] })
            const ctx = res.getContext("2d")
            ctx.drawImage(colorImg, 0, 0, res.width, res.height)
            return res
        })
        const sizeRatio = this.width / this.height
        img = cachedTransform(img, sizeRatio, () => {
            if (sizeRatio == 1) return cloneCanvas(img)
            const { width: iw, height: ih } = img, iw2 = ceil(iw / 2)
            const rw = ceil(ih * sizeRatio), rh = ih
            const res = newCanvas(rw, rh), ctx = res.getContext("2d")
            ctx.drawImage(img, 0, 0, iw2, ih, 0, 0, iw2, ih)
            ctx.drawImage(img, iw2, 0, iw2, ih, rw - iw2, 0, iw2, ih)
            for (let x = iw2; x < rw - iw2; ++x) ctx.drawImage(img, iw2, 0, 1, ih, x, 0, 1, ih)
            return res
        })
        return img
    }

    syncGraphics() {
        const container = this._graphics
        if (!container) return
        
        // Lazy-create button sprite if needed
        const buttonImg = this.getButtonImg()
        if(buttonImg) {
            const buttonSprite = this._buttonSprite ||= pixiHelpers.addNewSpriteTo(container)
            buttonSprite.texture = pixiHelpers.getCachedTexture(buttonImg)
            //const size = floor(min(this.width, this.height) * .8)
            buttonSprite.width = this.spriteWidth ?? this.width
            buttonSprite.height = this.spriteHeight ?? this.height
        } else if(this._buttonSprite) this._buttonSprite.texture = null
        
        // Lazy-create text overlay if needed
        if(this.text) {
            const textSprite = this._textSprite ||= container.addChild(new window.PIXI.Text({
                style: new window.PIXI.TextStyle({
                    fontFamily: 'serif',
                    fontSize: floor(this.height / 2),
                    fontWeight: 'bold',
                    fill: 'white',
                    align: 'center',
                })
            }))
            textSprite.anchor.set(0.5, 0.5)
            textSprite.zIndex = 1
            textSprite.text = this.text
        } else if(this._textSprite) this._textSprite.text = ""
        
        // Lazy-create icon overlay if needed
        if (this.icon) {
            const iconSprite = this._iconSprite ||= pixiHelpers.addNewSpriteTo(container)
            iconSprite.texture = pixiHelpers.getCachedTexture(this.icon)
            iconSprite.visibility = 1
            iconSprite.zIndex = 1
            const iconSize = min(this.width, this.height) * 0.5
            pixiHelpers.scaleSpriteTo(iconSprite, iconSize, iconSize)
        } else if(this._iconSprite) this._iconSprite.texture = null
        
        // Let base class handle container transform
        container.x = this.x
        container.y = this.y
        container.zIndex = this.z
    }
}


export class JoypadButton extends BaseJoypadButton {

    init(kwargs) {
        super.init(kwargs)
        this.isDown = false
    }

    syncHitTouches(hitTouches) {
        const { inputKey, disabled } = this
        const isDown = !disabled && hitTouches.length>0
        if(isDown && !this.isDown) this.onClick()
        this.isDown = isDown
        if(inputKey) this.game.setInputKey(inputKey, !disabled && hitTouches.length>0)
    }

    onClick() {}
}


export class StickButton extends BaseJoypadButton {

    init(kwargs) {
        super.init(kwargs)
        this.refTouch = null
        this.prevInput = null
    }

    syncHitTouches(hitTouches) {
        let input = null
        const touch = hitTouches.length>0 ? hitTouches[0] : null
        if(!this.disabled) {
            if(this.refTouch === null) {
                if(touch) this.setRefTouch(touch)
            } else {
                if(!touch) this.refTouch = null
            }
            if(touch === null) input = null
            else input = {
                x: touch.x - this.refTouch.x,
                y: touch.y - this.refTouch.y,
            }
        }
        if(input || this.prevInput) {
            if(this.onInput) this.onInput(input)
        }
        this.prevInput = input
    }

    setRefTouch(touch) {
        const dx = this.width/4, dy = this.height/4
        const minX = this.x - dx, maxX = this.x + dx
        const minY = this.y - dy, maxY = this.y + dy
        this.refTouch = {
            x: min(maxX, max(minX, touch.x)),
            y: min(maxY, max(minY, touch.y)),
        }
    }
}


@Dependencies.add(JoypadButton)
@Dependencies.init()
export class JoypadScene extends Scene {

    init(kwargs) {
        super.init(kwargs)
        this.width = 800
        this.height = floor(this.width * 9 / 16)
        this.z = 100  // Render on top of game scene
        this.syncPosSize()
        this.backgroundColor = "black"
        this.backgroundAlpha = 1
        this.game.initTouches()
        this.buttons = new GameObjectGroup(this)
        // Update pixiContainer zIndex if already created
        if (this.pixiContainer) {
            this.pixiContainer.zIndex = this.z
        }
    }

    isPausable() {
        return false
    }

    pause(val) {
        if (!this.isPausable()) return
        this.paused = val
    }

    update() {
        this.syncPosSize()
        this.buttons.update()
        this.checkHitTouches()
    }

    syncPosSize() {
        const { visible, x, y, viewWidth, viewHeight } = this.game.scenesPosSizes.joypad
        assign(this, { visible, x, y, viewWidth, viewHeight })
    }

    checkHitTouches() {
        this.buttons.forEach(but => {
            but._hitTouches ||= []
            but._hitTouches.length = 0
        })
        for(let touch of this.game.touches) {
            let { isDown, x: touchX, y: touchY } = touch
            if(!isDown) continue
            touchX -= this.x
            touchY -= this.y
            let bestButton = null, destDist2 = Infinity
            this.buttons.forEach(but => {
                if(but.disabled) return
                let { left, width, top, height } = but.getHitBox()
                if(left<=touchX && left+width>touchX && top<=touchY && top+height>touchY) {
                    const d2 = dist2(touchX-but.x,touchY-but.y)
                    if(!bestButton || but.z > bestButton.z || d2 < destDist2) {
                        bestButton = but
                        destDist2 = d2
                    }
                }
            })
            if(bestButton) bestButton._hitTouches.push({ x: touchX, y: touchY })
        }
        this.buttons.forEach(but => but.syncHitTouches(but._hitTouches))
    }

    syncGraphics() {
        this.syncGraphicsView()
        this.syncBackgroundGraphics()
        this.buttons.syncGraphics()
    }

    onTouch() {}

    addButton(cls, kwargs) {
        return this.buttons.add(cls, kwargs)
    }

    createPauseScene() {
        return new JoypadPauseScene(this.game)
    }
}


@Dependencies.add(JoypadButton)
@Dependencies.init()
export class JoypadGameScene extends JoypadScene {

    update() {
        super.update()
        this.syncLocalPlayerButtons()
    }

    syncLocalPlayerButtons() {
        const hero = this.game.scenes.game.getHero(this.game.localPlayerId)
        if (hero != this._lastHeroSynced) {
            this.buttons.clear()
            this._lastHeroSynced = hero
            if (!hero) return
            this.addPauseButton()
            hero.initJoypadButtons(this)
        }
        if (!hero) return
        hero.syncJoypadButtons(this)
    }

    addPauseButton() {
        this.pauseButton = this.addButton(JoypadButton, {
            x: this.width / 2,
            y: 40,
            width: 200,
            height: 60,
            text: "PAUSE",
        })
        this.pauseButton.z = 1
        this.pauseButton.onClick = () => this.game.pause(true)
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
        if (!localPlayerId || !game.players[localPlayerId] || this.startButton) return
        this.startButton = this.addButton(JoypadButton, { x: width / 2, y: height / 2, width: 300, height: 100, text: "START" })
        this.startButton.onClick = () => this.game.startGame()
    }
}


class JoypadPauseScene extends JoypadScene {

    init(kwargs) {
        super.init(kwargs)
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
        this.resumeButton = this.addButton(JoypadButton, { width: 300, height: 100, text: "RESUME" })
        this.resumeButton.onClick = () => this.game.pause(false)
        this.restartButton = this.addButton(JoypadButton, { width: 300, height: 100, text: "RESTART" })
        this.restartButton.onClick = () => this.game.restartGame()
    }

    update() {
        super.update()
        this.syncObjectsPos()
    }

    syncObjectsPos() {
        const { width, height } = this
        assign(this.pauseText, { x: floor(width / 2), y: floor(height / 6) })
        assign(this.resumeButton, { x: floor(width / 2), y: floor(height / 2) })
        assign(this.restartButton, { x: floor(width / 2), y: floor(height / 2) + 120 })
    }

    syncGraphics() {
        super.syncGraphics()
        this.notifs.syncGraphics()
    }
}
