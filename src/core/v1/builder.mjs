const { assign } = Object
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'
const { sumTo, newCanvas, newDomEl, addNewDomEl, Debouncer } = utils
import { CATALOG } from './catalog.mjs'
import * as game from './game.mjs'
const { GameCommon, SceneCommon, DefaultScene, GameObject, ObjectLink, Img } = game


// BUILDER //////////////////////////

/**
 * Game builder
 * @extends {GameCommon}
 */
export class GameBuilder extends GameCommon {

    /**
     * @param {HTMLElement} canvasParentEl
     * @param {HTMLElement} selectionMenuEl
     * @param {object} map
     * @param {object} kwargs
     */
    constructor(canvasParentEl, selectionMenuEl, map, kwargs) {
        super(canvasParentEl, map, kwargs)
        this.isBuilder = true
        this.selectionMenuEl = selectionMenuEl
        this.copiedObjectState = null
        this.scenes.game = new DefaultScene(this)
        this.scenes.draft = new DraftScene(this)
        super.syncSize()
        this.setMode("move")
        this.initTouches()
        this.initKeysListeners()
    }

    /**
     * Initializes keyboard listeners for builder actions.
     */
    initKeysListeners() {
        this.pressedKeys = new Set()
        document.body.addEventListener("keydown", evt => {
            const { key, ctrlKey } = evt
            this.pressedKeys.add(key)

            if(key == "Escape") {
                if(this.mode != "cursor") this.setMode("cursor")
                else this.clearSelection()
            }
            if(key == "Delete") {
                this.removeSelectedObject()
            }
            if (ctrlKey && (key === 'c' || key === 'x')) {
                const draftScn = this.scenes.draft
                const objState = draftScn.getSelectedObjectState()
                if(objState) {
                    this.setMode("object", objState)
                    if (key === 'x') this.removeSelectedObject()
                }
                evt.preventDefault()
                return
            }
        })
        document.body.addEventListener("keyup", evt => {
            this.pressedKeys.delete(evt.key)
        })
    }

    /**
     * Creates a new scene.
     * @param {typeof SceneCommon} cls
     * @param {object} kwargs
     * @returns {SceneCommon}
     */
    createScene(cls, kwargs) {
        kwargs ||= {}
        kwargs.chunkSize = Infinity
        const scn = super.createScene(cls, kwargs)
        scn.doCreateObjectMapProto = false
        return scn
    }

    /**
     * Sets the builder mode.
     * @param {string} mode
     * @param {string|null} kwargs
     */
    setMode(mode, kwargs) {
        this.mode = mode
        if(mode == "move") this.canvas.style.cursor = "move"
        else this.canvas.style.cursor = "cell"
        this.scenes.draft.syncMode(mode, kwargs)
    }

    /**
     * Sets the anchor mode for the draft scene.
     * @param {boolean} val
     */
    setAnchor(val) {
        this.scenes.draft.anchor = val
    }

    /**
     * Syncs the game scene state to the map.
     */
    syncMap() {
        this.map.scenes["0"] = this.scenes.game.getState(true)
    }

    /**
     * Updates the builder state.
     */
    update() {
        this.scenes.draft.update()
        const touch = this.touches[0]
        this.prevTouchIsDown = Boolean(touch) && touch.isDown
    }

    /**
     * Removes the selected object(s).
     */
    removeSelectedObject() {
        for(let obj of this.scenes.draft.selections) {
            if(obj instanceof GameObject) {
                obj.remove()
                // remove all links associated to this object
                this.scenes.game.objects.forEach(obj => {
                    const lnks = obj.objectLinks
                    if(lnks) for(let lnk of lnks) {
                        if(lnk.reactionObject == obj || lnk.triggerObject == obj) {
                            lnks.splice(lnks.indexOf(lnk), 1)
                        }
                    }
                })
            } else if(obj instanceof ObjectLink) {
                const lnks = obj.reactionObject.objectLinks
                lnks.splice(lnks.indexOf(obj), 1)
            }
        }
        this.clearSelection()
    }

    /**
     * Clears the current selection.
     */
    clearSelection() {
        this.scenes.draft.clearSelection()
    }

    /**
     * Draws the builder scenes.
     */
    draw() {
        super.draw()
        this.drawScene(this.scenes.draft)
    }
}

