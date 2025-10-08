const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import * as utils from '../../../../core/v1/utils.mjs'
import { GraphicsProps } from '../../../../core/v1/graphics.mjs'
const { checkHit, urlAbsPath, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, importJs, cachedTransform, hasKeys } = utils
import { ModuleCatalog, GameObject, Category, StateProperty, StateBool, StateNumber, LinkTrigger, LinkReaction, BodyMixin, PhysicsMixin, AttackMixin, SpriteSheet, ObjectRefs, ActivableMixin, CollectMixin, OwnerableMixin, now } from '../../../../core/v1/game.mjs'

export const CATALOG = new ModuleCatalog(import.meta.url, {
    version: "v1",
    perspective: "2Dside",
})


@StateNumber.define("lastSpawnIt", { default: -Infinity })
@CollectMixin.add({
    canCollect: true,
    canGetCollected: false,
})
@AttackMixin.add({
    canAttack: false,
    canGetAttacked: true,
    graceDuration: 2,
})
@Category.append("hero")
export class Hero extends GameObject {
    static IS_HERO = true

    init(kwargs) {
        super.init(kwargs)
        this.team = "hero"
        if(kwargs && kwargs.playerId !== undefined) this.setPlayerId(kwargs.playerId)
    }

    setPlayerId(playerId) {
        if(playerId === this.playerId) return
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
        if(extras) extras.delete(extra.id)
    }

    update() {
        super.update()
        this.updateSpawnEffect()
    }

    updateSpawnEffect() {
        const { lastSpawnIt } = this
        const { iteration } = this.scene
        const { fps } = this.game
        if(lastSpawnIt + fps > iteration) {
            if(!this._spawnEnt) this._spawnEnt = this.addSpawnEffect()
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
        if(inputState && hasKeys(inputState)) state.ist = inputState
        else delete state.ist
        const extras = this.extras
        if(extras && extras.size > 0) {
            const stExtras = state.extras ||= []
            stExtras.length = 0
            for(let exId of extras) stExtras.push(exId)
        } else if(state.extras) state.extras.length = 0
        return state
    }

    setState(state) {
        super.setState(state)
        this.setPlayerId(state.pid)
        this.inputState = state.ist
        if(this.extras || state.extras) {
            const extras = this.initExtras()
            extras.clear()
            if(state.extras) for(let exId of state.extras) extras.add(exId)
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

    spawn(x, y) {
        this.x = x + floor((this.scene.rand("spawn")-.5) * 50)
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


export const PuffAud = CATALOG.registerAudio("/static/catalogs/std/v1/2Dside/assets/puff.opus")


const SmokeExplosionSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/smoke_explosion.png"), 4, 1)

@CATALOG.registerObject({
    showInBuilder: false
})
@StateNumber.define("iteration")
export class SmokeExplosion extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 100
        this.game.audio.playSound(PuffAud)
    }

    update() {
        this.iteration += 1
        const time = this.iteration * this.game.dt
        if(time > .5) { this.remove(); return }
    }

    getBaseImg() {
        const time = this.iteration * this.game.dt
        return SmokeExplosionSpriteSheet.get(floor(time/.5*4))
    }
}


const PopImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/pop.png")
const PopAud = CATALOG.registerAudio("/static/catalogs/std/v1/2Dside/assets/pop.opus")

class Pop extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 10
        this.duration = floor(this.game.fps * .25)
        this.remIt = this.duration
    }
    update() {
        if(!this._soundPlayed) {
            this.game.audio.playSound(PopAud)
            this._soundPlayed = true
        }
        this.width = this.height = 10 + 100 * (1 - this.remIt/this.duration)
        this.remIt -= 1
        if(this.remIt <= 0) this.remove()
    }
    getBaseImg() {
        return PopImg
    }
}


@AttackMixin.add()
@Category.append("npc/enemy")
export class Enemy extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.team = "enemy"
    }

    die(killer) {
        this.remove()
        const { x, y } = this
        this.scene.addVisual(SmokeExplosion, { x, y })
    }
}


export const ItemAud = CATALOG.registerAudio("/static/catalogs/std/v1/2Dside/assets/item.opus")


@Category.append("extra")
@CollectMixin.add({
    canCollect: false,
    canGetCollected: true,
})
@StateNumber.define("dropAge", { default: Infinity, nullableWith: Infinity })
export class Extra extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.stuckToOwner = true
    }

    getPriority() {
        const { owner } = this
        if(owner) return owner.getPriority() - 1
        else super.getPriority()
    }

    update() {
        super.update()
        const { owner } = this
        if(owner && this.stuckToOwner) {
            this.x = owner.x
            this.y = owner.y
        }
        this.dropAge += 1
        if(this.dropAge > this.game.fps) this.dropAge = Infinity
    }

    canGetCollectedByObject(obj) {
        return this.dropAge == Infinity
    }

    onGetCollected(owner) {
        owner.addExtra(this)
    }

    onDrop(owner) {
        this.dropAge = 0
        owner.onExtraDrop(this)
    }
}


