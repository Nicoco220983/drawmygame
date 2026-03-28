import * as utils from './utils.mjs'
const { newDomEl, addNewDomEl, Debouncer, Img } = utils
import { CATALOG } from './catalog.mjs'

/**
 * Custom element for selecting a game object.
 * @extends {HTMLElement}
 */
class ObjectSelectorElement extends HTMLElement {

    constructor() {
        super()
        this.value = null

        this.attachShadow({ mode: 'open' })

        const styleEl = document.createElement('style')
        styleEl.textContent = `
            cs-option {
                display: flex;
                flex-direction: row;
                width: 150px;
                height: 20px;
                padding: .2em;
                cursor: pointer;
                background: white;
            }
            cs-option:hover {
                background-color: #eee;
            }
        `

        const selectWrapperEl = newDomEl("div", {
            tabindex: "0",
            style: {
                position: "relative",
            }
        })
        this.shadowRoot.append(styleEl, selectWrapperEl)
        this.selectEl = addNewDomEl(selectWrapperEl, "cs-option", {
            contenteditable: true,
            style: {
                border: "1px solid black",
            }
        })
        this.optionsEl = addNewDomEl(selectWrapperEl, "div", {
            style: {
                border: "1px solid black",
                position: "absolute",
                top: "100%",
                left: "0",
                display: "none",
                zIndex: 99,
            }
        })
        this.selectEl.addEventListener("focus", async () => {
            this.selectEl.innerHTML = "\u200B"  // hack for cursor placement
        })
        this.selectEl.oninput = () => {
            this.setOptionsVisibility(this.selectEl.textContent.replace(/\u200B/g, ''))
        }
        selectWrapperEl.addEventListener("focusout", evt => {
            if(selectWrapperEl.contains(evt.relatedTarget)) return
            this.setOptionsVisibility(false)
            if(this.value) this.setOptionKey(this.selectEl, this.value)
            else this.selectEl.innerHTML = ""
        })
    }

    /**
     * Initializes the selector with catalog objects.
     * @param {string} perspective
     * @param {string[]} versions
     * @param {game.Catalog} catalog
     * @param {Function} filter
     */
    init(type, perspective, versions, showInBuilder, catalogFilter) {
        this.type = type
        this.perspective = perspective
        this.versions = versions
        this.showInBuilder = showInBuilder
        this.catalogFilter = catalogFilter
    }

    /**
     * Sets the content of an option element.
     * @param {HTMLElement} optionEl
     * @param {string} objKey
     */
    setOptionKey(optionEl, objCat) {
        const label = objCat.label
        const icon = objCat.icon
        optionEl.innerHTML = ""
        if(icon) optionEl.appendChild(new Img(icon, true))
        addNewDomEl(optionEl, "span", {
            text: label,
            style: {
                paddingLeft: ".5em",
            }
        })
    }

    /**
     * Sets the visibility of the options list.
     * @param {boolean} val
     */
    async setOptionsVisibility(val) {
        this.optionsEl.style.display = val ? "block" : "none"
        if(!val) return
        this._fetchDebouncer ||= new Debouncer()
        this._fetchDebouncer.call(300, async () => {
            const itemCats = await CATALOG.searchItems(
                this.type,
                this.perspective,
                this.versions,
                this.catalogFilter,
                val,
            )
            this.optionsEl.innerHTML = ""
            for(let itemCat of itemCats) this.addOption(itemCat)
        })
    }

    addOption(objCat) {
        const optionEl = addNewDomEl(this.optionsEl, "cs-option")
        this.setOptionKey(optionEl, objCat)
        optionEl.onclick = async () => {
            this.setOptionsVisibility(false)
            await this.setSelectedObject(objCat.key)
            this.dispatchEvent(new CustomEvent("change", {
                detail: { key: objCat.key }
            }))
        }
    }

    /**
     * Sets the selected object.
     * @param {string} objKey
     */
    async setSelectedObject(objkey) {
        const objCats = await CATALOG.fetchItems(this.type, this.perspective, this.versions, [objkey])
        if(objCats.length == 0) return
        const objCat = objCats[0]
        this.value = objCat
        this.setOptionKey(this.selectEl, objCat)
    }
}
customElements.define('dmg-object-selector', ObjectSelectorElement)


/**
 * Custom element for editing the state of a game object.
 * @extends {HTMLElement}
 */
class ObjectStateElement extends HTMLElement {

    constructor() {
        super()
        this.value = null

        this.attachShadow({ mode: 'open' })

        const styleEl = document.createElement('style')
        styleEl.textContent = ``

        this.propsEl = newDomEl("div", {
            style: {
                padding: ".5em",
                display: "none",
                flexDirection: "column",
                gap: ".2em",
                border: "1px solid lightgrey"
            }
        })
        this.shadowRoot.append(styleEl, this.propsEl)
    }

    /**
     * Initializes the state editor for a given object.
     * @param {GameObject} obj
     */
    initObject(obj) {
        this.propsEl.style.display = "none"
        this.propsEl.innerHTML = ""
        obj.constructor.STATE_PROPS.forEach(prop => {
            if(!prop.showInBuilder) return
            this.propsEl.style.display = "flex"
            this.propsEl.appendChild(prop.createObjectInput(obj))
        })
    }

    /**
     * Sets the content of an option element.
     * @param {HTMLElement} optionEl
     * @param {string} objKey
     */
    setOptionKey(optionEl, objKey) {
        const objCat = CATALOG.objects[objKey]
        const label = objCat.label
        const icon = objCat.icon
        optionEl.innerHTML = ""
        if(icon) optionEl.appendChild(new Img(icon, true))
        addNewDomEl(optionEl, "span", {
            text: label,
            style: {
                paddingLeft: ".5em",
            }
        })
    }