/**
 * Draft scene for the builder
 * @extends {SceneCommon}
 */
class DraftScene extends SceneCommon {
    
    /**
     * Initializes the draft scene.
     * @param {object} kwargs
     */
    init(kwargs) {
        super.init(kwargs)
        this.backgroundColor = null
        this.viewSpeed = Infinity
        this.anchor = true
        this.draftObject = null
        this.touchedObj = null
        this.linkedObject = null
        this.selections = []
        this.syncPosSize()
    }

    /**
     * Syncs the draft object with the current builder mode.
     */
    syncMode(mode, kwargs) {
        this.prevPos = null
        this.setDraftObject(null)
        if(mode == "object" || mode == "wall") {
            this.setDraftObject(kwargs.key, kwargs)
        }
    }
/**
 * Sets the draft object using the given key or clears it if no key.
 * @param {string} key - The object key.
 * @param {object} kwargs - Additional arguments.
 */

    setDraftObject(key, kwargs) {
        const { perspective, versions } = this.game.map
        if(key) this.draftObject = this.createObjectFromKey(key, kwargs)
        else {
            if(this.draftObject) this.draftObject.remove()
            this.draftObject = null
        }
    }
/**
 * Gets the state of the last selected GameObject.
 * @returns {object|undefined}
 */

    getSelectedObjectState() {
        const selections = this.selections
        if (selections.length > 0) {
            const lastSelected = selections[selections.length - 1]
            if (lastSelected instanceof GameObject) {
                return lastSelected.getState()
            }
        }
    }

    /**
     * Updates the draft scene.
     */
    update() {
        this.syncPosSize()
        const { mode } = this.game
        this.updateDraftObject()
        if(mode == "object") this.addPointedObject()
        else if(mode == "wall") this.addPointedWall()
        else if(mode == "cursor") this.cursorUpdate()
    }

    /**
     * Handles updates when the mode is 'cursor'.
     */
    cursorUpdate() {
        const { touches, prevTouchIsDown } = this.game
        const touch = touches[0]
        if(touch && touch.isDown) {
            if(!prevTouchIsDown) {
                this.touchedObj = this.checkTouchSelect(touch)
                this.initMove(touch, this.touchedObj)
            } else {
                const touchedObj = this.checkTouchSelect(touch, this.touchedObj)
                this.linkedObject = (touchedObj instanceof GameObject) ? touchedObj : null
                this.updateMove(touch)
            }
        } else {
            if(prevTouchIsDown) {
                if(!this.hasMoved()) {
                    if(this.touchedObj) this.select(this.touchedObj)
                    else this.clearSelection()
                } else {
                    if(this.linkedObject) {
                        this.addObjectLink(this.linkedObject)
                        this.cancelMove()
                    }
                }
            }
            this.touchedObj = null
            this.linkedObject = null
            this.clearMove()
        }
    }

    /**
     * Checks for object/link selection at a given touch position.
     * @param {object} touch
     * @param {GameObject|ObjectLink|null} ignore
     * @returns {GameObject|ObjectLink|null}
     */
    checkTouchSelect(touch, ignore=null) {
        const gameScn = this.game.scenes.game
        const x = touch.x + gameScn.viewX, y = touch.y + gameScn.viewY
        let res = null
        // objects
        gameScn.objects.forEach(obj  => {
            if(obj == ignore) return
            if(obj.x1 !== undefined) {
                if(distancePointSegment(x, y, obj.x1, obj.y1, obj.x2, obj.y2) <= 5) {
                    res = obj
                }
            } else {
                const { left, width, top, height } = obj.getHitBox()
                if(left <= x && left+width >= x && top <= y && top+height >= y) {
                    res = obj
                }
            }
        })
        if(res) return res
        // links
        gameScn.objects.forEach(obj  => {
            if(!obj.objectLinks) return
            obj.objectLinks.forEach(lnk => {
                const { x:x1, y:y1 } = lnk.triggerObject
                const { x:x2, y:y2 } = lnk.reactionObject
                if(distancePointSegment(x, y, x1, y1, x2, y2) <= 5) {
                    res = lnk
                }
            })
        })
        return res
    }

