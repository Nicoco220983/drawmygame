const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import {
    sign, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, importJs, cachedTransform, hasKeys,
    CATALOG, IS_SERVER_ENV,
    StateProperty, StateBool, StateNumber,
    GameObject, Category, Dependencies, LinkTrigger, LinkReaction, Mixin, Img, SpriteSheet, Aud, ObjectRefs, now, hackMethod,
    pixiHelpers,
} from '../../../../core/v1/index.mjs'
import {
    ActivableMixin, CollectMixin, OwnerableMixin, BodyMixin, PhysicsMixin, AttackMixin,
    applyForce,
} from '../mixins.mjs'
import {
    JoypadButton, StickButton
} from '../joypad.mjs'
import {
    JumpMixin
} from './mixins.mjs'
import {
    SlashAud, HandHitAud, Pop, SmokeExplosion,
    Weapon,
} from './objects.mjs'


const REGISTER_COMMON_ARGS = {
    url: import.meta.url,
    version: "v1",
    perspective: "2Dside",
}


@Category.append("hero")
@Dependencies.add(SmokeExplosion, Pop)
@CollectMixin.add({
    canCollect: true,
    canGetCollected: false,
})
@AttackMixin.add({
    canAttack: false,
    canGetAttacked: true,
})
@StateNumber.define("lastSpawnIt", { default: -Infinity, nullableWith: -Infinity })
@StateNumber.define("team", { default: null, nullableWith: null })
export class Hero extends GameObject {
    static IS_HERO = true

    init(kwargs) {
        super.init(kwargs)
        if (kwargs && kwargs.playerId !== undefined) this.setPlayerId(kwargs.playerId)
    }

    setPlayerId(playerId) {
        if (playerId === this.playerId) return
        this.playerId = playerId
        this.scene.syncHero(this)
    }

    isLocalHero() {
        return this === this.scene.localHero
    }

    initExtras() {
        const extras = this.extras ||= new ObjectRefs(this.scene)
        return extras
    }

    addExtra(extra) {
        const extras = this.initExtras()
        extras.add(extra.id)
    }

    onExtraDrop(extra) {
        const extras = this.extras
        if (extras) extras.delete(extra.id)
    }

    update() {
        super.update()
        this.updateSpawnEffect()
    }

    updateSpawnEffect() {
        const { lastSpawnIt } = this
        const { iteration } = this.scene
        const { fps } = this.game
        if (lastSpawnIt + fps > iteration) {
            if (!this._spawnEnt) this._spawnEnt = this.addSpawnEffect()
        } else {
            delete this._spawnEnt
            this.lastSpawnIt = -Infinity
        }
    }

    addSpawnEffect() {
        return this.scene.addVisual(Pop, {
            x: this.x,
            y: this.y,
        })
    }

    getState() {
        const state = super.getState()
        state.pid = this.playerId
        state.liv = this.lives
        const inputState = this.inputState
        if (inputState && hasKeys(inputState)) state.ist = inputState
        else delete state.ist
        const extras = this.extras
        if (extras && extras.size > 0) {
            const stExtras = state.extras ||= []
            stExtras.length = 0
            for (let exId of extras) stExtras.push(exId)
        } else if (state.extras) state.extras.length = 0
        return state
    }

    setState(state) {
        super.setState(state)
        this.setPlayerId(state.pid)
        this.inputState = state.ist
        if (this.extras || state.extras) {
            const extras = this.initExtras()
            extras.clear()
            if (state.extras) for (let exId of state.extras) extras.add(exId)
        }
    }

    getInputState() {
        const inputState = this._inputState ||= {}
        return inputState
    }

    setInputState(inputState) {
        this.inputState = inputState
        this.inputStateTime = now()
        this._isStateToSend = true
    }

    initJoypadButtons(joypadScn) {}
    syncJoypadButtons(joypadScn) {}

