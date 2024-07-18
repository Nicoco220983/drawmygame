import * as utils from './utils.mjs'
import { Img, Sprite, Entity, Group, Entities } from "./game.mjs"


export class JoypadScene {

    constructor(game) {
        this.game = game
        this.x = 0
        this.y = 0
        this.pointer = null
        this.game.initTouches()
        if(!this.game.isServerEnv) {
            this.canvas = document.createElement("canvas")
        }
        this.buttons = new Group(this)
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
        this.buttons.forEach(ent => ent.syncSize())
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

    removeButtons() {
        this.buttons.forEach(but => but.remove())
    }

    addButtons(buts) {
        const nbCols = buts.length
        for(let i=0; i < nbCols; ++i) {
            const but = (buts[i] instanceof Array) ? buts[i] : [buts[i]]
            const nbRows = but.length
            for(let j=0; j < nbRows; ++j) {
                this.buttons.add(new Button(this, {
                    desc: but[j],
                    posX: i / nbCols,
                    posWidth: 1 / nbCols,
                    posY: j / nbRows,
                    posHeight: 1 / nbRows,
                }))
            }
        }
        this.buttons.forEach(ent => ent.syncSize())
    }

    update(time) {
        this.syncPointer()
        this.buttons.update(time)
    }

    syncPointer() {
        const gamePointer = this.game.pointer
        if(!gamePointer) return
        const thisPointer = this.pointer ||= {}
        thisPointer.isDown = gamePointer.isDown
        thisPointer.prevIsDown = gamePointer.prevIsDown
        thisPointer.x = gamePointer.x - this.x
        thisPointer.y = gamePointer.y - this.y
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


const ButtonImg = new Img("/static/assets/button.png")
const ButtonSprite = new Sprite(ButtonImg)

class Button extends Entity {
    constructor(scn, kwargs) {
        super(scn)
        this.key = kwargs.desc.key
        this.posX = kwargs.posX
        this.posWidth = kwargs.posWidth
        this.posY = kwargs.posY
        this.posHeight = kwargs.posHeight
        this.syncSize()
        this.sprite = ButtonSprite
    }

    syncSize() {
        const scn = this.scene
        this.width = scn.width * this.posWidth
        this.x = scn.width * this.posX + this.width / 2
        this.height = scn.height * this.posHeight
        this.y = scn.height * this.posY + this.height / 2
    }

    update(time) {
        this.game.setJoypadKeyPressed(this.key, this.checkHitTouches())
    }
}