    /**
     * Initializes a move action.
     * @param {object} touch
     * @param {GameObject|ObjectLink} obj
     */
    initMove(touch, obj) {
        const { viewX, viewY } = this.game.scenes.game
        const orig = this._moveOrig = {
            touchX: touch.x,
            touchY: touch.y,
            viewX,
            viewY,
            objs: null,
            objsX: null,
            objsY: null,
        }
        if(obj) {
            const objs = this.selections.concat([obj]).filter(obj => this.canMove(obj))
            if(objs.length > 0) {
                orig.objs = objs
                orig.objsX = objs.map(o => o.x)
                orig.objsY = objs.map(o => o.y)
            }
        }
    }

    /**
     * Checks if an object can be moved.
     * @param {GameObject|ObjectLink} obj
     * @returns {boolean}
     */
    canMove(obj) {
        return obj instanceof GameObject
    }

    /**
     * Updates a move action.
     * @param {object} touch
     */
    updateMove(touch) {
        const orig = this._moveOrig, { objs } = orig
        if(!orig) return
        if(!objs) {
            // update scene view
            const viewX = orig.viewX - (touch.x - orig.touchX)
            const viewY = orig.viewY - (touch.y - orig.touchY)
            this.setView(viewX, viewY)
            this.game.scenes.game.setView(viewX, viewY)
        } else {
            // update selected objects positions
            for(let idx in objs) {
                const obj = objs[idx]
                const origX = orig.objsX[idx]
                const origY = orig.objsY[idx]
                const newPos = {
                    x: origX + (touch.x - orig.touchX),
                    y: origY + (touch.y - orig.touchY),
                }
                if(obj.constructor.STUCK_TO_GRID) this.applyAnchor(newPos, true)
                obj.x = newPos.x
                obj.y = newPos.y
            }
        }
    }

    /**
     * Checks if the object has moved.
     * @returns {boolean}
     */
    hasMoved() {
        const orig = this._moveOrig, objs = orig.objs
        if(!objs) return false
        const { objsX, objsY } = orig
        return (objs[0].x != objsX[0]) || (objs[0].y != objsY[0])
    }

    /**
     * Cancels the current move action.
     */
    cancelMove() {
        const orig = this._moveOrig
        if(!orig) return
        const objs = orig.objs
        if(!objs) {
            this.setView(orig.viewX, orig.viewY)
            this.game.scenes.game.setView(orig.viewX, orig.viewY)
        } else {
            for(let idx in orig.objs) {
                const obj = orig.objs[idx]
                obj.x = orig.objsX[idx]
                obj.y = orig.objsY[idx]
            }
        }
    }

    /**
     * Clears the move action state.
     */
    clearMove() {
        this._moveOrig = null
    }
    
    /**
     * Adds an object link.
     * @param {GameObject} trigObj
     */
    addObjectLink(trigObj) {
        const orig = this._moveOrig
        if(!orig) return
        const objs = orig.objs
        if(!objs) return
        for(let idx in orig.objs) {
            const obj = orig.objs[idx]
            obj.addObjectLink(trigObj)
        }
    }

    /**
     * Updates the position of the draft object.
     */
    updateDraftObject() {
        if(!this.draftObject) return
        const { mode } = this.game
        const touch = this.game.touches[0]
        if(touch) {
            const gameScn = this.game.scenes.game
            const draftPos = {
                x: touch.x + gameScn.viewX,
                y: touch.y + gameScn.viewY,
            }
            if(mode == "object") {
                if(this.draftObject.constructor.STUCK_TO_GRID) this.applyAnchor(draftPos, true)
                this.draftObject.x = draftPos.x - gameScn.viewX
                this.draftObject.y = draftPos.y - gameScn.viewY
            } else if(mode == "wall") {
                this.applyAnchor(draftPos)
                this.draftObject.x2 = draftPos.x - gameScn.viewX
                this.draftObject.y2 = draftPos.y - gameScn.viewY
            }
        }
    }