    spawn(x, y) {
        this.x = x + floor((this.scene.rand("spawn") - .5) * 50)
        this.y = y
        this.speedX = 0
        this.speedY = -200
        this.lastSpawnIt = this.scene.iteration
    }

    die(killer) {
        this.remove()
        const { x, y } = this
        this.scene.addVisual(SmokeExplosion, { x, y })
    }

    remove() {
        super.remove()
        this.scene.syncHero(this)
    }

    syncGraphics() {
        super.syncGraphics()
        pixiHelpers.tintSprite(this._graphics, (this.getDamagedAge <= 5) ? "red" : null)
    }
}


// NICO

const HandImg = new Img("/static/catalogs/std/v1/2Dside/assets/hand.png")

@BodyMixin.add({
    width: 25,
    height: 25,
})
@Dependencies.add(HandImg, SlashAud, HandHitAud)
class NicoHand extends Weapon {

    init(kwargs) {
        super.init(kwargs)
        this.syncPos()
        this.attackKnockback = 200
        this.initIt = this.scene.iteration
        this.game.audio.playSound(SlashAud)
    }

    update() {
        super.update()
        this.syncPos()
        this.canAttack = this.scene.iteration == this.initIt
    }

    syncPos() {
        const { owner } = this
        if (!owner) return
        this.x = owner.x + owner.dirX * 28
        this.y = owner.y
        this.dirX = owner.dirX
    }

    getAttackProps(obj) {
        const props = super.getAttackProps(obj)
        props.knockbackAngle = this.dirX > 0 ? -45 : -135
        return props
    }

    onAttack(obj, props) {
        this.game.audio.playSound(HandHitAud)
    }

    syncGraphics() {
        this.setSprite(HandImg)
        super.syncGraphics()
    }
}


const ArrowsSpriteSheetImg = new Img("/static/catalogs/std/v1/2Dside/assets/arrows.png")
const ArrowsSpriteSheet = new SpriteSheet(ArrowsSpriteSheetImg, 4, 1)

const OuchAud = new Aud("/static/catalogs/std/v1/2Dside/assets/ouch.opus")

const NicoImg = new Img("/static/catalogs/std/v1/2Dside/assets/nico.png")
const NicoBaseSpriteSheet = new Img("/static/catalogs/std/v1/2Dside/assets/nico_full.png")
const NicoColorableSpriteSheet = new Img("/static/catalogs/std/v1/2Dside/assets/nico_full_colorable.png")
const NicoSpriteSheets = {
    spritesheets: {},
    get: function (color) {
        return this.spritesheets[color] ||= new SpriteSheet((() => {
            if (!color) return NicoBaseSpriteSheet
            const coloredImg = colorizeCanvas(cloneCanvas(NicoColorableSpriteSheet), color)
            return addCanvas(cloneCanvas(NicoBaseSpriteSheet), coloredImg)
        })(), 4, 1)
    },
}


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Nico",
    icon: NicoImg,
})
@Dependencies.add(NicoBaseSpriteSheet, NicoColorableSpriteSheet, OuchAud, ArrowsSpriteSheetImg, NicoHand)
@JumpMixin.add({
    jumpSpeed: 500,
    nullJumpSpeed: 800,
    maxJumpBlockAngle: 90,
})
@AttackMixin.modify({
    maxHealth: 100,
})
@PhysicsMixin.add()
@BodyMixin.add({
    width: 40,
    height: 45,
})
@StateNumber.define("handRemIt", { nullableWith: null, default: null })
@StateProperty.modify("dirX", { showInBuilder: true })
export class Nico extends Hero {

    init(kwargs) {
        super.init(kwargs)
        this.handDur = ceil(.1 * this.game.fps)
        this.hand = null
    }

    update() {
        super.update()
        this.applyInputState()
        this.updateHand()
    }

    updateHand() {
        if (this.handRemIt == this.handDur) {
            this.hand ||= this.scene.addObject(NicoHand, {
                owner: this
            })
        } else if (this.hand && !this.handRemIt) {
            this.hand.remove()
            this.hand = null
        }
    }

