const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import {
    sign, cachedTransform, cloneCanvas, colorizeCanvas,
    CATALOG,
    StateProperty, StateBool, StateNumber, StateString, StateEnum,
    Dependencies, GameObject, Category, LinkTrigger, LinkReaction, Img, SpriteSheet, Aud, ObjectRefs,
} from '../../../../core/v1/index.mjs'
import {
    ActivableMixin, CollectMixin, OwnerableMixin, BodyMixin, PhysicsMixin, AttackMixin, 
} from '../mixins.mjs'


const REGISTER_COMMON_ARGS = {
    url: import.meta.url,
    version: "v1",
    perspective: "2Dside",
}


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

@Category.append("background")
@Category.append("block")
export class BackgroundBlock extends GameObject {
    static STATEFUL = false
    static STUCK_TO_GRID = true

    init(kwargs) {
        super.init(kwargs)
        this.z = -1
        this.width = this.height = floor(this.scene.gridSize)
    }

    getGraphicsProps() {
        const props = super.getGraphicsProps()
        props.width = this.width
        props.height = this.height
        return props
    }
}



const DirtImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/dirt.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Dirt",
    icon: DirtImg,
})
@Dependencies.add(DirtImg)
@StateString.define("color", { showInBuilder: true })
export class DirtBlock extends Block {
    getBaseImg() {
        let img = DirtImg
        if (this.color) {
            img = cachedTransform(img, this.color, () => {
                return colorizeCanvas(cloneCanvas(img), this.color, "#6f911b")
            })
        }
        return img
    }
}



const StoneImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/stone.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Stone",
    icon: StoneImg,
})
@Dependencies.add(StoneImg)
@StateString.define("color", { showInBuilder: true })
export class StoneBlock extends Block {
    getBaseImg() {
        let img = StoneImg
        if (this.color) {
            img = cachedTransform(img, this.color, () => {
                return colorizeCanvas(cloneCanvas(img), this.color, "#877d71")
            })
        }
        return img
    }
}


const BackgroundStoneImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/background_stone.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Background Stone",
    icon: BackgroundStoneImg,
})
@Dependencies.add(BackgroundStoneImg)
@StateString.define("color", { showInBuilder: true })
export class BackgroundStoneBlock extends BackgroundBlock {
    getBaseImg() {
        let img = BackgroundStoneImg
        if (this.color) {
            img = cachedTransform(img, this.color, () => {
                return colorizeCanvas(cloneCanvas(img), this.color, "#877d71")
            })
        }
        return img
    }
}



const BricksImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/bricks.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Bricks",
    icon: BricksImg,
})
@Dependencies.add(BricksImg)
@StateString.define("color", { showInBuilder: true })
export class BricksBlock extends Block {
    getBaseImg() {
        let img = BricksImg
        if (this.color) {
            img = cachedTransform(img, this.color, () => {
                return colorizeCanvas(cloneCanvas(img), this.color, "#b6a88e")
            })
        }
        return img
    }
}



const BackgroundBricksImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/background_bricks.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Background Bricks",
    icon: BackgroundBricksImg,
})
@Dependencies.add(BackgroundBricksImg)
@StateString.define("color", { showInBuilder: true })
export class BackgroundBricksBlock extends BackgroundBlock {
    getBaseImg() {
        let img = BackgroundBricksImg
        if (this.color) {
            img = cachedTransform(img, this.color, () => {
                return colorizeCanvas(cloneCanvas(img), this.color, "#b6a88e")
            })
        }
        return img
    }
}



const WoodImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/wood.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Wood",
    icon: WoodImg,
})
@Dependencies.add(WoodImg)
@StateString.define("color", { showInBuilder: true })
export class WoodBlock extends Block {
    getBaseImg() {
        let img = WoodImg
        if (this.color) {
            img = cachedTransform(img, this.color, () => {
                return colorizeCanvas(cloneCanvas(img), this.color, "#9b5f21")
            })
        }
        return img
    }
}



const BackgroundWoodImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/background_wood.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Background Wood",
    icon: BackgroundWoodImg,
})
@Dependencies.add(BackgroundWoodImg)
@StateString.define("color", { showInBuilder: true })
export class BackgroundWoodBlock extends BackgroundBlock {
    getBaseImg() {
        let img = BackgroundWoodImg
        if (this.color) {
            img = cachedTransform(img, this.color, () => {
                return colorizeCanvas(cloneCanvas(img), this.color, "#9b5f21")
            })
        }
        return img
    }
}



const PlatformImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/platform.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Platform",
    icon: PlatformImg,
})
@Dependencies.add(PlatformImg)
@StateString.define("color", { showInBuilder: true })
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
        const hWidth = width / 2, hHeight = height / 2
        const xMin = x - hWidth, yMin = y - hHeight, xMax = x + hWidth
        pol.push(
            xMin, yMin,
            xMax, yMin,
        )
        return pol
    }
    getBaseImg() {
        let img = PlatformImg
        if (this.color) {
            img = cachedTransform(img, this.color, () => {
                return colorizeCanvas(cloneCanvas(img), this.color, "#9b5f21")
            })
        }
        return img
    }
}


const DoorImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/door.png")
const DoorSpriteSheetImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/door_spritesheet.png")
const DoorSpriteSheet = new SpriteSheet(DoorSpriteSheetImg, 2, 1)

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Door",
    icon: DoorImg,
    showInBuilder: true,
})
@Dependencies.add(DoorSpriteSheetImg)
@LinkReaction.add("reactToggle", { label: "toggle", isDefault: true })
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


const CloudImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/cloud.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Cloud",
    icon: CloudImg,
    showInBuilder: true,
})
@Dependencies.add(CloudImg)
@StateNumber.define("blockAge", { default: Infinity, nullableWith: Infinity })
@StateNumber.define("timeToDisappear", { default: 1, precision: .5, showInBuilder: true })
@StateNumber.define("timeToReappear", { default: 3, precision: .5, nullableWith: Infinity, showInBuilder: true })
export class Cloud extends Block {

    init(kwargs) {
        super.init(kwargs)
        this.step = 0
        this.lastBlockIt = -Infinity
    }

    onBlock(obj, details) {
        super.onBlock(obj, details)
        if (this.blockAge === Infinity) this.blockAge = 0
        this.lastBlockIt = this.scene.iteration
    }

    update() {
        const { blockAge, timeToDisappear, timeToReappear } = this
        const { fps } = this.game
        this.initBlockChecker()
        if (blockAge === Infinity) this.step = 0
        else if (blockAge < (timeToDisappear * fps)) this.step = 1
        else if (blockAge < ((timeToDisappear + timeToReappear) * fps)) {
            this.step = 2
        } else if (this.lastBlockIt < this.scene.iteration) {
            this.step = 0
            this.blockAge = Infinity
        }
        this.canBlock = (this.step < 2)
        this.blockAge += 1
    }

    initBlockChecker() {
        this._blockChecker ||= this.scene.addObject(CloudBlockChecker, { owner: this })
    }

    getGraphicsProps() {
        const { step } = this
        const props = super.getGraphicsProps()
        if (step == 0) props.visibility = 1
        else if (step == 1) props.visibility = .75
        else props.visibility = .5
        return props
    }

    getBaseImg() {
        return CloudImg
    }
}

@PhysicsMixin.add({
    canMove: false,
    checkBlockAnyway: true,
})
class CloudBlockChecker extends GameObject {

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

    update() {
        super.update()
        if (this.owner.removed) this.remove()
    }
}


const DetectAud = new Aud("/static/catalogs/std/v1/2Dside/assets/detect.wav")



@Dependencies.add(DetectAud)
@AttackMixin.add()
@LinkReaction.add("reactTrigger", { label: "trigger", isDefault: true })
@StateNumber.define("lastDetectAge", { default: Infinity, nulableWith: Infinity })
@StateNumber.define("duration", { default: 2, precision: .1, showInBuilder: true })
@StateNumber.define("countdown", { default: .5, precision: .1, showInBuilder: true })
@StateEnum.define("dir", { default: "right", options: { "up": "Up", "down": "Down", "left": "Left", "right": "Right" }, showInBuilder: true })
export class Trap extends Block {

    init(kwargs) {
        super.init(kwargs)
        this.canBlock = false
        this.checkBlockAnyway = true
        this.team = 0
        this.attackPeriod = this.duration
    }

    getAngle() {
        const { dir } = this
        if (dir == "right") return 0
        if (dir == "down") return 90
        if (dir == "left") return 180
        if (dir == "up") return 270
    }

    onBlock(obj, details) {
        super.onBlock(obj, details)
        if (this.lastDetectAge == Infinity) {
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
        if (this.lastDetectAge > (countdown + duration) * fps) this.lastDetectAge = Infinity
    }

    getAttackProps(obj) {
        const props = AttackMixin.getAttackProps.call(this, obj)
        props.knockbackAngle = this.getAngle()
        return props
    }

    reactTrigger(msg) {
        if (msg.value >= .5 && this.lastDetectAge == Infinity) this.lastDetectAge = this.countdown * this.game.fps
    }

    getGraphicsProps() {
        const props = super.getGraphicsProps()
        props.angle = this.getAngle()
        props.visibility = this.canAttack ? 1 : 0
        return props
    }
}


const BoxingGloveImg = new Img("/static/catalogs/std/v1/2Dside/assets/boxing_glove.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Boxing Trap",
    icon: BoxingGloveImg,
    showInBuilder: true,
})
@Dependencies.add(BoxingGloveImg)
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


const BouncingBlockImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/bouncing_block.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Bouncing Block",
    icon: BouncingBlockImg,
    showInBuilder: true,
})
@Dependencies.add(BouncingBlockImg)
export class BouncingBlock extends Block {

    init(kwargs) {
        super.init(kwargs)
        this.physicsBounciness = 1
    }

    getBaseImg() {
        return BouncingBlockImg
    }
}


const IceBlockImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/ice.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Ice Block",
    icon: IceBlockImg,
    showInBuilder: true,
})
@Dependencies.add(IceBlockImg)
export class IceBlock extends Block {

    init(kwargs) {
        super.init(kwargs)
        this.physicsStaticFriction = 0
        this.physicsDynamicFriction = 0
    }

    getBaseImg() {
        return IceBlockImg
    }
}


const SpiderWebBlockImg = new Img("/static/catalogs/std/v1/2Dside/assets/blocks/spider_web.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Spider Web",
    icon: SpiderWebBlockImg,
    showInBuilder: true,
})
@Dependencies.add(SpiderWebBlockImg)
export class SpiderWebBlock extends Block {

    init(kwargs) {
        super.init(kwargs)
        this.canBlock = false
        this.checkBlockAnyway = true
        this.targetMaxSpeed = 50
    }

    onBlock(obj, details) {
        const { targetMaxSpeed } = this
        super.onBlock(obj, details)
        if(abs(obj.speedX) > targetMaxSpeed) obj.speedX = sign(obj.speedX) * targetMaxSpeed
        if(abs(obj.speedY) > targetMaxSpeed) obj.speedY = sign(obj.speedY) * targetMaxSpeed
    }

    getBaseImg() {
        return SpiderWebBlockImg
    }
}