@AttackMixin.add({
    canAttack: true,
    canGetAttacked: false,
})
export class Weapon extends Extra {

    init(kwargs) {
        super.init(kwargs)
        this.team = null
    }

    onGetCollected(owner) {
        super.onGetCollected(owner)
        this.team = owner.team
    }

    onDrop(owner) {
        super.onDrop(owner)
        this.team = null
    }

    canAttackObject(obj) {
        const { owner } = this
        return owner ? (obj != owner && owner.canAttackObject(obj)) : true
    }

    getAttackProps(obj) {
        const props = AttackMixin.prototype.objGetAttackProps.call(this, obj)
        props.attacker = this.owner ?? this
        return props
    }
}


@Category.append("projectile")
@AttackMixin.add({
    canAttack: true,
    canGetAttacked: false,
})
@PhysicsMixin.add({
    affectedByGravity: false,
})
@OwnerableMixin.add()
export class Projectile extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.syncTeam()
    }

    update() {
        super.update()
        this.syncTeam()
    }

    syncTeam() {
        this.team = this.owner?.team ?? null
    }

    canAttackObject(obj) {
        const { owner } = this
        return owner ? (obj != owner && owner.canAttackObject(obj)) : true
    }

    getAttackProps(obj) {
        const props = AttackMixin.prototype.objGetAttackProps.call(this, obj)
        props.attacker = this.owner ?? this
        return props
    }

    onAttack(obj, props) {
        this.remove()
    }
}


// HEROES

const NicoImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/nico.png")
const NicoBaseSpriteSheet = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/nico_full.png")
const NicoColorableSpriteSheet = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/nico_full_colorable.png")
const NicoSpriteSheets = {
    spritesheets: {},
    get: function(color) {
        return this.spritesheets[color] ||= new SpriteSheet((() => {
            if(!color) return NicoBaseSpriteSheet
            const coloredImg = colorizeCanvas(cloneCanvas(NicoColorableSpriteSheet), color)
            return addCanvas(cloneCanvas(NicoBaseSpriteSheet), coloredImg)
        })(), 4, 1)
    },
}

const HandImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/hand.png")
const ArrowsSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/arrows.png"), 4, 1)

const OuchAud = CATALOG.registerAudio("/static/catalogs/std/v1/2Dside/assets/ouch.opus")
const SlashAud = CATALOG.registerAudio("/static/catalogs/std/v1/2Dside/assets/slash.opus")
const HandHitAud = CATALOG.registerAudio("/static/catalogs/std/v1/2Dside/assets/hand_hit.opus")
const JumpAud = CATALOG.registerAudio("/static/catalogs/std/v1/2Dside/assets/jump.opus")



