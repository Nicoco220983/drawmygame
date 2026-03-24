const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import {
    sign, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, importJs, cachedTransform, hasKeys,
    CATALOG, IS_SERVER_ENV,
    StateProperty, StateBool, StateNumber, StateString,
    GameObject, Category, Dependencies, LinkTrigger, LinkReaction, Mixin, Img, SpriteSheet, Aud, ObjectRefs, now, hackMethod,
    pixiHelpers,
} from '../../../../core/v1/index.mjs'
import {
    ActivableMixin, CollectMixin, OwnerableMixin, BodyMixin, PhysicsMixin, AttackMixin,
    applyForce,
} from '../mixins.mjs'


const REGISTER_COMMON_ARGS = {
    url: import.meta.url,
    version: "v1",
    perspective: "2Dside",
}


export const PuffAud = new Aud("/static/catalogs/std/v1/2Dside/assets/puff.opus")


const SmokeExplosionSpriteSheetImg = new Img("/static/catalogs/std/v1/2Dside/assets/smoke_explosion.png")
const SmokeExplosionSpriteSheet = new SpriteSheet(SmokeExplosionSpriteSheetImg, 4, 1)

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    showInBuilder: false
})
@Dependencies.add(SmokeExplosionSpriteSheetImg, PuffAud)
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
        if (time > .5) { this.remove(); return }
    }

    syncGraphics() {
        const time = this.iteration * this.game.dt
        const img = SmokeExplosionSpriteSheet.getImg(floor(time / .5 * 4))
        this.setSprite(img)
        super.syncGraphics()
    }
}


const PopImg = new Img("/static/catalogs/std/v1/2Dside/assets/pop.png")
const PopAud = new Aud("/static/catalogs/std/v1/2Dside/assets/pop.opus")

@Dependencies.add(PopImg, PopAud)
export class Pop extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 10
        this.duration = floor(this.game.fps * .25)
        this.remIt = this.duration
    }

    update() {
        if (!this._soundPlayed) {
            this.game.audio.playSound(PopAud)
            this._soundPlayed = true
        }
        this.width = this.height = 10 + 100 * (1 - this.remIt / this.duration)
        this.remIt -= 1
        if (this.remIt <= 0) this.remove()
    }

    syncGraphics() {
        this.setSprite(PopImg)
        super.syncGraphics()
        const scale = (.5 + 1 * (1 - this.remIt / this.duration))
        this._graphics.scale.x = this._graphics.scale.y = scale
    }
}


export const ItemAud = new Aud("/static/catalogs/std/v1/2Dside/assets/item.opus")


@Category.append("extra")
@Dependencies.add(ItemAud)
@CollectMixin.add({
    canCollect: false,
    canGetCollected: true,
})
@StateNumber.define("dropAge", { default: Infinity, nullableWith: Infinity })
export class Extra extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.stuckToOwner = true
        this.extraKey = null
    }

    getPriority() {
        const { owner } = this
        if (owner) return owner.getPriority() - 1
        else super.getPriority()
    }

    update() {
        super.update()
        const { owner } = this
        if (owner && this.stuckToOwner) {
            this.x = owner.x
            this.y = owner.y
            this.z = owner.z + 1
        }
        this.dropAge += 1
        if (this.dropAge > this.game.fps) this.dropAge = Infinity
    }

    canGetCollectedByObject(obj) {
        return this.dropAge == Infinity
    }

    onGetCollected(owner) {
        this.removeOwnerExtraWithSameKey(owner)
        owner.addExtra(this)
    }

    removeOwnerExtraWithSameKey(owner) {
        const { extraKey } = this
        if (!this.extraKey) return
        const { extras } = owner
        if (!extras) return
        extras.forEach(extra2 => {
            if (extra2.extraKey = extraKey) {
                extra2.drop()
                extra2.remove()  // TODO rm when infinite drop/collect solved
            }
        })
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
        const props = AttackMixin.getAttackProps.call(this, obj)
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
        const props = AttackMixin.getAttackProps.call(this, obj)
        props.attacker = this.owner ?? this
        return props
    }

    onAttack(obj, props) {
        this.remove()
    }
}


// weapons

