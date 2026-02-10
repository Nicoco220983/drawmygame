const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import {
    sign, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, importJs, cachedTransform, hasKeys,
    GraphicsProps,
    CATALOG,
    StateProperty, StateBool, StateNumber,
    GameObject, Category, Dependencies, LinkTrigger, LinkReaction, Mixin, Img, SpriteSheet, Aud, ObjectRefs, now, hackMethod,
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
        //this.initTeam()
        this.updateSpawnEffect()
    }

    // initTeam() {
    //     if(this._initTeamDone) return
    //     this._initTeamDone = true
    //     if(this.scene.teamsManager) {
    //         this.scene.teamsManager.assignHeroTeam(this)
    //     }
    // }

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

    initJoypadButtons(joypadScn) { }

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

    getBaseImg() {
        return HandImg
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

    getGraphicsProps() {
        const props = super.getGraphicsProps()
        props.width = 50
        props.height = 50
        return props
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
        const { width, height } = joypadScn
        const size = height * .45
        //joypadScn.addButton(JoypadButton, { inputKey: "ArrowLeft", x: width * .15, y: height * .27, size, icon: ArrowsSpriteSheet.get(3) })
        //joypadScn.addButton(JoypadButton, { inputKey: "ArrowRight", x: width * .3, y: height * .73, size, icon: ArrowsSpriteSheet.get(1) })
        const walkButton = joypadScn.addButton(StickButton, { x: width * .25, y: height * .5, size: height * .8 })
        walkButton.onInput = pos => {
            this.game.setInputKey("ArrowRight", (pos && pos.x > 10))
            this.game.setInputKey("ArrowLeft", (pos && pos.x < -10))
        }
        joypadScn.addButton(JoypadButton, { inputKey: "ArrowUp", x: width * .85, y: height * .27, size, icon: ArrowsSpriteSheet.get(0) })
        this.actionButton = joypadScn.addButton(JoypadButton, { inputKey: " ", x: width * .7, y: height * .73, size, icon: HandImg })
        this.syncJoypadActionButton()
    }

    syncJoypadActionButton() {
        const { actionButton } = this
        const actionExtra = this.getActionExtra()
        actionButton.icon = actionExtra ? actionExtra.getBaseImg() : HandImg
    }

    addExtra(extra) {
        super.addExtra(extra)
        if (extra.isActionExtra) this.syncJoypadActionButton()
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

    getBaseImg() {
        const { iteration } = this.scene
        const { dt, players } = this.game
        const player = players && players[this.playerId]
        const color = player && player.color
        const spriteSheet = NicoSpriteSheets.get(color)
        if (iteration > 0 && (this.handRemIt || !this.canJump())) return spriteSheet.get(1)
        else if (this.speedX == 0) return spriteSheet.get(0)
        else return spriteSheet.get(1 + floor((iteration * dt * 6) % 3))
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