@CATALOG.registerObject({
    label: "Nico",
    icon: NicoImg,
})
@StateNumber.define("handRemIt", { nullableWith: null, default: null })
@StateProperty.modify("dirX", { showInBuilder: true })
@AttackMixin.add({
    canAttack: false,
    canGetAttacked: true,
    maxHealth: 100,
    graceDuration: 2,
})
@PhysicsMixin.add()
@BodyMixin.add({
    width: 40,
    height: 45,
})
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
        if(this.handRemIt == this.handDur) {
            this.hand ||= this.scene.addObject(NicoHand, {
                owner: this
            })
        } else if(this.hand && !this.handRemIt) {
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

    getBaseImg() {
        const { iteration } = this.scene
        const { dt, players } = this.game
        const player = players && players[this.playerId]
        const color = player && player.color
        const spriteSheet = NicoSpriteSheets.get(color)
        if(iteration > 0 && (this.handRemIt || this.speedResY == 0)) return spriteSheet.get(1)
        else if(this.speedX == 0) return spriteSheet.get(0)
        else return spriteSheet.get(1 + floor((iteration * dt * 6) % 3))
    }

    getInputState() {
        const { game } = this
        const inputState = super.getInputState()
        if(game.isKeyPressed("ArrowRight")) inputState.walkX = 1
        else if(game.isKeyPressed("ArrowLeft")) inputState.walkX = -1
        else delete inputState.walkX
        if(game.isKeyPressed("ArrowUp")) inputState.jump = true
        else delete inputState.jump
        if(game.isKeyPressed(" ")) inputState.obj = true
        else delete inputState.obj
        return inputState
    }

    applyInputState() {
        const { dt } = this.game
        if(this.getHealth() == 0) return
        const { inputState } = this
        if(!inputState || !inputState.walkX) this.speedX = sumTo(this.speedX, 500 * dt, 0)
        else if(inputState.walkX > 0) {
            this.dirX = 1
            this.speedX = sumTo(this.speedX, 1000 * dt, 300)
        } else if(inputState.walkX < 0) {
            this.dirX = -1
            this.speedX = sumTo(this.speedX, 1000 * dt, -300)
        }
        if(inputState && inputState.jump && this.speedResY < 0) {
            this.speedY = min(-500, this.speedY-100)
            this.game.audio.playSound(JumpAud)
        }
        if(this.handRemIt) this.handRemIt -= 1
        if(inputState && inputState.obj) this.act()
        else if(this.handRemIt === 0) this.handRemIt = null
    }

    act() {
        const actionExtra = this.getActionExtra()
        if(actionExtra) actionExtra.act()
        else if(this.handRemIt===null) this.handRemIt = this.handDur
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
        const size = height*.45
        joypadScn.addButton({ inputKey:"ArrowLeft", x:width*.15, y:height*.27, size, icon: ArrowsSpriteSheet.get(3) })
        joypadScn.addButton({ inputKey:"ArrowRight", x:width*.3, y:height*.73, size, icon: ArrowsSpriteSheet.get(1) })
        joypadScn.addButton({ inputKey:"ArrowUp", x:width*.85, y:height*.27, size, icon: ArrowsSpriteSheet.get(0) })
        joypadScn.actionButton = joypadScn.addButton({ inputKey:" ", x:width*.7, y:height*.73, size, icon: HandImg })
        this.syncJoypadActionButton()
    }

    syncJoypadActionButton() {
        const { scenes } = this.game
        const actionButton = scenes.joypad && scenes.joypad.actionButton
        if(!actionButton) return
        const actionExtra = this.getActionExtra()
        actionButton.icon = actionExtra ? actionExtra.getBaseImg() : HandImg
    }

    addExtra(extra) {
        if(extra.isActionExtra) {
            const prevActionExtra = this.getActionExtra()
            if(prevActionExtra) {
                prevActionExtra.drop()
                prevActionExtra.remove()  // TODO rm when infinite drop/collect solved
            }
        }
        super.addExtra(extra)
        if(extra.isActionExtra) this.syncJoypadActionButton()
    }

    getActionExtra() {
        const { extras } = this
        if(!extras) return null
        let actionExtra = null
        extras.forEach(extra => {
            if(extra.isActionExtra) actionExtra = extra
        })
        return actionExtra
    }
}


@BodyMixin.add({
    width: 25,
    height: 25,
})
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


// weapons

const SWORD_ATTACK_PERIOD = .5

const SwordImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/sword.png")
const SwordSlashSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/slash.png"), 3, 2)

const SwordHitAud = CATALOG.registerAudio("/static/catalogs/std/v1/2Dside/assets/sword_hit.opus")

@CATALOG.registerObject({
    label: "Sword",
    icon: SwordImg,
})
@StateNumber.define("lastAttackAge", { default: Infinity })
@BodyMixin.add({
    width: 40,
    height: 40,
})
export class Sword extends Weapon {

    init(kwargs) {
        super.init(kwargs)
        this.isActionExtra = true
        this.attackDamages = 100
        this.oneAttackByObject = true
    }

    update() {
        super.update()
        this.syncPos()
        if(this.lastAttackAge == 0) this.game.audio.playSound(SlashAud)
        this.lastAttackAge += 1
        if(this.lastAttackAge > (SWORD_ATTACK_PERIOD * this.game.fps)) this.lastAttackAge = Infinity
        if(!this.isAttacking()) this.resetOneAttackByObject()
    }

    syncPos() {
        const { owner } = this
        if(!owner) return
        this.dirX = owner.dirX
        this.y = owner.y
        if(this.isAttacking()) {
            this.x = owner.x + 40 * owner.dirX
            this.width = this.height = 60
        } else {
            this.x = owner.x + 25 * owner.dirX
            this.width = this.height = 40
        }
    }

    act() {
        if(this.isAttacking()) return
        this.lastAttackAge = 0
    }

    canAttackObject(obj) {
        if(!this.isAttacking()) return false
        return super.canAttackObject(obj)
    }

    onAttack(obj, props) {
        this.game.audio.playSound(SwordHitAud)
    }

    isAttacking() {
        return this.lastAttackAge < (SWORD_ATTACK_PERIOD * this.game.fps)
    }

    getBaseImg() {
        const ratioSinceLastAttack = this.lastAttackAge / (SWORD_ATTACK_PERIOD * this.game.fps)
        if(ratioSinceLastAttack <= 1) {
            return SwordSlashSpriteSheet.get(floor(6*ratioSinceLastAttack))
        } else {
            return SwordImg
        }
    }
}


const BoxingGloveImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/boxing_glove.png")