const SWORD_ATTACK_PERIOD = .5

const SwordImg = new Img("/static/catalogs/std/v1/2Dside/assets/sword.png")
const SwordSlashSpriteSheetImg = new Img("/static/catalogs/std/v1/2Dside/assets/slash.png")
const SwordSlashSpriteSheet = new SpriteSheet(SwordSlashSpriteSheetImg, 3, 2)

export const SlashAud = new Aud("/static/catalogs/std/v1/2Dside/assets/slash.opus")
export const HandHitAud = new Aud("/static/catalogs/std/v1/2Dside/assets/hand_hit.opus")
export const SwordHitAud = new Aud("/static/catalogs/std/v1/2Dside/assets/sword_hit.opus")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Sword",
    icon: SwordImg,
})
@Dependencies.add(SwordImg, SwordSlashSpriteSheetImg, SlashAud, SwordHitAud)
@BodyMixin.add({
    width: 40,
    height: 40,
})
@StateNumber.define("lastAttackAge", { default: Infinity })
export class Sword extends Weapon {

    init(kwargs) {
        super.init(kwargs)
        this.extraKey = "hands"
        this.isActionExtra = true
        this.attackDamages = 100
        this.attackPeriod = SWORD_ATTACK_PERIOD
    }

    update() {
        super.update()
        this.syncPos()
        if (this.lastAttackAge == 0) this.game.audio.playSound(SlashAud)
        this.lastAttackAge += 1
        if (this.lastAttackAge > (SWORD_ATTACK_PERIOD * this.game.fps)) this.lastAttackAge = Infinity
    }

    syncPos() {
        const { owner } = this
        if (!owner) return
        this.dirX = owner.dirX
        this.y = owner.y
        if (this.isAttacking()) {
            this.x = owner.x + 40 * owner.dirX
            this.width = this.height = 60
        } else {
            this.x = owner.x + 25 * owner.dirX
            this.width = this.height = 40
        }
    }

    act() {
        if (this.isAttacking()) return
        this.lastAttackAge = 0
    }

    canAttackObject(obj) {
        if (!this.isAttacking()) return false
        return super.canAttackObject(obj)
    }

    onAttack(obj, props) {
        this.game.audio.playSound(SwordHitAud)
    }

    isAttacking() {
        return this.lastAttackAge < (SWORD_ATTACK_PERIOD * this.game.fps)
    }

    syncGraphics() {
        const ratioSinceLastAttack = this.lastAttackAge / (SWORD_ATTACK_PERIOD * this.game.fps)
        if (ratioSinceLastAttack <= 1) {
            const img = SwordSlashSpriteSheet.getImg(floor(6 * ratioSinceLastAttack))
            this.setSprite(img)
        } else {
            this.setSprite(SwordImg)
        }
        super.syncGraphics()
    }
}


const BoxingGloveImg = new Img("/static/catalogs/std/v1/2Dside/assets/boxing_glove.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Boxing Glove",
    icon: BoxingGloveImg,
})
@Dependencies.add(BoxingGloveImg)
@BodyMixin.add({
    width: 25,
    height: 20,
})
@StateNumber.define("lastAttackAge", { default: Infinity })
export class BoxingGlove extends Weapon {

    init(kwargs) {
        super.init(kwargs)
        this.extraKey = "hands"
        this.isActionExtra = true
        this.attackDamages = 0
        this.attackKnockback = 500
        this.attackPeriod = .1
    }

    update() {
        super.update()
        this.syncPos()
        if (this.lastAttackAge == 0) this.game.audio.playSound(SlashAud)
        this.lastAttackAge += 1
        if (this.lastAttackAge > this.attackPeriod * this.game.fps) this.lastAttackAge = Infinity
    }

    syncPos() {
        const { owner } = this
        if (!owner) return
        this.dirX = owner.dirX
        this.y = owner.y
        if (this.isAttacking()) {
            this.x = owner.x + 40 * owner.dirX
            this.width = 40
            this.height = 32
        } else {
            this.x = owner.x + 25 * owner.dirX
            this.width = 25
            this.height = 20
        }
    }

    isAttacking() {
        return this.lastAttackAge <= this.attackPeriod * this.game.fps
    }

