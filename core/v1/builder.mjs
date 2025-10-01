const { assign } = Object
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, addToLoads, checkAllLoadsDone, checkHit, sumTo, newCanvas, newDomEl, addNewDomEl } = utils
import { GameCommon, SceneCommon, DefaultScene, GameObject, Wall, PlatformWall, ObjectLink, Hero, now, FPS, nbKeys } from './game.mjs'
import { GraphicsProps } from './graphics.mjs'


// BUILDER //////////////////////////

export class GameBuilder extends GameCommon {

    constructor(canvasParentEl, selectionMenuEl, catalog, map, kwargs) {
        super(canvasParentEl, catalog, map, kwargs)
        this.selectionMenuEl = selectionMenuEl
        this.scenes.game = new DefaultScene(this)
        this.scenes.draft = new DraftScene(this)
        super.syncSize()
        this.setMode("move")
        this.initTouches()
        this.initKeysListeners()
    }

    initKeysListeners() {
        this.pressedKeys = new Set()
        document.body.addEventListener("keydown", evt => {
            const { key } = evt
            this.pressedKeys.add(key)
            if(key == "Escape") {
                if(this.mode != "cursor") this.setMode("cursor")
                else this.clearSelection()
            }
            if(key == "Delete" || key == "Backspace") {
                this.removeSelectedObject()
            }
        })
        document.body.addEventListener("keyup", evt => {
            this.pressedKeys.delete(evt.key)
        })
    }

    createScene(cls, kwargs) {
        const scn = new cls(this, kwargs)
        scn.doCreateObjectMapProto = false
        return scn
    }

    setMode(mode, modeKey = null) {
        this.mode = mode
        this.modeKey = modeKey
        if(mode == "move") this.canvas.style.cursor = "move"
        else this.canvas.style.cursor = "cell"
        this.scenes.draft.syncMode()
    }

    setAnchor(val) {
        this.scenes.draft.anchor = val
    }

    syncMap() {
        this.map.scenes["0"] = this.scenes.game.getState(true)
    }

    update() {
        this.scenes.draft.update()
        const touch = this.touches[0]
        this.prevTouchIsDown = Boolean(touch) && touch.isDown
    }

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

    clearSelection() {
        this.scenes.draft.clearSelection()
    }

    draw() {
        super.draw()
        this.drawScene(this.scenes.draft)
    }
}


class DraftScene extends SceneCommon {
    
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

    syncMode() {
        const { mode, modeKey } = this.game
        this.prevPos = null
        if(this.draftObject) {
            this.draftObject.remove()
            this.draftObject = null
        }
        if(mode == "object") {
            this.draftObject = this.createObjectFromKey(modeKey)
        }
    }

    update() {
        this.syncPosSize()
        const { mode } = this.game
        this.updateDraftObject()
        if(mode == "object") this.addPointedObject()
        else if(mode == "wall") this.addPointedWall()
        else if(mode == "cursor") this.cursorUpdate()
    }

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