@CATALOG.registerObject({
    label: "Boxing Glove",
    icon: BoxingGloveImg,
})
@BodyMixin.add({
    width: 25,
    height: 20,
})
@StateNumber.define("lastAttackAge", { default: Infinity })
export class BoxingGlove extends Weapon {

    init(kwargs) {
        super.init(kwargs)
        this.isActionExtra = true
        this.attackDamages = 0
        this.attackKnockback = 500
        this.oneAttackByObject = true
        this.attackDurationIt = .1 * this.game.fps
    }

    update() {
        super.update()
        this.syncPos()
        if(this.lastAttackAge == 0) this.game.audio.playSound(SlashAud)
        if(!this.isAttacking()) this.resetOneAttackByObject()
        this.lastAttackAge += 1
        if(this.lastAttackAge > this.attackDurationIt) this.lastAttackAge = Infinity
    }

    syncPos() {
        const { owner } = this
        if(!owner) return
        this.dirX = owner.dirX
        this.y = owner.y
        if(this.isAttacking()) {
            this.x = owner.x + 40 * owner.dirX
            this.width = 40
            this.height = 32
        } else {
            this.x = owner.x + 25 * owner.dirX
            this.width = 25
            this.height = 20
        }
    }

    act() {
        if(this.isAttacking()) return
        this.lastAttackAge = 0
    }

    canAttackObject(obj) {
        if(!this.isAttacking()) return false
        return super.canAttackObject(obj)
    }

    getAttackProps(obj) {
        const props = super.getAttackProps(obj)
        props.knockbackAngle = this.dirX > 0 ? -45 : -135
        return props
    }

    onAttack(obj, props) {
        this.game.audio.playSound(HandHitAud)
    }

    isAttacking() {
        return this.lastAttackAge <= this.attackDurationIt
    }

    getBaseImg() {
        return BoxingGloveImg
    }
}


const ShurikenImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/shuriken.png")

@CATALOG.registerObject({
    label: "ShurikenPack",
    icon: ShurikenImg,
})
@BodyMixin.add({
    width: 30,
    height: 30,
})
@StateNumber.define("nb", { default:5, nullableWith: Infinity, showInBuilder: true })
export class ShurikenPack extends Extra {

    init(kwargs) {
        super.init(kwargs)
        this.isActionExtra = true
        this.actLastTryIt = -Infinity
        this.actRemIt = 0
        if(kwargs?.nb !== undefined) this.nb = kwargs.nb
        this.throwPeriod = .3
    }

    act() {
        const prevActLastTryIt = this.actLastTryIt
        this.actLastTryIt = this.scene.iteration
        if(this.actLastTryIt <= prevActLastTryIt+1 || this.actRemIt > 0) return
        this.actRemIt = ceil(this.throwPeriod * this.game.fps)
        this.throwOneShuriken()
        this.nb -= 1
        if(this.nb <= 0) this.remove()
    }

    throwOneShuriken() {
        const { x, y, owner } = this
        if(!owner) return
        this.scene.addObject(Shuriken, {
            x, y, owner,
        })
    }

    update() {
        super.update()
        const { owner } = this
        if(owner) {
            this.x = owner.x
            this.y = owner.y
        }
        if(this.actRemIt > 0) this.actRemIt -= 1
    }

    getBaseImg() {
        return ShurikenImg
    }
}

@CATALOG.registerObject({
    label: "Shuriken",
    icon: ShurikenImg,
    showInBuilder: false,
})
@BodyMixin.add({
    width: 30,
    height: 30,
})
@StateNumber.define("itToLive", { default: null })
export class Shuriken extends Projectile {

    init(kwargs) {
        super.init(kwargs)
        if(this.owner) this.dirX = this.owner.dirX
        this.speedX = this.dirX * 500
        this.itToLive = 2 * this.game.fps
        this.attackDamages = 35
        this.game.audio.playSound(SlashAud)
    }

    update() {
        this.angle += 30
        this.itToLive -= 1
        if(this.itToLive <= 0) this.remove()
        if(this.speedResX || this.speedResY) this.remove()
    }

    getBaseImg() {
        return ShurikenImg
    }
}


const BombImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/bomb.png")
const BombSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/bomb_spritesheet.png"), 2, 1)

