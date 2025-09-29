const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import * as utils from '../../../core/v1/utils.mjs'
const { checkHit, urlAbsPath, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, importJs, cachedTransform } = utils
import { ModuleCatalog, GameObject, Category, StateProperty, StateBool, StateInt, LinkTrigger, LinkReaction, BodyMixin, PhysicsMixin, AttackMixin, SpriteSheet, ObjectRefs, Hero, Enemy, Extra, Weapon, Projectile,ActivableMixin, CollectMixin, OwnerableMixin } from '../../../core/v1/game.mjs'


export const CATALOG = new ModuleCatalog("std")


// HEROES

const NicoImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/nico.png")
const NicoBaseSpriteSheet = CATALOG.registerImage("/static/catalogs/std/v1/assets/nico_full.png")
const NicoColorableSpriteSheet = CATALOG.registerImage("/static/catalogs/std/v1/assets/nico_full_colorable.png")
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

const HandImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/hand.png")
const ArrowsSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/core/v1/assets/arrows.png"), 4, 1)

const OuchAud = CATALOG.registerAudio("/static/catalogs/std/v1/assets/ouch.opus")
const SlashAud = CATALOG.registerAudio("/static/catalogs/std/v1/assets/slash.opus")
const HandHitAud = CATALOG.registerAudio("/static/catalogs/std/v1/assets/hand_hit.opus")
const JumpAud = CATALOG.registerAudio("/static/catalogs/std/v1/assets/jump.opus")



