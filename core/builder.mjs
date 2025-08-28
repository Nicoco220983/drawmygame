const { assign } = Object
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, addToLoads, checkAllLoadsDone, checkHit, sumTo, newCanvas, newDomEl, addNewDomEl } = utils
import { GameCommon, SceneCommon, DefaultScene, GameObject, Wall, Actor, ActorLink, Sprite, Hero, now, FPS, nbKeys } from './game.mjs'


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
        scn.doCreateActorMapProto = false
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
            if(obj instanceof GameObject) obj.remove()
            else if(obj instanceof ActorLink) {
                const lnks = obj.reactionActor.actorLinks
                lnks.splice(lnks.indexOf(obj), 1)
            }
        }
        this.clearSelection()
    }

    clearSelection() {
        this.scenes.draft.clearSelection()
    }

    draw() {
        const ctx = super.draw()
        this.drawScene(ctx, this.scenes.draft)
    }
}


class DraftScene extends SceneCommon {
    constructor(game, kwargs) {
        super(game, kwargs)
        this.backgroundColor = null
        this.viewSpeed = Infinity
        this.anchor = true
        this.draftActor = null
        this.touchedObj = null
        this.linkedActor = null
        this.selections = []
        this.gridBoxSize = 20
    }

    syncSize() {
        const gameScn = this.game.scenes.game
        this.width = gameScn.width
        this.height = gameScn.height
    }

    syncMode() {
        const { mode, modeKey } = this.game
        this.prevPos = null
        if(this.draftActor) {
            this.draftActor.remove()
            this.draftActor = null
        }
        if(mode == "actor") {
            this.draftActor = this.addActor(modeKey)
            this.draftActor.spriteVisibility = 0
        }
    }

