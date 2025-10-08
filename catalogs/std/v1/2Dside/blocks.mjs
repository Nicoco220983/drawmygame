const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import { ModuleCatalog, GameObject, Category, StateProperty, StateBool, StateNumber, StateEnum, LinkTrigger, LinkReaction, BodyMixin, PhysicsMixin, AttackMixin, SpriteSheet, ObjectRefs, ActivableMixin, CollectMixin, OwnerableMixin } from '../../../../core/v1/game.mjs'

export const CATALOG = new ModuleCatalog(import.meta.url, {
    version: "v1",
    perspective: "2Dside",
})


@Category.append("block")
@PhysicsMixin.add({
    canMove: false,
    canBlock: true,
})
export class Block extends GameObject {
    static STATEFUL = false
    static STUCK_TO_GRID = true

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = floor(this.scene.gridSize)
    }

    getGraphicsProps() {
        const props = super.getGraphicsProps()
        props.width = this.width
        props.height = this.height
        return props
    }
}



const GrassImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/blocks/grass.png")

@CATALOG.registerObject({
    label: "Grass",
    icon: GrassImg,
})
export class GrassBlock extends Block {
    getBaseImg() {
        return GrassImg
    }
}



const PlatformImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/blocks/platform.png")

@CATALOG.registerObject({
    label: "Platform",
    icon: PlatformImg,
})
export class PlatformBlock extends Block {

    getHitProps(dt) {
        const props = super.getHitProps(dt)
        props.uniDirX = 0
        props.uniDirY = -1
        return props
    }

    getBodyPolygon() {
        const pol = this._bodyPolygons ||= []
        pol.length = 0
        const { x, y, width, height } = this
        const hWidth = width/2, hHeight = height/2
        const xMin = x-hWidth, yMin = y-hHeight, xMax = x+hWidth
        pol.push(
            xMin, yMin,
            xMax, yMin,
        )
        return pol
    }
    
    getBaseImg() {
        return PlatformImg
    }
}


const DoorImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/blocks/door.png")
const DoorSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/blocks/door_spritesheet.png"), 2, 1)

@CATALOG.registerObject({
    label: "Door",
    icon: DoorImg,
    showInBuilder: true,
})
@LinkReaction.add("reactToggle", { label:"toggle", isDefault: true })
@StateBool.define("closed", { default: true, showInBuilder: true })
@Category.append("engine")
export class Door extends Block {

    init(kwargs) {
        super.init(kwargs)
        this.checkBlockAnyway = true
        this.origClosed = this.closed
        this.lastBlockIt = -Infinity
    }

    reactToggle(resp) {
        const shouldBeClosed = (resp.value >= .5) ? (!this.origClosed) : this.origClosed
        this.closed = shouldBeClosed && (this.closed || this.lastBlockIt < this.scene.iteration)
    }

    update() {
        super.update()
        this.canBlock = this.closed
    }

    onBlock(obj, details) {
        super.onBlock(obj, details)
        this.lastBlockIt = this.scene.iteration
    }

    getBaseImg() {
        return DoorSpriteSheet.get(this.closed ? 0 : 1)
    }
}


const CloudImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/blocks/cloud.png")

@CATALOG.registerObject({
    label: "Cloud",
    icon: CloudImg,
    showInBuilder: true,
})
@StateNumber.define("blockAge", { default: null, nullableWith: null })
@StateNumber.define("timeToDisappear", { default: 1, precision: .5, showInBuilder: true })
@StateNumber.define("timeToReappear", { default: 3, precision: .5, nullableWith: Infinity, showInBuilder: true })
export class Cloud extends Block {

    init(kwargs) {
        super.init(kwargs)
        this.step = 0
        this.lastBlockIt = -Infinity
        this.checker = this.scene.addObject(CloudChecker, { owner: this })
    }

    onBlock(obj, details) {
        super.onBlock(obj, details)
        if(this.blockAge === null) this.blockAge = 0
        this.lastBlockIt = this.scene.iteration
    }