    act() {
        if (this.isAttacking()) return
        this.lastAttackAge = 0
    }

    canAttackObject(obj) {
        if (!this.isAttacking()) return false
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

    syncGraphics() {
        this.setSprite(BoxingGloveImg)
        super.syncGraphics()
    }
}


const ShurikenImg = new Img("/static/catalogs/std/v1/2Dside/assets/shuriken.png")


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Shuriken",
    icon: ShurikenImg,
    showInBuilder: false,
})
@Dependencies.add(ShurikenImg)
@BodyMixin.add({
    width: 30,
    height: 30,
})
@StateNumber.define("itToLive", { default: null })
export class Shuriken extends Projectile {

    init(kwargs) {
        super.init(kwargs)
        if (this.owner) this.dirX = this.owner.dirX
        this.speedX = this.dirX * 500
        this.itToLive = 2 * this.game.fps
        this.attackDamages = 35
        this.game.audio.playSound(SlashAud)
    }

    onGetBlocked() {
        this.remove()
    }

    update() {
        this.angle += 30
        this.itToLive -= 1
        if (this.itToLive <= 0) this.remove()
    }

    syncGraphics() {
        this.setSprite(ShurikenImg)
        super.syncGraphics()
    }
}


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "ShurikenPack",
    icon: ShurikenImg,
})
@Dependencies.add(ShurikenImg, Shuriken)
@BodyMixin.add({
    width: 30,
    height: 30,
})
@StateNumber.define("nb", { default: 10, nullableWith: Infinity, showInBuilder: true })
export class ShurikenPack extends Extra {

    init(kwargs) {
        super.init(kwargs)
        this.extraKey = "hands"
        this.isActionExtra = true
        this.actLastTryIt = -Infinity
        this.actRemIt = 0
        if (kwargs?.nb !== undefined) this.nb = kwargs.nb
        this.throwPeriod = .3
    }

    act() {
        const prevActLastTryIt = this.actLastTryIt
        this.actLastTryIt = this.scene.iteration
        if (this.actLastTryIt <= prevActLastTryIt + 1 || this.actRemIt > 0) return
        this.actRemIt = ceil(this.throwPeriod * this.game.fps)
        this.throwOneShuriken()
        this.nb -= 1
        if (this.nb <= 0) this.remove()
    }

    throwOneShuriken() {
        const { x, y, owner } = this
        if (!owner) return
        this.scene.addObject(Shuriken, {
            x, y, owner,
        })
    }

    update() {
        super.update()
        const { owner } = this
        if (owner) {
            this.x = owner.x
            this.y = owner.y
        }
        if (this.actRemIt > 0) this.actRemIt -= 1
    }

    syncGraphics() {
        this.setSprite(ShurikenImg)
        super.syncGraphics()
    }
}


const ExplosionSpriteSheetImg = new Img("/static/catalogs/std/v1/2Dside/assets/explosion.png")
const ExplosionSpriteSheet = new SpriteSheet(ExplosionSpriteSheetImg, 4, 2)

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    showInBuilder: false
})
@Dependencies.add(ExplosionSpriteSheetImg)
@AttackMixin.add({
    canAttack: true,
    canGetAttacked: false,
    attackDamages: 100,
    attackPeriod: Infinity,
})
@OwnerableMixin.add({
    removedWithOwner: false,
})
@BodyMixin.add({
    width: 300,
    height: 300,
})
@StateNumber.define("iteration")
export class Explosion extends GameObject {

    getAttackProps(obj) {
        const props = AttackMixin.getAttackProps.call(this, obj)
        props.attacker = this.owner || this
        return props
    }

    update() {
        super.update()
        const age = this.iteration / this.game.fps
        if (age >= 1) return this.remove()
        this.iteration += 1
    }

    syncGraphics() {
        this.setSprite(ExplosionSpriteSheet.getImg(floor(this.iteration / this.game.fps * 15)))
        super.syncGraphics()
    }
}


