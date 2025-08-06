const { assign } = Object
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, addToLoads, checkAllLoadsDone, checkHit, sumTo, newCanvas, newDomEl } = utils
import { GameCommon, SceneCommon, DefaultScene, GameObject, Wall, Sprite, Hero, now, FPS, nbKeys } from './game.mjs'


// BUILDER //////////////////////////

export class GameBuilder extends GameCommon {

    constructor(canvasParentEl, menuEl, catalog, map, kwargs) {
        super(canvasParentEl, catalog, map, kwargs)
        this.menuEl = menuEl
        this.selectionMenu = new SelectionMenu(this)
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
            this.pressedKeys.add(evt.key)
            if(evt.key == "Escape") {
                if(this.mode != "cursor") this.setMode("cursor")
                else this.clearSelection()
            }
            if(evt.key == "Backspace") {
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
            obj.remove()
        }
        this.clearSelection()
    }

    clearSelection() {
        this.scenes.draft.selections.length = 0
        this.selectionMenu.clear()
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
                this.objClicked = this.checkTouchSelect(touch)
                this.initMove(touch, this.objClicked)
            } else {
                this.updateMove(touch, this.objClicked)
            }
        } else {
            if(prevTouchIsDown) {
                if(!this.hasMoved() && this.objClicked) {
                    this.select(this.objClicked)
                }
            }
            this.clearMove()
        }
    }

    checkTouchSelect(touch) {
        const gameScn = this.game.scenes.game
        const x = touch.x + gameScn.viewX, y = touch.y + gameScn.viewY
        let res = null
        // walls
        gameScn.walls.forEach(wall => {
            if(distancePointSegment(x, y, wall.x1, wall.y1, wall.x2, wall.y2) <= 5) {
                res = wall
            }
        })
        if(res) return res
        // actors
        gameScn.actors.forEach(act  => {
            const { left, width, top, height } = act.getHitBox()
            if(left <= x && left+width >= x && top <= y && top+height >= y) {
                res = act
            }
        })
        return res
    }

    initMove(touch, obj) {
        const orig = this._moveOrig = {
            touchX: touch.x,
            touchY: touch.y,
            viewX: this.viewX,
            viewY: this.viewY,
        }
        if(obj) {
            const objs = this.selections.concat([obj])
            orig.objs = objs
            orig.objsX = objs.map(o => o.x)
            orig.objsY = objs.map(o => o.y)
        }
    }

    updateMove(touch, obj) {
        const orig = this._moveOrig
        if(!orig) return
        if(!obj) {
            const viewX = orig.viewX - (touch.x - orig.touchX)
            const viewY = orig.viewY - (touch.y - orig.touchY)
            this.setView(viewX, viewY)
            this.game.scenes.game.setView(viewX, viewY)
        } else {
            for(let idx in orig.objs) {
                const obj = orig.objs[idx]
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

    clearMove() {
        this._moveOrig = null
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
        if(!this.game.pressedKeys.has("Shift")) this.game.clearSelection()
        this.selections.push(obj)
        const selMenu = this.game.selectionMenu
        selMenu.clear()
        selMenu.addSelection(obj)
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
            } else if(sel instanceof GameObject) {
                const hitBox = sel.getHitBox()
                left = hitBox.left
                top = hitBox.top
                width = hitBox.width
                height = hitBox.height
            }
            ctx.lineWidth = 1
            ctx.strokeStyle = "grey"
            ctx.beginPath()
            ctx.setLineDash([5, 5])
            ctx.rect(left, top, width, height)
            ctx.stroke()
        }
    }
}


class SelectionMenu {
    constructor(scn) {
        this.scene = scn
        this.game = scn.game
        this.sectionEls = {}
        this.selections = []
    }
    clear() {
        const { menuEl } = this.game
        menuEl.innerHTML = ""
        this.sectionEls = {}
        this.selections.length = 0
    }
    addSelection(obj) {
        this.selections.push(obj)
        const statesEl = document.createElement("dmg-actor-state")
        statesEl.setActor(obj)
        this.game.menuEl.appendChild(statesEl)
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
        const selectEl = this.selectEl = newDomEl("cs-option", {
            tabindex: "0",
            style: {
                border: "1px solid black",
            }
        })
        selectWrapperEl.appendChild(selectEl)
        const optionsEl = this.optionsEl = newDomEl("div", {
            style: {
                border: "1px solid black",
                position: "absolute",
                top: "100%",
                left: "0",
                display: "none",
            }
        })
        selectWrapperEl.appendChild(optionsEl)
        selectEl.onclick = () => this.setOptionsVisibility(true)
        selectWrapperEl.onblur = () => this.setOptionsVisibility(false)
    }
    initCatalog(catalog, filter) {
        this.catalog = catalog
        this.optionsEl.innerHTML = ""
        for(let actKey in catalog.actors) {
            const actCat = catalog.actors[actKey]
            if(!actCat.showInBuilder) continue
            if(filter && !filter(actCat)) continue
            const optionEl = newDomEl("cs-option")
            this.setOptionKey(optionEl, actKey)
            this.optionsEl.appendChild(optionEl)
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
        optionEl.appendChild(newDomEl("span", {
            text: label,
            style: {
                paddingLeft: ".5em",
            }
        }))
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
    setActor(act) {
        this.statesEl.innerHTML = ""
        act.constructor.STATE_PROPS.forEach(prop => {
            if(!prop.showInBuilder) return
            const wrapperEl = newDomEl("div", {
                style: {
                    display: "flex",
                    flexDirection: "row",
                }
            })
            wrapperEl.appendChild(newDomEl("span", {
                text: prop.key
            }))
            const inputEl = prop.createObjectInput(act)
            wrapperEl.appendChild(inputEl)
            this.statesEl.appendChild(wrapperEl)
        })
    }
    setOptionKey(optionEl, actKey) {
        const actCat = this.catalog.actors[actKey]
        const label = actCat.label
        const icon = actCat.icon
        optionEl.innerHTML = ""
        if(icon) optionEl.appendChild(icon.cloneNode(true))
        optionEl.appendChild(newDomEl("span", {
            text: label,
            style: {
                paddingLeft: ".5em",
            }
        }))
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


function distancePointSegment(x, y, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    const px = x1 + t * dx, py = y1 + t * dy
    if (t < 0) return sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1))
    else if (t > 1) sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2))
    else return sqrt((x - px) * (x - px) + (y - py) * (y - py))
  }