const { min, max, cos, sin, PI } = Math

import {
    sign, normAngle, isAngleInRange,
    GameObject, Dependencies, Mixin,
    Aud,
} from '../../../../core/v1/index.mjs'

import {
    BodyMixin, PhysicsMixin, OwnerableMixin
} from '../mixins.mjs'


const JumpAud = new Aud("/static/catalogs/std/v1/2Dside/assets/jump.opus")

@PhysicsMixin.addIfAbsent()
@Dependencies.add(JumpAud)
export class JumpMixin extends Mixin {

    initClass(cls, kwargs) {
        super.initClass(cls, kwargs)
        const proto = cls.prototype

        proto.jumpSpeed = kwargs?.jumpSpeed ?? 500
        proto.nullJumpSpeed = kwargs?.nullJumpSpeed ?? 800
        proto.maxJumpBlockAngle = kwargs?.maxJumpBlockAngle ?? 70
        proto.jumpPeriod = kwargs?.jumpPeriod ?? .2

        proto.initJumpBlockChecker = this.initJumpBlockChecker
        proto.canJump = this.canJump
        proto.mayJump = this.mayJump
        proto.jump = this.jump

        proto._jumpLastIt = -Infinity
    }

    initJumpBlockChecker() {
        const checker = this._jumpBlockChecker ||= this.scene.addObject(JumpMixinBlockChecker, { owner: this })
        return checker
    }

    update() {
        this.initJumpBlockChecker()
    }

    canJump() {
        if((this.scene.iteration - this._jumpLastIt) * this.game.dt < this.jumpPeriod) return
        let blockAngle = this.initJumpBlockChecker().getBlockedAngle()
        if(blockAngle === null) return false
        const { maxJumpBlockAngle } = this
        return isAngleInRange(blockAngle, -90-maxJumpBlockAngle, -90+maxJumpBlockAngle)
    }

    mayJump() {
        if (this.canJump()) {
            this.jump()
            return true
        }
        return false
    }

    jump() {
        const { jumpSpeed, nullJumpSpeed } = this
        const blockAngle = this.initJumpBlockChecker().getBlockedAngle()
        const jumpAngle = -90 - normAngle(-90 - blockAngle) / 2
        if (jumpAngle != -90) {
            const jumpSpeedX = jumpSpeed * cos(jumpAngle * PI / 180)
            if(jumpSpeedX > 0) this.speedX = min(this.speedX + jumpSpeedX, jumpSpeedX)
            else this.speedX = max(this.speedX + jumpSpeedX, jumpSpeedX)
            this.dirX = sign(jumpSpeedX)
        }
        let jumpSpeedY = jumpSpeed * sin(jumpAngle * PI / 180) // < 0
        this.speedY += max(jumpSpeedY, min(0, jumpSpeedY * (1 + this.speedY / nullJumpSpeed)))
        this.game.audio.playSound(JumpAud)
        this._jumpLastIt = this.scene.iteration
    }
}


@OwnerableMixin.add()
@PhysicsMixin.add({
    canMove: false,
    checkGetBlockedAnyway: true,
})
@BodyMixin.add()
class JumpMixinBlockChecker extends GameObject {
    init(kwargs) {
        super.init(kwargs)
        this.lastGetBlockedIteration = -Infinity
        this.sync()
    }
    sync() {
        const { owner } = this
        if(!owner) return
        this.x = owner.x
        this.y = owner.y
        this.width = owner.width + 2
        this.height = owner.height + 2
    }
    getBlockedAngle() {
        if(this.lastGetBlockedIteration < this.scene.iteration) return null
        return this.lastGetBlockedAngle
    }
    onGetBlocked(obj, details) {
        if(obj === this.owner) return
        this.lastGetBlockedIteration = this.scene.iteration
        this.lastGetBlockedAngle = details.angle
    }
    update() {
        super.update()
        this.sync()
    }
}