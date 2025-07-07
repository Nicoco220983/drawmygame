const { assign } = Object
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, addToLoads, checkAllLoadsDone, checkHit, sumTo, newCanvas, newDomEl } = utils
import { GameCommon, SceneCommon, GameObject, Wall, Sprite, Hero, now, FPS, SpawnActorEvent, nbKeys, INIT_STATE } from './game.mjs'


// BUILDER //////////////////////////

export class GameBuilder extends GameCommon {

    constructor(canvasParentEl, menuEl, catalog, map, kwargs) {
        super(canvasParentEl, catalog, map, kwargs)
        this.menuEl = menuEl
        this.selectionMenu = new SelectionMenu(this)
        this.initBuilderScene()
        this.setMode("move")
        this.initTouches()
    }

    initBuilderScene() {
        this.scenes.game = new BuilderScene(this)
        this.scenes.game.loadMap("0")
        this.syncSize()
    }

    update() {
        super.update()
        const touch = this.touches[0]
        this.prevTouchIsDown = Boolean(touch) && touch.isDown
    }

    setMode(mode, modeKey = null) {
        this.mode = mode
        this.modeKey = modeKey
        if(mode == "move") this.canvas.style.cursor = "move"
        else this.canvas.style.cursor = "cell"
        const gameScn = this.scenes.game
        gameScn.syncMode()
    }

    setAnchor(val) {
        this.scenes.game.anchor = val
    }

    syncMap() {
        this.scenes.game.syncMap()
    }

    clearSelection() {
        this.scenes.game.selections.length = 0
        this.selectionMenu.clear()
    }
}


class BuilderScene extends SceneCommon {
    constructor(...args) {
        super(...args)
        this.viewSpeed = Infinity
        this.gridBoxSize = 20
        this.anchor = true
        this.selections = []
    }

    syncSizeAndPos() {
        super.syncSizeAndPos()
        this.syncGrid()
    }

    loadMap(map) {
        super.loadMap(map)
        this.initHeros()
        this.initEvents()
    }

    initHeros() {
        const mapHeros = this.map.heros
        if(!mapHeros) return
        for(let heroDef of mapHeros) {
            const { key, x, y } = heroDef
            this.newActor(key, { x, y })
        }
    }

    initActors() {
        const mapEnts = this.map.actors
        if(!mapEnts) return
        mapEnts.forEach(actState => {
            const act = this.newActor(actState.key)
            act.setInitState(actState)
        })
    }

    initEvents() {
        const mapEvts = this.map.events
        if(!mapEvts) return
        mapEvts.forEach(evt => {
            const { key: evtKey } = evt
            if(evtKey == "act") {
                const act = this.newActor(evt.state.key)
                act.setState(evt.state)
                act.builderTrigger = (nbKeys(evt) > 1) ? evt : null
            }
        })
    }

    syncGrid() {
        if(!this.map) return
        const { width, height } = this.map
        let { grid } = this
        if(grid && grid.width == width && grid.height == height) return
        grid = this.grid ||= new GameObject(this)
        grid.x = width / 2
        grid.y = height / 2
        grid.width = width
        grid.height = height
        const can = newCanvas(width, height)
        const ctx = can.getContext("2d")
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
    }

    syncMode() {
        const { mode, modeKey } = this.game
        this.prevPos = null
        if(this.draftActor) {
            this.draftActor.remove()
            this.draftActor = null
        }
        if(mode == "actor") {
            this.draftActor = this.newActor(modeKey)
            this.draftActor.spriteVisibility = 0
        }
    }

    update() {
        const { mode } = this.game
        this.updateDraftActor()
        if(mode == "move") this.updateMove()
        else if(mode == "select") this.updateSelect()
        else if(mode == "wall") this.addPointedWall()
        else if(mode == "erase") this.erasePointedActorOrWall()
        else if(mode == "actor") this.addPointedActor()
        this.notifs.update()
    }