    update() {
        const { blockAge, timeToDisappear, timeToReappear } = this
        const { fps } = this.game
        if(blockAge === null) this.step = 0
        else if(blockAge < (timeToDisappear * fps)) this.step = 1
        else if(blockAge < ((timeToDisappear + timeToReappear) * fps)) {
            this.step = 2
        } else if(this.lastBlockIt < this.scene.iteration) {
            this.step = 0
            this.blockAge = null
        }
        this.canBlock = (this.step < 2)
        if(this.blockAge !== null) this.blockAge += 1
    }

    getGraphicsProps() {
        const { step } = this
        const props = super.getGraphicsProps()
        if(step == 0) props.visibility = 1
        else if(step == 1) props.visibility = .75
        else props.visibility = .5
        return props
    }

    getBaseImg() {
        return CloudImg
    }

    remove() {
        super.remove()
        this.checker.remove()
    }
}

@PhysicsMixin.add({
    canMove: false,
    checkBlockAnyway: true,
})
class CloudChecker extends GameObject {
    static STATEFUL = false

    init(kwargs) {
        super.init(kwargs)
        this.owner = kwargs.owner
        this.x = this.owner.x
        this.y = this.owner.y
        this.width = this.owner.width + 2
        this.height = this.owner.height + 2
    }

    onBlock(obj, details) {
        this.owner.onBlock(obj, details)
    }
}


const DetectAud = CATALOG.registerAudio("/static/catalogs/std/v1/2Dside/assets/detect.wav")



@AttackMixin.add()
@LinkReaction.add("reactTrigger", { label:"trigger", isDefault: true })
@StateNumber.define("lastDetectAge", { default: Infinity, nulableWith: Infinity })
@StateNumber.define("duration", { default: 2, precision:.1, showInBuilder: true })
@StateNumber.define("countdown", { default: .5, precision:.1, showInBuilder: true })
@StateEnum.define("dir", { default: "right", options: { "up": "Up", "down": "Down", "left": "Left", "right": "Right"}, showInBuilder: true })
export class Trap extends Block {

    init(kwargs) {
        super.init(kwargs)
        this.canBlock = false
        this.checkBlockAnyway = true
        this.team = "engine"
        this.oneAttackByObject = true
    }

    getAngle() {
        const { dir } = this
        if(dir == "right") return 0
        if(dir == "down") return 90
        if(dir == "left") return 180
        if(dir == "up") return 270
    }

    onBlock(obj, details) {
        super.onBlock(obj, details)
        if(this.lastDetectAge == Infinity) {
            this.lastDetectAge = 0
            this.game.audio.playSound(DetectAud)
        }
    }

    update() {
        const { countdown, duration } = this
        const { fps } = this.game
        super.update()
        this.canAttack = this.lastDetectAge > countdown * fps && this.lastDetectAge < (countdown + duration) * fps
        this.lastDetectAge += 1
        if(this.lastDetectAge > (countdown + duration) * fps) this.lastDetectAge = Infinity
        if(this.lastDetectAge == Infinity) this.resetOneAttackByObject()
    }

    getAttackProps(obj) {
        const props = AttackMixin.prototype.objGetAttackProps.call(this, obj)
        props.knockbackAngle = this.getAngle()
        return props
    }

    reactTrigger(msg) {
        if(msg.value >= .5 && this.lastDetectAge == Infinity) this.lastDetectAge = this.countdown * this.game.fps
    }

    getGraphicsProps() {
        const props = super.getGraphicsProps()
        props.angle = this.getAngle()
        props.visibility = this.canAttack ? 1 : 0
        return props
    }
}


const BoxingGloveImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/boxing_glove.png")

@CATALOG.registerObject({
    label: "Boxing Trap",
    icon: BoxingGloveImg,
    showInBuilder: true,
})
export class BoxingTrap extends Trap {

    init(kwargs) {
        super.init(kwargs)
        this.attackDamages = 0
        this.attackKnockback = 1000
    }

    getBaseImg() {
        return BoxingGloveImg
    }
}


const BouncingBlockImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/blocks/bouncing_block.png")

@CATALOG.registerObject({
    label: "Bouncing Block",
    icon: BouncingBlockImg,
    showInBuilder: true,
})
export class BouncingBlock extends Block {

    init(kwargs) {
        super.init(kwargs)
        this.bouncingFactor = 1
    }

    getBaseImg() {
        return BouncingBlockImg
    }
}