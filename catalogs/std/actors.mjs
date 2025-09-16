const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import * as utils from '../../core/utils.mjs'
const { checkHit, urlAbsPath, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, importJs, cachedTransform } = utils
import { ModuleCatalog, GameObject, Category, StateProperty, StateBool, StateInt, LinkTrigger, LinkReaction, PhysicsComponent, HealthComponent, Sprite, SpriteSheet, Actor, ActorRefs, Hero, Enemy, Collectable, Extra, HeartSpriteSheets, ActivableComponent, CollectComponent } from '../../core/game.mjs'


export const CATALOG = new ModuleCatalog("std")


// HEROES

const NicoImg = CATALOG.registerImage("/static/catalogs/std/assets/nico.png")
const NicoBaseSpriteSheet = CATALOG.registerImage("/static/catalogs/std/assets/nico_full.png")
const NicoColorableSpriteSheet = CATALOG.registerImage("/static/catalogs/std/assets/nico_full_colorable.png")
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

const HandSprite = new Sprite(CATALOG.registerImage("/static/catalogs/std/assets/hand.png"))
const ArrowsSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/core/assets/arrows.png"), 4, 1)

const OuchAud = CATALOG.registerAudio("/static/catalogs/std/assets/ouch.opus")
const SlashAud = CATALOG.registerAudio("/static/catalogs/std/assets/slash.opus")
const HandHitAud = CATALOG.registerAudio("/static/catalogs/std/assets/hand_hit.opus")
const JumpAud = CATALOG.registerAudio("/static/catalogs/std/assets/jump.opus")



@CATALOG.registerActor("nico", {
    label: "Nico",
    icon: NicoImg,
})
@StateInt.define("handRemIt", { nullableWith: null, default: null })
@StateProperty.modify("dirX", { showInBuilder: true })
@HealthComponent.add({
    canAttack: false,
    canGetAttacked: true,
    maxHealth: 100,
    graceDuration: 2,
})
@PhysicsComponent.add({
    shape: "box",
    width: 50,
    height: 50,
})
export class Nico extends Hero {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 50
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
            this.hand ||= this.scene.addActor(NicoHand, {
                owner: this
            })
        } else if(this.hand) {
            this.hand.remove()
            this.hand = null
        }
    }

    // attack(act) {
    //     if(act.canGetAttacked) act.onAttack(0, this)
    // }

    getSprite() {
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
        if(game.isKeyPressed(" ")) inputState.act = true
        else delete inputState.act
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
        if(inputState && inputState.act) this.act()
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
        joypadScn.actionButton = joypadScn.addButton({ inputKey:" ", x:width*.7, y:height*.73, size, icon: HandSprite })
        this.syncJoypadActionButton()
    }

    syncJoypadActionButton() {
        const { scenes } = this.game
        const actionButton = scenes.joypad && scenes.joypad.actionButton
        if(!actionButton) return
        const actionExtra = this.getActionExtra()
        actionButton.icon = actionExtra ? actionExtra.getSprite() : HandSprite
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

    drawTo(ctx) {
        if(this.disabled) return
        super.drawTo(ctx)
        if(this.handRemIt && this.spriteWidth>0 && this.spriteHeight>0) {
            const handImg = HandSprite.getImg(
                ~~(this.spriteWidth * .5),
                ~~(this.spriteHeight * .5),
                this.dirX,
                this.dirY,
            )
            if(handImg) ctx.drawImage(handImg, ~~(this.x + handImg.width * (-.5 + this.dirX * 1.1)), ~~(this.y - handImg.height/2))
        }
    }
}

@HealthComponent.add({
    canAttack: true,
    canGetAttacked: false,
    attackDamages: 0,
})
@PhysicsComponent.add({
    shape: "box",
    width: 25,
    height: 25,
    canMove: false,
})
class NicoHand extends Actor {
    static STATEFUL = false