const BombImg = new Img("/static/catalogs/std/v1/2Dside/assets/bomb.png")
const BombSpriteSheetImg = new Img("/static/catalogs/std/v1/2Dside/assets/bomb_spritesheet.png")
const BombSpriteSheet = new SpriteSheet(BombSpriteSheetImg, 2, 1)

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Bomb",
    icon: BombImg
})
@Dependencies.add(BombSpriteSheetImg, Explosion)
@PhysicsMixin.add({
    affectedByGravity: false,
    physicsBounciness: .5,
    physicsStaticFriction: 100,
    physicsDynamicFriction: 2,
})
@BodyMixin.add({
    width: 40,
    height: 40,
})
@StateNumber.define("countdown", { default: 2, precision: .5, showInBuilder: true })
@StateNumber.define("itToLive", { default: null })
export class Bomb extends Extra {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 40
        this.extraKey = "hands"
        this.isActionExtra = true
    }

    update() {
        super.update()
        this.canBeHit = this.owner == null && this.itToLive == null
        const { dt } = this.game
        const { x, y, owner } = this
        this.affectedByGravity = this.canGetBlocked = (this.itToLive !== null)
        if (this.itToLive !== null) {
            if (this.itToLive <= 0) {
                this.scene.addObject(Explosion, { x, y, owner })
                this.remove()
            }
            this.itToLive -= 1
        } else if (owner) {
            this.x = owner.x
            this.y = owner.y
        }
    }

    act() {
        const { owner } = this
        if (!owner) return
        this.drop()
        this.owner = owner
        this.stuckToOwner = false
        this.speedX = owner.dirX * 200
        this.speedY = -500
        this.itToLive = this.countdown * this.game.fps
    }

    syncGraphics() {
        const { itToLive, countdown } = this
        let img
        if (itToLive === null) {
            img = BombSpriteSheet.getImg(0)
        } else {
            img = BombSpriteSheet.getImg(floor(pow(3 * (1 - (itToLive / this.game.fps) / countdown), 2) * 2) % 2)
        }
        this.setSprite(img)
        super.syncGraphics()
    }
}


const JetPackImg = new Img("/static/catalogs/std/v1/2Dside/assets/jetpack.png")
const JetPackSpriteSheetImg = new Img("/static/catalogs/std/v1/2Dside/assets/jetpack_spritesheet.png")
const JetPackSpriteSheet = new SpriteSheet(JetPackSpriteSheetImg, 2, 1)
const JetPackAud = new Aud("/static/catalogs/std/v1/2Dside/assets/jetpack.opus")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "JetPack",
    icon: JetPackImg,
})
@Dependencies.add(JetPackSpriteSheetImg, JetPackAud)
@BodyMixin.add({
    width: 20,
    height: 50,
})
@StateNumber.define("duration", { default: 10, nullableWith: Infinity, showInBuilder: true })
@StateNumber.define("useIt")
export class JetPack extends Extra {

    init(kwargs) {
        super.init(kwargs)
        this.acc = 1200
        this.dec = 3000
        this.flyLastIt = -Infinity
        this.extraKey = "back"
    }

    onGetCollected(owner) {
        const { dt } = this.game
        super.onGetCollected(owner)
        hackMethod(owner, "mayJump", -1, evt => {
            if (this.owner != owner) return
            const jumped = evt.returnValue
            if (jumped) return
            if (this.duration != Infinity) {
                if (this.useIt >= this.duration * this.game.fps) return
                this.useIt += 1
            }
            if (owner.speedY > 0) owner.speedY -= this.dec * dt
            else owner.speedY -= this.acc * dt
            this.audPrm ||= this.game.audio.playSound(JetPackAud, 1.0, true)
            this.flyLastIt = this.scene.iteration
        })
    }

    isFlying() {
        return this.flyLastIt == this.scene.iteration
    }

    update() {
        super.update()
        this.syncWithOwner()
        if (!this.isFlying()) this.stopAud()
    }

    stopAud() {
        if (!this.audPrm) return
        this.audPrm.then(aud => aud && aud.stop())
        this.audPrm = null
    }

    syncWithOwner() {
        const { owner } = this
        if (!owner) return
        this.dirX = owner.dirX
        this.x = owner.x - owner.dirX * 15
        this.y = owner.y + 10
    }

    syncGraphics() {
        const img = JetPackSpriteSheet.getImg(this.isFlying() ? 1 : 0)
        this.setSprite(img)
        super.syncGraphics()
    }