    /**
     * Sets the visibility of the options list.
     * @param {boolean} val
     */
    setOptionsVisibility(val) {
        this.optionsEl.style.display = val ? "block" : "none"
    }

    /**
     * Sets the selected object.
     * @param {string} objKey
     */
    setSelectedObject(objKey) {
        this.value = objKey
        this.setOptionKey(this.selectEl, objKey)
        this.dispatchEvent(new CustomEvent("change", {
            detail: { key: objKey }
        }))
    }
}
customElements.define('dmg-object-state', ObjectStateElement)


/**
 * Custom element for editing an object link.
 * @extends {HTMLElement}
 */
class ObjectLinkElement extends HTMLElement {

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })

        const styleEl = document.createElement('style')
        styleEl.textContent = ``

        this.wrapperEl = newDomEl("div", {
            display: "flex",
            flexDirection: "column",
        })
        this.shadowRoot.append(styleEl, this.wrapperEl)

        this.objectLink = null
    }

    /**
     * Initializes the editor for a given object link.
     * @param {ObjectLink} objLink
     */
    initObjectLink(objLink) {
        this.objectLink = objLink
        this.wrapperEl.innerHTML = ""
        const keysEl = addNewDomEl(this.wrapperEl, "div", {
            display: "flex",
            flexDirection: "row",
        })
        addNewDomEl(keysEl, "span", { text: "trigger:" })
        const trigKeyEl = addNewDomEl(keysEl, "select")
        objLink.triggerObject.constructor.LINK_TRIGGERS.forEach((trig, funcName) => {
            addNewDomEl(trigKeyEl, "option", {
                value: funcName,
                text: trig.label,
            })
        })
        trigKeyEl.value = objLink.triggerKey
        trigKeyEl.addEventListener("change", () => objLink.triggerKey = trigKeyEl.value)
        addNewDomEl(keysEl, "span", { text: "reaction:" })
        const reactKeyEl = addNewDomEl(keysEl, "select")
        objLink.reactionObject.constructor.LINK_REACTIONS.forEach((trig, funcName) => {
            addNewDomEl(reactKeyEl, "option", {
                value: funcName,
                text: trig.label,
            })
        })
        reactKeyEl.value = objLink.reactionKey
        reactKeyEl.addEventListener("change", () => objLink.reactionKey = reactKeyEl.value)
    }
}
customElements.define('dmg-object-link', ObjectLinkElement)


/**
 * Custom element for adding/removing multiple lines with the same content template.
 * @extends {HTMLElement}
 */
class MultiLineElement extends HTMLElement {

    constructor() {
        super()
        this.originalContent = null

        this.attachShadow({ mode: 'open' })

        const styleEl = document.createElement('style')
        styleEl.textContent = `
            :host {
                display: flex;
                flex-direction: column;
                gap: .3em;
                padding: .5em;
            }
            .line {
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: .3em;
                flex-wrap: nowrap;
            }
            .line > div:first-child {
                flex: 1;
                min-width: 0;
            }
            .remove-btn {
                cursor: pointer;
                padding: .2em .5em;
                background: lightgrey;
                color: white;
                border: none;
                border-radius: 3px;
            }
            .remove-btn:hover {
                background: grey;
            }
            .add-btn {
                cursor: pointer;
                padding: .2em .5em;
                background: lightgrey;
                color: black;
                border: none;
                border-radius: 3px;
                font-weight: bold;
                align-self: flex-start;
            }
            .add-btn:hover {
                background: grey;
            }
        `

        this.addBtn = addNewDomEl(this.shadowRoot, "button", {
            class: "add-btn",
            text: "+",
        })
        this.addBtn.addEventListener("click", () => this.addLine())

        this.shadowRoot.insertBefore(styleEl, this.addBtn)
    }

    /**
     * Called when the element is connected to the DOM.
     * Captures the original content from the light DOM and creates first line.
     */
    connectedCallback() {
        // Capture original content only once
        if (this.originalContent === null) {
            this.originalContent = this.innerHTML
            // Clear the light DOM content
            this.innerHTML = ""
            // Create the first line
            this.addLine()
        }
    }

    /**
     * Adds a new line with the original content and a remove button.
     */
    addLine() {
        const lineEl = newDomEl("div", {
            class: "line",
        })

        const contentEl = newDomEl("div")
        contentEl.innerHTML = this.originalContent

        const removeBtn = addNewDomEl(lineEl, "button", {
            class: "remove-btn",
            text: "−",
        })
        removeBtn.addEventListener("click", () => this.removeLine(lineEl))

        lineEl.appendChild(contentEl)
        lineEl.appendChild(removeBtn)
        this.shadowRoot.insertBefore(lineEl, this.addBtn)

        // Call the setup callback if provided
        if (this.onAddLine) this.onAddLine(contentEl.firstChild, lineEl)

        this.dispatchEvent(new CustomEvent("lineadded", {
            detail: { lineEl, el: contentEl.firstChild }
        }))
    }

    /**
     * Removes a specific line.
     * @param {HTMLElement} lineEl
     */
    removeLine(lineEl) {
        if (this.onRemoveLine) this.onRemoveLine(lineEl.firstChild.firstChild, lineEl)
        lineEl.remove()
    }

    /**
     * Gets all line elements.
     * @returns {HTMLElement[]}
     */
    getLines() {
        return Array.from(this.shadowRoot.querySelectorAll('.line')).map(lineEl => lineEl.firstChild.firstChild)
    }

    /**
     * Gets the number of lines.
     * @returns {number}
     */
    getLineCount() {
        return this.shadowRoot.querySelectorAll('.line').length
    }
}
customElements.define('dmg-multi-line', MultiLineElement)