    init(kwargs) {
        this.owner = kwargs.owner
        this.syncPos()
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
    canAttackActor(act) {
        return act != this.owner && this.owner.canAttackActor(act)
    }
    onAttack(act) {
        this.game.audio.playSound(HandHitAud)
    }
}


// weapons

const SWORD_ATTACK_PERIOD = .5

const SwordImg = CATALOG.registerImage("/static/catalogs/std/assets/sword.png")
const SwordSprite = new Sprite(SwordImg)
const SwordSlashSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/assets/slash.png"), 3, 2)

const SwordHitAud = CATALOG.registerAudio("/static/catalogs/std/assets/sword_hit.opus")

@CATALOG.registerActor("sword", {
    label: "Sword",
    icon: SwordImg,
})
@StateInt.define("lastAttackAge", { default: Infinity })
@HealthComponent.add({
    canAttack: true,
    canGetAttacked: false,
    attackDamages: 100,
    oneAttackByActor: true,
})
@PhysicsComponent.add({
    shape: "box",
    width: 40,
    height: 40,
    canMove: false,
})
export class Sword extends Extra {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 40
        this.sprite = SwordSprite
        this.isActionExtra = true
    }
    update() {
        super.update()
        this.syncPos()
        if(this.lastAttackAge == 0) this.game.audio.playSound(SlashAud)
        this.lastAttackAge += 1
        if(this.lastAttackAge > (SWORD_ATTACK_PERIOD * this.game.fps)) this.lastAttackAge = Infinity
        if(!this.isAttacking()) this.resetOneAttackByActor()
    }
    syncPos() {
        const owner = this.getOwner()
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
    canAttackActor(act) {
        const { ownerId } = this
        if(!ownerId || !this.isAttacking() || act.id == ownerId) return false
        const owner = this.getOwner()
        return owner ? owner.canAttackActor(act) : false
    }
    onAttack(act) {
        this.game.audio.playSound(SwordHitAud)
    }
    isAttacking() {
        return this.lastAttackAge < (SWORD_ATTACK_PERIOD * this.game.fps)
    }
    getAttackOwner() {
        return this.getOwner()
    }
    act() {
        if(this.isAttacking()) return
        this.lastAttackAge = 0
    }
    getSprite() {
        const ratioSinceLastAttack = this.lastAttackAge / (SWORD_ATTACK_PERIOD * this.game.fps)
        if(this.ownerId !== null && ratioSinceLastAttack <= 1) {
            return SwordSlashSpriteSheet.get(floor(6*ratioSinceLastAttack))
        } else {
            return SwordSprite
        }
    }
}


const ShurikenImg = CATALOG.registerImage("/static/catalogs/std/assets/shuriken.png")
const ShurikenSprite = new Sprite(ShurikenImg)

@CATALOG.registerActor("shurikp", {
    label: "ShurikenPack",
    icon: ShurikenImg,
})
@PhysicsComponent.add({
    shape: "box",
    width: 30,
    height: 30,
    affectedByGravity: false,
})
@StateInt.define("nb", { default:5, nullableWith: Infinity, showInBuilder: true })
export class ShurikenPack extends Extra {

    init(kwargs) {
        super.init(kwargs)
        this.isActionExtra = true
        this.width = this.height = 30
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
        const owner = this.getOwner()
        if(!owner) return
        this.scene.addActor(Shuriken, {
            x: this.x, y: this.y,
            ownerId: this.ownerId,
        })
    }
    update() {
        super.update()
        const owner = this.getOwner()
        if(owner) {
            this.x = owner.x
            this.y = owner.y
        }
        if(this.actRemIt > 0) this.actRemIt -= 1
    }
    getSprite() {
        return ShurikenSprite
    }
}

@CATALOG.registerActor("shurik", {
    label: "Shuriken",
    icon: ShurikenImg,
    showInBuilder: false,
})
@HealthComponent.add({
    canAttack: true,
    canGetAttacked: false,
    attackDamages: 35,
})
@PhysicsComponent.add({
    shape: "box",
    width: 30,
    height: 30,
    affectedByGravity: false,
})
@StateProperty.define("ownerId")
@StateInt.define("itToLive", { default: null })
@Category.append("projectile")
export class Shuriken extends Actor {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
        this.ownerId = kwargs.ownerId
        const owner = this.getOwner()
        if(owner) this.dirX = owner.dirX
        this.speedX = this.dirX * 500
        this.itToLive = 2 * this.game.fps
        this.game.audio.playSound(SlashAud)
    }
    getOwner() {
        const { ownerId } = this
        return this.scene.actors.get(ownerId)
    }
    canAttackActor(act) {
        const { ownerId } = this
        if(act.id == ownerId) return false
        const owner = this.getOwner()
        return owner ? owner.canAttackActor(act) : true
    }
    onAttack(act) {
        this.remove()
    }
    getAttackOwner() {
        return this.getOwner()
    }
    update() {
        this.itToLive -= 1
        if(this.itToLive <= 0) this.remove()
        if(this.speedResX || this.speedResY) this.remove()
    }
    getSprite() {
        return ShurikenSprite
    }
}