    applyInputState() {
        const { dt } = this.game
        if (this.getHealth() == 0) return
        const { inputState } = this
        if (!inputState || !inputState.walkX) {
            this.physicsStaticFriction = 500
            this.physicsDynamicFriction = 2
        } else if (inputState.walkX > 0) {
            this.dirX = 1
            this.speedX = sumTo(this.speedX, 1000 * dt, 300)
            this.physicsStaticFriction = this.physicsDynamicFriction = 0
        } else if (inputState.walkX < 0) {
            this.dirX = -1
            this.speedX = sumTo(this.speedX, 1000 * dt, -300)
            this.physicsStaticFriction = this.physicsDynamicFriction = 0
        }
        if (inputState && inputState.jump) this.mayJump()
        if (this.handRemIt) this.handRemIt -= 1
        if (inputState && inputState.obj) this.act()
        else if (this.handRemIt === 0) this.handRemIt = null
    }

    act() {
        const actionExtra = this.getActionExtra()
        if (actionExtra) actionExtra.act()
        else if (this.handRemIt === null) this.handRemIt = this.handDur
    }

    getHitBox() {
        return {
            left: this.x - 20,
            width: 40,
            top: this.y - 25,
            height: 50,
        }
    }

    onGetAttacked(val, damager) {
        this.game.audio.playSound(OuchAud)
    }

    initJoypadButtons(joypadScn) {
        this.walkButton = joypadScn.addButton(StickButton)
        this.walkButton.onInput = pos => {
            this.game.setInputKey("ArrowRight", (pos && pos.x > 10))
            this.game.setInputKey("ArrowLeft", (pos && pos.x < -10))
        }
        this.jumpButton = joypadScn.addButton(JoypadButton, { inputKey: "ArrowUp", icon: ArrowsSpriteSheet.getImg(0) })
        this.actionButton = joypadScn.addButton(JoypadButton, { inputKey: " ", icon: HandImg })
        this.syncJoypadButtons(joypadScn)
    }

    syncJoypadButtons(joypadScn) {
        const { width, height } = joypadScn
        const { walkButton, jumpButton, actionButton } = this
        const setSpriteSize = but => {
            const spriteSize = floor(min(but.width, but.height) * .8)
            but.spriteWidth = but.spriteHeight = spriteSize
        }
        if(walkButton) {
            walkButton.x = width * .25
            walkButton.y = height * .5
            walkButton.width = width * .5
            walkButton.height = height
            setSpriteSize(walkButton)
        }
        if(jumpButton) {
            jumpButton.x = width * 5/6
            jumpButton.y = height * 1/3
            jumpButton.width = width * 1/3
            jumpButton.height = height * 2/3
            setSpriteSize(jumpButton)
        }
        if(actionButton) {
            actionButton.x = width * 4/6
            actionButton.y = height * 2/3
            actionButton.width = width * 1/3
            actionButton.height = height * 2/3
            setSpriteSize(actionButton)
            const actionExtra = this.getActionExtra()
            actionButton.icon = actionExtra ? actionExtra.constructor.getIconImg() : HandImg
        }
    }

    getActionExtra() {
        const { extras } = this
        if (!extras) return null
        let actionExtra = null
        extras.forEach(extra => {
            if (extra.isActionExtra) actionExtra = extra
        })
        return actionExtra
    }

    syncGraphics() {
        const { iteration } = this.scene
        const { dt, players } = this.game
        const player = players && players[this.playerId]
        const color = player && player.color
        const spriteSheet = NicoSpriteSheets.get(color)
        let img
        if (iteration > 0 && (this.handRemIt || !this.canJump())) img = spriteSheet.getImg(1)
        else if (this.speedX == 0) img = spriteSheet.getImg(0)
        else img = spriteSheet.getImg(1 + floor((iteration * dt * 6) % 3))
        this.setSprite(img)
        super.syncGraphics()
    }