    checkTouchSelect(touch, ignore=null) {
        const gameScn = this.game.scenes.game
        const x = touch.x + gameScn.viewX, y = touch.y + gameScn.viewY
        let res = null
        // objects
        gameScn.objects.forEach(obj  => {
            if(obj == ignore) return
            if(obj instanceof Wall) {
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

    canMove(obj) {
        return obj instanceof GameObject || obj instanceof Wall
    }

    updateMove(touch) {
        const orig = this._moveOrig, { objs } = orig
        if(!orig) return
        if(!objs) {
            const viewX = orig.viewX - (touch.x - orig.touchX)
            const viewY = orig.viewY - (touch.y - orig.touchY)
            this.setView(viewX, viewY)
            this.game.scenes.game.setView(viewX, viewY)
        } else {
            for(let idx in objs) {
                const obj = objs[idx]
                const origX = orig.objsX[idx]
                const origY = orig.objsY[idx]
                obj.x = origX + (touch.x - orig.touchX)
                obj.y = origY + (touch.y - orig.touchY)
            }
        }
    }

    hasMoved() {
        const orig = this._moveOrig, objs = orig.objs
        if(!objs) return false
        const { objsX, objsY } = orig
        return (objs[0].x != objsX[0]) || (objs[0].y != objsY[0])
    }

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

    clearMove() {
        this._moveOrig = null
    }
    
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

    updateDraftObject() {
        if(!this.draftObject) return
        const { mode } = this.game
        const touch = this.game.touches[0]
        if(touch) {
            const draftPos = {
                x: touch.x,
                y: touch.y,
            }
            if(mode == "object") {
                if(this.draftObject.constructor.STICK_TO_GRID) this.applyAnchor(draftPos, true)
                this.draftObject.x = draftPos.x
                this.draftObject.y = draftPos.y
            } else if(mode == "wall") {
                if(this.anchor) this.applyAnchor(draftPos)
                this.draftObject.x2 = draftPos.x
                this.draftObject.y2 = draftPos.y
            }
        }
    }

    addPointedObject() {
        const { touches, prevTouchIsDown } = this.game
        const { modeKey } = this.game
        const { draftObject } = this
        const touch = touches[0]
        if(touch && touch.isDown && !prevTouchIsDown) {
            const gameScn = this.game.scenes.game
            const pos = {
                x: touch.x + gameScn.viewX,
                y: touch.y + gameScn.viewY,
            }
            if(draftObject && draftObject.constructor.STICK_TO_GRID) this.applyAnchor(pos, true)
            const x = floor(pos.x)
            const y = floor(pos.y)
            gameScn.addObject(modeKey, { x, y })
        }
    }
    
    addPointedWall() {
        const { touches, prevTouchIsDown, modeKey } = this.game
        const touch = touches[0]

        if(touch && touch.isDown && !prevTouchIsDown) {
            const gameScn = this.game.scenes.game
            const pos = {
                x: touch.x + gameScn.viewX,
                y: touch.y + gameScn.viewY,
            }
            if(this.anchor) this.applyAnchor(pos)
            if(this.prevPos !== null) {
                let cls = Wall
                if(modeKey == "platform") cls = PlatformWall
                gameScn.addObject(cls, { x1:this.prevPos.x, y1:this.prevPos.y, x2:pos.x, y2:pos.y })
            }
            if(!this.draftObject) {
                let cls = Wall
                if(modeKey == "platform") cls = PlatformWall
                this.draftObject = this.addObject(cls, { x1:pos.x, y1:pos.y, x2:pos.x, y2:pos.y })
            } else {
                this.draftObject.x1 = pos.x
                this.draftObject.y1 = pos.y
            }
            this.prevPos = pos
        }
    }

    applyAnchor(pos, targetCenters) {
        const { gridSize } = this.game.scenes.game
        let { x, y } = pos
        if(targetCenters) { x -= gridSize/2; y -= gridSize/2 }
        const x1 = floor(x / gridSize) * gridSize, x2 = x1 + gridSize
        pos.x = (x-x1 < x2-x) ? x1 : x2
        const y1 = floor(y / gridSize) * gridSize, y2 = y1 + gridSize
        pos.y = (y-y1 < y2-y) ? y1 : y2
        if(targetCenters) { pos.x += gridSize/2; pos.y += gridSize/2 }
    }

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

    clearSelection() {
        this.selections.length = 0
        this.game.selectionMenuEl.innerHTML = ""
    }

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

    drawSelections(ctx) {
        const { viewX, viewY } = this.game.scenes.game
        ctx.save()
        ctx.lineWidth = 1
        ctx.strokeStyle = "grey"
        for(let sel of this.selections) {
            let left, top, width, height
            if(sel instanceof Wall) {
                left = min(sel.x1, sel.x2)
                top = min(sel.y1, sel.y2)
                width = abs(sel.x1 - sel.x2)
                height = abs(sel.y1 - sel.y2)
            } else if(sel instanceof GameObject) {
                const hitBox = sel.getHitBox()
                left = hitBox.left
                top = hitBox.top
                width = hitBox.width
                height = hitBox.height
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
        this.selectEl.onclick = () => this.setOptionsVisibility(true)
        selectWrapperEl.onblur = () => this.setOptionsVisibility(false)
    }
    initCatalog(catalog, filter) {
        this.catalog = catalog
        this.optionsEl.innerHTML = ""
        for(let objKey in catalog.objects) {
            const objCat = catalog.objects[objKey]
            if(!objCat.showInBuilder) continue
            if(filter && !filter(objCat)) continue
            const optionEl = addNewDomEl(this.optionsEl, "cs-option")
            this.setOptionKey(optionEl, objKey)
            optionEl.onclick = () => {
                this.setSelectedObject(objKey)
                this.setOptionsVisibility(false)
            }
        }
    }
    setOptionKey(optionEl, objKey) {
        const objCat = this.catalog.objects[objKey]
        const label = objCat.label
        const icon = objCat.icon
        optionEl.innerHTML = ""
        if(icon) optionEl.appendChild(icon.cloneNode(true))
        addNewDomEl(optionEl, "span", {
            text: label,
            style: {
                paddingLeft: ".5em",
            }
        })
    }
    setOptionsVisibility(val) {
        this.optionsEl.style.display = val ? "block" : "none"
    }
    setSelectedObject(objKey) {
        this.value = objKey
        this.setOptionKey(this.selectEl, objKey)
        // this.dispatchEvent(new CustomEvent("select", {
        //     detail: { key: objKey }
        // }))
        this.dispatchEvent(new CustomEvent("change", {
            detail: { key: objKey }
        }))
    }
}
customElements.define('dmg-object-selector', ObjectSelectorElement)



class ObjectStateElement extends HTMLElement {
    constructor() {
        super()
        this.value = null

        this.attachShadow({ mode: 'open' })

        const styleEl = document.createElement('style')
        styleEl.textContent = ``

        this.statesEl = newDomEl("div", {
            display: "flex",
            flexDirection: "column",
        })
        this.shadowRoot.append(styleEl, this.statesEl)
    }
    initObject(obj) {
        this.statesEl.innerHTML = ""
        obj.constructor.STATE_PROPS.forEach(prop => {
            if(!prop.showInBuilder) return
            const wrapperEl = addNewDomEl(this.statesEl, "div", {
                style: {
                    display: "flex",
                    flexDirection: "row",
                }
            })
            addNewDomEl(wrapperEl, "span", {
                text: prop.key
            })
            wrapperEl.appendChild(prop.createObjectInput(obj))
        })
    }
    setOptionKey(optionEl, objKey) {
        const objCat = this.catalog.objects[objKey]
        const label = objCat.label
        const icon = objCat.icon
        optionEl.innerHTML = ""
        if(icon) optionEl.appendChild(icon.cloneNode(true))
        addNewDomEl(optionEl, "span", {
            text: label,
            style: {
                paddingLeft: ".5em",
            }
        })
    }
    setOptionsVisibility(val) {
        this.optionsEl.style.display = val ? "block" : "none"
    }
    setSelectedObject(objKey) {
        this.value = objKey
        this.setOptionKey(this.selectEl, objKey)
        this.dispatchEvent(new CustomEvent("change", {
            detail: { key: objKey }
        }))
    }
}
customElements.define('dmg-object-state', ObjectStateElement)


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


function distancePointSegment(x, y, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    const px = x1 + t * dx, py = y1 + t * dy
    if (t < 0) return sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1))
    else if (t > 1) sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2))
    else return sqrt((x - px) * (x - px) + (y - py) * (y - py))
  }