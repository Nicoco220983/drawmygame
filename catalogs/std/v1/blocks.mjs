const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import { ModuleCatalog, GameObject, Category, StateProperty, StateBool, StateInt, LinkTrigger, LinkReaction, BodyMixin, PhysicsMixin, AttackMixin, SpriteSheet, ObjectRefs, Hero, Enemy, Extra, ActivableMixin, CollectMixin, OwnerableMixin } from '../../../core/v1/game.mjs'


export const CATALOG = new ModuleCatalog("std")


@Category.append("block")
@PhysicsMixin.add({
    canMove: false,
    canBlock: true,
})
export class Block extends GameObject {
    static STATEFUL = false
    static STICK_TO_GRID = true

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = floor(this.scene.gridSize *.9)
    }

    getGraphicsProps() {
        const props = super.getGraphicsProps()
        props.width = this.width * 1.1
        props.height = this.height * 1.1
        return props
    }
}



const GrassImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/blocks/grass.png")

@CATALOG.registerObject("grass", {
    label: "Grass",
    icon: GrassImg,
})
export class GrassBlock extends Block {
    getBaseImg() {
        return GrassImg
    }
}



const PlatformImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/blocks/platform.png")

@CATALOG.registerObject("platform", {
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


const DoorImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/blocks/door.png")
const DoorSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/catalogs/std/v1/assets/blocks/door_spritesheet.png"), 2, 1)

@CATALOG.registerObject("door", {
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

    onBlock(obj) {
        this.lastBlockIt = this.scene.iteration
    }

    getBaseImg() {
        return DoorSpriteSheet.get(this.closed ? 0 : 1)
    }
}


const CloudImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/blocks/cloud.png")

@CATALOG.registerObject("cloud", {
    label: "Cloud",
    icon: CloudImg,
    showInBuilder: true,
})
@StateInt.define("blockAge", { default: null, nullableWith: null })
@StateInt.define("timeToDisappear", { default: 2, showInBuilder: true })
@StateInt.define("timeToReappear", { default: 2, nullableWith: Infinity, showInBuilder: true })
export class Cloud extends Block {

    init(kwargs) {
        super.init(kwargs)
        this.checkBlockAnyway = true
        this.step = 0
        this.lastBlockIt = -Infinity
    }

    onBlock(obj) {
        super.onBlock(obj)
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
}