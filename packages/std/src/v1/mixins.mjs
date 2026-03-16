const { values, assign, getPrototypeOf } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import {
    now, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newTextCanvas, newDomEl, addNewDomEl, importJs, hasKeys, nbKeys,
    StateProperty, StateBool, StateNumber, StateObjectRef,
    LinkReaction,
    Mixin,
} from '../../../core/v1/index.mjs'


@LinkReaction.add("reactToggle", { label:"Toggle", isDefault: true })
@StateBool.define("activated", { showInBuilder: true, default: true })
export class ActivableMixin extends Mixin {
    static KEY = "activable"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.origActivated = true

        proto.reactToggle = this.reactToggle
    }

    init(kwargs) {
        super.init(kwargs)
        this.origActivated = this.activated
    }

    reactToggle(resp) {
        this.activated = (resp.value >= .5) ? (!this.origActivated) : this.origActivated
    }
}


export class BodyMixin extends Mixin {
    static KEY = "body"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.shape = kwargs?.shape ?? "box"
        proto.width = kwargs?.width ?? 50
        proto.height = kwargs?.height ?? 50
        proto.radius = kwargs?.radius ?? 50

        proto.getBodyPolygon ||= this.getBodyPolygon
    }

    getBodyPolygon() {
        const pol = this._bodyPolygons ||= []
        pol.length = 0
        if(this.shape == "box") {
            const { x, y, width, height } = this
            const hWidth = width/2, hHeight = height/2
            const xMin = x-hWidth, yMin = y-hHeight, xMax = x+hWidth, yMax = y+hHeight
            pol.push(
                xMin, yMin,
                xMax, yMin,
                xMax, yMax,
                xMin, yMax,
            )
        }
        return pol
    }
}


@BodyMixin.addIfAbsent()
export class HitMixin extends Mixin {
    static KEY = "hit"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.canHitGroup ||= function(group) { return false }
        proto.canBeHitAsGroup ||= function(group) { return false }
        proto.canHitObject ||= function(obj) { return false }
        proto.hit ||= function(obj, details) {}

        proto.getHitProps ||= this.getHitProps
    }

    getHitProps(dt) {
        const props = this._hitProps ||= {}
        props.polygon = this.getBodyPolygon()
        props.dx = (this.speedX ?? 0) * dt
        props.dy = (this.speedY ?? 0) * dt
        props.uniDirX = props.uniDirY = null
        return props
    }
}


@StateNumber.define("speedY")
@StateNumber.define("speedX")
@HitMixin.addIfAbsent()
@BodyMixin.addIfAbsent()
export class PhysicsMixin extends Mixin {
    static KEY = "physics"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.canMove = kwargs?.canMove ?? true
        proto.affectedByGravity = kwargs?.affectedByGravity ?? proto.canMove
        proto.canBlock = kwargs?.canBlock ?? false
        proto.canGetBlocked = kwargs?.canGetBlocked ?? proto.canMove
        proto.checkBlockAnyway = kwargs?.checkBlockAnyway ?? false
        proto.checkGetBlockedAnyway = kwargs?.checkGetBlockedAnyway ?? false
        proto.physicsBounciness = kwargs?.physicsBounciness ?? 0
        proto.physicsStaticFriction = kwargs?.physicsStaticFriction ?? Infinity
        proto.physicsDynamicFriction = kwargs?.physicsDynamicFriction ?? Infinity
        proto.physicsWeight = kwargs?.physicsWeight ?? 100

        proto.onBlock ||= function(obj, details) {}
        proto.onGetBlocked ||= function(obj, details) {}

        const origCanHitGroup = proto.canHitGroup
        proto.canHitGroup = function(group) {
            if(group == "physics" && (this.canBlock || this.checkBlockAnyway)) return true
            return origCanHitGroup.call(this, group)
        }
        const origCanBeHitAsGroup = proto.canBeHitAsGroup
        proto.canBeHitAsGroup = function(group) {
            if(group == "physics" && (this.canGetBlocked || this.checkGetBlockedAnyway)) return true
            return origCanBeHitAsGroup.call(this, group)
        }

