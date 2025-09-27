const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import { ModuleCatalog, GameObject, Category, StateProperty, StateBool, StateInt, LinkTrigger, LinkReaction, BodyMixin, PhysicsMixin, AttackMixin, SpriteSheet, ObjectRefs, Hero, Enemy, Extra, ActivableMixin, CollectMixin, OwnerableMixin } from '../../core/game.mjs'


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



const GrassImg = CATALOG.registerImage("/static/catalogs/std/assets/blocks/grass.png")

@CATALOG.registerObject("grass", {
    label: "Grass",
    icon: GrassImg,
})
export class GrassBlock extends Block {
    getBaseImg() {
        return GrassImg
    }
}