@CATALOG.registerObject({
    label: "Bomb",
    icon: BombImg
})
@PhysicsMixin.add({
    affectedByGravity: false,
})
@BodyMixin.add({
    width: 40,
    height: 40,
})
@StateNumber.define("countdown", { default: 2, precision:.5, showInBuilder: true })
@StateNumber.define("itToLive", { default: null })
export class Bomb extends Extra {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 40
        this.isActionExtra = true
    }

    update() {
        super.update()
        this.canBeHit = this.owner == null && this.itToLive == null
        const { dt } = this.game
        const { x, y, owner } = this
        this.affectedByGravity = this.canGetBlocked = (this.itToLive !== null)
        if(this.itToLive !== null) {
            if(this.speedResY < 0) this.speedX = sumTo(this.speedX, 500 * dt, 0)
            if(this.itToLive <= 0) {
                this.scene.addObject(Explosion, { x, y, owner })
                this.remove()
            }
            this.itToLive -= 1
        } else if(owner) {
            this.x = owner.x
            this.y = owner.y
        }
    }

    act() {
        const { owner } = this
        if(!owner) return
        this.drop()
        this.owner = owner
        this.stuckToOwner = false
        this.speedX = owner.dirX * 200
        this.speedY = -500
        this.itToLive = this.countdown * this.game.fps
    }

    getBaseImg() {
        const { itToLive, countdown } = this
        if(itToLive === null) return BombSpriteSheet.get(0)
        return BombSpriteSheet.get(floor(pow(3*(1 - (itToLive / this.game.fps)/countdown), 2)*2) % 2)
    }
}


const ExplosionSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/explosion.png"), 4, 2)

@CATALOG.registerObject({
    showInBuilder: false
})
@AttackMixin.add({
    canAttack: true,
    canGetAttacked: false,
    attackDamages: 100,
    oneAttackByObject: true,
})
@OwnerableMixin.add({
    removedWithOwner: false,
})
@BodyMixin.add({
    width: 300,
    height: 300,
})
@StateNumber.define("lastAttackAge", { default: Infinity })
@StateNumber.define("iteration")
export class Explosion extends GameObject {

    getAttackProps(obj) {
        const props = AttackMixin.prototype.objGetAttackProps.call(this, obj)
        props.attacker = this.owner || this
        return props
    }

    update() {
        super.update()
        const age = this.iteration/this.game.fps
        if(age >= 1) return this.remove()
        this.iteration += 1
    }

    getGraphicsProps() {
        const props = super.getGraphicsProps()
        if(!props) return null
        props.width = 500
        props.height = 500
        return props
    }

    getBaseImg() {
        return ExplosionSpriteSheet.get(floor(
            this.iteration / this.game.fps * 15
        ))
    }
}


// ENEMIES


const SpikyImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/spiky.png")

@CATALOG.registerObject({
    label: "Spiky",
    icon: SpikyImg,
})
@AttackMixin.add({
    canAttack: true,
    canGetAttacked: true,
    maxHealth: 100,
    attackDamages: 10,
    attackKnockback: 200,
})
@BodyMixin.add({
    width: 45,
    height: 45,
})
export class Spiky extends Enemy {

    canAttackObject(obj) {
        return obj instanceof Hero
    }

    getGraphicsProps() {
        const { fps } = this.game, { iteration } = this.scene
        const props = super.getGraphicsProps()
        const rand = this._graphicsRand ||= floor(random() * fps)
        const angle = PI * (rand + iteration) / fps, cosAngle = cos(angle)
        props.y += props.height * .05 * cosAngle
        return props
    }

    getBaseImg() {
        return SpikyImg
    }
}


const BlobImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/blob.png")

@CATALOG.registerObject({
    label: "Blob",
    icon: BlobImg,
})
@StateNumber.define("lastChangeDirAge")
@StateProperty.modify("dirX", { showInBuilder: true })
@AttackMixin.add({
    canAttack: true,
    canGetAttacked: true,
    maxHealth: 100,
    attackDamages: 10,
    attackKnockback: 200,
})
@PhysicsMixin.add()
@BodyMixin.add({
    width: 40,
    height: 36,
})
export class BlobEnemy extends Enemy {

    init(kwargs) {
        super.init(kwargs)
        this.maxSpeed = 30
        this.acc = 1000
        this.blockChecker = this.scene.addObject(BlobEnemyBlockChecker, {
            owner: this,
        })
    }

    update() {
        super.update()
        const { dt } = this.game
        // move
        if(abs(this.speedX) < 10) this.mayChangeDir()
        if(this.speedResY < 0) this.speedX = sumTo(this.speedX, this.acc * dt, this.dirX * this.maxSpeed)
        this.lastChangeDirAge += 1
    }

    mayChangeDir() {
        if(this.speedResY >= 0) return
        if(this.lastChangeDirAge < this.game.fps) return
        this.lastChangeDirAge = 0
        this.dirX *= -1
        this.speedX *= -1
    }

    canAttackObject(obj) {
        return obj instanceof Hero
    }

    getAttackProps(obj) {
        const props = super.getAttackProps(obj)
        props.knockbackAngle = this.x<obj.x ? -45 : -135
        return props
    }