    update() {
        this.syncSize()
        const { mode } = this.game
        this.updateDraftActor()
        if(mode == "actor") this.addPointedActor()
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
                this.linkedActor = (touchedObj instanceof Actor) ? touchedObj : null
                this.updateMove(touch)
            }
        } else {
            if(prevTouchIsDown) {
                if(!this.hasMoved()) {
                    if(this.touchedObj) this.select(this.touchedObj)
                    else this.clearSelection()
                } else {
                    if(this.linkedActor) {
                        this.addActorLink(this.linkedActor)
                        this.cancelMove()
                    }
                }
            }
            this.touchedObj = null
            this.linkedActor = null
            this.clearMove()
        }
    }

    checkTouchSelect(touch, ignore=null) {
        const gameScn = this.game.scenes.game
        const x = touch.x + gameScn.viewX, y = touch.y + gameScn.viewY
        let res = null
        // walls
        gameScn.walls.forEach(wall => {
            if(wall == ignore) return
            if(distancePointSegment(x, y, wall.x1, wall.y1, wall.x2, wall.y2) <= 5) {
                res = wall
            }
        })
        if(res) return res
        // actors
        gameScn.actors.forEach(act  => {
            if(act == ignore) return
            const { left, width, top, height } = act.getHitBox()
            if(left <= x && left+width >= x && top <= y && top+height >= y) {
                res = act
            }
        })
        if(res) return res
        // links
        gameScn.actors.forEach(act  => {
            if(!act.actorLinks) return
            act.actorLinks.forEach(lnk => {
                const { x:x1, y:y1 } = lnk.triggerActor
                const { x:x2, y:y2 } = lnk.reactionActor
                if(distancePointSegment(x, y, x1, y1, x2, y2) <= 5) {
                    res = lnk
                }
            })
        })
        return res
    }

    initMove(touch, obj) {
        const orig = this._moveOrig = {
            touchX: touch.x,
            touchY: touch.y,
            viewX: this.viewX,
            viewY: this.viewY,
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
        return obj instanceof Actor || obj instanceof Wall
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
    
    addActorLink(trigAct) {
        const orig = this._moveOrig
        if(!orig) return
        const objs = orig.objs
        if(!objs) return
        for(let idx in orig.objs) {
            const obj = orig.objs[idx]
            obj.addActorLink(trigAct)
        }
    }

    updateDraftActor() {
        if(!this.draftActor) return
        const { mode } = this.game
        const touch = this.game.touches[0]
        if(touch) {
            this.draftActor.spriteVisibility = .5
            const draftPos = {
                x: touch.x,
                y: touch.y,
            }
            if(mode == "actor") {
                this.draftActor.x = draftPos.x
                this.draftActor.y = draftPos.y
            } else if(mode == "wall") {
                if(this.anchor) this.applyAnchor(draftPos)
                this.draftActor.x2 = draftPos.x
                this.draftActor.y2 = draftPos.y
            }
        } else {
            this.draftActor.spriteVisibility = 0
        }
    }

    addPointedActor() {
        const { touches, prevTouchIsDown } = this.game
        const { modeKey } = this.game
        const touch = touches[0]
        if(touch && touch.isDown && !prevTouchIsDown) {
            const gameScn = this.game.scenes.game
            const x = floor(touch.x + gameScn.viewX)
            const y = floor(touch.y + gameScn.viewY)
            gameScn.addActor(modeKey, { x, y })
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
                gameScn.addWall({ key:modeKey, x1:this.prevPos.x, y1:this.prevPos.y, x2:pos.x, y2:pos.y })
            }
            if(!this.draftActor) {
                this.draftActor = this.addWall({ key:modeKey, x1:pos.x, y1:pos.y, x2:pos.x, y2:pos.y })
                this.draftActor.visibility = .5
            } else {
                this.draftActor.x1 = pos.x
                this.draftActor.y1 = pos.y
            }
            this.prevPos = pos
        }
    }

    applyAnchor(pos) {
        const boxSize = this.gridBoxSize
        const x1 = floor(pos.x / boxSize) * boxSize, x2 = x1 + boxSize
        pos.x = (pos.x-x1 < x2-pos.x) ? x1 : x2
        const y1 = floor(pos.y / boxSize) * boxSize, y2 = y1 + boxSize
        pos.y = (pos.y-y1 < y2-pos.y) ? y1 : y2
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
        if(obj instanceof Actor) {
            const stateEl = addNewDomEl(selMenuEl, "dmg-actor-state")
            stateEl.initActor(obj)
        } else if(obj instanceof ActorLink) {
            const linkEl = addNewDomEl(selMenuEl, "dmg-actor-link")
            linkEl.initActorLink(obj)
        }
    }

    clearSelection() {
        this.selections.length = 0
        this.game.selectionMenuEl.innerHTML = ""
    }

    drawTo(ctx) {
        const grid = this.initGrid()
        if(grid) {
            ctx.translate(~~-this.viewX, ~~-this.viewY)
            grid.drawTo(ctx)
            ctx.translate(~~this.viewX, ~~this.viewY)
        }
        super.drawTo(ctx)
        ctx.translate(~~-this.viewX, ~~-this.viewY)
        this.drawSelections(ctx)
        this.drawLinkedActor(ctx)
        this.drawActorLinks(ctx)
        ctx.translate(~~this.viewX, ~~this.viewY)
    }

    initGrid() {
        const { width, height } = this.game.scenes.game
        let { grid } = this
        if(grid && grid.width == width && grid.height == height) return grid
        grid = this.grid ||= new GameObject(this)
        grid.x = width / 2
        grid.y = height / 2
        grid.width = width
        grid.height = height
        const can = newCanvas(width, height), ctx = can.getContext("2d")
        ctx.strokeStyle = "lightgrey"
        const addLine = (x1, y1, x2, y2) => {
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
        }
        const boxSize = this.gridBoxSize
        const nbCols = ceil(width/boxSize), nbRows = ceil(height/boxSize)
        for(let x=1; x<nbCols; ++x) addLine(boxSize*x, 0, boxSize*x, height)
        for(let y=1; y<nbRows; ++y) addLine(0, boxSize*y, width, boxSize*y)
        grid.sprite = new Sprite(can)
        return grid
    }

    drawSelections(ctx) {
        for(let sel of this.selections) {
            let left, top, width, height
            if(sel instanceof Wall) {
                left = min(sel.x1, sel.x2)
                top = min(sel.y1, sel.y2)
                width = abs(sel.x1 - sel.x2)
                height = abs(sel.y1 - sel.y2)
            } else if(sel instanceof Actor) {
                const hitBox = sel.getHitBox()
                left = hitBox.left
                top = hitBox.top
                width = hitBox.width
                height = hitBox.height
            } else if(sel instanceof ActorLink) {
                const { x:x1, y:y1 } = sel.triggerActor
                const { x:x2, y:y2 } = sel.reactionActor
                left = x1
                top = y1
                width = x2 - x1
                height = y2 - y1
            }
            ctx.lineWidth = 1
            ctx.strokeStyle = "grey"
            ctx.beginPath()
            ctx.setLineDash([5, 5])
            ctx.rect(left, top, width, height)
            ctx.stroke()
        }
    }

    drawLinkedActor(ctx) {
        if(!this.linkedActor) return
        const { left, top, width, height } = this.linkedActor.getHitBox()
        ctx.lineWidth = 2
        ctx.strokeStyle = "red"
        ctx.beginPath()
        ctx.rect(left, top, width, height)
        ctx.stroke()
    }

    drawActorLinks(ctx) {
        const gameScn = this.game.scenes.game
        ctx.lineWidth = 1
        ctx.strokeStyle = "red"
        ctx.beginPath()
        ctx.setLineDash([5, 5])
        gameScn.actors.forEach(act => {
            const actLinks = act.actorLinks
            if(actLinks) actLinks.forEach(actLink => {
                const trigAct = actLink.triggerActor
                ctx.moveTo(act.x, act.y)
                ctx.lineTo(trigAct.x, trigAct.y)
            })
        })
        ctx.stroke()
    }
}