        proto.canReallyBlockObject = function(obj) {
            return (
                (this.canBlock || this.checkBlockAnyway)
                && (obj.canGetBlocked || obj.checkGetBlockedAnyway)
                && !(this.canBlock && obj.canGetBlocked) // in this case the check is already done by physics engine
            )
        }
        const origCanHitObject = proto.canHitObject
        proto.canHitObject = function(obj) {
            return this.canReallyBlockObject(obj) || origCanHitObject.call(this, obj)
        }

        const origHit = proto.hit
        proto.hit = function(obj, details) {
            origHit.call(this, obj, details)
            if((this.canBlock || this.checkBlockAnyway) && obj.canGetBlocked) this.onBlock(obj, details)
            if((obj.canGetBlocked || obj.checkGetBlockedAnyway) && this.canBlock) obj.onGetBlocked(this, details)
        }
    }

    init(kwargs) {
        super.init(kwargs)
        if(kwargs?.speedX !== undefined) this.speedX = kwargs.speedX
        if(kwargs?.speedY !== undefined) this.speedY = kwargs.speedY
    }

    update() {
        // done by physics engine
    }
}

export function applyForce(obj, forceX, forceY) {
    const weight = obj.physicsWeight ?? 100
    obj.speedX += forceX * 100 / weight
    obj.speedY += forceY * 100 / weight
}


@StateObjectRef.define("owner")
export class OwnerableMixin extends Mixin {
    static KEY = "ownerable"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.removedWithOwner = kwargs?.removedWithOwner ?? true
    }

    init(kwargs) {
        super.init(kwargs)
        this.owner = kwargs?.owner ?? null
    }

    update() {
        super.update()
        const { owner } = this
        if(owner && owner.removed) {
            this.owner = null
            if(this.removedWithOwner) this.remove()
        }
    }
}


class AttackProps {

    static {
        assign(this.prototype, {
            damages: 0,
            knockback: 0,
            knockbackAngle: 0,
        })
    }

    constructor(attacker, kwargs) {
        this.attacker = attacker
        assign(this, kwargs)
    }
}


@HitMixin.addIfAbsent()
@StateNumber.define("damages")
@StateProperty.define("attackAges")
export class AttackMixin extends Mixin {
    static KEY = "attack"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.canAttack = kwargs?.canAttack ?? true
        proto.canGetAttacked = kwargs?.canGetAttacked ?? true
        proto.maxHealth = kwargs?.maxHealth ?? 100
        proto.attackDamages = kwargs?.attackDamages ?? 0
        proto.attackKnockback = kwargs?.attackKnockback ?? 0
        proto.attackPeriod = kwargs?.attackPeriod ?? 1
        proto.getDamagedAge = Infinity

        const origCanHitGroup = proto.canHitGroup
        proto.canHitGroup = function(group) {
            if(group == "health" && this.canAttack) return true
            return origCanHitGroup.call(this, group)
        }
        const origCanBeHitAsGroup = proto.canBeHitAsGroup
        proto.canBeHitAsGroup = function(group) {
            if(group == "health" && this.canGetAttacked) return true
            return origCanBeHitAsGroup.call(this, group)
        }
        
        proto.getHealth ||= this.getHealth
        const canReallyAttackObject = function(obj) {
            if(!this.canAttack) return false
            if(!this.scene.teamsManager.canTeamAttack(this.team, obj.team)) return false
            const { attackPeriod, attackAges } = this
            if(attackPeriod != 0 && attackAges) {
                const attackAge = attackAges[obj.id]
                if(attackAge !== undefined && attackAge <= attackPeriod * this.game.fps) return false
            }
            if(!(obj.canGetAttacked && obj.canGetAttackedByObject(this))) return false
            return this.canAttackObject(obj)
        }
        proto.canGetAttackedByObject ||= function(obj) { return true }
        proto.canAttackObject ||= function(obj) { return true }
        const origCanHitObject = proto.canHitObject
        proto.canHitObject = function(obj) {
            return canReallyAttackObject.call(this, obj) || origCanHitObject.call(this, obj)
        }

        const origHit = proto.hit
        proto.hit = function(obj, details) {
            origHit.call(this, obj, details)
            if(canReallyAttackObject.call(this, obj)) this.attack(obj)
        }
        proto.getAttackProps ||= AttackMixin.getAttackProps
        proto.attack = this.attack
        proto.onAttack ||= function(obj, props) {}
        proto.getAttacked ||= this.getAttacked
        proto.onGetAttacked ||= function(props) {}

