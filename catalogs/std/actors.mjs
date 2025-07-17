const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import * as utils from '../../core/utils.mjs'
const { urlAbsPath, checkHit, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, importJs } = utils
import { ModuleCatalog, GameObject, defineStateProperty, StateProperty, StateInt, addComponent, PhysicsComponent, Sprite, SpriteSheet, Hero, Enemy, Collectable, Extra, HeartSpriteSheets } from '../../core/game.mjs'


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
@defineStateProperty(StateInt, "handRemIt", { default: null })
@addComponent(PhysicsComponent)
export class Nico extends Hero {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 50
        this.handDur = ceil(.1 * this.game.fps)
    }

    update() {
        super.update()
        // inputs
        this.applyInputState()
        if(this.handRemIt == this.handDur) this.checkHandHit()
        // // fall
        // if(this.y > this.map.height + 100) {
        //     this.mayTakeDamage(1, null, true)
        //     if(this.health > 0) this.scene.spawnHero(this)
        // }
    }

    checkHandHit() {
        const handHitBox = this.handHitBox ||= {
            width: 25,
            height: 25,
        }
        handHitBox.x = this.x + this.dirX * 28
        handHitBox.y = this.y
        let hasHit = false
        const _checkHit = act => {
            if(this == act) return
            if(checkHit(handHitBox, act)) {
                act.mayTakeDamage(0, this)
                hasHit = true
            }
        }
        this.scene.getTeam("enemy").forEach(_checkHit)
        this.scene.getTeam("hero").forEach(_checkHit)
        this.game.audio.playSound(hasHit ? HandHitAud : SlashAud)
    }

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
        if(this.health == 0) return
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

    takeDamage(val, damager) {
        super.takeDamage(val, damager)
        this.game.audio.playSound(OuchAud)
    }

    initJoypadButtons(joypadScn) {
        const { width, height } = joypadScn
        const size = height*.45
        joypadScn.newButton({ inputKey:"ArrowLeft", x:width*.15, y:height*.27, size, icon: ArrowsSpriteSheet.get(3) })
        joypadScn.newButton({ inputKey:"ArrowRight", x:width*.3, y:height*.73, size, icon: ArrowsSpriteSheet.get(1) })
        joypadScn.newButton({ inputKey:"ArrowUp", x:width*.85, y:height*.27, size, icon: ArrowsSpriteSheet.get(0) })
        joypadScn.actionButton = joypadScn.newButton({ inputKey:" ", x:width*.7, y:height*.73, size, icon: HandSprite })
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


// ENEMIES


const SpikyImg = CATALOG.registerImage("/static/catalogs/std/assets/spiky.png")
const SpikySprite = new Sprite(SpikyImg)

@CATALOG.registerActor("spiky", {
    label: "Spiky",
    icon: SpikyImg,
})
export class Spiky extends Enemy {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 45
        this.spriteRand = floor(random() * this.game.fps)
    }

    update() {
        // attack
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) hero.mayTakeDamage(1, this)
        })
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
@defineStateProperty(StateInt, "lastChangeDirAge")
@addComponent(PhysicsComponent)
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
        // attack
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) hero.mayTakeDamage(1, this)
        })
        this.lastChangeDirAge += 1
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
@addComponent(PhysicsComponent, { affectedByGravity: false })
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
        const { iteration } = this.scene
        const { width } = this.scene.map
        // move
        if((this.speedResX * this.dirX < 0) || (this.x < 0 && this.dirX < 0) || (this.x > width && this.dirX > 0)) this.dirX *= -1
        this.speedX = sumTo(this.speedX, 1000 * dt, this.dirX * 2000 * dt)
        this.speedY = sumTo(this.speedY, 1000 * dt, 0)
        // attack
        this.scene.getTeam("hero").forEach(hero => {
            if(checkHit(this, hero)) hero.mayTakeDamage(1, this)
        })
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