    getInputState() {
        const { game } = this
        const inputState = super.getInputState()
        // walk
        delete inputState.walkX
        if (game.isKeyPressed("ArrowRight")) inputState.walkX = 1
        else if (game.isKeyPressed("ArrowLeft")) inputState.walkX = -1
        // jump
        delete inputState.jump
        if (game.isKeyPressed("ArrowUp")) inputState.jump = true
        // action
        delete inputState.obj
        if (game.isKeyPressed(" ")) inputState.obj = true
        return inputState
    }
}



const BoySkeletonImg = new Img("/static/catalogs/std/v1/2Dside/assets/boy_skeleton.png")


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "StdHero",
})
@Dependencies.add(BoySkeletonImg, OuchAud, ArrowsSpriteSheetImg, NicoHand)
@JumpMixin.add({
    jumpSpeed: 500,
    nullJumpSpeed: 800,
    maxJumpBlockAngle: 90,
})
@AttackMixin.modify({
    maxHealth: 100,
})
@PhysicsMixin.add()
@BodyMixin.add({
    width: 40,
    height: 45,
})
@StateNumber.define("handRemIt", { nullableWith: null, default: null })
@StateProperty.modify("dirX", { showInBuilder: true })
export class StandardHero extends Hero {

    init(kwargs) {
        super.init(kwargs)
        this.handDur = ceil(.1 * this.game.fps)
        this.hand = null
    }

    update() {
        super.update()
        this.applyInputState()
        this.updateHand()
    }

    updateHand() {
        if (this.handRemIt == this.handDur) {
            this.hand ||= this.scene.addObject(NicoHand, {
                owner: this
            })
        } else if (this.hand && !this.handRemIt) {
            this.hand.remove()
            this.hand = null
        }
    }

    applyInputState() {
        const { dt } = this.game
        if (this.getHealth() == 0) return
        const { inputState } = this
        if (!inputState || !inputState.walkX) {
            this.physicsStaticFriction = 500
            this.physicsDynamicFriction = 2
        } else if (inputState.walkX > 0) {
            this.dirX = 1
            this.speedX = sumTo(this.speedX, 1000 * dt, 300)
            this.physicsStaticFriction = this.physicsDynamicFriction = 0
        } else if (inputState.walkX < 0) {
            this.dirX = -1
            this.speedX = sumTo(this.speedX, 1000 * dt, -300)
            this.physicsStaticFriction = this.physicsDynamicFriction = 0
        }
        if (inputState && inputState.jump) this.mayJump()
        if (this.handRemIt) this.handRemIt -= 1
        if (inputState && inputState.obj) this.act()
        else if (this.handRemIt === 0) this.handRemIt = null
    }

    act() {
        const actionExtra = this.getActionExtra()
        if (actionExtra) actionExtra.act()
        else if (this.handRemIt === null) this.handRemIt = this.handDur
    }

    getHitBox() {
        return {
            left: this.x - 20,
            width: 40,
            top: this.y - 25,
            height: 50,
        }
    }

    onGetAttacked(val, damager) {
        this.game.audio.playSound(OuchAud)
    }

    initJoypadButtons(joypadScn) {
        this.walkButton = joypadScn.addButton(StickButton)
        this.walkButton.onInput = pos => {
            this.game.setInputKey("ArrowRight", (pos && pos.x > 10))
            this.game.setInputKey("ArrowLeft", (pos && pos.x < -10))
        }
        this.jumpButton = joypadScn.addButton(JoypadButton, { inputKey: "ArrowUp", icon: ArrowsSpriteSheet.getImg(0) })
        this.actionButton = joypadScn.addButton(JoypadButton, { inputKey: " ", icon: HandImg })
        this.syncJoypadButtons(joypadScn)
    }