const BombImg = CATALOG.registerImage("/static/catalogs/std/assets/bomb.png")
const BombSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/assets/bomb_spritesheet.png"), 2, 1)

@CATALOG.registerActor("bomb", {
    label: "Bomb",
    icon: BombImg
})
@PhysicsComponent.add({
    shape: "box",
    width: 40,
    height: 40,
    affectedByGravity: false,
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
        this.canBeHit = this.ownerId == null && this.itToLive == null
        const { dt } = this.game
        const { x, y } = this
        const owner = this.getOwner()
        this.affectedByGravity = this.canBeBlocked = (this.itToLive !== null)
        if(this.itToLive !== null) {
            if(this.speedResY < 0) this.speedX = sumTo(this.speedX, 500 * dt, 0)
            if(this.itToLive <= 0) {
                this.scene.addActor(Explosion, { x, y, owner })
                this.remove()
            }
            this.itToLive -= 1
        } else if(owner) {
            this.x = owner.x
            this.y = owner.y
        }
    }
    act() {
        const owner = this.getOwner()
        if(!owner) return
        this.drop()
        this.ownerId = owner.id
        this.speedX = owner.dirX * 200
        this.speedY = -500
        this.itToLive = this.countdown * this.game.fps
    }
    getSprite() {
        const { itToLive, countdown } = this
        if(itToLive === null) return BombSpriteSheet.get(0)
        return BombSpriteSheet.get(floor(pow(3*(1 - (itToLive / this.game.fps)/countdown), 2)*2) % 2)
    }
    scaleSprite(sprite) {
        super.scaleSprite(sprite)
        if(this.itToLive !== null) this.spriteDy = 0
    }
}


const ExplosionSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/assets/explosion.png"), 8, 6)

@CATALOG.registerActor("explos", {
    showInBuilder: false
})
@HealthComponent.add({
    canAttack: true,
    canGetAttacked: false,
    attackDamages: 100,
    oneAttackByActor: true,
})
@PhysicsComponent.add({
    shape: "box",
    width: 300,
    height: 300,
    canMove: false,
})
@StateProperty.define("ownerId")
@StateInt.define("lastAttackAge", { default: Infinity })
@StateInt.define("iteration")
export class Explosion extends Actor {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 300
        this.ownerId = (kwargs && kwargs.owner && kwargs.owner.id) || null
    }
    getOwner() {
        const { ownerId } = this
        if(ownerId === null) return null
        return this.scene.actors.get(ownerId)
    }
    // canHitCategory(cat) {
    //     return cat.startsWith("npc/enemy/")
    // }
    // canAttackActor(act) {
    //     return act.canGetAttacked
    // }
    // hit(act) {
    //     if(act.canGetAttacked) act.onAttack(100, this.getOwner())
    // }
    getAttackOwner() {
        return this.getOwner() || this
    }
    update() {
        super.update()
        const age = this.iteration/this.game.fps
        if(age >= 1) return this.remove()
        this.iteration += 1
    }
    getSprite() {
        return ExplosionSpriteSheet.get(floor(
            this.iteration / this.game.fps * 8 * 6
        ))
    }
}


// ENEMIES


const SpikyImg = CATALOG.registerImage("/static/catalogs/std/assets/spiky.png")
const SpikySprite = new Sprite(SpikyImg)

@CATALOG.registerActor("spiky", {
    label: "Spiky",
    icon: SpikyImg,
})
@HealthComponent.add({
    canAttack: true,
    canGetAttacked: true,
    maxHealth: 100,
    attackDamages: 10,
})
@PhysicsComponent.add({
    shape: "box",
    width: 45,
    height: 45,
    canMove: false,
    canBeBlocked: false,
})
export class Spiky extends Enemy {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 45
        this.spriteRand = floor(random() * this.game.fps)
    }

    canAttackActor(act) {
        return act instanceof Hero
    }

    getSprite() {
        return SpikySprite
    }
    
    scaleSprite(sprite) {
        super.scaleSprite(sprite)
        const { iteration } = this.scene
        const { fps } = this.game
        const angle = PI * (this.spriteRand + iteration) / fps, cosAngle = cos(angle)
        this.spriteDy = -this.spriteWidth * .05 * cosAngle
    }
}


const BlobImg = CATALOG.registerImage("/static/catalogs/std/assets/blob.png")
const BlobSprite = new Sprite(BlobImg)

