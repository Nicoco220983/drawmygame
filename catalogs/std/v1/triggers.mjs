const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import * as utils from '../../../core/v1/utils.mjs'
const { checkHit, urlAbsPath, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, importJs, cachedTransform } = utils
import { ModuleCatalog, GameObject, Category, StateProperty, StateBool, StateInt, LinkTrigger, LinkReaction, BodyMixin, PhysicsMixin, AttackMixin, SpriteSheet, ObjectRefs, Hero, Enemy, Extra, Weapon, Projectile,ActivableMixin, CollectMixin, OwnerableMixin } from '../../../core/v1/game.mjs'


export const CATALOG = new ModuleCatalog("std")


@LinkTrigger.add("isTriggered", { isDefault: true })
export class Trigger extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.triggerValue = 0
    }

    isTriggered() {
        return this.triggerValue
    }
}


const BurronImg = CATALOG.registerImage("/static/core/v1/assets/button.png")
const ButtonSpriteSheet = new SpriteSheet(CATALOG.registerImage("/static/core/v1/assets/button_spritesheet.png"), 2, 1)

@CATALOG.registerObject("button", {
    label: "Button",
    icon: BurronImg,
})
@Category.append("engine/trigger")
@StateInt.define("pushAge", { default: null, nullableWith: null })
@StateInt.define("duration", { default: Infinity, nullableWith: Infinity, showInBuilder: true })
@StateBool.define("pushed", { showInBuilder: true })
@AttackMixin.add({
    canAttack: false,
    canGetAttacked: true,
    maxHealth: Infinity,
})
@BodyMixin.add({
    width: 30,
    height: 30,
})
export class Button extends Trigger {

    init(kwargs) {
        super.init(kwargs)
        this.team = "engine"
    }

    onGetAttacked(attacker, damage) {
        this.pushed = !this.pushed
        if(this.pushed && this.duration != Infinity) this.pushAge = 0
        else this.pushAge = null
    }

    update() {
        super.update()
        if(this.pushAge !== null) {
            this.pushAge += 1
            if(this.pushAge > (this.duration * this.game.fps)) {
                this.pushAge = null
                this.pushed = false
            }
        }
        this.triggerValue = this.pushed ? 1 : 0
    }

    getBaseImg() {
        return ButtonSpriteSheet.get(this.pushed ? 1 : 0)
    }
}


const ClockImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/triggers/clock.png")

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
        this.triggerValue = it > (untriggered_period * fps) ? 1 : 0
        this.iteration += 1
    }

    getBaseImg() {
        return ClockImg
    }
}


const WatcherImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/triggers/watcher.png")

@CATALOG.registerObject("watcher", {
    label: "Watcher",
    icon: WatcherImg,
    showInBuilder: true,
})
@StateBool.define("watchHeros", { default: true, showInBuilder: true })
@StateInt.define("watchDistance", { default: 100, showInBuilder: true })
export class Viewer extends Trigger {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
    }

    update() {
        super.update()
        this.triggerValue = 0
        if(this.watchHeros) {
            for(let hero of this.scene.filterObjects("heros", obj => obj instanceof Hero)) {
                if(hypot(this.x-hero.x, this.y-hero.y) <= this.watchDistance) {
                    this.triggerValue = 1
                }
            }
        }
    }

    getBaseImg() {
        return WatcherImg
    }
}


const InvertTriggerImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/triggers/invert_trigger.png")

@CATALOG.registerObject("invert", {
    label: "Invert (NOT)",
    icon: InvertTriggerImg,
    showInBuilder: true,
})
@LinkReaction.add("reactInvert", { label:"Invert", isDefault: true })
export class InverterTrigger extends Trigger {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
        this.lastMsg = { value: 0 }
    }

    reactInvert(msg) {
        this.lastMsg.value = msg.value
    }

    update() {
        super.update()
        this.triggerValue = 1 - this.lastMsg.value
    }

    getBaseImg() {
        return InvertTriggerImg
    }
}