    updateDraftActor() {
        if(!this.draftActor) return
        const { mode } = this.game
        const touch = this.game.touches[0]
        if(touch) {
            this.draftActor.spriteVisibility = .5
            const draftPos = {
                x: touch.x + this.viewX,
                y: touch.y + this.viewY,
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

    updateMove() {
        const { touches } = this.game
        const touch = touches[0]
        if(touch && touch.isDown) {
            if(!this.moveOrig) this.moveOrig = {
                touchX: touch.x,
                touchY: touch.y,
                viewX: this.viewX,
                viewY: this.viewY,
            }
            this.setView(
                this.moveOrig.viewX - (touch.x - this.moveOrig.touchX),
                this.moveOrig.viewY - (touch.y - this.moveOrig.touchY),
            )
        } else {
            this.moveOrig = null
        }
    }

    updateSelect() {
        const { touches, prevTouchIsDown } = this.game
        const touch = touches[0]
        if(touch && touch.isDown && !prevTouchIsDown) {
            const x = touch.x + this.viewX, y = touch.y + this.viewY
            // walls
            this.walls.forEach(wall => {
                if(distancePointSegment(x, y, wall.x1, wall.y1, wall.x2, wall.y2) <= 5)
                    this.select(wall)
            })
            // actors
            this.actors.forEach(act  => {
                const { left, width, top, height } = act.getHitBox()
                if(left <= x && left+width >= x && top <= y && top+height >= y) {
                    this.select(act)
                }
            })
        }
    }

    select(obj) {
        this.selections.push(obj)
        this.game.selectionMenu.clear()
        this.game.selectionMenu.addSelection(obj)
    }

    addPointedWall() {
        const { touches, prevTouchIsDown, modeKey } = this.game
        const touch = touches[0]

        if(touch && touch.isDown && !prevTouchIsDown) {
            const pos = {
                x: touch.x + this.viewX,
                y: touch.y + this.viewY,
            }
            if(this.anchor) this.applyAnchor(pos)
            if(this.prevPos !== null) {
                this.newWall({ key:modeKey, x1:this.prevPos.x, y1:this.prevPos.y, x2:pos.x, y2:pos.y })
            }
            if(!this.draftActor) {
                this.draftActor = this.newWall({ key:modeKey, x1:pos.x, y1:pos.y, x2:pos.x, y2:pos.y })
                this.draftActor.visibility = .5
            } else {
                this.draftActor.x1 = pos.x
                this.draftActor.y1 = pos.y
            }
            this.prevPos = pos
        }
    }

    newActor(key, kwargs) {
        const act = super.newActor(key, kwargs)
        if(act instanceof Hero) {
            this.actors.forEach(act2 => {
                if(act2 !== act && act2 instanceof Hero && act2 != this.draftActor)
                    act2.remove()
            })
        }
        return act
    }

    erasePointedActorOrWall() {
        const { touches, prevTouchIsDown } = this.game
        const touch = touches[0]
        if(touch && touch.isDown && !prevTouchIsDown) {
            const x = touch.x + this.viewX, y = touch.y + this.viewY
            // walls
            this.walls.forEach(wall => {
                if(distancePointSegment(x, y, wall.x1, wall.y1, wall.x2, wall.y2) <= 5)
                    wall.remove()
            })
            // actors
            this.actors.forEach(act  => {
                const { left, width, top, height } = act.getHitBox()
                if(left <= x && left+width >= x && top <= y && top+height >= y) {
                    act.remove()
                }
            })
        }
    }

    addPointedActor() {
        const { touches, prevTouchIsDown } = this.game
        const { modeKey } = this.game
        const touch = touches[0]
        if(touch && touch.isDown && !prevTouchIsDown) {
            const x = floor(touch.x + this.viewX)
            const y = floor(touch.y + this.viewY)
            this.newActor(modeKey, { x, y })
        }
    }

    applyAnchor(pos) {
        const boxSize = this.gridBoxSize
        const x1 = floor(pos.x / boxSize) * boxSize, x2 = x1 + boxSize
        pos.x = (pos.x-x1 < x2-pos.x) ? x1 : x2
        const y1 = floor(pos.y / boxSize) * boxSize, y2 = y1 + boxSize
        pos.y = (pos.y-y1 < y2-pos.y) ? y1 : y2
    }

    syncMap() {
        if(this.draftActor) this.draftActor.remove()
        this.draftActor = null
        const { map } = this.game
        const mapScn = map.scenes["0"]
        const mapScnWalls = mapScn.walls ||= []
        mapScnWalls.length = 0
        this.walls.forEach(wall => {
            if(wall.removed) return
            const { x1, y1, x2, y2, key } = wall
            mapScnWalls.push({ x1, y1, x2, y2, key })
        })
        const mapScnHeros = mapScn.heros ||= []
        mapScnHeros.length = 0
        const mapScnEnts = mapScn.actors ||= []
        mapScnEnts.length = 0
        const mapScnEvts = mapScn.events ||= []
        mapScnEvts.length = 0
        this.actors.forEach(act => {
            if(act.removed) return
            const state = act.getInitState()
            if(act instanceof Hero) mapScnHeros.push(state)
            else {
                if(act.builderTrigger) {
                    const evt = new SpawnActorEvent(this, act.builderTrigger)
                    evt.actState = state
                    mapScnEvts.push(evt.getInitState())
                } else {
                    mapScnEnts.push(state)
                }
            }
        })
    }

    drawTo(ctx) {
        ctx.translate(~~-this.viewX, ~~-this.viewY)
        this.grid.drawTo(ctx)
        ctx.translate(~~this.viewX, ~~this.viewY)
        super.drawTo(ctx)
        ctx.translate(~~-this.viewX, ~~-this.viewY)
        this.drawSelections(ctx)
        ctx.translate(~~this.viewX, ~~this.viewY)
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
        for(let prop of obj.constructor.INIT_STATE_PROPS) {
            const inputEl = prop.toInput(obj)
            inputEl.onchange = () => prop.fromInput(obj, inputEl)
            this.addInput("section", prop.key, inputEl)
        }
        this.addSpawnActorTriggerInputs(obj)
    }
    getSection(section) {
        const { menuEl } = this.game
        let sectionEl = this.sectionEls[section]
        if(!sectionEl) {
            sectionEl = this.sectionEls[section] = menuEl.appendChild(newDomEl("div"))
            sectionEl.appendChild(newDomEl("div", { style: { fontWeight: "bold" }, text: section }))
        }
        return sectionEl
    }
    addInput(section, name, input, defVal) {
        if(typeof input === "string") {
            const inputEl = document.createElement("input")
            inputEl.type = input
            inputEl.value = defVal
            input = inputEl
        }
        const sectionEl = this.getSection(section)
        const lineEl = sectionEl.appendChild(newDomEl("div"))
        lineEl.innerHTML = `<span>${name}:</span>`
        lineEl.appendChild(input)
        return input
    }
    updateState(key, val) {
        for(let sel of this.game.scenes.game.selections) {
            sel[key] = val
        }
    }
    addSpawnActorTriggerInputs(act) {
        const sectionEl = this.getSection("trigger")
        const checkEl = sectionEl.appendChild(newDomEl("input", { type: "checkbox" }))
        const trigWrapperEl = sectionEl.appendChild(newDomEl("div"))
        checkEl.checked = Boolean(act.builderTrigger)
        const syncTriggerInputs = () => {
            trigWrapperEl.innerHTML = ""
            if(checkEl.checked) {
                const trigEl = trigWrapperEl.appendChild(newDomEl("dmg-spawn-actor-event-trigger-form"))
                trigEl.setTrigger(act.builderTrigger)
            }
        }
        syncTriggerInputs()
        checkEl.onchange = () => {
            act.builderTrigger = checkEl.checked ? {} : null
            syncTriggerInputs()
        }
    }
}


class TriggerFormElement extends HTMLElement {
    connectedCallback() {
        this.innerHTML = ""
        assign(this.style, {
            display: "flex",
            flexDirection: "column",
        })
        this.initSelEl()
        this.triggerEl = this.appendChild(newDomEl("div"))
        this.connected = true
        this.sync()
    }
    initSelEl() {
        const selEl = this.selEl = this.appendChild(newDomEl("select"))
        selEl.appendChild(newDomEl("option", { value: "", text: "" }))
        selEl.appendChild(newDomEl("option", { value: "maxExecs", text: "max execs" }))
        selEl.appendChild(newDomEl("option", { value: "prevExecOlder", text: "prev exec older" }))
        selEl.appendChild(newDomEl("option", { value: "and", text: "and" }))
        selEl.appendChild(newDomEl("option", { value: "or", text: "or" }))
        selEl.appendChild(newDomEl("option", { value: "not", text: "not" }))
        selEl.onchange = () => {
            for(let key in this.trigger) delete this.trigger[key]
            this.trigger[selEl.value] = null
            this.syncTrigger()
        }
    }
    setTrigger(trigger) {
        this.trigger = trigger
        this.sync()
    }
    sync() {
        if(!this.connected || !this.trigger) return
        this.syncSel()
        this.syncTrigger()
    }
    syncSel() {
        const { selEl, trigger } = this
        selEl.value = ""
        if(trigger.maxExecs !== undefined) return selEl.value = "maxExecs"
        if(trigger.prevExecOlder !== undefined) return selEl.value = "prevExecOlder"
        if(trigger.and !== undefined) return selEl.value = "and"
        if(trigger.or !== undefined) return selEl.value = "or"
        if(trigger.not !== undefined) return selEl.value = "not"
    }
    syncTrigger() {
        const { selEl, triggerEl, trigger } = this
        triggerEl.innerHTML = ""
        const key = selEl.value
        if(key == "maxExecs" || key == "prevExecOlder") {
            if(trigger[key] === null) trigger[key] = 0
            const inputEl = triggerEl.appendChild(newDomEl("input", { type: "number", value: trigger[key] }))
            inputEl.onchange = () => trigger[key] = parseInt(inputEl.value)
        } else if(key == "and" || key == "or") {
            if(trigger[key] === null) trigger[key] = []
            const butEl = triggerEl.appendChild(newDomEl("button", { text: "Add" }))
            butEl.onclick = () => {
                const newTrig = {}
                trigger[key].push(newTrig)
                this.addSubTriggerElement(newTrig)
            }
            if(trigger[key]) for(let subTrigger of trigger[key]) this.addSubTriggerElement(subTrigger)
        } else if(key == "not") {
            if(trigger[key] === null) trigger[key] = {}
            this.addSubTriggerElement(trigger[key])
        }
    }
    addSubTriggerElement(subTrigger) {
        const subEl = newDomEl(this.tagName)
        subEl.setTrigger(subTrigger)
        this.triggerEl.appendChild(subEl)
    }
}
customElements.define("dmg-event-trigger-form", TriggerFormElement)


class SpawnActorTriggerFormElement extends TriggerFormElement {
    initSelEl() {
        super.initSelEl()
        const { selEl } = this
        selEl.appendChild(newDomEl("option", { value: "nbActs", text: "nb actors" }))
        selEl.appendChild(newDomEl("option", { value: "prevActFur", text: "previous actor further" }))
    }
    syncSel() {
        const { selEl, trigger } = this
        super.syncSel()
        if(trigger.nbActs !== undefined) return selEl.value = "nbActs"
        if(trigger.prevActFur !== undefined) return selEl.value = "prevActFur"
    }
    syncTrigger() {
        super.syncTrigger()
        const { selEl, triggerEl, trigger } = this
        const key = selEl.value
        if(key == "nbActs") {
            if(trigger[key] === null) trigger[key] = 1
            const inputEl = triggerEl.appendChild(newDomEl("input", { type: "number", value: trigger[key] }))
            inputEl.onchange = () => trigger[key] = parseInt(inputEl.value)
        }
        if(key == "prevActFur") {
            if(trigger[key] === null) trigger[key] = 100
            const inputEl = triggerEl.appendChild(newDomEl("input", { type: "number", value: trigger[key] }))
            inputEl.onchange = () => trigger[key] = parseInt(inputEl.value)
        }
    }
}
customElements.define("dmg-spawn-actor-event-trigger-form", SpawnActorTriggerFormElement)


function distancePointSegment(x, y, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    const px = x1 + t * dx, py = y1 + t * dy
    if (t < 0) return sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1))
    else if (t > 1) sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2))
    else return sqrt((x - px) * (x - px) + (y - py) * (y - py))
  }