@CATALOG.registerObject("nico", {
    label: "Nico",
    icon: NicoImg,
})
@StateInt.define("handRemIt", { nullableWith: null, default: null })
@StateProperty.modify("dirX", { showInBuilder: true })
@AttackMixin.add({
    canAttack: false,
    canGetAttacked: true,
    maxHealth: 100,
    graceDuration: 2,
})
@PhysicsMixin.add()
@BodyMixin.add({
    width: 50,
    height: 50,
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
        } else if(this.hand) {
            this.hand.remove()
            this.hand = null
        }
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
        if(!inputState || !inputState.walkX) this.speedX = sumTo(this.speedX, 2000 * dt, 0)
        else if(inputState.walkX > 0) {
            this.dirX = 1
            this.speedX = sumTo(this.speedX, 1000 * dt, 300)
        } else if(inputState.walkX < 0) {
            this.dirX = -1
            this.speedX = sumTo(this.speedX, 1000 * dt, -300)
        }
        if(inputState && inputState.jump && this.speedResY < 0) {
            this.speedY = -500
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
    static STATEFUL = false

    init(kwargs) {
        super.init(kwargs)
        this.syncPos()
        this.attackKnockback = 200
        this.game.audio.playSound(SlashAud)
    }

    update() {
        super.update()
        this.syncPos()
    }

    syncPos() {
        const { owner } = this
        this.x = owner.x + owner.dirX * 28
        this.y = owner.y
        this.dirX = owner.dirX
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

const SwordImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/sword.png")
const SwordSlashSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/v1/assets/slash.png"), 3, 2)

const SwordHitAud = CATALOG.registerAudio("/static/catalogs/std/v1/assets/sword_hit.opus")

@CATALOG.registerObject("sword", {
    label: "Sword",
    icon: SwordImg,
})
@StateInt.define("lastAttackAge", { default: Infinity })
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

    act() {
        if(this.isAttacking()) return
        this.lastAttackAge = 0
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


const ShurikenImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/shuriken.png")

@CATALOG.registerObject("shurikp", {
    label: "ShurikenPack",
    icon: ShurikenImg,
})
@BodyMixin.add({
    width: 30,
    height: 30,
})
@StateInt.define("nb", { default:5, nullableWith: Infinity, showInBuilder: true })
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

@CATALOG.registerObject("shurik", {
    label: "Shuriken",
    icon: ShurikenImg,
    showInBuilder: false,
})
@BodyMixin.add({
    width: 30,
    height: 30,
})
@StateInt.define("itToLive", { default: null })
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
        this.itToLive -= 1
        if(this.itToLive <= 0) this.remove()
        if(this.speedResX || this.speedResY) this.remove()
    }

    getBaseImg() {
        return ShurikenImg
    }
}


const BombImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/bomb.png")
const BombSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/v1/assets/bomb_spritesheet.png"), 2, 1)

@CATALOG.registerObject("bomb", {
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
@StateInt.define("countdown", { default: 2, showInBuilder: true })
@StateInt.define("itToLive", { default: null })
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


const ExplosionSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/v1/assets/explosion.png"), 8, 6)

@CATALOG.registerObject("explos", {
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
@StateInt.define("lastAttackAge", { default: Infinity })
@StateInt.define("iteration")
export class Explosion extends GameObject {

    getAttackProps() {
        const props = AttackMixin.prototype.objGetAttackProps.call(this)
        props.attacker = this.owner || this
        return props
    }

    update() {
        super.update()
        const age = this.iteration/this.game.fps
        if(age >= 1) return this.remove()
        this.iteration += 1
    }

    getBaseImg() {
        return ExplosionSpriteSheet.get(floor(
            this.iteration / this.game.fps * 8 * 6
        ))
    }
}


// ENEMIES


const SpikyImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/spiky.png")

@CATALOG.registerObject("spiky", {
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


const BlobImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/blob.png")

@CATALOG.registerObject("blob", {
    label: "Blob",
    icon: BlobImg,
})
@StateInt.define("lastChangeDirAge")
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
        this.blockChecker = this.scene.addObject(BlobEnemyBlockChecker, {
            owner: this,
        })
    }

    update() {
        super.update()
        const { fps } = this.game
        // move
        if(abs(this.speedX) < 10) this.mayChangeDir()
        if(this.speedResY < 0) this.speedX = this.dirX * 30
        this.lastChangeDirAge += 1
    }

    mayChangeDir() {
        if(this.lastChangeDirAge < this.game.fps) return
        this.dirX *= -1
        this.lastChangeDirAge = 0
    }

    canAttackObject(obj) {
        return obj instanceof Hero
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
    static STATEFUL = false

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

    onGetBlocked(obj) {
        this.lastGetBlockedIteration = this.scene.iteration
    }
}


const GhostImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/ghost.png")

@CATALOG.registerObject("ghost", {
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

const HeartImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/heart.png")

const HeartSpriteSheetsImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/colorable_heart.png")
export const HeartSpriteSheets = {
    spritesheets: {},
    get: function(color) {
        return this.spritesheets[color] ||= new SpriteSheet((() => {
            if(!color) return HeartSpriteSheetsImg
            return colorizeCanvas(cloneCanvas(HeartSpriteSheetsImg), color)
        })(), 2, 1)
    },
}

@CATALOG.registerObject("heart", {
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


const StarImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/star.png")

@CATALOG.registerObject("star", {
    label: "Star",
    icon: StarImg,
})
@CollectMixin.add({
    canCollect: false,
    canGetCollected: true,
})
export class Star extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
    }

    onGetCollected(collector) {
        this.remove()
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
        return StarImg
    }
}


const CheckpointImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/checkpoint.png")

@CATALOG.registerObject("checkpt", {
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


const PortalImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/portal.png")
const PortalJumpAud = CATALOG.registerAudio("/static/catalogs/std/v1/assets/portal_jump.opus")

@CATALOG.registerObject("portal", {
    label: "Portal",
    icon: PortalImg,
})
@ActivableMixin.add()
export class Portal extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 50
    }

    update() {
        super.update()
        if(this.activated) {
            this.scene.objects.forEach(obj => {
                if(hypot(obj.x-this.x, obj.y-this.y)<30 && (obj.speedX * (this.x-obj.x) + obj.speedY * (this.y-obj.y))>0) {
                    this.teleport(obj)
                }
            })
        }
    }

    teleport(obj) {
        const portals = this.scene.filterObjects("portals", obj => (obj instanceof Portal && obj.activated))
        if(portals.length < 2) return
        let targetPortal = portals[floor(this.scene.rand("portals") * (portals.length - 1))]
        if(targetPortal === this) targetPortal = portals[portals.length - 1]
        obj.x = targetPortal.x + (this.x - obj.x)
        obj.y = targetPortal.y + (this.y - obj.y)
        this.game.audio.playSound(PortalJumpAud)
    }

    getGraphicsProps() {
        const props = super.getGraphicsProps()
        props.visibility = this.activated ? 1 : .5
        return props
    }

    getBaseImg() {
        return PortalImg
    }
}


@LinkTrigger.add("isTriggered", { isDefault: true })
@StateBool.define("triggered")
export class Trigger extends GameObject {

    isTriggered() {
        return this.triggered
    }
}


const BurronImg = CATALOG.registerImage("/static/core/v1/assets/button.png")
const ButtonSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/core/v1/assets/button_spritesheet.png"), 2, 1)

@CATALOG.registerObject("button", {
    label: "Button",
    icon: BurronImg,
})
@StateInt.define("duration", { default: Infinity, nullableWith: Infinity, showInBuilder: true })
@StateInt.define("period", { default: 0, showInBuilder: true })
@StateInt.define("trigAge", { default: Infinity, nullableWith: Infinity })
@AttackMixin.add({
    canAttack: false,
    canGetAttacked: true,
    maxHealth: Infinity,
})
@BodyMixin.add({
    width: 30,
    height: 30,
})
@Category.append("engine/trigger")
export class Button extends Trigger {

    init(kwargs) {
        super.init(kwargs)
        this.team = "engine"
    }

    onGetAttacked(attacker, damage) {
        if(this.trigAge < this.period * this.game.fps) return
        this.triggered = !this.triggered
        if((this.triggered && this.duration != Infinity) || this.period != 0) {
            this.trigAge = 0
        }
    }

    update() {
        super.update()
        if(this.trigAge != Infinity) {
            this.trigAge += 1
            if(this.trigAge > (this.duration * this.game.fps)) {
                this.trigAge = Infinity
                this.triggered = false
            }
        }
    }

    getBaseImg() {
        return ButtonSpriteSheet.get(this.triggered ? 1 : 0)
    }
}


const ClockImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/clock.png")

@CATALOG.registerObject("clock", {
    label: "Clock",
    icon: ClockImg,
    showInBuilder: true,
})
@StateInt.define("iteration")
@StateInt.define("triggered_period", { default:1, showInBuilder: true })
@StateInt.define("untriggered_period", { default:1, showInBuilder: true })
export class Clock extends Trigger {
    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
    }

    update() {
        super.update()
        const { fps } = this.game
        const { untriggered_period, triggered_period } = this
        const full_period = untriggered_period + triggered_period
        const it = this.iteration % (full_period * fps)
        this.triggered = it > (untriggered_period * fps)
        this.iteration += 1
    }

    getBaseImg() {
        return ClockImg
    }
}