    remove() {
        super.remove()
        this.stopAud()
    }
}


// ENEMIES


@AttackMixin.add({
    canAttack: false,
    canGetAttacked: true,
})
@Category.append("npc/enemy")
@StateNumber.define("team", { default: -1, nullableWith: -1 })
export class Enemy extends GameObject {

    die(killer) {
        this.remove()
        const { x, y } = this
        this.scene.addVisual(SmokeExplosion, { x, y })
    }
}


const SpikyImg = new Img("/static/catalogs/std/v1/2Dside/assets/spiky.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Spiky",
    icon: SpikyImg,
})
@Dependencies.add(SpikyImg)
@AttackMixin.modify({
    canAttack: true,
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
        return obj.constructor.IS_HERO
    }

    syncGraphics() {
        this.setSprite(SpikyImg)
        super.syncGraphics()
        const initAngle = this._graphicsInitAngle ||= 2*PI*random()
        const angle = initAngle + this.scene.iteration / 20 * PI
        this._graphics.y = this.y + this.height * .05 * cos(angle)
    }
}


const BlobImg = new Img("/static/catalogs/std/v1/2Dside/assets/blob.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Blob",
    icon: BlobImg,
})
@Dependencies.add(BlobImg)
@StateProperty.modify("dirX", { showInBuilder: true })
@AttackMixin.modify({
    canAttack: true,
    maxHealth: 100,
    attackDamages: 10,
    attackKnockback: 200,
})
@PhysicsMixin.add()
@BodyMixin.add({
    width: 40,
    height: 36,
})
@StateNumber.define("lastChangeDirAge")
export class BlobEnemy extends Enemy {

    init(kwargs) {
        super.init(kwargs)
        this.maxSpeed = 30
        this.acc = 1000
        this.physicsStaticFriction = 100
        this.physicsDynamicFriction = 1
        this.onFloorLastIt = -Infinity
    }

    onGetBlocked(obj, details) {
        const { angle } = details
        if (angle < 0) this.onFloorLastIt = this.scene.iteration
    }

    update() {
        super.update()
        const { dt } = this.game
        this.initGetBlockedChecker()
        // move
        if (abs(this.speedX) < 10) this.mayChangeDir()
        if (this.onFloorLastIt == this.scene.iteration) this.speedX = sumTo(this.speedX, this.acc * dt, this.dirX * this.maxSpeed)
        this.lastChangeDirAge += 1
    }

    initGetBlockedChecker() {
        this._blockChecker ||= this.scene.addObject(BlobEnemyBlockChecker, {
            owner: this,
        })
    }

    mayChangeDir() {
        if (this.onFloorLastIt != this.scene.iteration) return
        if (this.lastChangeDirAge < this.game.fps) return
        this.lastChangeDirAge = 0
        this.dirX *= -1
        this.speedX *= -1
    }

    canAttackObject(obj) {
        return obj.constructor.IS_HERO
    }

    getAttackProps(obj) {
        const props = super.getAttackProps(obj)
        props.knockbackAngle = this.x < obj.x ? -45 : -135
        return props
    }

    getHitBox() {
        return {
            left: this.x - 10,
            width: 20,
            top: this.y - 30,
            height: 60,
        }
    }

    syncGraphics() {
        this.setSprite(BlobImg)
        super.syncGraphics()
        const initAngle = this._graphicsInitAngle ||= 2*PI*random()
        const angle = initAngle + this.scene.iteration / 20 * PI
        const cosAngle = cos(angle), sinAngle = sin(angle)
        this._graphics.x = this.x - this.width * .05 * cosAngle
        this._graphics.y = this.y - this.height * .05 * sinAngle
        pixiHelpers.scaleSpriteTo(this._sprite, this.width * (1+.1*cosAngle), this.height * (1+.1*sinAngle), this.dirX, this.dirY)
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
        this.x = owner.x + owner.dirX * owner.width / 2
        this.y = owner.y + owner.height / 2
        if (this.lastGetBlockedIteration < this.scene.iteration) {
            owner.mayChangeDir()
        }
        if (this.owner.removed) this.remove()
    }