    getGraphicsProps() {
        const { fps } = this.game, { iteration } = this.scene
        const props = super.getGraphicsProps()
        const rand = this._graphicsRand ||= floor(random() * fps)
        const angle = 2 * PI * (rand + iteration) / fps, cosAngle = cos(angle), sinAngle = sin(angle)
        props.width = 50 * (1 + .1 * cosAngle)
        props.height = 35 * (1 + .1 * sinAngle)
        props.y -= 35 * .1 * sinAngle / 2
        return props
    }

    getBaseImg() {
        return BlobImg
    }

    getHitBox() {
        return {
            left: this.x - 10,
            width: 20,
            top: this.y - 30,
            height: 60,
        }
    }

    remove() {
        super.remove()
        this.blockChecker.remove()
    }
}


@PhysicsMixin.add({
    canMove: false,
    checkGetBlockedAnyway: true,
})
@BodyMixin.add({
    width: 10,
    height: 50,
})
class BlobEnemyBlockChecker extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.owner = kwargs.owner
        this.lastGetBlockedIteration = 0
    }

    update() {
        super.update()
        const { owner } = this
        this.x = owner.x + owner.dirX * owner.width/2
        this.y = owner.y + owner.height/2
        if(this.lastGetBlockedIteration < this.scene.iteration) {
            owner.mayChangeDir()
        }
    }

    onGetBlocked(obj, details) {
        this.lastGetBlockedIteration = this.scene.iteration
    }
}


const GhostImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/ghost.png")

@CATALOG.registerObject({
    label: "Ghost",
    icon: GhostImg,
})
@StateProperty.modify("dirX", { showInBuilder: true })
@AttackMixin.add({
    canAttack: true,
    canGetAttacked: true,
    maxHealth: 100,
    attackDamages: 10,
    attackKnockback: 200,
})
@PhysicsMixin.add({
    affectedByGravity: false,
})
@BodyMixin.add({
    width: 45,
    height: 45,
})
export class Ghost extends Enemy {

    update() {
        super.update()
        const { dt } = this.game
        const { width } = this.scene.map
        // move
        if((this.speedResX * this.dirX < 0) || (this.x < 0 && this.dirX < 0) || (this.x > width && this.dirX > 0)) this.dirX *= -1
        this.speedX = sumTo(this.speedX, 1000 * dt, this.dirX * 2000 * dt)
        this.speedY = sumTo(this.speedY, 1000 * dt, 0)
    }

    canAttackObject(obj) {
        return obj instanceof Hero
    }

    getBaseImg() {
        return GhostImg
    }

    getGraphicsProps() {
        const { fps } = this.game, { iteration } = this.scene
        const props = super.getGraphicsProps()
        const rand = this._graphicsRand ||= floor(random() * fps)
        const angle = PI * (rand + iteration) / fps, cosAngle = cos(angle)
        props.y += props.height * .1 * cosAngle
        return props
    }

    getHitBox() {
        return {
            left: this.x - 30,
            width: 60,
            top: this.y - 10,
            height: 20,
        }
    }
}


// COLLECTABLES

const HeartImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/heart.png")

const HeartSpriteSheetsImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/colorable_heart.png")
export const HeartSpriteSheets = {
    spritesheets: {},
    get: function(color) {
        return this.spritesheets[color] ||= new SpriteSheet((() => {
            if(!color) return HeartSpriteSheetsImg
            return colorizeCanvas(cloneCanvas(HeartSpriteSheetsImg), color)
        })(), 2, 1)
    },
}

@CATALOG.registerObject({
    label: "Heart",
    icon: HeartImg,
})
@CollectMixin.add({
    canCollect: false,
    canGetCollected: true,
})
export class Heart extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
    }

    canGetCollectedByObject(obj) {
        return obj instanceof Hero
    }

    onGetCollected(hero) {
        this.remove()
        hero.damages = 0
    }

    getGraphicsProps() {
        const { fps } = this.game, { iteration } = this.scene
        const props = super.getGraphicsProps()
        const rand = this._graphicsRand ||= floor(random() * fps)
        const angle = PI * (rand + iteration) / fps, cosAngle = cos(angle)
        props.y += props.height * .05 * cosAngle
        return props
    }

    getBaseImg() {
        return HeartSpriteSheets.get("red").get(0)
    }
}


const StarImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/star.png")

@CATALOG.registerObject({
    label: "Star",
    icon: StarImg,
})
@PhysicsMixin.add({
    affectedByGravity: false,
    canGetBlocked: true,
    bouncingFactor: 1,
})
@BodyMixin.add({
    width: 30,
    height: 30,
})
@StateNumber.define("speed", { precision:100, showInBuilder: true })
export class Star extends Extra {

