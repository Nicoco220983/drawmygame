const { getPrototypeOf } = Object
import { round, newDomEl, addNewDomEl } from './utils.mjs'


/**
 * Represents a state property.
 */
export class StateProperty {
    static DEFAULT_STATE_VALUE = null

    /**
     * Defines a state property.
     * @param {string} key The key of the property.
     * @param {object} kwargs The properties of the property.
     * @returns {function(object):object} The decorator.
     */
    static define(key, kwargs) {
        return target => {
            if(target.IS_MIXIN) {
                target.addTargetDecorator(this, "define", key, kwargs)
                return target
            }
            const prop = new this(key, kwargs)
            prop.initObjectClass(target)
            return target
        }
    }

    /**
     * Undefines a state property.
     * @param {string} key The key of the property.
     * @returns {function(object):object} The decorator.
     */
    static undefine(key) {
        return target => {
            if(target.IS_MIXIN) {
                target.addTargetDecorator(this, "undefine", key)
                return target
            }
            if(!target.STATE_PROPS || !target.STATE_PROPS.has(key)) throw Error(`StateProperty "${key}" does not exist in ${target.name}`)
            if(!target.hasOwnProperty('STATE_PROPS')) target.STATE_PROPS = new Map(target.STATE_PROPS)
            target.STATE_PROPS.delete(key)
            return target
        }
    }

    /**
     * Modifies a state property.
     * @param {string} key The key of the property.
     * @param {object} kwargs The properties to modify.
     * @returns {function(object):object} The decorator.
     */
    static modify(key, kwargs) {
        return target => {
            if(target.IS_MIXIN) {
                target.addTargetDecorator(this, "modify", key, kwargs)
                return target
            }
            if(!target.STATE_PROPS || !target.STATE_PROPS.has(key)) throw Error(`StateProperty "${key}" does not exist in ${target.name}`)
            const parentProp = target.STATE_PROPS.get(key)
            const prop = new this(key, {
                ...parentProp.initKwargs,
                ...kwargs,
            })
            prop.initObjectClass(target)
            return target
        }
    }

    constructor(key, kwargs) {
        this.key = key
        this.initKwargs = kwargs
        this.defaultStateValue = this.constructor.DEFAULT_STATE_VALUE
        if(kwargs?.default !== undefined) this.defaultStateValue = kwargs?.default
        if(kwargs?.nullableWith !== undefined) this.nullableWith = kwargs.nullableWith
        this.showInBuilder = kwargs?.showInBuilder ?? false
    }
    initObjectClass(cls) {
        if(!cls.hasOwnProperty('STATE_PROPS')) cls.STATE_PROPS = new Map(cls.STATE_PROPS)
        cls.STATE_PROPS.set(this.key, this)
        this.initObjectClassProp(cls)
    }
    initObjectClassProp(cls) {
        this.setObjectPropFromState(cls.prototype, this.defaultStateValue)
    }
    initObject(obj, kwargs) {}
    // state
    getObjectPropState(obj) {
        const val = obj[this.key]
        if(val === (this.nullableWith ?? null)) return null
        else return val
    }
    setObjectPropFromState(obj, valState) {
        const { key } = this
        if(valState === undefined) return delete obj[key]
        if(valState === null) return obj[key] = this.nullableWith ?? null
        obj[key] = valState
    }
    syncStateFromObject(obj, state) {
        const { key } = this
        if(!obj.hasOwnProperty(key)) return
        let val = obj[key], protoVal = getPrototypeOf(obj)[key]
        if(val === undefined || val === protoVal) return
        const valState = this.getObjectPropState(obj)
        if(valState === undefined) return
        state[key] = valState
    }
    syncObjectFromState(state, obj) {
        this.setObjectPropFromState(obj, state[this.key])
    }
    // inputs
    createObjectInput(obj) {
        const val = this.getObjectPropState(obj)
        const wrapperEl = newDomEl("div", {
            style: {
                display: "flex",
                flexDirection: "row",
                gap: ".5em",
            }
        })
        addNewDomEl(wrapperEl, "span", {
            text: this.key
        })
        let nullEl = null, nullTxtEl = null
        if(this.nullableWith !== undefined) {
            nullEl = addNewDomEl(wrapperEl, "input", {
                type: "checkbox",
            })
            if(val === null) nullEl.checked = true
            nullTxtEl = addNewDomEl(wrapperEl, "div", {
                text: this.nullableWith,
            })
            nullEl.addEventListener("change", () => {
                syncEls()
                if(nullEl.checked) this.setObjectPropFromState(obj, null)
                else this.syncObjectFromInput(valEl, obj)
            })
        }
        const valEl = this.createObjectBaseInput(obj)
        wrapperEl.appendChild(valEl)
        valEl.addEventListener("change", () => syncEls())
        const syncEls = () => {
            valEl.style.display = nullEl?.checked ? "none" : "block"
            if(nullTxtEl) nullTxtEl.style.display = nullEl?.checked ? "block" : "none"
        }
        syncEls()
        return wrapperEl
    }
    // TODO: remove it for generic StateProperty
    createObjectBaseInput(obj) {
        const val = this.getObjectPropState(obj)
        const inputEl = newDomEl("input", {
            type: "text",
            value: (typeof val === "string") ? val : ""
        })
        inputEl.addEventListener("change", () => this.syncObjectFromInput(inputEl, obj))
        return inputEl
    }
    syncObjectFromInput(inputEl, obj) {
        let val = inputEl.value
        this.setObjectPropFromState(obj, (val == "") ? this.defaultStateValue : val)
    }
}