@CATALOG.registerActor("blob", {
    label: "Blob",
    icon: BlobImg,
})
@StateInt.define("lastChangeDirAge")
@StateProperty.modify("dirX", { showInBuilder: true })
@HealthComponent.add({
    canAttack: true,
    canGetAttacked: true,
    maxHealth: 100,
    attackDamages: 10,
})
@PhysicsComponent.add({
    shape: "box",
    width: 50,
    height: 36,
})
export class BlobEnemy extends Enemy {

    init(kwargs) {
        super.init(kwargs)
        this.width = 50
        this.height = 36
        this.spriteRand = floor(random() * this.game.fps)
    }

    update() {
        super.update()
        const { fps } = this.game
        // move
        if(this.speedX != 0 && this.lastChangeDirAge > fps && abs(this.speedResX) > .8 * 20) {
            this.dirX *= -1
            this.lastChangeDirAge = 0
        }
        if(this.speedResY < 0) {
            this.speedX = this.dirX * 30
        }
        this.lastChangeDirAge += 1
    }

    canAttackActor(act) {
        return act instanceof Hero
    }

    getSprite() {
        return BlobSprite
    }
    
    scaleSprite(sprite) {
        super.scaleSprite(sprite)
        const { iteration } = this.scene
        const { fps } = this.game
        const angle = 2 * PI * (this.spriteRand + iteration) / fps, cosAngle = cos(angle), sinAngle = sin(angle)
        this.spriteWidth *= (1 + .1 * cosAngle)
        this.spriteHeight *= (1 + .1 * sinAngle)
        this.spriteDy = -this.spriteWidth * .1 * sinAngle / 2
    }

    getHitBox() {
        return {
            left: this.x - 10,
            width: 20,
            top: this.y - 30,
            height: 60,
        }
    }
}


const GhostImg = CATALOG.registerImage("/static/catalogs/std/assets/ghost.png")
const GhostSprite = new Sprite(GhostImg)

@CATALOG.registerActor("ghost", {
    label: "Ghost",
    icon: GhostImg,
})
@StateProperty.modify("dirX", { showInBuilder: true })
@HealthComponent.add({
    canAttack: true,
    canGetAttacked: true,
    maxHealth: 100,
    attackDamages: 10,
})
@PhysicsComponent.add({
    shape: "box",
    width: 45,
    height: 45,
    affectedByGravity: false,
})
export class Ghost extends Enemy {

    init(kwargs) {
        super.init(kwargs)
        this.width = 45
        this.height = 45
        this.spriteRand = floor(random() * this.game.fps)
    }

    update() {
        super.update()
        const { dt } = this.game
        const { width } = this.scene.map
        // move
        if((this.speedResX * this.dirX < 0) || (this.x < 0 && this.dirX < 0) || (this.x > width && this.dirX > 0)) this.dirX *= -1
        this.speedX = sumTo(this.speedX, 1000 * dt, this.dirX * 2000 * dt)
        this.speedY = sumTo(this.speedY, 1000 * dt, 0)
    }

    canAttackActor(act) {
        return act instanceof Hero
    }

    getSprite() {
        return GhostSprite
    }
    
    scaleSprite(sprite) {
        super.scaleSprite(sprite)
        const { iteration } = this.scene
        const { fps } = this.game
        const angle = 2 * PI * (this.spriteRand + iteration) / fps, cosAngle = cos(angle)
        this.spriteDy = -this.spriteWidth * .1 * cosAngle
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

const HeartImg = CATALOG.registerImage("/static/core/assets/heart.png")

@CATALOG.registerActor("heart", {
    label: "Heart",
    icon: HeartImg,
})
export class Heart extends Collectable {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
        this.spriteRand = floor(random() * this.game.fps)
    }

    onCollected(hero) {
        super.onCollected(hero)
        this.remove()
        if(hero.getHealth() < hero.maxHealth) {
            hero.damages = 0
        } else {
            hero.lives += 1
        }
    }

    getSprite() {
        return HeartSpriteSheets.get("red").get(0)
    }
    
    scaleSprite(sprite) {
        super.scaleSprite(sprite)
        const { iteration } = this.scene
        const { fps } = this.game
        const angle = PI * (this.spriteRand + iteration) / fps, cosAngle = cos(angle)
        this.spriteDy = -this.spriteWidth * .05 * cosAngle
    }
}


const StarImg = CATALOG.registerImage("/static/catalogs/std/assets/star.png")
const StarSprite = new Sprite(StarImg)

@CATALOG.registerActor("star", {
    label: "Star",
    icon: StarImg,
})
@CollectComponent.add({
    canCollect: false,
    canGetCollected: true,
})
export class Star extends Actor {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
    }
    onGetCollected(collector) {
        this.remove()
    }
    getSprite() {
        return StarSprite
    }
}