    update() {
        super.update()
        const { speed, owner, speedX, speedY, scene } = this
        if(owner) {
            this.speedX = this.speedY = 0
        } else if(speed > 0) {
            if(this.speedX == 0 && this.speedY == 0) {
                // first speed
                const angle = floor(this.scene.rand("starangle") * 4) * 90 + 45
                this.speedX = this.baseSpeedX = this.speed * cos(angle * PI / 180)
                this.speedY = this.baseSpeedY = this.speed * sin(angle * PI / 180)
            } else {
                // maintain constant speed
                const curSpd = hypot(this.speedX, this.speedY)
                this.speedX *= speed / curSpd
                this.speedY *= speed / curSpd
            }
        }
        // scene border
        if(speedX > 0 && this.x > scene.width) this.speedX *= -1
        else if(speedX < 0 && this.x < 0) this.speedX *= -1
        if(speedY > 0 && this.y > scene.height) this.speedY *= -1
        else if(speedY < 0 && this.y < 0) this.speedY *= -1
    }

    getGraphicsProps() {
        const { fps } = this.game, { iteration } = this.scene
        const props = super.getGraphicsProps()
        if(!props) return null
        const rand = this._graphicsRand ||= floor(random() * fps)
        const angle = PI * (rand + iteration) / fps, cosAngle = cos(angle)
        props.y += props.height * .05 * cosAngle
        return props
    }

    getBaseImg() {
        return this.owner ? null : StarImg
    }
}


const CheckpointImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/checkpoint.png")

@CATALOG.registerObject({
    label: "CheckPoint",
    icon: CheckpointImg,
})
@CollectMixin.add({
    canGetCollected: true,
})
@BodyMixin.add({
    width: 40,
    height: 40,
})
export class Checkpoint extends GameObject {

    onGetCollected(hero) {
        this.remove()
        this.scene.herosSpawnX = this.x
        this.scene.herosSpawnY = this.y
    }

    getBaseImg() {
        return CheckpointImg
    }
}


const PortalImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/portal.png")
const PortalJumpAud = CATALOG.registerAudio("/static/catalogs/std/v1/2Dside/assets/portal_jump.opus")

@CATALOG.registerObject({
    label: "Portal",
    icon: PortalImg,
})
@ActivableMixin.add()
@StateBool.define("isOutput", { default: true, showInBuilder: true })
@StateBool.define("isInput", { default: true, showInBuilder: true })
export class Portal extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 50
    }

    update() {
        super.update()
        if(this.activated && this.isInput) {
            this.scene.objects.forEach(obj => {
                if(hypot(obj.x-this.x, obj.y-this.y)<30 && (obj.speedX * (this.x-obj.x) + obj.speedY * (this.y-obj.y))>0) {
                    this.teleport(obj)
                }
            })
        }
    }

    teleport(obj) {
        const { scene } = this
        const portals = scene.filterObjects("portals", obj => obj instanceof Portal)
        const candidates = portals.filter(port => port != this && port.activated && port.isOutput)
        if(candidates.length == 0) return
        let targetPortal = candidates[floor(scene.rand("teleport") * candidates.length)]
        obj.x = targetPortal.x + (this.x - obj.x)
        obj.y = targetPortal.y + (this.y - obj.y)
        this.game.audio.playSound(PortalJumpAud)
    }

    getGraphicsProps() {
        const props = super.getGraphicsProps()
        props.visibility = this.activated ? 1 : .5
        props.angle = this.scene.iteration
        return props
    }

    getBaseImg() {
        return PortalImg
    }
}


// SPAWNER

@CATALOG.registerObject({
    label: "Hero",
    icon: PopImg,
})
export class HeroSpawnPoint extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 50
    }

    getBaseImg() {
        return this.game.isBuilder ? PopImg : null
    }
}


@CATALOG.registerObject({
    label: "ObjectSpawner",
    icon: PopImg,
})
@ObjectRefs.StateProperty.define("spawnedObjects")
@StateNumber.define("lastSpawnAge", { default: Infinity })
@StateNumber.define("nbSpawn")
@StateNumber.define("prevFuther", { precision: 50, showInBuilder: true })
@StateNumber.define("maxLiving", { default: 5, nullableWith: Infinity, showInBuilder: true })
@StateNumber.define("max", { default: Infinity, nullableWith: Infinity, showInBuilder: true })
@StateNumber.define("period", { default: 1, precision: .1, showInBuilder: true })
@GameObject.StateProperty.define("model", { showInBuilder: true })
@ActivableMixin.add()
@BodyMixin.add({
    width: 50,
    height: 50,
})
export class ObjectSpawner extends GameObject {

    update() {
        super.update()
        this.spawnedObjects.update()
        if(this.nbSpawn >= this.max && this.spawnedObjects.size == 0) this.remove()
        this.maySpawnObject()
    }

