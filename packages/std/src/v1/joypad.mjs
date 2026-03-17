
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
const { assign } = Object
import {
    cachedTransform, newCanvas, cloneCanvas, colorizeCanvas, newTextCanvas,
    Dependencies, GameObject, Text, GameObjectGroup, Img, Scene,
} from "../../../core/v1/index.mjs"


const ButtonSpriteSheetImg = new Img("/static/catalogs/std/v1/2Dside/assets/button_spritesheet.png")
const ButtonColorableSpriteSheetImg = new Img("/static/catalogs/std/v1/2Dside/assets/button_colorable.png")

@Dependencies.add(ButtonSpriteSheetImg, ButtonColorableSpriteSheetImg)
export class JoypadButton extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.inputKey = kwargs?.inputKey
        this.disabled = kwargs?.disabled
        this.text = kwargs?.text
        this.icon = kwargs?.icon
        this.isDown = false
    }

    update() {
        super.update()
        if (this.disabled) return
        const isDown = Boolean(this.checkHitTouches())
        if (isDown != this.isDown) {
            this.isDown = isDown
            if (isDown) {
                if(this.onClickDown) this.onClickDown()
            } else {
                if(this.onClickUp) this.onClickUp()
            }
        }
    }

    onClickDown() {
        if (this.inputKey) this.game.setInputKey(this.inputKey, true)
    }

    onClickUp() {
        if (this.inputKey) this.game.setInputKey(this.inputKey, false)
    }

    getBaseTexture() {
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
        return img.getTexture ? img.getTexture() : window.PIXI.Texture.from(img)
    }

    createTextImg(text) {
        const fontSize = floor(this.height / 2)
        return newTextCanvas(text, {
            fillStyle: "white",
            font: `bold ${fontSize}px serif`,
        })
    }

    createPixiObject() {
        const container = new window.PIXI.Container()
        
        // Background sprite
        const texture = this.getBaseTexture()
        if (texture) {
            this._bgSprite = new window.PIXI.Sprite(texture)
            this._bgSprite.anchor.set(0.5, 0.5)
            container.addChild(this._bgSprite)
        }
        
        // Text overlay
        if (this.text) {
            const style = new window.PIXI.TextStyle({
                fontFamily: 'serif',
                fontSize: floor(this.height / 2),
                fontWeight: 'bold',
                fill: 'white',
                align: 'center',
            })
            this._textObj = new window.PIXI.Text({ text: this.text, style })
            this._textObj.anchor.set(0.5, 0.5)
            container.addChild(this._textObj)
        }
        
        // Icon overlay (if provided)
        if (this.icon) {
            // Icon could be a texture or an Img instance
            const iconTexture = this.icon.getTexture ? this.icon.getTexture() : 
                               (this.icon instanceof window.PIXI.Texture ? this.icon : null)
            if (iconTexture) {
                this._iconSprite = new window.PIXI.Sprite(iconTexture)
                this._iconSprite.anchor.set(0.5, 0.5)
                // Scale icon to fit within button
                const iconSize = min(this.width, this.height) * 0.5
                const scale = iconSize / max(this._iconSprite.width, this._iconSprite.height)
                this._iconSprite.scale.set(scale)
                container.addChild(this._iconSprite)
            }
        }
        
        return container
    }

    syncGraphics() {
        const container = this._pixiObject
        if (!container) return
        
        // Update container position
        container.x = this.x
        container.y = this.y
        container.alpha = this.visibility
        
        // Update background sprite
        if (this._bgSprite) {
            const texture = this.getBaseTexture()
            if (texture && this._bgSprite.texture !== texture) {
                this._bgSprite.texture = texture
            }
            this._bgSprite.width = this.width
            this._bgSprite.height = this.height
        }
        
        // Text is static, no update needed
        
        // Update icon if exists
        if (this._iconSprite) {
            // Icon may need repositioning if button size changes
            const iconSize = min(this.width, this.height) * 0.5
            const scale = iconSize / max(this._iconSprite.texture.orig.width, this._iconSprite.texture.orig.height)
            this._iconSprite.scale.set(scale)
        }
    }
}