        proto.getDamaged ||= this.getDamaged
        proto.die ||= this.die
    }

    update() {
        const { attackPeriod, attackAges } = this
        if(attackPeriod != 0 && attackAges) {
            const attackPeriodIt = attackPeriod * this.game.fps
            let atLeastOneId = false
            for(let id in attackAges) {
                const age = attackAges[id]
                if(age > attackPeriodIt) delete attackAges[id]
                else {
                    attackAges[id] = age + 1
                    atLeastOneId = true
                }
            }
            if(!atLeastOneId) this.attackAges = null
        }
        this.getDamagedAge += 1
    }

    getHealth() {
        return this.maxHealth - this.damages
    }

    attack(obj) {
        if(this.attackPeriod != 0) {
            const attackAges = this.attackAges ||= {}
            attackAges[obj.id] = 0
        }
        const props = this.getAttackProps(obj)
        obj.getAttacked(props)
        this.onAttack(obj, props)
    }

    getAttacked(props) {
        if(this.getHealth() <= 0) return
        const { attacker, damages } = props
        if(this.scene.teamsManager.canTeamDamage(attacker.team, this.team)) {
            this.getDamaged(damages, props)
        }
        const knockback = props?.knockback
        if(knockback) {
            const knockbackAngle = props.knockbackAngle * PI / 180
            applyForce(
                this,
                knockback * cos(knockbackAngle),
                knockback * sin(knockbackAngle),
            )
        }
        this.onGetAttacked(props)
    }

    getDamaged(damages, props) {
        this.damages += damages
        this.getDamagedAge = 0
        const attacker = props?.attacker
        if(this.getHealth() <= 0) {
            this.die(attacker)
        } else if(attacker) {
            this.speedY = -200
            this.speedX = 200 * ((this.x > attacker.x) ? 1 : -1)
        }
    }

    die(killer) {
        this.remove()
    }
}

AttackMixin.getAttackProps = function(obj) {
    const props = this._attackProps ||= new AttackProps(this, {
        damages: this.attackDamages,
        knockback: this.attackKnockback,
        knockbackAngle : atan2(obj.y-this.y, obj.x-this.x) * 180 / PI
    })
    return props
}


@HitMixin.addIfAbsent()
@OwnerableMixin.addIfAbsent()
export class CollectMixin extends Mixin {
    static KEY = "collect"

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.canCollect = kwargs?.canCollect ?? true
        proto.canGetCollected = kwargs?.canGetCollected ?? true

        const origCanHitGroup = proto.canHitGroup
        proto.canHitGroup = function(group) {
            if(group == "collect" && this.canCollect) return true
            return origCanHitGroup.call(this, group)
        }
        const origCanBeHitAsGroup = proto.canBeHitAsGroup
        proto.canBeHitAsGroup = function(group) {
            if(group == "collect" && this.canGetCollected) return true
            return origCanBeHitAsGroup.call(this, group)
        }
        
        const canReallyCollectObject = function(obj) {
            if(!this.canCollect) return false
            if(obj.owner) return false
            if(!(obj.canGetCollected && obj.canGetCollectedByObject(this))) return false
            return this.canCollectObject(obj)
        }
        proto.canGetCollectedByObject ||= function(obj) { return true }
        proto.canCollectObject ||= function(obj) { return true }
        const origCanHitObject = proto.canHitObject
        proto.canHitObject = function(obj) {
            return canReallyCollectObject.call(this, obj) || origCanHitObject.call(this, obj)
        }

        const origHit = proto.hit
        proto.hit = function(obj, details) {
            origHit.call(this, obj, details)
            if(canReallyCollectObject.call(this, obj)) this.collect(obj)
        }
        proto.collect = this.collect
        proto.onCollect ||= function(obj) {}
        proto.getCollected ||= this.getCollected
        proto.onGetCollected ||= function(collector) {}
        proto.drop = this.drop
        proto.onDrop ||= function(owner) {}
        const origRemove = proto.remove
        proto.remove = function() {
            origRemove.call(this)
            this.drop()
        }
    }

    collect(obj) {
        if(obj.getCollected) obj.getCollected(this)
        this.onCollect(obj)
    }

    getCollected(collector) {
        this.owner = collector
        this.onGetCollected(collector)
    }

    drop() {
        const { owner } = this
        if(!owner) return
        this.owner = null
        this.onDrop(owner)
    }
}