    maySpawnObject() {
        if(!this.activated) return
        if(this.nbSpawn >= this.max) return
        if(this.spawnedObjects.size >= this.maxLiving) return
        const { x, y, prevFuther } = this
        if(prevFuther > 0) {
            let allFar = true
            this.spawnedObjects.forEach(obj => {
                if(hypot(x-obj.x, y-obj.y) <= prevFuther) allFar = false
            })
            if(!allFar) return
        }
        this.lastSpawnAge += 1
        if(this.lastSpawnAge < ceil(this.period * this.game.fps)) return
        this.spawnObject()
    }

    spawnObject() {
        const { scene, model } = this
        if(!model) return
        const obj = scene.addObject(model.getKey())
        obj.setState(obj.getState())
        obj.x = this.x
        obj.y = this.y
        this.nbSpawn += 1
        this.spawnedObjects.add(obj.id)
        this.lastSpawnAge = 0
        scene.addVisual(Pop, { x:this.x, y:this.y })
        return obj
    }

    draw(drawer) {
        if(!this.game.isBuilder) return
        super.draw(drawer)
        const { model } = this
        if(!model) return
        const modelProps = model.getGraphicsProps()
        const modelProps2 = this._modelGraphicsProps ||= new GraphicsProps({
            visibility: .5
        })
        modelProps2.img = modelProps.img
        modelProps2.x = this.x
        modelProps2.y = this.y
        modelProps2.width = modelProps.width
        modelProps2.height = modelProps.height
        modelProps2.draw(drawer)
    }

    getBaseImg() {
        return PopImg
    }
}


// WALL

@CATALOG.registerObject({
    stateful: false,
})
@Category.append("wall")
@PhysicsMixin.add({
    canMove: false,
    canBlock: true,
})
export class Wall extends GameObject {

    init(kwargs) {
        if(kwargs?.x1 !== undefined) this.x1 = kwargs.x1
        if(kwargs?.y1 !== undefined) this.y1 = kwargs.y1
        if(kwargs?.x2 !== undefined) this.x2 = kwargs.x2
        if(kwargs?.y2 !== undefined) this.y2 = kwargs.y2
        this.color = "black"
    }

    getBodyPolygon() {
        const pol = this.bodyPolygons ||= []
        pol.length = 0
        const { x1, x2, y1, y2 } = this
        pol.push(
            x1, y1,
            x2, y2,
        )
        return pol
    }

    getGraphicsProps() {
        const { x1, y1, x2, y2 } = this
        const img = this.getBaseImg()
        const props = this._graphicsProps ||= new GraphicsProps()
        const lineWidth = 5
        props.img = img
        props.x = (x1 + x2) / 2
        props.y = (y1 + y2) / 2
        props.width = abs(x1 - x2) + 2*lineWidth
        props.height = abs(y1 - y2) + 2*lineWidth
        return props
    }

    getBaseImg() {
        const { x1, y1, x2, y2 } = this
        let baseImg = this._baseImg
        if(baseImg && baseImg.x1 == x1 && baseImg.y1 == y1 && baseImg.x2 == x2 && baseImg.y2 == y2) return baseImg
        const lineWidth = 5
        baseImg = this._baseImg = newCanvas(abs(x1-x2)+2*lineWidth, abs(y1-y2)+2*lineWidth)
        assign(baseImg, { x1, y1, x2, y2 })
        const ctx = baseImg.getContext("2d")
        ctx.lineWidth = lineWidth
        ctx.strokeStyle = this.color
        ctx.beginPath()
        const minX = min(x1, x2), minY = min(y1, y2)
        ctx.moveTo(lineWidth+x1-minX, lineWidth+y1-minY)
        ctx.lineTo(lineWidth+x2-minX, lineWidth+y2-minY)
        ctx.stroke()
        return baseImg
    }

    getState(isInitState=false) {
        const state = super.getState(isInitState)
        const { x1, y1, x2, y2 } = this
        assign(state, { x1, y1, x2, y2 })
        return state
    }

    setState(state) {
        super.setState(state)
        const { x1, y1, x2, y2 } = state
        assign(this, { x1, y1, x2, y2 })
    }
}


@CATALOG.registerObject({
    stateful: false,
})
export class PlatformWall extends Wall {

    init(kwargs) {
        super.init(kwargs)
        this.color = "grey"
    }

    getHitProps(dt) {
        const props = super.getHitProps(dt)
        const { x1, x2, y1, y2 } = this
        const dx = x2-x1, dy = y2-y1, dd = hypot(dx, dy)
        props.uniDirX = dy/dd
        props.uniDirY = -dx/dd
        return props
    }
}


@CATALOG.registerObject({
    stateful: false,
})
export class BouncingWall extends Wall {

    init(kwargs) {
        super.init(kwargs)
        this.color = "green"
        this.bouncingFactor = 1
    }
}