    syncJoypadButtons(joypadScn) {
        const { width, height } = joypadScn
        const { walkButton, jumpButton, actionButton } = this
        const setSpriteSize = but => {
            const spriteSize = floor(min(but.width, but.height) * .8)
            but.spriteWidth = but.spriteHeight = spriteSize
        }
        if(walkButton) {
            walkButton.x = width * .25
            walkButton.y = height * .5
            walkButton.width = width * .5
            walkButton.height = height
            setSpriteSize(walkButton)
        }
        if(jumpButton) {
            jumpButton.x = width * 5/6
            jumpButton.y = height * 1/3
            jumpButton.width = width * 1/3
            jumpButton.height = height * 2/3
            setSpriteSize(jumpButton)
        }
        if(actionButton) {
            actionButton.x = width * 4/6
            actionButton.y = height * 2/3
            actionButton.width = width * 1/3
            actionButton.height = height * 2/3
            setSpriteSize(actionButton)
            const actionExtra = this.getActionExtra()
            actionButton.icon = actionExtra ? actionExtra.constructor.getIconImg() : HandImg
        }
    }

    getActionExtra() {
        const { extras } = this
        if (!extras) return null
        let actionExtra = null
        extras.forEach(extra => {
            if (extra.isActionExtra) actionExtra = extra
        })
        return actionExtra
    }

    getInputState() {
        const { game } = this
        const inputState = super.getInputState()
        // walk
        delete inputState.walkX
        if (game.isKeyPressed("ArrowRight")) inputState.walkX = 1
        else if (game.isKeyPressed("ArrowLeft")) inputState.walkX = -1
        // jump
        delete inputState.jump
        if (game.isKeyPressed("ArrowUp")) inputState.jump = true
        // action
        delete inputState.obj
        if (game.isKeyPressed(" ")) inputState.obj = true
        return inputState
    }

    syncGraphics() {
        this.initSprites()
        this.animateSprites()
        this._graphics.x = this.x
        this._graphics.y = this.y
        this._graphics.scale.x = this.dirX
    }

    initSprites() {
        this.initBodyParts()
    }

