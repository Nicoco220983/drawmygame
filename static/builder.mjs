const { assign } = Object
const { abs, floor, ceil, min, max, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'
const { urlAbsPath, addToLoads, checkAllLoadsDone, checkHit, sumTo, newCanvas, newDomEl } = utils
import { GameCommon, SceneCommon, Entity, Wall, Entities, Sprite, Hero, now, FPS, SpawnEntityEvent, nbKeys, INIT_STATE } from './game.mjs'


// BUILDER //////////////////////////

export class GameBuilder extends GameCommon {

    constructor(canvasParentEl, menuEl, lib, map, kwargs) {
        super(canvasParentEl, lib, map, kwargs)
        this.menuEl = menuEl
        this.selectionMenu = new SelectionMenu(this)
        this.setMode("move")
        this.initTouches()
    }

    initGameScene() {
        this.scenes.game = new BuilderScene(this)
        this.scenes.game.loadMap(this.map)
        this.syncSize()
    }

    play() {
        if(this.gameLoop) return
        const beginTime = now()
        this.gameLoop = setInterval(() => {
            this.update()
            this.mayDraw()
        }, 1000 / FPS)
    }

    stop() {
        if(this.gameLoop) clearInterval(this.gameLoop)
        this.gameLoop = null
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
        this.scenes.game.syncMode()
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
        this.selections = []
    }

    syncSizeAndPos() {
        super.syncSizeAndPos()
        this.syncGrid()
    }

    initHeros() {
        const mapHeros = this.map.heros
        for(let heroDef of mapHeros) {
            const { key, x, y } = heroDef
            this.newEntity(key, { x, y })
        }
    }

    initEntities() {
        this.map.entities.forEach(entState => {
            const ent = this.newEntity(entState.key)
            ent.setInitState(entState)
        })
    }

    initEvents() {
        this.map.events.forEach(evt => {
            const { key: evtKey } = evt
            if(evtKey == "ent") {
                const ent = this.newEntity(evt.state.key)
                ent.setState(evt.state)
                ent.builderTrigger = (nbKeys(evt) > 1) ? evt : null
            }
        })
    }

    syncGrid() {
        if(!this.map) return
        const { width, height } = this.map
        let { grid } = this
        if(grid && grid.width == width && grid.height == height) return
        grid = this.grid ||= new Entity(this)
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
        const boxSize = 20, nbCols = ceil(width/boxSize), nbRows = ceil(height/boxSize)
        for(let x=1; x<nbCols; ++x) addLine(boxSize*x, 0, boxSize*x, height)
        for(let y=1; y<nbRows; ++y) addLine(0, boxSize*y, width, boxSize*y)
        grid.sprite = new Sprite(can)
    }

    syncMode() {
        const { mode, modeKey } = this.game
        this.prevTouchX = null
        this.prevTouchY = null
        if(this.draftEntity) {
            this.draftEntity.remove()
            this.draftEntity = null
        }
        if(mode == "entity") {
            this.draftEntity = this.newEntity(modeKey)
            this.draftEntity.spriteVisibility = 0
        }
    }

    update() {
        super.update()
        const { mode } = this.game
        this.updateDraftEntity()
        if(mode == "move") this.updateMove()
        else if(mode == "select") this.updateSelect()
        else if(mode == "wall") this.addPointedWall()
        else if(mode == "erase") this.erasePointedEntityOrWall()
        else if(mode == "entity") this.addPointedEntity()
    }

    updateDraftEntity() {
        if(!this.draftEntity) return
        const { mode } = this.game
        const touch = this.game.touches[0]
        if(touch) {
            this.draftEntity.spriteVisibility = .5
            if(mode == "entity") {
                this.draftEntity.x = touch.x
                this.draftEntity.y = touch.y
            } else if(mode == "wall") {
                this.draftEntity.x2 = touch.x
                this.draftEntity.y2 = touch.y
            }
        } else {
            this.draftEntity.spriteVisibility = 0
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
            // entities
            this.entities.forEach(ent  => {
                const { left, width, top, height } = ent.getHitBox()
                if(left <= x && left+width >= x && top <= y && top+height >= y) {
                    this.select(ent)
                }
            })
        }
    }

    select(ent) {
        this.selections.push(ent)
        this.game.selectionMenu.clear()
        this.game.selectionMenu.addSelection(ent)
    }

    addPointedWall() {
        const { touches, prevTouchIsDown, modeKey } = this.game
        const touch = touches[0]

        if(touch && touch.isDown && !prevTouchIsDown) {
            const touchX = touch.x + this.viewX
            const touchY = touch.y + this.viewY
            if(this.prevTouchX !== null) {
                this.newWall({ key:modeKey, x1:this.prevTouchX, y1:this.prevTouchY, x2:touchX, y2:touchY })
            }
            if(!this.draftEntity) {
                this.draftEntity = this.newWall({ key:modeKey, x1:touchX, y1:touchY, x2:touchX, y2:touchY })
                this.draftEntity.visibility = .5
            } else {
                this.draftEntity.x1 = touchX
                this.draftEntity.y1 = touchY
            }
            this.prevTouchX = touchX
            this.prevTouchY = touchY
        }
    }

    newEntity(key, kwargs) {
        const ent = super.newEntity(key, kwargs)
        if(ent instanceof Hero) {
            this.entities.forEach(ent2 => {
                if(ent2 !== ent && ent2 instanceof Hero && ent2 != this.draftEntity)
                    ent2.remove()
            })
        }
        return ent
    }

    erasePointedEntityOrWall() {
        const { touches, prevTouchIsDown } = this.game
        const touch = touches[0]
        if(touch && touch.isDown && !prevTouchIsDown) {
            const x = touch.x + this.viewX, y = touch.y + this.viewY
            // walls
            this.walls.forEach(wall => {
                if(distancePointSegment(x, y, wall.x1, wall.y1, wall.x2, wall.y2) <= 5)
                    wall.remove()
            })
            // entities
            this.entities.forEach(ent  => {
                const { left, width, top, height } = ent.getHitBox()
                if(left <= x && left+width >= x && top <= y && top+height >= y) {
                    ent.remove()
                }
            })
        }
    }

    addPointedEntity() {
        const { touches, prevTouchIsDown } = this.game
        const { modeKey } = this.game
        const touch = touches[0]
        if(touch && touch.isDown && !prevTouchIsDown) {
            const x = floor(touch.x + this.viewX)
            const y = floor(touch.y + this.viewY)
            this.newEntity(modeKey, { x, y })
        }
    }

    syncMap() {
        if(this.draftEntity) this.draftEntity.remove()
        this.draftEntity = null
        const { map } = this.game
        map.walls.length = 0
        this.walls.forEach(wall => {
            if(wall.removed) return
            const { x1, y1, x2, y2, key } = wall
            map.walls.push({ x1, y1, x2, y2, key })
        })
        map.heros.length = 0
        map.entities.length = 0
        map.events.length = 0
        this.entities.forEach(ent => {
            if(ent.removed) return
            const state = ent.getInitState()
            if(ent instanceof Hero) map.heros.push(state)
            else {
                if(ent.builderTrigger) {
                    const evt = new SpawnEntityEvent(this, ent.builderTrigger)
                    evt.entState = state
                    map.events.push(evt.getInitState())
                } else {
                    map.entities.push(state)
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
            } else if(sel instanceof Entity) {
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
    addSelection(ent) {
        this.selections.push(ent)
        //if(ent.addMenuInputs) ent.addMenuInputs(this)
        for(let prop of ent.constructor.STATE_PROPS) if((prop.type & INIT_STATE) === INIT_STATE) {
            const inputEl = prop.toInput(ent)
            inputEl.onchange = () => prop.fromInput(ent, inputEl)
            this.addInput("section", prop.key, inputEl)
        }
        this.addSpawnEntityTriggerInputs(ent)
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
    addSpawnEntityTriggerInputs(ent) {
        const sectionEl = this.getSection("trigger")
        const checkEl = sectionEl.appendChild(newDomEl("input", { type: "checkbox" }))
        const trigWrapperEl = sectionEl.appendChild(newDomEl("div"))
        checkEl.checked = Boolean(ent.builderTrigger)
        const syncTriggerInputs = () => {
            trigWrapperEl.innerHTML = ""
            if(checkEl.checked) {
                const trigEl = trigWrapperEl.appendChild(newDomEl("dmg-spawn-entity-event-trigger-form"))
                trigEl.setTrigger(ent.builderTrigger)
            }
        }
        syncTriggerInputs()
        checkEl.onchange = () => {
            ent.builderTrigger = checkEl.checked ? {} : null
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


class SpawnEntityTriggerFormElement extends TriggerFormElement {
    initSelEl() {
        super.initSelEl()
        const { selEl } = this
        selEl.appendChild(newDomEl("option", { value: "nbEnts", text: "nb entities" }))
        selEl.appendChild(newDomEl("option", { value: "prevEntFur", text: "previous entity further" }))
    }
    syncSel() {
        const { selEl, trigger } = this
        super.syncSel()
        if(trigger.nbEnts !== undefined) return selEl.value = "nbEnts"
        if(trigger.prevEntFur !== undefined) return selEl.value = "prevEntFur"
    }
    syncTrigger() {
        super.syncTrigger()
        const { selEl, triggerEl, trigger } = this
        const key = selEl.value
        if(key == "nbEnts") {
            if(trigger[key] === null) trigger[key] = 1
            const inputEl = triggerEl.appendChild(newDomEl("input", { type: "number", value: trigger[key] }))
            inputEl.onchange = () => trigger[key] = parseInt(inputEl.value)
        }
        if(key == "prevEntFur") {
            if(trigger[key] === null) trigger[key] = 100
            const inputEl = triggerEl.appendChild(newDomEl("input", { type: "number", value: trigger[key] }))
            inputEl.onchange = () => trigger[key] = parseInt(inputEl.value)
        }
    }
}
customElements.define("dmg-spawn-entity-event-trigger-form", SpawnEntityTriggerFormElement)


function distancePointSegment(x, y, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    const px = x1 + t * dx, py = y1 + t * dy
    if (t < 0) return sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1))
    else if (t > 1) sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2))
    else return sqrt((x - px) * (x - px) + (y - py) * (y - py))
  }