class ActorSelectorElement extends HTMLElement {
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
            style: {
                position: "relative",
            }
        })
        this.shadowRoot.append(styleEl, selectWrapperEl)
        this.selectEl = addNewDomEl(selectWrapperEl, "cs-option", {
            tabindex: "0",
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
            }
        })
        this.selectEl.onclick = () => this.setOptionsVisibility(true)
        selectWrapperEl.onblur = () => this.setOptionsVisibility(false)
    }
    initCatalog(catalog, filter) {
        this.catalog = catalog
        this.optionsEl.innerHTML = ""
        for(let actKey in catalog.actors) {
            const actCat = catalog.actors[actKey]
            if(!actCat.showInBuilder) continue
            if(filter && !filter(actCat)) continue
            const optionEl = addNewDomEl(this.optionsEl, "cs-option")
            this.setOptionKey(optionEl, actKey)
            optionEl.onclick = () => {
                this.setSelectedActor(actKey)
                this.setOptionsVisibility(false)
            }
        }
    }
    setOptionKey(optionEl, actKey) {
        const actCat = this.catalog.actors[actKey]
        const label = actCat.label
        const icon = actCat.icon
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
    setSelectedActor(actKey) {
        this.value = actKey
        this.setOptionKey(this.selectEl, actKey)
        // this.dispatchEvent(new CustomEvent("select", {
        //     detail: { key: actKey }
        // }))
        this.dispatchEvent(new CustomEvent("change", {
            detail: { key: actKey }
        }))
    }
}
customElements.define('dmg-actor-selector', ActorSelectorElement)



class ActorStateElement extends HTMLElement {
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
    initActor(act) {
        this.statesEl.innerHTML = ""
        act.constructor.STATE_PROPS.forEach(prop => {
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
            wrapperEl.appendChild(prop.createObjectInput(act))
        })
    }
    setOptionKey(optionEl, actKey) {
        const actCat = this.catalog.actors[actKey]
        const label = actCat.label
        const icon = actCat.icon
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
    setSelectedActor(actKey) {
        this.value = actKey
        this.setOptionKey(this.selectEl, actKey)
        this.dispatchEvent(new CustomEvent("change", {
            detail: { key: actKey }
        }))
    }
}
customElements.define('dmg-actor-state', ActorStateElement)


class ActorLinkElement extends HTMLElement {
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

        this.actorLink = null
    }
    initActorLink(actLink) {
        this.actorLink = actLink
        this.wrapperEl.innerHTML = ""
        const keysEl = addNewDomEl(this.wrapperEl, "div", {
            display: "flex",
            flexDirection: "row",
        })
        addNewDomEl(keysEl, "span", { text: "trigger:" })
        const trigKeyEl = addNewDomEl(keysEl, "select")
        actLink.reactionActor.constructor.LINK_TRIGGERS.forEach((trig, funcName) => {
            addNewDomEl(trigKeyEl, "option", {
                value: funcName,
                text: trig.label,
            })
        })
        trigKeyEl.value = actLink.triggerKey
        trigKeyEl.addEventListener("change", () => actLink.triggerKey = trigKeyEl.value)
        addNewDomEl(keysEl, "span", { text: "reaction:" })
        const reactKeyEl = addNewDomEl(keysEl, "select")
        actLink.reactionActor.constructor.LINK_ACTIONS.forEach((trig, funcName) => {
            addNewDomEl(reactKeyEl, "option", {
                value: funcName,
                text: trig.label,
            })
        })
        reactKeyEl.value = actLink.reactionKey
        reactKeyEl.addEventListener("change", () => actLink.reactionKey = reactKeyEl.value)
    }
}
customElements.define('dmg-actor-link', ActorLinkElement)


function distancePointSegment(x, y, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    const px = x1 + t * dx, py = y1 + t * dy
    if (t < 0) return sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1))
    else if (t > 1) sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2))
    else return sqrt((x - px) * (x - px) + (y - py) * (y - py))
  }