    onGetBlocked(obj, details) {
        this.lastGetBlockedIteration = this.scene.iteration
    }
}


const GhostImg = new Img("/static/catalogs/std/v1/2Dside/assets/ghost.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Ghost",
    icon: GhostImg,
})
@Dependencies.add(GhostImg)
@StateProperty.modify("dirX", { showInBuilder: true })
@AttackMixin.modify({
    canAttack: true,
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
@StateNumber.define("lastChangeDirAge")
export class Ghost extends Enemy {

    update() {
        super.update()
        const { dt } = this.game
        const { width } = this.scene.map
        // move
        if ((this.x < 0 && this.dirX < 0) || (this.x > width && this.dirX > 0) || abs(this.speedX) < 10) this.mayChangeDir()
        this.speedX = sumTo(this.speedX, 1000 * dt, this.dirX * 2000 * dt)
        this.speedY = sumTo(this.speedY, 1000 * dt, 0)
        this.lastChangeDirAge += 1
    }

    mayChangeDir() {
        if (this.lastChangeDirAge < this.game.fps) return
        this.lastChangeDirAge = 0
        this.dirX *= -1
        this.speedX *= -1
    }

    canAttackObject(obj) {
        return obj.constructor.IS_HERO
    }

    getHitBox() {
        return {
            left: this.x - 30,
            width: 60,
            top: this.y - 10,
            height: 20,
        }
    }

    syncGraphics() {
        this.setSprite(GhostImg)
        super.syncGraphics()
        const initAngle = this._graphicsInitAngle ||= 2*PI*random()
        const angle = initAngle + this.scene.iteration / 20 * PI
        this._graphics.y = this.y + this.height * .1 * cos(angle)
    }
}


// COLLECTABLES

const HeartImg = new Img("/static/catalogs/std/v1/2Dside/assets/heart.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Heart",
    icon: HeartImg,
})
@Dependencies.add(HeartImg)
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
        return obj.constructor.IS_HERO
    }

    onGetCollected(hero) {
        this.remove()
        hero.damages = 0
    }

    syncGraphics() {
        this.setSprite(HeartImg)
        super.syncGraphics()
    }
}


const StarImg = new Img("/static/catalogs/std/v1/2Dside/assets/star.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Star",
    icon: StarImg,
})
@Dependencies.add(StarImg)
@PhysicsMixin.add({
    affectedByGravity: false,
    canGetBlocked: true,
    physicsBounciness: 1,
    physicsStaticFriction: 0,
    physicsDynamicFriction: 0,
})
@BodyMixin.add({
    width: 30,
    height: 30,
})
@StateNumber.define("speed", { precision: 100, showInBuilder: true })
export class Star extends Extra {

    update() {
        super.update()
        const { speed, owner, speedX, speedY, scene } = this
        if (owner) {
            this.speedX = this.speedY = 0
        } else if (speed > 0) {
            if (this.speedX == 0 && this.speedY == 0) {
                // first speed
                const angle = floor(this.scene.rand("starangle") * 4) * 90 + 45
                this.speedX = this.speed * cos(angle * PI / 180)
                this.speedY = this.speed * sin(angle * PI / 180)
            } else {
                // maintain constant speed
                const curSpd = hypot(this.speedX, this.speedY)
                this.speedX *= speed / curSpd
                this.speedY *= speed / curSpd
            }
        }
        // scene border
        if (speedX > 0 && this.x > scene.width) this.speedX *= -1
        else if (speedX < 0 && this.x < 0) this.speedX *= -1
        if (speedY > 0 && this.y > scene.height) this.speedY *= -1
        else if (speedY < 0 && this.y < 0) this.speedY *= -1
    }

    syncGraphics() {
        this.setSprite(StarImg)
        this.visibility = !this.owner
        return super.syncGraphics()
    }
}


const CheckpointImg = new Img("/static/catalogs/std/v1/2Dside/assets/checkpoint.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "CheckPoint",
    icon: CheckpointImg,
})
@Dependencies.add(CheckpointImg)
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

    syncGraphics() {
        this.setSprite(CheckpointImg)
        super.syncGraphics()
    }
}