@CATALOG.registerActor("heart", {
    label: "Heart",
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
        if(hero.health < hero.getMaxHealth()) {
            hero.health = hero.getMaxHealth()
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


const SWORD_ATTACK_PERIOD = .5

const SwordImg = CATALOG.registerImage("/static/catalogs/std/assets/sword.png")
const SwordSprite = new Sprite(SwordImg)
const SwordSlashSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/assets/slash.png"), 3, 2)

const SwordHitAud = CATALOG.registerAudio("/static/catalogs/std/assets/sword_hit.opus")

@CATALOG.registerActor("sword", {
    label: "Sword",
    icon: SwordImg,
})
@defineStateProperty(StateInt, "lastAttackAge", { default: Infinity })
export class Sword extends Extra {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 40
        this.sprite = SwordSprite
        this.isActionExtra = true
    }
    update() {
        super.update()
        const owner = this.getOwner()
        if(owner) {
            this.dirX = owner.dirX
            this.y = owner.y
            if(this.isAttacking()) {
                this.x = owner.x + 40 * owner.dirX
                this.width = this.height = 60
            } else {
                this.x = owner.x + 25 * owner.dirX
                this.width = this.height = 40
            }
            if(this.lastAttackAge == 0) this.checkHit()
            this.lastAttackAge += 1
        }
    }
    isAttacking() {
        return this.lastAttackAge < (SWORD_ATTACK_PERIOD * this.game.fps)
    }
    act() {
        if(this.isAttacking()) return
        this.lastAttackAge = 0
    }
    checkHit() {
        const owner = this.getOwner()
        let hasHit = false
        const _checkHit = act => {
            if(owner === act) return
            if(checkHit(this, act)) {
                this.hit(act)
                hasHit = true
            }
        }
        this.scene.getTeam("hero").forEach(_checkHit)
        this.scene.getTeam("enemy").forEach(_checkHit)
        this.game.audio.playSound(hasHit ? SwordHitAud : SlashAud)
    }
    hit(act) {
        const damage = act.team == this.team ? 0 : 1
        act.mayTakeDamage(damage, this.getOwner())
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

@CATALOG.registerActor("shurik", {
    label: "Shuriken",
    icon: ShurikenImg,
})
@addComponent(PhysicsComponent, { affectedByGravity: false })
@defineStateProperty(StateInt, "nb", { default:5, nullableWith: Infinity, showInBuilder: true })
@defineStateProperty(StateInt, "itToLive", { default: null })
export class Shurikens extends Extra {

    init(kwargs) {
        super.init(kwargs)
        this.isActionExtra = true
        this.width = this.height = 30
        this.actLastTryIt = -Infinity
        this.actRemIt = 0
        if(kwargs && kwargs.itToLive !== undefined) this.itToLive = kwargs.itToLive
        this.throwPeriod = .3
    }
    isCollectableBy(team) {
        if(this.itToLive !== null) return false
        return super.isCollectableBy(team)
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
        this.scene.newActor(Shurikens, {
            x: this.x, y: this.y,
            ownerId: this.ownerId,
            nb: 1, itToLive: 2 * this.game.fps,
            speedX: owner.dirX * 500,
        })
        this.game.audio.playSound(SlashAud)
    }
    update() {
        const owner = this.getOwner()
        if(this.itToLive) {
            this.checkHit()
            this.itToLive -= 1
            if(this.itToLive <= 0) this.remove()
            if(this.speedResX || this.speedResY) this.remove()
        } else if(owner) {
            this.x = owner.x
            this.y = owner.y
        }
        if(this.actRemIt > 0) this.actRemIt -= 1
    }
    checkHit() {
        const _checkHit = act => {
            if(!this.removed && checkHit(this, act)) {
                this.hit(act)
                this.remove()
            }
        }
        this.scene.getTeam("enemy").forEach(_checkHit)
    }
    hit(act) {
        act.mayTakeDamage(1, this.getOwner())
    }
    getSprite() {
        return ShurikenSprite
    }
    scaleSprite(sprite) {
        super.scaleSprite(sprite)
        if(this.itToLive !== null) this.spriteDy = 0
    }
}


const BombSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/assets/bomb.png"), 2, 1)

@CATALOG.registerActor("bomb", {
    label: "Bomb",
})
@addComponent(PhysicsComponent)
@defineStateProperty(StateInt, "itToLive", { default: null })
export class Bomb extends Extra {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 40
        this.isActionExtra = true
        this.affectedByGravity = this.blockedByWalls = false
    }
    isCollectableBy(team) {
        if(this.itToLive !== null) return false
        return super.isCollectableBy(team)
    }
    update() {
        const { dt } = this.game
        const { x, y } = this
        const owner = this.getOwner()
        this.affectedByGravity = this.blockedByWalls = (this.itToLive !== null)
        if(this.itToLive !== null) {
            if(this.speedResY < 0) this.speedX = sumTo(this.speedX, 500 * dt, 0)
            if(this.itToLive <= 0) {
                this.scene.newActor(Explosion, { x, y, owner: this.getOwner() })
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
        this.itToLive = 1 * this.game.fps
    }
    getSprite() {
        const { itToLive } = this
        if(itToLive === null) return BombSpriteSheet.get(0)
        return BombSpriteSheet.get(floor(pow(3 - (itToLive / this.game.fps), 2)*2) % 2)
    }
    scaleSprite(sprite) {
        super.scaleSprite(sprite)
        if(this.itToLive !== null) this.spriteDy = 0
    }
}


const StarImg = CATALOG.registerImage("/static/catalogs/std/assets/star.png")
const StarSprite = new Sprite(StarImg)

@CATALOG.registerActor("star", {
    label: "Star",
    icon: StarImg,
})
export class Star extends Collectable {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
        this.scene.nbStars ||= 0
        this.scene.nbStars += 1
    }
    onCollected(hero) {
        super.onCollected(hero)
        this.remove()
        this.scene.nbStars -= 1
        //if(this.scene.step == "GAME" && this.scene.nbStars == 0) this.scene.step = "VICTORY"
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


// OTHERS





const ExplosionSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/assets/explosion.png"), 8, 6)

@CATALOG.registerActor("explos", {
    showInBuilder: false
})
@defineStateProperty(StateInt, "iteration")
@defineStateProperty(StateInt, "lastAttackAge", { default: Infinity })
export class Explosion extends GameObject {

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
    update() {
        super.update()
        if(this.iteration == 0) this.checkActorsToDamage()
        const age = this.iteration/this.game.fps
        if(age >= 1) return this.remove()
        this.iteration += 1
    }
    checkActorsToDamage() {
        const { x, y } = this
        const radius2 = pow(150, 2)
        const _checkOne = act => {
            const dx = x - act.x, dy = y - act.y
            if(dx*dx+dy*dy < radius2) act.mayTakeDamage(1, this.getOwner())
        }
        this.scene.getTeam("hero").forEach(_checkOne)
        this.scene.getTeam("enemy").forEach(_checkOne)
    }
    getSprite() {
        return ExplosionSpriteSheet.get(floor(
            this.iteration / this.game.fps * 8 * 6
        ))
    }
}


const PortalImg = CATALOG.registerImage("/static/catalogs/std/assets/portal.png")
const PortalSprite = new Sprite(PortalImg)
const PortalJumpAud = CATALOG.registerAudio("/static/catalogs/std/assets/portal_jump.opus")

@CATALOG.registerActor("portal", {
    label: "Portal",
    icon: PortalImg,
})
export class Portal extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 50
    }
    update() {
        this.scene.actors.forEach(act => {
            if(hypot(act.x-this.x, act.y-this.y)<30 && (act.speedX * (this.x-act.x) + act.speedY * (this.y-act.y))>0) {
                this.teleport(act)
            }
        })
    }
    teleport(act) {
        const portals = this.scene.filterActors("portals", act => (act instanceof Portal))
        if(portals.length < 2) return
        let targetPortal = portals[floor(this.scene.rand("portals") * (portals.length - 1))]
        if(targetPortal === this) targetPortal = portals[portals.length - 1]
        act.x = targetPortal.x + (this.x - act.x)
        act.y = targetPortal.y + (this.y - act.y)
        this.game.audio.playSound(PortalJumpAud)
    }
    getSprite() {
        return PortalSprite
    }
}