    initBodyParts() {
        if(this.bodySprite) return
        const img = BoySkeletonImg
        img.parts ||= {}
        const imgToObjFactor = .2
        const headWidth = 200, headHeight = 160, headAnchorX = 100, headAnchorY = 140, headDy = -20 + 50
        const bodyWidth = 100, bodyHeight = 100, bodyAnchorX = 50, bodyAnchorY = 40, bodyDy = 50
        const armWidth = 50, armHeight = 100, armAnchorX = 30, armAnchorY = 20, armDx = -20, armDy = -10 + 50
        const legWidth = 100, legHeight = 40, legAnchorX = 50, legAnchorY = 10, legDx = -10, legDy = 25 + 50
        // head
        img.parts.head ||= cloneCanvas(img, { dx: 0, dy: 0, width: headWidth, height: headHeight })
        this.headSprite = pixiHelpers.addNewSpriteTo(this._graphics, img.parts.head)
        this.headSprite.anchor.set(headAnchorX/headWidth, headAnchorY/headHeight)
        this.headSprite.y = headDy * imgToObjFactor
        this.headSprite.zIndex = 1
        pixiHelpers.scaleSpriteTo(this.headSprite, headWidth*imgToObjFactor, headHeight*imgToObjFactor)
        // body
        img.parts.body ||= cloneCanvas(img, { dx: -armWidth, dy: -headHeight, width: bodyWidth, height: bodyHeight })
        this.bodySprite = pixiHelpers.addNewSpriteTo(this._graphics, img.parts.body)
        this.bodySprite.anchor.set(bodyAnchorX/bodyWidth, bodyAnchorY/bodyHeight)
        this.bodySprite.y = bodyDy * imgToObjFactor
        this.bodySprite.zIndex = 0
        pixiHelpers.scaleSpriteTo(this.bodySprite, bodyWidth*imgToObjFactor, bodyHeight*imgToObjFactor)
        // arm1
        img.parts.arm1 ||= cloneCanvas(img, { dx: 0, dy: -headHeight, width: armWidth, height: armHeight })
        this.arm1Sprite = pixiHelpers.addNewSpriteTo(this._graphics, img.parts.arm1)
        this.arm1Sprite.anchor.set(armAnchorX/armWidth, armAnchorY/armHeight)
        this.arm1Sprite.x = armDx * imgToObjFactor
        this.arm1Sprite.y = armDy * imgToObjFactor
        this.arm1Sprite.zIndex = 2
        pixiHelpers.scaleSpriteTo(this.arm1Sprite, armWidth*imgToObjFactor, armHeight*imgToObjFactor)
        // arm2
        img.parts.arm2 ||= cloneCanvas(img, { dx: -(armWidth+bodyWidth), dy: -headHeight, width: armWidth, height: armHeight })
        this.arm2Sprite = pixiHelpers.addNewSpriteTo(this._graphics, img.parts.arm2)
        this.arm2Sprite.anchor.set((armWidth-armAnchorX)/armWidth, armAnchorY/armHeight)
        this.arm2Sprite.x = -armDx * imgToObjFactor
        this.arm2Sprite.y = armDy * imgToObjFactor
        this.arm2Sprite.zIndex = -2
        pixiHelpers.scaleSpriteTo(this.arm2Sprite, armWidth*imgToObjFactor, armHeight*imgToObjFactor)
        // leg1
        img.parts.leg1 ||= cloneCanvas(img, { dx: 0, dy: -(headHeight+bodyHeight), width: legWidth, height: legHeight })
        this.leg1Sprite = pixiHelpers.addNewSpriteTo(this._graphics, img.parts.leg1)
        this.leg1Sprite.anchor.set(legAnchorX/legWidth, legAnchorY/legHeight)
        this.leg1Sprite.x = legDx * imgToObjFactor
        this.leg1Sprite.y = legDy * imgToObjFactor
        this.leg1Sprite.zIndex = 2
        pixiHelpers.scaleSpriteTo(this.leg1Sprite, legWidth*imgToObjFactor, legHeight*imgToObjFactor)
        // leg2
        img.parts.leg2 ||= cloneCanvas(img, { dx: -legWidth, dy: -(headHeight+bodyHeight), width: legWidth, height: legHeight })
        this.leg2Sprite = pixiHelpers.addNewSpriteTo(this._graphics, img.parts.leg2)
        this.leg2Sprite.anchor.set((legWidth-legAnchorX)/legWidth, legAnchorY/legHeight)
        this.leg2Sprite.x = -legDx * imgToObjFactor
        this.leg2Sprite.y = legDy * imgToObjFactor
        this.leg2Sprite.zIndex = -2
        pixiHelpers.scaleSpriteTo(this.leg2Sprite, legWidth*imgToObjFactor, legHeight*imgToObjFactor)
    }

    animateSprites() {
        const { iteration } = this.scene
        if (iteration > 0 && (this.handRemIt || !this.canJump())) this.animateSpritesAsJumping()
        else if (this.speedX == 0) this.animateSpritesAsStanding()
        else this.animateSpritesAsWalking()
    }

    animateSpritesAsStanding() {
        this.headSprite.rotation = 0
        this.bodySprite.rotation = 0
        this.arm1Sprite.rotation = 0
        this.arm2Sprite.rotation = 0
        this.leg1Sprite.rotation = 0
        this.leg2Sprite.rotation = 0
    }

    animateSpritesAsJumping() {
        this.headSprite.rotation = 0
        this.bodySprite.rotation = 0
        const angle = PI/4
        this.arm1Sprite.rotation = angle
        this.arm2Sprite.rotation = -angle
        this.leg1Sprite.rotation = angle
        this.leg2Sprite.rotation = -angle
    }

    animateSpritesAsWalking() {
        this.headSprite.rotation = 0
        this.bodySprite.rotation = 0
        const angle = (this.scene.iteration * .1) % 2 - 1
        this.arm1Sprite.rotation = angle
        this.arm2Sprite.rotation = -angle
        this.leg1Sprite.rotation = angle
        this.leg2Sprite.rotation = -angle
    }
}