const PortalImg = new Img("/static/catalogs/std/v1/2Dside/assets/portal.png")
const PortalJumpAud = new Aud("/static/catalogs/std/v1/2Dside/assets/portal_jump.opus")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Portal",
    icon: PortalImg,
})
@Dependencies.add(PortalImg, PortalJumpAud)
@ActivableMixin.add()
@StateBool.define("isOutput", { default: true, showInBuilder: true })
@StateBool.define("isInput", { default: true, showInBuilder: true })
@StateString.define("color", { default: "blue", showInBuilder: true })
export class Portal extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 50
    }

    update() {
        super.update()
        if (this.activated && this.isInput) {
            this.scene.objects.forEach(obj => {
                if (hypot(obj.x - this.x, obj.y - this.y) < 30 && (obj.speedX * (this.x - obj.x) + obj.speedY * (this.y - obj.y)) > 0) {
                    this.teleport(obj)
                }
            })
        }
    }

    teleport(obj) {
        const { scene } = this
        const portals = scene.filterObjects("portals", obj => obj instanceof Portal)
        const candidates = portals.filter(port => port != this && port.activated && port.isOutput && port.color === this.color)
        if (candidates.length == 0) return
        let targetPortal = candidates[floor(scene.rand("teleport") * candidates.length)]
        obj.x = targetPortal.x + (this.x - obj.x)
        obj.y = targetPortal.y + (this.y - obj.y)
        this.game.audio.playSound(PortalJumpAud)
    }

    syncGraphics() {
        let img = PortalImg
        if (this.color && this.color !== "blue") {
            img = cachedTransform(img, this.color, () => {
                return colorizeCanvas(cloneCanvas(img), this.color, "#006dbe")
            })
        }
        this.setSprite(img)
        super.syncGraphics()
    }
}


const BallImg = new Img("/static/catalogs/std/v1/2Dside/assets/ball.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Ball",
    icon: BallImg,
})
@Dependencies.add(BallImg)
@AttackMixin.add({
    canAttack: false,
    canGetAttacked: true,
    maxHealth: Infinity,
})
@PhysicsMixin.add({
    physicsBounciness: .8,
    physicsWeight: 50,
    physicsStaticFriction: 100,
    physicsDynamicFriction: 1,
})
@BodyMixin.add({
    width: 30,
    height: 30,
})
export class Ball extends GameObject {

    syncGraphics() {
        this.setSprite(BallImg)
        super.syncGraphics()
    }
}


// SPAWNER

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Hero",
    icon: PopImg,
})
@StateNumber.define("team", { default: null, nullableWith: null })
export class HeroSpawnPoint extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 50
    }

    syncGraphics() {
        // TODO: remove when "empty base img" position bug is fixed
        this.setSprite(PopImg)
        super.syncGraphics()
    }
}


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "ObjectSpawner",
    icon: PopImg,
})
@Dependencies.add(Pop)
@ActivableMixin.add()
@BodyMixin.add({
    width: 50,
    height: 50,
})
@ObjectRefs.StateProperty.define("spawnedObjects")
@StateNumber.define("lastSpawnAge", { default: Infinity })
@StateNumber.define("nbSpawn")
@StateNumber.define("prevFuther", { precision: 50, showInBuilder: true })
@StateNumber.define("maxLiving", { default: 5, nullableWith: Infinity, showInBuilder: true })
@StateNumber.define("max", { default: Infinity, nullableWith: Infinity, showInBuilder: true })
@StateNumber.define("period", { default: 1, precision: .1, showInBuilder: true })
@GameObject.StateProperty.define("model", {
    showInBuilder: true,
    filter: {
        not: {
            or: [
                { category: "hero" },
                { category: "manager" },
                { category: "background" },
                { category: "wall" },
            ]
        }
    }
})
export class ObjectSpawner extends GameObject {

    // static async load(perspective, versions, initState) {
    //     const loads = []
    //     loads.push(super.load(initState))
    //     if(initState.model) loads.push(CATALOG.loadObjects(perspective, versions, [initState.model]))
    //     await Promise.all(loads)
    // }

    update() {
        super.update()
        this.spawnedObjects.update()
        if (this.nbSpawn >= this.max && this.spawnedObjects.size == 0) this.remove()
        this.maySpawnObject()
    }