    /**
     * Adds an object at the pointed position.
     */
    addPointedObject() {
        const { touches, prevTouchIsDown } = this.game
        const { draftObject } = this
        const touch = touches[0]
        if(touch && touch.isDown && !prevTouchIsDown) {
            const gameScn = this.game.scenes.game
            const pos = {
                x: touch.x + gameScn.viewX,
                y: touch.y + gameScn.viewY,
            }
            if(draftObject && draftObject.constructor.STUCK_TO_GRID) this.applyAnchor(pos, true)
            const objState = draftObject.getState()
            delete objState.id
            gameScn.addObject(objState.key, {
                ...objState,
                x: floor(pos.x),
                y: floor(pos.y),
            })
        }
    }
    
    /**
     * Adds a wall at the pointed position.
     */
    addPointedWall() {
        const { touches, prevTouchIsDown } = this.game
        const { draftObject } = this
        const touch = touches[0]

        if(touch && touch.isDown && !prevTouchIsDown) {
            const gameScn = this.game.scenes.game
            const pos = {
                x: touch.x + gameScn.viewX,
                y: touch.y + gameScn.viewY,
            }
            this.applyAnchor(pos)
            if(this.prevPos !== null) {
                gameScn.addObject(draftObject.getKey(), { x1:this.prevPos.x, y1:this.prevPos.y, x2:pos.x, y2:pos.y })
            }
            this.draftObject.x1 = pos.x - gameScn.viewX
            this.draftObject.y1 = pos.y - gameScn.viewY
            this.prevPos = pos
        }
    }

    /**
     * Applies grid anchoring to a position.
     * @param {{x: number, y: number}} pos
     * @param {boolean} targetCenters
     */
    applyAnchor(pos, targetCenters) {
        if(!this.anchor) return
        const { gridSize } = this.game.scenes.game
        let { x, y } = pos
        if(targetCenters) { x -= gridSize/2; y -= gridSize/2 }
        const x1 = floor(x / gridSize) * gridSize, x2 = x1 + gridSize
        pos.x = (x-x1 < x2-x) ? x1 : x2
        const y1 = floor(y / gridSize) * gridSize, y2 = y1 + gridSize
        pos.y = (y-y1 < y2-y) ? y1 : y2
        if(targetCenters) { pos.x += gridSize/2; pos.y += gridSize/2 }
    }

    /**
     * Selects an object or a link.
     * @param {GameObject|ObjectLink} obj
     */
    select(obj) {
        if(this.game.pressedKeys.has("Shift")) {
            const idx = this.selections.indexOf(obj)
            if(idx >= 0) this.selections.splice(idx, 1)
            else this.selections.push(obj)
        } else {
            this.clearSelection()
            this.selections.push(obj)
        }
        const selMenuEl = this.game.selectionMenuEl
        selMenuEl.innerHTML = ""
        if(obj instanceof GameObject) {
            const stateEl = addNewDomEl(selMenuEl, "dmg-object-state")
            stateEl.initObject(obj)
        } else if(obj instanceof ObjectLink) {
            const linkEl = addNewDomEl(selMenuEl, "dmg-object-link")
            linkEl.initObjectLink(obj)
        }
    }

    /**
     * Clears the current selection.
     */
    clearSelection() {
        this.selections.length = 0
        this.game.selectionMenuEl.innerHTML = ""
    }

    /**
     * Draws the draft scene.
     */
    draw() {
        const { viewX, viewY } = this.game.scenes.game
        const can = this.canvas
        can.width = this.viewWidth
        can.height = this.viewHeight
        const ctx = can.getContext("2d")
        ctx.reset()
        const drawer = this.graphicsEngine
        const gridImg = this.initGridImg()
        if(gridImg) ctx.drawImage(gridImg, ~~-viewX, ~~-viewY)
        if(this.draftObject) {
            const props = this.draftObject.getGraphicsProps()
            if(props) {
                props.visibility = .5
                drawer.draw(props)
            }
        }
        this.drawSelections(ctx)
        this.drawLinkedObject(ctx)
        this.drawObjectLinks(ctx)
        return can
    }

