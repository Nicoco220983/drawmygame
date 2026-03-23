const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import {
    CATALOG,
    StateProperty, StateBool, StateNumber,
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


const BurronImg = new Img("/static/catalogs/std/v1/2Dside/assets/button.png")
const ButtonSpriteSheetImg = new Img("/static/catalogs/std/v1/2Dside/assets/button_spritesheet.png")
const ButtonSpriteSheet = new SpriteSheet(ButtonSpriteSheetImg, 2, 1)

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Button",
    icon: BurronImg,
})
@Dependencies.add(ButtonSpriteSheetImg)
@Category.append("engine/trigger")
@StateNumber.define("pushAge", { default: null, nullableWith: null })
@StateNumber.define("duration", { default: Infinity, precision: .1, nullableWith: Infinity, showInBuilder: true })
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
        this.team = 0
    }

    onGetAttacked(attacker, damage) {
        this.pushed = !this.pushed
        if (this.pushed && this.duration != Infinity) this.pushAge = 0
        else this.pushAge = null
    }

    update() {
        super.update()
        if (this.pushAge !== null) {
            this.pushAge += 1
            if (this.pushAge > (this.duration * this.game.fps)) {
                this.pushAge = null
                this.pushed = false
            }
        }
        this.triggerValue = this.pushed ? 1 : 0
    }

    syncGraphics() {
        const img = ButtonSpriteSheet.getImg(this.pushed ? 1 : 0)
        this.setSprite(img)
        super.syncGraphics()
    }
}


const ClockImg = new Img("/static/catalogs/std/v1/2Dside/assets/triggers/clock.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Clock",
    icon: ClockImg,
    showInBuilder: true,
})
@Dependencies.add(ClockImg)
@StateNumber.define("iteration")
@StateNumber.define("triggered_period", { default: 1, precision: .1, showInBuilder: true })
@StateNumber.define("untriggered_period", { default: 1, precision: .1, showInBuilder: true })
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

    syncGraphics() {
        if (this.game.isBuilder) {
            this.setSprite(ClockImg)
        }
        super.syncGraphics()
    }
}


const WatcherImg = new Img("/static/catalogs/std/v1/2Dside/assets/triggers/watcher.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Watcher",
    icon: WatcherImg,
    showInBuilder: true,
})
@Dependencies.add(WatcherImg)
@StateBool.define("watchHeros", { default: true, showInBuilder: true })
@StateNumber.define("watchDistance", { default: 100, precision: 50, showInBuilder: true })
export class Viewer extends Trigger {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
    }

    update() {
        super.update()
        this.triggerValue = 0
        if (this.watchHeros) {
            for (let hero of this.scene.filterObjects("heros", obj => obj.constructor.IS_HERO)) {
                if (hypot(this.x - hero.x, this.y - hero.y) <= this.watchDistance) {
                    this.triggerValue = 1
                }
            }
        }
    }

    syncGraphics() {
        if (this.game.isBuilder) {
            this.setSprite(WatcherImg)
        }
        super.syncGraphics()
    }
}


const InvertTriggerImg = new Img("/static/catalogs/std/v1/2Dside/assets/triggers/invert_trigger.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Invert (NOT)",
    icon: InvertTriggerImg,
    showInBuilder: true,
})
@Dependencies.add(InvertTriggerImg)
@LinkReaction.add("reactInvert", { label: "Invert", isDefault: true })
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

    syncGraphics() {
        if (this.game.isBuilder) {
            this.setSprite(InvertTriggerImg)
        }
        super.syncGraphics()
    }
}


@LinkReaction.add("reactAggregate", { label: "aggregate", isDefault: true })
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
        if (reactKey == "reactAggregate") {
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


const MinTriggerImg = new Img("/static/catalogs/std/v1/2Dside/assets/triggers/min_trigger.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Min (AND)",
    icon: MinTriggerImg,
    showInBuilder: true,
})
@Dependencies.add(MinTriggerImg)
export class MinTrigger extends AggregatorTrigger {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
    }

    aggregate(vals) {
        return min(...vals)
    }

    syncGraphics() {
        if (this.game.isBuilder) {
            this.setSprite(MinTriggerImg)
        }
        super.syncGraphics()
    }
}


const MaxTriggerImg = new Img("/static/catalogs/std/v1/2Dside/assets/triggers/max_trigger.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Max (OR)",
    icon: MaxTriggerImg,
    showInBuilder: true,
})
@Dependencies.add(MaxTriggerImg)
export class MaxTrigger extends AggregatorTrigger {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
    }

    aggregate(vals) {
        return max(...vals)
    }

    syncGraphics() {
        if (this.game.isBuilder) {
            this.setSprite(MaxTriggerImg)
        }
        super.syncGraphics()
    }
}


const XorTriggerImg = new Img("/static/catalogs/std/v1/2Dside/assets/triggers/xor_trigger.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Xor",
    icon: XorTriggerImg,
    showInBuilder: true,
})
@Dependencies.add(XorTriggerImg)
export class XorTrigger extends AggregatorTrigger {

    init(kwargs) {
        super.init(kwargs)
        this.width = this.height = 30
    }

    aggregate(vals) {
        let aggVal = 0
        for (let val of vals) aggVal = abs(aggVal - val)
        return aggVal
    }

    syncGraphics() {
        if (this.game.isBuilder) {
            this.setSprite(XorTriggerImg)
        }
        super.syncGraphics()
    }
}



const DelayTriggerImg = new Img("/static/catalogs/std/v1/2Dside/assets/triggers/delay_trigger.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Delay",
    icon: DelayTriggerImg,
    showInBuilder: true,
})
@Dependencies.add(DelayTriggerImg)
@LinkReaction.add("reactDelay", { label: "delay", isDefault: true })
@StateProperty.define()
@StateNumber.define("delay", { default: 0, precision: .1, showInBuilder: true })
@StateNumber.define("preserve", { default: 0, precision: .1, nullableWith: Infinity, showInBuilder: true })
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
        const prevValue = histLen > 0 ? history[histLen - 1].value : null
        if (value != prevValue) {
            history.push({
                value,
                firstIteration: iteration,
                lastIteration: iteration,
            })
        } else {
            history[histLen - 1].lastIteration = iteration
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
        for (let idx in history) {
            const { value: histVal, firstIteration: histFirstIt, lastIteration: histLastIt } = history[idx]
            if (histLastIt + delayIt + preserveIt < iteration) {
                idxToClean = idx
                continue
            }
            if (histFirstIt + delayIt > iteration) break
            value = max(value, histVal)
        }
        if (idxToClean > -1) history.splice(0, idxToClean + 1)
        this.triggerValue = value
    }

    syncGraphics() {
        if (this.game.isBuilder) {
            this.setSprite(DelayTriggerImg)
        }
        super.syncGraphics()
    }
}