export class StickButton extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.disabled = kwargs?.disabled
        this.text = kwargs?.text
        this.icon = kwargs?.icon
        this.startPos = null
        this.prevInput = null
    }

    update() {
        super.update()
        let input = null
        if(!this.disabled) {
            const touch = this.checkHitTouches()
            if(this.startPos === null) {
                if(touch) this.startPos = {
                    x: touch.x,
                    y: touch.y,
                }
            } else {
                if(!touch) this.startPos = null
            }
            if(touch === null) input = null
            else input = {
                x: touch.x - this.startPos.x,
                y: touch.y - this.startPos.y,
            }
        }
        if(input || this.prevInput) {
            if(this.onInput) this.onInput(input)
        }
        this.prevInput = input
    }

    getBaseTexture() {
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
        return img.getTexture ? img.getTexture() : window.PIXI.Texture.from(img)
    }

    createPixiObject() {
        const container = new window.PIXI.Container()
        
        // Background sprite
        const texture = this.getBaseTexture()
        if (texture) {
            this._bgSprite = new window.PIXI.Sprite(texture)
            this._bgSprite.anchor.set(0.5, 0.5)
            container.addChild(this._bgSprite)
        }
        
        // Text overlay
        if (this.text) {
            const style = new window.PIXI.TextStyle({
                fontFamily: 'serif',
                fontSize: floor(this.height / 2),
                fontWeight: 'bold',
                fill: 'white',
                align: 'center',
            })
            this._textObj = new window.PIXI.Text({ text: this.text, style })
            this._textObj.anchor.set(0.5, 0.5)
            container.addChild(this._textObj)
        }
        
        // Icon overlay (if provided)
        if (this.icon) {
            const iconTexture = this.icon.getTexture ? this.icon.getTexture() : 
                               (this.icon instanceof window.PIXI.Texture ? this.icon : null)
            if (iconTexture) {
                this._iconSprite = new window.PIXI.Sprite(iconTexture)
                this._iconSprite.anchor.set(0.5, 0.5)
                const iconSize = min(this.width, this.height) * 0.5
                const scale = iconSize / max(this._iconSprite.width, this._iconSprite.height)
                this._iconSprite.scale.set(scale)
                container.addChild(this._iconSprite)
            }
        }
        
        return container
    }

    syncGraphics() {
        const container = this._pixiObject
        if (!container) return
        
        container.x = this.x
        container.y = this.y
        container.alpha = this.visibility
        
        if (this._bgSprite) {
            const texture = this.getBaseTexture()
            if (texture && this._bgSprite.texture !== texture) {
                this._bgSprite.texture = texture
            }
            this._bgSprite.width = this.width
            this._bgSprite.height = this.height
        }
        
        if (this._iconSprite) {
            const iconSize = min(this.width, this.height) * 0.5
            const scale = iconSize / max(this._iconSprite.texture.orig.width, this._iconSprite.texture.orig.height)
            this._iconSprite.scale.set(scale)
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
    }

    syncPosSize() {
        const { visible, x, y, viewWidth, viewHeight } = this.game.scenesPosSizes.joypad
        assign(this, { visible, x, y, viewWidth, viewHeight })
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
        if (hero && hero == this._lastHeroSynced) return
        this.buttons.clear()
        if (!hero) return
        this.addPauseButton()
        hero.initJoypadButtons(this)
        this._lastHeroSynced = hero
    }

    addPauseButton() {
        this.pauseButton = this.addButton(JoypadButton, { x: this.width / 2, y: 40, width: 200, height: 60, text: "PAUSE" })
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
        if (!localPlayerId || !game.players[localPlayerId] || this.startButton) return
        this.startButton = this.addButton(JoypadButton, { x: width / 2, y: height / 2, width: 300, height: 100, text: "START" })
        this.startButton.onClickUp = () => this.game.startGame()
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
        this.resumeButton.onClickUp = () => this.game.pause(false)
        this.restartButton = this.addButton(JoypadButton, { width: 300, height: 100, text: "RESTART" })
        this.restartButton.onClickUp = () => this.game.restartGame()
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