const CheckpointImg = CATALOG.registerImage("/static/catalogs/std/assets/checkpoint.png")
const CheckpointSprite = new Sprite(CheckpointImg)

@CATALOG.registerActor("checkpt", {
    label: "CheckPoint",
    icon: CheckpointImg,
})
export class Checkpoint extends Collectable {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 40
    }
    onCollected(hero) {
        super.onCollected(hero)
        this.remove()
        this.scene.herosSpawnX = this.x
        this.scene.herosSpawnY = this.y
    }
    getSprite() {
        return CheckpointSprite
    }
}


const PortalImg = CATALOG.registerImage("/static/catalogs/std/assets/portal.png")
const PortalSprite = new Sprite(PortalImg)
const PortalJumpAud = CATALOG.registerAudio("/static/catalogs/std/assets/portal_jump.opus")

@CATALOG.registerActor("portal", {
    label: "Portal",
    icon: PortalImg,
})
@ActivableComponent.add()
export class Portal extends Actor {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 50
    }
    update() {
        super.update()
        if(this.activated) {
            this.scene.actors.forEach(act => {
                if(hypot(act.x-this.x, act.y-this.y)<30 && (act.speedX * (this.x-act.x) + act.speedY * (this.y-act.y))>0) {
                    this.teleport(act)
                }
            })
        }
    }
    teleport(act) {
        const portals = this.scene.filterActors("portals", act => (act instanceof Portal && act.activated))
        if(portals.length < 2) return
        let targetPortal = portals[floor(this.scene.rand("portals") * (portals.length - 1))]
        if(targetPortal === this) targetPortal = portals[portals.length - 1]
        act.x = targetPortal.x + (this.x - act.x)
        act.y = targetPortal.y + (this.y - act.y)
        this.game.audio.playSound(PortalJumpAud)
    }
    getSprite() {
        this.spriteVisibility = this.activated ? 1 : .5
        return PortalSprite
    }
}


@LinkTrigger.add("isTriggered", { isDefault: true })
@StateBool.define("triggered")
export class Trigger extends Actor {

    isTriggered() {
        return this.triggered
    }
}


const BurronImg = CATALOG.registerImage("/static/core/assets/button.png")
const ButtonSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/core/assets/button_spritesheet.png"), 2, 1)

@CATALOG.registerActor("button", {
    label: "Button",
    icon: BurronImg,
})
@StateInt.define("duration", { default: Infinity, nullableWith: Infinity, showInBuilder: true })
@StateInt.define("period", { default: 0, showInBuilder: true })
@StateInt.define("trigAge", { default: Infinity, nullableWith: Infinity })
@HealthComponent.add({
    canAttack: false,
    canGetAttacked: true,
    maxHealth: Infinity,
})
@PhysicsComponent.add({
    shape: "box",
    width: 30,
    height: 30,
    canMove: false,
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

    getSprite() {
        return ButtonSpriteSheet.get(this.triggered ? 1 : 0)
    }
}


const ClockImg = CATALOG.registerImage("/static/catalogs/std/assets/clock.png")
const ClockSprite = new Sprite(ClockImg)

@CATALOG.registerActor("clock", {
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
    getSprite() {
        return ClockSprite
    }
}


const DoorImg = CATALOG.registerImage("/static/catalogs/std/assets/door.png")
const DoorSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/assets/door_spritesheet.png"), 2, 1)

@CATALOG.registerActor("door", {
    label: "Door",
    icon: DoorImg,
    showInBuilder: true,
})
@LinkReaction.add("reactToggle", { label:"toggle", isDefault: true })
@PhysicsComponent.add({
    shape: "box",
    width: 50,
    height: 50,
    canMove:false,
    canBlock: true,
})
@StateBool.define("closed", { default: true, showInBuilder: true })
@Category.append("engine")
export class Door extends Actor {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 50
        this.origClosed = this.closed
    }

    reactToggle(resp) {
        this.closed = (resp.value >= .5) ? (!this.origClosed) : this.origClosed
    }

    update() {
        super.update()
        this.canBlock = this.closed
    }

    getSprite() {
        return DoorSpriteSheet.get(this.closed ? 0 : 1)
    }
}