@LinkReaction.add("reactAggregate", { label:"aggregate", isDefault: true })
export class AggregatorTrigger extends Trigger {

    init(kwargs) {
        super.init(kwargs)
        this.triggerValues = {}
    }

    getInitValue() {
        return 0
    }

    aggregate(vals) {
        // to be defined in child class
    }

    addObjectLink(trigObj, trigKey, reactKey, threshold) {
        super.addObjectLink(trigObj, trigKey, reactKey, threshold)
        const trigVals = this.triggerValues
        if(reactKey == "reactAggregate") {
            trigVals[trigObj.id] = this.getInitValue()
        }
    }

    reactAggregate(msg) {
        this.triggerValues[msg.triggerObject.id] = msg.value
    }

    update() {
        super.update()
        this.updateTriggered()
    }

    updateTriggered() {
        this.triggerValue = this.aggregate(Object.values(this.triggerValues))
    }
}


const MinTriggerImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/triggers/min_trigger.png")

@CATALOG.registerObject("min", {
    label: "Min (AND)",
    icon: MinTriggerImg,
    showInBuilder: true,
})
export class MinTrigger extends AggregatorTrigger {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
    }

    aggregate(vals) {
        return min(...vals)
    }

    getBaseImg() {
        return MinTriggerImg
    }
}


const MaxTriggerImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/triggers/max_trigger.png")

@CATALOG.registerObject("max", {
    label: "Max (OR)",
    icon: MaxTriggerImg,
    showInBuilder: true,
})
export class MaxTrigger extends AggregatorTrigger {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
    }

    aggregate(vals) {
        return max(...vals)
    }

    getBaseImg() {
        return MaxTriggerImg
    }
}


const XorTriggerImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/triggers/xor_trigger.png")

@CATALOG.registerObject("xor", {
    label: "Xor",
    icon: XorTriggerImg,
    showInBuilder: true,
})
export class XorTrigger extends AggregatorTrigger {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
    }

    aggregate(vals) {
        let aggVal = 0
        for(let val of vals) aggVal = abs(aggVal - val)
        return aggVal
    }

    getBaseImg() {
        return XorTriggerImg
    }
}



const DelayTriggerImg = CATALOG.registerImage("/static/catalogs/std/v1/assets/triggers/delay_trigger.png")

@CATALOG.registerObject("delay", {
    label: "Delay",
    icon: DelayTriggerImg,
    showInBuilder: true,
})
@LinkReaction.add("reactDelay", { label:"delay", isDefault: true })
@StateProperty.define()
@StateInt.define("delay", { default: 0, showInBuilder: true })
@StateInt.define("preserve", { default: 0, nullableWith: Infinity, showInBuilder: true })
export class DelayTrigger extends Trigger {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
        this.history = []
    }

    reactDelay(msg) {
        const { history } = this, histLen = history.length
        const { value } = msg
        const { iteration } = this.scene
        const prevValue = histLen > 0 ? history[histLen-1].value : null
        if(value != prevValue) {
            history.push({
                value,
                firstIteration: iteration,
                lastIteration: iteration,
            })
        } else {
            history[histLen-1].lastIteration = iteration
        }
    }

    update() {
        super.update()
        this.updateTriggered()
    }

    updateTriggered() {
        const { delay, preserve, history } = this
        const { iteration } = this.scene
        const { fps } = this.game
        const delayIt = delay * fps, preserveIt = preserve * fps
        let idxToClean = -1, value = 0
        for(let idx in history) {
            const { value: histVal, firstIteration: histFirstIt, lastIteration: histLastIt } = history[idx]
            if(histLastIt + delayIt + preserveIt < iteration) {
                idxToClean = idx
                continue
            }
            if(histFirstIt + delayIt > iteration) break
            value = max(value, histVal)
        }
        if(idxToClean > -1) history.splice(0, idxToClean+1)
        this.triggerValue = value
    }

    getBaseImg() {
        return DelayTriggerImg
    }
}