export class StateBool extends StateProperty {
    static DEFAULT_STATE_VALUE = false

    createObjectBaseInput(obj) {
        const val = this.getObjectPropState(obj)
        const inputEl = newDomEl("input", {
            type: "checkbox",
            checked: Boolean(val),
        })
        inputEl.addEventListener("change", () => this.syncObjectFromInput(inputEl, obj))
        return inputEl
    }
    syncObjectFromInput(inputEl, obj) {
        this.setObjectPropFromState(obj, inputEl.checked)
    }
}

export class StateNumber extends StateProperty {
    static DEFAULT_STATE_VALUE = 0

    constructor(key, kwargs) {
        super(key, kwargs)
        this.precision = kwargs?.precision ?? 1
        this.min = kwargs?.min ?? 0
        this.max = kwargs?.max ?? null
        const kwargsDefault = kwargs?.default
        if(typeof kwargsDefault == 'number') this.defaultStateValue = kwargsDefault / this.precision
    }
    getObjectPropState(obj) {
        const val = obj[this.key]
        if(val === (this.nullableWith ?? null)) return null
        else return round(val / this.precision)
    }
    setObjectPropFromState(obj, valState) {
        const { key } = this
        if(valState === undefined) return delete obj[key]
        if(valState === null) return obj[key] = this.nullableWith ?? null
        obj[key] = valState * this.precision
    }
    createObjectBaseInput(obj) {
        const val = this.getObjectPropState(obj)
        const inputEl = newDomEl("input", {
            type: "number",
            value: (typeof val === "number") ? (val * this.precision) : ""
        })
        inputEl.setAttribute("min", this.min)
        if(this.max !== null) inputEl.setAttribute("max", this.max)
        inputEl.setAttribute("step", this.precision)
        inputEl.addEventListener("change", () => this.syncObjectFromInput(inputEl, obj))
        return inputEl
    }
    syncObjectFromInput(inputEl, obj) {
        let val = inputEl.value
        val = (val == "") ? this.defaultStateValue : parseFloat(val)
        val = round(val / this.precision)
        this.setObjectPropFromState(obj, val)
    }
}

export class StateEnum extends StateProperty {
    constructor(key, kwargs) {
        super(key, kwargs)
        this.options = kwargs.options
    }
    createObjectBaseInput(obj) {
        const { options } = this
        const val = this.getObjectPropState(obj)
        const inputEl = newDomEl("select")
        for(let optVal in options) {
            addNewDomEl(inputEl, "option", {
                value: optVal,
                text: options[optVal],
            })
        }
        inputEl.value = val
        inputEl.addEventListener("change", () => this.syncObjectFromInput(inputEl, obj))
        return inputEl
    }
}

export class StateIntEnum extends StateEnum {
    static DEFAULT_STATE_VALUE = 0

    syncObjectFromInput(inputEl, obj) {
        let val = inputEl.value
        this.setObjectPropFromState(obj, (val == "") ? this.defaultStateValue : parseInt(val))
    }
}


export class StateString extends StateProperty {
    static DEFAULT_STATE_VALUE = ""

    createObjectBaseInput(obj) {
        const val = this.getObjectPropState(obj)
        const inputEl = newDomEl("input", {
            type: "text",
            value: (typeof val === "string") ? val : ""
        })
        inputEl.addEventListener("change", () => this.syncObjectFromInput(inputEl, obj))
        return inputEl
    }

    syncObjectFromInput(inputEl, obj) {
        let val = inputEl.value
        this.setObjectPropFromState(obj, (val == "") ? this.defaultStateValue : val)
    }
}


export class StateObjectRef extends StateProperty {
    initObjectClassProp(cls) {
        cls.prototype[this.key] = this.nullableWith ?? null
    }
    getObjectPropState(obj) {
        const val = obj[this.key]
        if(val === (this.nullableWith ?? null)) return null
        return val.id
    }
    setObjectPropFromState(obj, valState) {
        const { key } = this
        if(!valState) obj[key] = this.nullableWith ?? null
        else obj[key] = obj.scene.objects.get(valState)
    }
}