    maySpawnObject() {
        if (!this.activated) return
        if (this.nbSpawn >= this.max) return
        if (this.spawnedObjects.size >= this.maxLiving) return
        const { x, y, prevFuther } = this
        if (prevFuther > 0) {
            let allFar = true
            this.spawnedObjects.forEach(obj => {
                if (hypot(x - obj.x, y - obj.y) <= prevFuther) allFar = false
            })
            if (!allFar) return
        }
        this.lastSpawnAge += 1
        if (this.lastSpawnAge < ceil(this.period * this.game.fps)) return
        this.spawnObject()
    }

    spawnObject() {
        const { scene, model } = this
        if (!model) return
        const obj = scene.addObject(model.getKey())
        obj.setState(model.getState())
        obj.x = this.x
        obj.y = this.y
        this.nbSpawn += 1
        this.spawnedObjects.add(obj.id)
        this.lastSpawnAge = 0
        scene.addVisual(Pop, { x: this.x, y: this.y })
        return obj
    }

    syncGraphics() {
        if (this.game.isBuilder) {
            this.setSprite(PopImg)
        }
        super.syncGraphics()
        this.syncObjectGraphics()
    }

    syncObjectGraphics() {
        // TODO: make it work
        if(!this.game.isBuilder) return
        const objCat = this.model ? CATALOG.getObject(this.game.map.perspective, this.game.map.versions, this.model.getKey()) : null
        if(!objCat?.icon) {
            if(this._modelIconSprite) {
                this._modelIconSprite.destroy()
                this._modelIconSprite = null
            }
            return
        }
        if (this._modelIconSprite?._objCatIcon == objCat.icon) return
        this._modelIconSprite?.destroy()
        const sprite = PIXI.Sprite.from(objCat.icon)
        sprite.anchor.set(0.5, 0.5)
        //sprite.width = this.width
        //sprite.height = this.height
        //sprite.visibility = 1
        this._graphics.addChild(sprite)
        sprite._objCatIcon = objCat.icon
        this._modelIconSprite = sprite
    }
}


// WALL

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
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
        if (kwargs?.visibility !== undefined) this.visibility = kwargs.visibility
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

    syncGraphics() {
        const container = this._graphics
        if (!container) return
        
        const { x1, y1, x2, y2, color, visibility, z } = this
        
        // Update container properties (Wall doesn't use x,y,width,height like regular objects)
        if (visibility !== undefined) container.alpha = visibility
        if (z !== undefined) container.zIndex = z
        
        // Get or create the graphics child
        let graphics = container._wallGraphics
        if (!graphics) {
            graphics = container._wallGraphics = new window.PIXI.Graphics()
            container.addChild(graphics)
        }
        
        // Check if we need to redraw
        if (graphics._wallX1 === x1 && graphics._wallY1 === y1 && 
            graphics._wallX2 === x2 && graphics._wallY2 === y2 &&
            graphics._wallColor === color) {
            return
        }
        
        // Clear and redraw the wall line
        graphics.clear()
        graphics.moveTo(x1, y1)
        graphics.lineTo(x2, y2)
        graphics.stroke({ width: 5, color: pixiHelpers.toPixiColor(color) })
        
        // Cache current state
        graphics._wallX1 = x1
        graphics._wallY1 = y1
        graphics._wallX2 = x2
        graphics._wallY2 = y2
        graphics._wallColor = color
    }

    getState(isInitState = false) {
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
    ...REGISTER_COMMON_ARGS,
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
        const dx = x2 - x1, dy = y2 - y1, dd = hypot(dx, dy)
        props.uniDirX = dy / dd
        props.uniDirY = -dx / dd
        return props
    }
}


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    stateful: false,
})
export class BouncingWall extends Wall {

    init(kwargs) {
        super.init(kwargs)
        this.color = "green"
        this.physicsBounciness = 1
    }
}


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    stateful: false,
})
export class GlidingWall extends Wall {

    init(kwargs) {
        super.init(kwargs)
        this.color = "blue"
        this.physicsStaticFriction = 0
        this.physicsDynamicFriction = 0
    }
}