    /**
     * Initializes the grid background image.
     * @returns {HTMLCanvasElement}
     */
    initGridImg() {
        let gridImg = this._gridImg
        const { width, height, gridSize } = this.game.scenes.game
        if(gridImg && gridImg.width == width && gridImg.height == height && gridImg.gridSize == gridSize) return gridImg
        gridImg = this._gridImg = newCanvas(width, height)
        assign(gridImg, { gridSize })
        const ctx = gridImg.getContext("2d")
        ctx.strokeStyle = "lightgrey"
        const addLine = (x1, y1, x2, y2) => {
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
        }
        const nbCols = ceil(width/gridSize), nbRows = ceil(height/gridSize)
        for(let x=1; x<nbCols; ++x) addLine(gridSize*x, 0, gridSize*x, height)
        for(let y=1; y<nbRows; ++y) addLine(0, gridSize*y, width, gridSize*y)
        return gridImg
    }

    /**
     * Draws the selection boxes.
     * @param {CanvasRenderingContext2D} ctx
     */
    drawSelections(ctx) {
        const { viewX, viewY } = this.game.scenes.game
        ctx.save()
        ctx.lineWidth = 1
        ctx.strokeStyle = "grey"
        for(let sel of this.selections) {
            let left, top, width, height
            if(sel instanceof GameObject) {
                if(sel.x1 !== undefined) {
                    left = min(sel.x1, sel.x2)
                    top = min(sel.y1, sel.y2)
                    width = abs(sel.x1 - sel.x2)
                    height = abs(sel.y1 - sel.y2)
                } else {
                    const hitBox = sel.getHitBox()
                    left = hitBox.left
                    top = hitBox.top
                    width = hitBox.width
                    height = hitBox.height
                }
            } else if(sel instanceof ObjectLink) {
                const { x:x1, y:y1 } = sel.triggerObject
                const { x:x2, y:y2 } = sel.reactionObject
                left = x1
                top = y1
                width = x2 - x1
                height = y2 - y1
            }
            ctx.beginPath()
            ctx.setLineDash([5, 5])
            ctx.rect(~~(left-viewX), ~~(top-viewY), width, height)
            ctx.stroke()
        }
        ctx.restore()
    }

    /**
     * Draws the outline of the object being linked to.
     * @param {CanvasRenderingContext2D} ctx
     */
    drawLinkedObject(ctx) {
        const { viewX, viewY } = this.game.scenes.game
        if(!this.linkedObject) return
        const { left, top, width, height } = this.linkedObject.getHitBox()
        ctx.save()
        ctx.lineWidth = 2
        ctx.strokeStyle = "red"
        ctx.beginPath()
        ctx.rect(~~(left-viewX), ~~(top-viewY), width, height)
        ctx.stroke()
        ctx.restore()
    }

    /**
     * Draws the object links.
     * @param {CanvasRenderingContext2D} ctx
     */
    drawObjectLinks(ctx) {
        const gameScn = this.game.scenes.game
        const { viewX, viewY } = gameScn
        ctx.save()
        ctx.lineWidth = 1
        ctx.strokeStyle = "red"
        ctx.beginPath()
        ctx.setLineDash([5, 5])
        gameScn.objects.forEach(obj => {
            const objLinks = obj.objectLinks
            if(objLinks) objLinks.forEach(objLink => {
                const trigObj = objLink.triggerObject
                ctx.moveTo(~~(obj.x-viewX), ~~(obj.y-viewY))
                ctx.lineTo(~~(trigObj.x-viewX), ~~(trigObj.y-viewY))
            })
        })
        ctx.stroke()
        ctx.restore()
    }
}

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
        this.selectEl.addEventListener("focus", () => {
            if(this.value) this.setSelectedObject(this.value)
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
        optionEl.onclick = () => {
            this.setSelectedObject(objCat)
            this.setOptionsVisibility(false)
        }
    }

    /**
     * Sets the selected object.
     * @param {string} objKey
     */
    setSelectedObject(objCat) {
        this.value = objCat
        this.setOptionKey(this.selectEl, objCat)
        // this.dispatchEvent(new CustomEvent("select", {
        //     detail: { key: objKey }
        // }))
        this.dispatchEvent(new CustomEvent("change", {
            detail: { key: objCat.key }
        }))
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
 * Calculates the distance between a point and a line segment.
 * @param {number} x
 * @param {number} y
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
function distancePointSegment(x, y, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    const px = x1 + t * dx, py = y1 + t * dy
    if (t < 0) return sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1))
    else if (t > 1) return sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2))
    else return sqrt((x - px) * (x - px) + (y - py) * (y - py))
  }