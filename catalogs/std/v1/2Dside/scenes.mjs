const { assign } = Object
const { floor, round, ceil, min, max } = Math
import { GraphicsProps } from '../../../../core/v1/graphics.mjs'
import { SceneCommon, GameScene, GameObject, Category, StateProperty, StateBool, StateNumber, Mixin, OwnerableMixin, Text, ModuleCatalog, hackMethod, GameObjectGroup, PlayerIcon, PlayerText, importAndPreload } from '../../../../core/v1/game.mjs'
import { Hero, Wall, Star, HeroSpawnPoint } from './objects.mjs'
import * as utils from '../../../../core/v1/utils.mjs'
const { sumTo, newCanvas, newTextCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, addNewDomEl, importJs, hasKeys, nbKeys } = utils

export const CATALOG = new ModuleCatalog(import.meta.url, {
    version: "v1",
    perspective: "2Dside",
})


const IS_SERVER_ENV = (typeof window === 'undefined')


@StateNumber.undefine("z")
@StateNumber.undefine("y")
@StateNumber.undefine("x")
@Category.append("manager")
export class Manager extends GameObject {}


@Category.append("border")
export class BorderManager extends Manager {}


@CATALOG.registerObject({
    label: "Block Border",
    showInBuilder: true,
})
export class BlockBorderManager extends BorderManager {

    update() {
        super.update()
        this.initWalls()
    }

    initWalls() {
        if(this._initWallsDone) return
        this._initWallsDone = true
        const { scene } = this, { width, height } = scene
        scene.addObject(Wall, { x1:0, y1:0, x2:width, y2:0, visibility:0 })
        scene.addObject(Wall, { x1:width, y1:0, x2:width, y2:height, visibility:0 })
        scene.addObject(Wall, { x1:width, y1:height, x2:0, y2:height, visibility:0 })
        scene.addObject(Wall, { x1:0, y1:height, x2:0, y2:0, visibility:0 })
    }
}


@CATALOG.registerObject({
    label: "Damage Border",
    showInBuilder: true,
})
@StateNumber.define("heroOutDamages", { default: 10, nullableWith: Infinity, showInBuilder: true })
@StateNumber.define("limit", { default: 100, precision: 50, showInBuilder: true })
export class DamageBorderManager extends BorderManager {

    update() {
        super.update()
        const { scene, limit } = this
        const { width, height } = scene
        scene.objects.forEach(obj => {
            const { x, y } = obj
            if(x < -limit || x > width + limit || y < -limit || y > height + limit) {
                this.handleObjectOut(obj)
            }
        })
    }

    handleObjectOut(obj) {
        if(obj instanceof Hero) {
            obj.getDamaged(this.heroOutDamages)
            if(obj.getHealth() > 0) this.scene.spawnHero(obj)
        } else {
            obj.remove()
        }
    }
}


@CATALOG.registerObject({
    label: "Loop Border",
    showInBuilder: true,
})
export class LoopBorderManager extends BorderManager {

    update() {
        super.update()
        const { scene } = this
        const { width, height } = scene
        scene.objects.forEach(obj => {
            const { x, y } = obj
            if(x > width) obj.x -= width
            else if(x < 0) obj.x += width
            if(y > height) obj.y -= height
            else if(y < 0) obj.y += height
        })
    }
}


@CATALOG.registerObject({
    label: "Hero Lives",
    showInBuilder: true,
})
@Category.append("heroslives")
@StateProperty.define("deathsIts")
@StateNumber.define("delay", { default: 1, precision: .5, showInBuilder: true })
@StateNumber.define("lives", { default: 3, nullableWith: Infinity, showInBuilder: true })
export class HerosLivesManager extends Manager {

    init(kwargs) {
        super.init(kwargs)
        const { scene } = this
        hackMethod(scene, "onAddObject", -1, evt => {
            const obj = evt.inputArgs[0]
            if(!(obj instanceof Hero)) return
            hackMethod(obj, "die", -1, evt => {
                const deathsIts = this.deathsIts ||= {}
                deathsIts[obj.playerId] = scene.iteration
            })
        })
    }
    update() {
        const { scene, deathsIts, delay } = this
        const { game, iteration } = scene
        const { fps } = game
        if(deathsIts) {
            for(let playerId in deathsIts) {
                if(this.lives <= 0) break
                if(iteration >= (deathsIts[playerId] + (delay*fps))) {
                    scene.addHero(playerId)
                    delete deathsIts[playerId]
                    this.lives -= 1
                }
            }
            if(!hasKeys(deathsIts)) this.deathsIts = null
        }
    }
}


@Category.append("view")
export class ViewManager extends Manager {}


@CATALOG.registerObject({
    label: "View Heros Center",
    showInBuilder: true
})
export class ViewHerosCenterManager extends ViewManager {

    update() {
        super.update()
        this.updateSceneView()
    }

    updateSceneView() {
        const scn = this.scene
        const { heros, localHero, viewWidth, viewHeight } = scn
        if(!hasKeys(heros)) return
        if(localHero) {
            scn.setView(
                localHero.x - viewWidth/2,
                localHero.y - viewHeight/2,
            )
        } else {
            let sumX = 0, sumY = 0, nbHeros = 0
            for(let playerId in heros) {
                const hero = heros[playerId]
                sumX += hero.x
                sumY += hero.y
                nbHeros += 1
            }
            scn.setView(
                sumX / nbHeros - viewWidth/2,
                sumY / nbHeros - viewHeight/2,
            )
        }
    }
}


@CATALOG.registerObject({
    label: "View First Hero",
    showInBuilder: true
})
export class ViewFirstHeroManager extends ViewManager {

    init(kwargs) {
        super.init(kwargs)
        const { scene } = this
        hackMethod(scene, "spawnHero", 1, evt => {
            const hero = evt.inputArgs[0]
            this.spawnHero(hero)
            evt.stopPropagation()
        })
    }

    update() {
        super.update()
        this.updateSceneView()
        this.spawnFarHeros()
    }

    updateSceneView() {
        const scn = this.scene
        const { heros, localHero, viewWidth, viewHeight } = scn
        if(!hasKeys(heros)) return
        if(localHero) {
            scn.setView(
                localHero.x - viewWidth/2,
                localHero.y - viewHeight/2,
            )
        } else {
            const firstHero = scn.getFirstHero()
            if(firstHero) scn.setView(
                firstHero.x - viewWidth/2,
                firstHero.y - viewHeight/2,
            )
        }
    }

    spawnFarHeros() {
        const scn = this.scene
        const { heros, viewWidth, viewHeight } = scn
        const firstHero = scn.getFirstHero()
        if(!firstHero) return
        const { x:fhx, y:fhy } = firstHero
        for(let playerId in heros) {
            if(playerId === firstHero.playerId) continue
            const hero = heros[playerId]
            const dx = hero.x - fhx, dy = hero.y - fhy
            if(dx < -viewWidth*.7 || dx > viewWidth*.7 || dy < -viewHeight*.7 || dy > viewHeight*.7) {
                this.spawnHero(hero)
            }
        }
    }

    spawnHero(hero) {
        const scn = this.scene
        const firstHero = scn.getFirstHero()
        let spawnX, spawnY
        if(!firstHero || hero === firstHero) {
            spawnX = scn.herosSpawnX
            spawnY = scn.herosSpawnY
        } else {
            spawnX = firstHero.x
            spawnY = firstHero.y
        }
        hero.spawn(spawnX, spawnY)
    }
}


@CATALOG.registerObject({
    label: "Physics",
})
@StateNumber.define("gravityAcc", { default: 1000, precision: 100 })
@StateNumber.define("gravityMaxSpeed", { default: 1000, precision: 100 })
@Category.append("physics")
export class PhysicsManager extends Manager {}


@CATALOG.registerObject({
    label: "Attack",
})
@Category.append("attack")
export class AttackManager extends Manager {

    canTeamAttack(team1, team2) {
        return true
    }
    canTeamDamage(team1, team2) {
        return team1 != team2
    }
}


export class HeadsUpDisplay extends GameObject {
    init(kwargs) {
        super.init(kwargs)
        this.margin = 5
        this.barWidth = 100
        this.barHeight = 20
        this.heroLineMinHeight = 20
        this.textArgs = {
            font: "bold 20px arial",
            fillStyle: "black",
        }
        this.globalElems = new GameObjectGroup(this.scene)
        this.playersElems = new Map()
        this.showHerosHealths = kwargs?.showHerosHealths ?? true
        this.showPlayersScores = kwargs?.showPlayersScores ?? true
        this.playersLinesSorter = kwargs?.playersLinesSorter ?? null
    }
    addGlobalHudElem(cls, args) {
        this.globalElems.add(cls, args)
    }
    initPlayerElements(hero) {
        const { game, playersElems, textArgs, margin, barWidth, barHeight, heroLineMinHeight } = this
        for(let playerId in game.players) {
            if(playersElems.has(playerId)) continue
            const grp = new GameObjectGroup(this.scene)
            playersElems.set(playerId, grp)
            //grp.nbBarElems = 0
            grp.add(PlayerIcon, { x: heroLineMinHeight/2, y: heroLineMinHeight/2, width: heroLineMinHeight, height: heroLineMinHeight, playerId })
            if(this.showHerosHealths) grp.add(HealthBar, { playerId, width:barWidth, height:barHeight })
            if(this.showPlayersScores) grp.add(PlayerScoreText, { playerId, ...textArgs })
            grp.sync = () => {
                let hasBars = false, elemsX = heroLineMinHeight + margin, barsY = 0
                grp.forEach(elem => { if(elem instanceof BarNotif) {
                    elem.x = elemsX + elem.width/2,
                    elem.y = barsY + elem.height/2
                    hasBars = true
                    barsY = elem.y + elem.height/2 + margin
                }})
                if(hasBars) elemsX += barWidth + margin
                grp.forEach(elem => { if(!(elem instanceof BarNotif || elem instanceof PlayerIcon)) {
                    elem.x = elemsX + elem.width/2
                    elem.y = elem.height/2
                    elemsX = elem.x + elem.width + margin
                }})
                grp.height = max(heroLineMinHeight, barsY)
            }
            grp.sync()
            hackMethod(grp, "update", 0, evt => grp.sync())
        }
        return playersElems
    }
    update() {
        this.initPlayerElements()
        this.globalElems.update()
        this.playersElems.forEach(elems => elems.update())
        this.syncPlayersElems()
    }
    syncPlayersElems() {
        const { margin } = this
        let prevGrp = null
        let playerIds = Array.from(this.playersElems.keys())
        if(this.playersLinesSorter) playerIds.sort(this.playersLinesSorter)
        for(let playerId of playerIds) {
            const grp = this.playersElems.get(playerId)
            grp.x = margin
            grp.y = (prevGrp ? (prevGrp.y + prevGrp.height) : 0) + margin
            prevGrp = grp
        }
    }
    draw(drawer) {
        super.draw(drawer)
        this.globalElems.draw(drawer)
        this.playersElems.forEach(elems => elems.draw(drawer))
    }
}


class BarNotif extends GameObject {

    init(args) {
        super.init(args)
        this.barColor = "white"
        this.value = 1  // from 0 to 1
        this.width = 100
        this.height = 10
    }

    getBaseImg() {
        const { width, height } = this
        const can = this._baseImg || newCanvas(width, height)
        assign(can, { width, height })
        const ctx = can.getContext("2d")
        const valWidth = ~~(width * this.value)
        ctx.fillStyle = "grey"
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = this.barColor
        ctx.fillRect(0, 0, valWidth, height)
        ctx.strokeStyle = "black"
        ctx.lineWidth = 1
        ctx.strokeRect(0, 0, width, height)
        return can
    }
}


class HealthBar extends BarNotif {

    init(args) {
        super.init(args)
        this.barColor = "red"
        this.playerId = args.playerId
    }

    update() {
        const hero = this.scene.getHero(this.playerId)
        this.value = hero ? (hero.getHealth() / hero.maxHealth) : 0
    }
}


class PlayerScoreText extends Text {

    init(args) {
        super.init(args)
        this.playerId = args.playerId
    }

    update() {
        super.update()
        const { scores } = this.scene
        this.updateText(floor(scores.get(this.playerId) ?? 0))
    }
}


// Background

@Category.append("background")
@StateNumber.undefine("z")
@StateNumber.undefine("y")
@StateNumber.undefine("x")
export class Background extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.z = -1000
        this.updatePosAndSize()
    }

    update() {
        super.update()
        this.updatePosAndSize()
    }

    updatePosAndSize() {
        const { scene } = this
        this.width = scene.viewWidth
        this.height = scene.viewHeight
        this.x = this.width/2
        this.y = this.height/2
    }
}


const GreenLandscapeImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/backgrounds/green_landscape.jpg")

@CATALOG.registerObject({
    label: "Green Landscape",
})
export class GreenLandscapeBackground extends Background {
    getBaseImg() {
        return GreenLandscapeImg
    }
}


const RockMountainsImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/backgrounds/rock_mountains.jpg")

@CATALOG.registerObject({
    label: "Rock Mountains",
})
export class RockMountainsBackground extends Background {
    getBaseImg() {
        return RockMountainsImg
    }
}


const SnowMountainsImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/backgrounds/snow_mountains.jpg")

@CATALOG.registerObject({
    label: "Snow Mountains",
})
export class SnowMountainsBackground extends Background {
    getBaseImg() {
        return SnowMountainsImg
    }
}


const DarkForestImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/backgrounds/dark_forest.jpg")

@CATALOG.registerObject({
    label: "Dark Forest",
})
export class DarkForestBackground extends Background {
    getBaseImg() {
        return DarkForestImg
    }
}


const DarkCityImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/backgrounds/dark_city.jpg")

@CATALOG.registerObject({
    label: "Dark City",
})
export class DarkCityBackground extends Background {
    getBaseImg() {
        return DarkCityImg
    }
}


// Standard

@CATALOG.registerScene()
@StateBool.define("killAllEnemies", { default: false, showInBuilder: true })
@StateBool.define("catchAllStars", { default: false, showInBuilder: true })
@GameObject.StateProperty.define("attackManager", {
    filter: { category: "manager/attack" },
    default: { key: "std:AttackManager" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("physicsManager", {
    filter: { category: "manager/physics" },
    default: { key: "std:PhysicsManager" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("viewManager", {
    filter: { category: "manager/view" },
    default: { key: "std:ViewHerosCenterManager" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("herosLivesManager", {
    filter: { category: "manager/heroslives" },
    default: { key: "std:HerosLivesManager" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("borderManager", {
    filter: { category: "manager/border" },
    default: { key: "std:BlockBorderManager" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("background", {
    filter: { category: "background" },
    default: { key: "std:GreenLandscapeBackground" },
    showInBuilder: true,
})
export class StandardScene extends GameScene {

    init(args) {
        super.init(args)
        this.backgroundColor = null
        this.hud = new HeadsUpDisplay(this)
    }

    initHerosSpawnPos() {
        const points = this.filterObjects("heroSpawnPoints", obj => obj instanceof HeroSpawnPoint)
        if(points.length == 0) return
        const firstPoint = points[0]
        this.setHerosSpawnPos(firstPoint.x, firstPoint.y)
    }

    update() {
        super.update()
        this.background.update()
        this.hud.update()
        this.borderManager.update()
        this.viewManager.update()
        this.herosLivesManager.update()
        this.physicsManager.update()
        this.attackManager.update()
        if(this.step == "GAME") {
            let allOk = null
            if(allOk!==false && this.catchAllStars) {
                const stars = this.filterObjects("stars", obj => obj instanceof Star)
                allOk = (stars.length == 0)
            }
            if(allOk!==false && this.killAllEnemies) {
                const enemies = this.filterObjects("enemies", obj => obj instanceof Enemy)
                allOk = (enemies.length == 0)
            }
            if(allOk) this.step = "VICTORY"
        }
    }

    async loadJoypadScene() {
        const { JoypadGameScene } = await importAndPreload("/static/catalogs/std/v1/2Dside/joypad.mjs")
        return new JoypadGameScene(this.game)
    }

    draw() {
        const res = super.draw()
        const drawer = this.graphicsEngine
        this.hud.draw(drawer)
        return res
    }

    drawBackground(drawer) {
        this.background.draw(drawer)
    }
}


// TAG

@CATALOG.registerScene()
@StateNumber.define("duration", { default: 3 * 60, precision: 30, showInBuilder: true })
@GameObject.StateProperty.define("attackManager", {
    filter: { category: "manager/attack" },
    default: { key: "std:AttackManager" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("physicsManager", {
    filter: { category: "manager/physics" },
    default: { key: "std:PhysicsManager" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("borderManager", {
    filter: { category: "manager/border" },
    default: { key: "std:LoopBorderManager" },
    showInBuilder: true,
})
export class TagScene extends GameScene {
    
    init(args) {
        super.init(args)
        this.step = "INIT"
        this.initDuration = 3
        this.hud = new HeadsUpDisplay(this, {
            showHerosHealths: false
        })
    }

    initHerosSpawnPos() {
        const points = this.filterObjects("heroSpawnPoints", obj => obj instanceof HeroSpawnPoint)
        if(points.length == 0) return
        const firstPoint = points[0]
        this.setHerosSpawnPos(firstPoint.x, firstPoint.y)
    }

    loadMap(map) {
        super.loadMap(map)
        this.addObject(Tag)
    }

    onAddObject(obj) {
        super.onAddObject(obj)
        if(obj instanceof Hero) this.hackHero(obj)
    }

    hackHero(hero) {
        hero.maxHealth = Infinity
        hackMethod(hero, "onGetAttacked", 0, evt => {
            const attackProps = evt.inputArgs[0]
            const { attacker } = attackProps
            const tag = this.tag
            if(!tag || !attacker || tag.owner != attacker) return
            tag.owner = hero
        })
    }

    update() {
        super.update()
        this.hud.update()
        this.attackManager.update()
        this.physicsManager.update()
        this.checkTaggedHero()
        this.preventTaggedHeroToMove(this.step == "INIT")
        if(this.step == "INIT") this.updateStepInit()
    }

    checkTaggedHero() {
        const taggedHero = this.tag.owner
        if(taggedHero && !taggedHero.removed) return
        let heros = []
        this.objects.forEach(ent => {
            if(ent instanceof Hero) heros.push(ent)
        })
        if(heros.length == 0) return
        const numHero = floor(this.rand("tag") * heros.length)
        this.tag.owner = heros[numHero]
    }

    preventTaggedHeroToMove(val) {
        const taggedHero = this.tag.owner
        if(!taggedHero || taggedHero.removed) return
        if(val) {
            this.taggedHeroPreventMoveHack ||= hackMethod(taggedHero, "getInputState", 1, evt => {
                evt.stopPropagation()
            })
        } else if(this.taggedHeroPreventMoveHack) {
            this.taggedHeroPreventMoveHack.remove()
            this.taggedHeroPreventMoveHack = null
        }
    }

    updateStepInit() {
        const { iteration, initDuration } = this
        const { fps } = this.game
        this.initCountDown()
        this.updateWorld()
        if(iteration > initDuration * fps) {
            this.step = "GAME"
            delete this.countDown
        }
    }

    initCountDown() {
        this.countDown ||= this.notifs.add(CountDown, {
            x: this.width/2,
            y: this.height/2,
            duration: 3,
            font: "bold 200px arial",
            fillStyle: "black",
        })
    }

    updateStepGame() {
        const { iteration, initDuration, duration } = this
        const { fps } = this.game
        super.updateStepGame()
        if(iteration % fps == 0) this.incrNonTaggedPlayerScores()
        if(iteration > (initDuration + duration) * fps) this.step = "GAMEOVER"
    }

    incrNonTaggedPlayerScores() {
        const { tag } = this
        const taggedHero = tag.owner
        if(!taggedHero) return
        const taggedPlayerId = taggedHero.playerId
        for(let playerId in this.game.players) {
            if(playerId == taggedPlayerId) continue
            this.incrScore(playerId, 1)
        }
    }

    updateStepGameOver() {
        const { scores } = this
        if(!this.scoresBoard) this.scoresBoard = this.notifs.add(ScoresBoard, {
            x: this.width/2,
            y: this.height/2,
            scores,
        })
    }

    async loadJoypadScene() {
        const { JoypadGameScene } = await importAndPreload("/static/catalogs/std/v1/2Dside/joypad.mjs")
        return new JoypadGameScene(this.game)
    }

    draw() {
        const res = super.draw()
        const drawer = this.graphicsEngine
        this.hud.draw(drawer)
        return res
    }
}


const TagImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/tag.png")

@CATALOG.registerObject({
    showInBuilder: false
})
@OwnerableMixin.add({
    removedWithOwner: false,
})
export class Tag extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = 30
        this.height = 30
        // self register in scene
        this.scene.tag = this
    }

    update() {
        super.update()
        this.sync()
    }

    sync() {
        const { owner } = this
        if(!owner) return
        this.x = owner.x
        this.y = owner.y - 50
    }

    getBaseImg() {
        return this.owner ? TagImg : null
    }
}


@CATALOG.registerScene()
@StateNumber.define("duration", { default: 3 * 60, precision: 30, showInBuilder: true })
@GameObject.StateProperty.define("attackManager", {
    filter: { category: "manager/attack" },
    default: { key: "std:AttackManager" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("physicsManager", {
    filter: { category: "manager/physics" },
    default: { key: "std:PhysicsManager" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("borderManager", {
    filter: { category: "manager/border" },
    default: { key: "std:LoopBorderManager" },
    showInBuilder: true,
})
export class StealTreasures extends GameScene {
    
    init(args) {
        super.init(args)
        const { scores } = this
        this.hud = new HeadsUpDisplay(this, {
            showHerosHealths: false,
            playersLinesSorter: (pid1, pid2) => {
                return (scores.get(pid2) ?? 0) - (scores.get(pid1) ?? 0)
            }
        })
    }

    initHerosSpawnPos() {
        const points = this.filterObjects("heroSpawnPoints", obj => obj instanceof HeroSpawnPoint)
        if(points.length == 0) return
        const firstPoint = points[0]
        this.setHerosSpawnPos(firstPoint.x, firstPoint.y)
    }

    onAddObject(obj) {
        super.onAddObject(obj)
        if(obj instanceof Hero) this.hackHero(obj)
    }

    hackHero(hero) {
        hero.maxHealth = Infinity
        hackMethod(hero, "onGetAttacked", 0, evt => {
            let oneDropped = false
            if(hero.extras) hero.extras.forEach(extra => {
                if(oneDropped) return
                if(extra instanceof Star) {
                    extra.drop()
                    oneDropped = true
                }
            })
        })
        this.addObject(StarsBar, {
            owner: hero,
        })
    }

    update() {
        super.update()
        this.hud.update()
        this.attackManager.update()
        this.physicsManager.update()
    }

    updateStepGame() {
        super.updateStepGame()
        this.updatePlayersScore()
        if(this.iteration > this.duration * this.game.fps) this.step = "GAMEOVER"
    }

    updatePlayersScore() {
        for(let playerId in this.game.players) {
            const hero = this.getHero(playerId)
            if(!hero) continue
            const nbStars = countStarExtras(hero)
            this.incrScore(playerId, nbStars / this.game.fps)
        }
    }

    updateStepGameOver() {
        const { scores } = this
        if(!this.scoresBoard) this.scoresBoard = this.notifs.add(ScoresBoard, {
            x: this.width/2,
            y: this.height/2,
            scores,
        })
    }

    async loadJoypadScene() {
        const { JoypadGameScene } = await importAndPreload("/static/catalogs/std/v1/2Dside/joypad.mjs")
        return new JoypadGameScene(this.game)
    }

    draw() {
        const res = super.draw()
        const drawer = this.graphicsEngine
        this.hud.draw(drawer)
        return res
    }
}


const StarImg = CATALOG.registerImage("/static/catalogs/std/v1/2Dside/assets/star.png")

@OwnerableMixin.add()
class StarsBar extends GameObject {

    update() {
        super.update()
        const { owner } = this
        if(owner) {
            this.x = owner.x
            this.y = owner.y - owner.height/2 - 10
        }
    }

    draw(drawer) {
        const { owner } = this
        if(!owner) return
        const nbStars = countStarExtras(owner)
        const props = this._starsProps ||= []
        for(let i=0; i<nbStars; ++i) {
            if(i >= props.length) props.push(new GraphicsProps({
                img: StarImg,
                width: 10,
                height: 10,
            }))
            const prop = props[i]
            prop.x = this.x + i*5 - (nbStars-1)*5/2
            prop.y = this.y
            prop.draw(drawer)
        }
    }
}


function countStarExtras(hero) {
    let nbStars = 0
    if(hero.extras) hero.extras.forEach(extra => {
        if(extra instanceof Star) nbStars += 1
    })
    return nbStars
}


// WAIGTING

@CATALOG.registerScene({
    showInBuilder: false,
})
export class WaitingScene extends SceneCommon {

    init(kwargs) {
        super.init(kwargs)
        this.backgroundColor = "black"
        this.playerObjs = new Map()
        this.initTitleText()
        this.initQrcodeImg()
    }

    initTitleText() {
        const titleTxt = this.addNotif(Text, {
            text: "WAITING PLAYERS",
            font: "bold 50px arial",
            fillStyle: "white",
        })
        titleTxt.syncPos = () => {
            titleTxt.x = this.viewWidth/2
            titleTxt.y = this.viewHeight/6
        }
        hackMethod(titleTxt, "update", 0, evt => titleTxt.syncPos())
        titleTxt.syncPos()
    }

    update() {
        this.notifs.update()
        this.syncPlayerObjs()
        this.playerObjs.forEach(objs => objs.update())
    }

    syncPlayerObjs() {
        const { playerObjs, viewWidth, viewHeight } = this
        const { players } = this.game
        // add & place players
        let numPlayer = 0
        for(let playerId in players) {
            const grp = this.initPlayerObjGroup(playerId)
            grp.x = viewWidth/2
            grp.y = viewHeight/3 + (numPlayer * 40)
            numPlayer += 1
        }
        // rm removed players
        for(let playerId in playerObjs)
            if(!(playerId in players))
                playerObjs.remove(playerId)
    }

    initPlayerObjGroup(playerId) {
        const { game, playerObjs } = this
        let grp = playerObjs.get(playerId)
        if(!grp) {
            grp = new GameObjectGroup(this)
            playerObjs.set(playerId, grp)
            grp.add(PlayerIcon, { x: 15, y: 15, playerId, width: 30, height: 30, strokeColor: "white" })
            const txt = grp.add(PlayerText, { y: 15, playerId, font: "bold 30px arial", fillStyle: "white" })
            txt.sync = () => {
                txt.x = 35 + txt.width/2
                txt.updateText(game.players[playerId]?.name ?? "")
            }
            txt.sync()
            hackMethod(txt, "update", 0, evt => txt.sync())
        }
        return grp
    }

    draw() {
        const can = this.canvas
        can.width = this.viewWidth
        can.height = this.viewHeight
        const ctx = can.getContext("2d")
        ctx.reset()
        const drawer = this.graphicsEngine
        this.drawBackground(drawer)
        this.notifs.draw(drawer)
        this.playerObjs.forEach(objs => objs.draw(drawer))
        const qrcodeProps = this.getQrcodeGraphicsProps()
        if(qrcodeProps) drawer.draw(qrcodeProps)
        return can
    }

    getQrcodeGraphicsProps() {
        const qrcodeImg = this._qrcodeImg
        if(!qrcodeImg) return null
        const qrcodeProps = this._qrcodeGraphicsProps ||= new GraphicsProps({
            img: qrcodeImg,
            width: 200,
            height: 200,
            x: 150,
            y: this.viewHeight/2,
        })
        return qrcodeProps
    }

    async initQrcodeImg() {
        if(IS_SERVER_ENV) return
        let res = this._qrcodeImg
        if(!res) {
            const qrcodeImg = this._qrcodeImg = await this.game.initQrcodeImg()
            const can = newCanvas(ceil(qrcodeImg.width*1.2), ceil(qrcodeImg.height*1.2))
            const ctx = can.getContext("2d")
            ctx.fillStyle = "white"
            ctx.fillRect(0, 0, can.width, can.height)
            ctx.drawImage(qrcodeImg, floor((can.width-qrcodeImg.width)/2), floor((can.height-qrcodeImg.height)/2))
            res = this._qrcodeImg = can
        }
        return res
    }

    async loadJoypadScene() {
        const { JoypadWaitingScene } = await importAndPreload("./joypad.mjs")
        return new JoypadWaitingScene(this.game)
    }
}


// UTILS

export class ScoresBoard extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.scores = kwargs.scores
        this.width = 300
        this.headerHeight = 80
        this.lineHeight = 40
        this.height = this.headerHeight + nbKeys(this.game.players) * this.lineHeight
    }

    getBaseImg() {
        const baseImg = this._baseImg ||= document.createElement("canvas")
        baseImg.width = this.width
        baseImg.height = this.height
        this.drawBackground(baseImg)
        this.drawScores(baseImg)
        return baseImg
    }

    drawBackground(can) {
        const { width, height } = can
        const ctx = can.getContext("2d")
        ctx.fillStyle = "lightgrey"
        ctx.globalAlpha = .8
        ctx.fillRect(0, 0, width, height)
        ctx.globalAlpha = 1
        ctx.strokeStyle = "black"
        ctx.lineWidth = 1
        ctx.strokeRect(0, 0, width, height)
    }

    drawScores(can) {
        const { headerHeight, lineHeight, scores } = this
        const { width } = can
        const { players } = this.game
        const ctx = can.getContext("2d")
        const fontHeight = floor(lineHeight *.7)
        const fontArgs = {
            font: `${fontHeight}px arial`,
            fillStyle: "black"
        }
        const titleCan = newTextCanvas("Scores:", {
            ...fontArgs,
            font: `bold ${fontHeight}px arial`,
        })
        ctx.drawImage(titleCan, (width-titleCan.width)/2, lineHeight/4)
        const sortedPlayerScores = Object.keys(players).map(pid => [pid, scores.get(pid) ?? 0]).sort((a, b) => b[1] - a[1])
        for(let i in sortedPlayerScores) {
            const [playerId, score] = sortedPlayerScores[i]
            const playerName = players[playerId].name
            const lineCan = newTextCanvas(`${playerName}: ${floor(score)}`, fontArgs)
            ctx.drawImage(lineCan, (width-lineCan.width)/2, headerHeight + i * lineHeight)
        }
    }
}


export class CountDown extends Text {

    init(kwargs) {
        super.init(kwargs)
        this.duration = kwargs && kwargs.duration || 3
        this.startIt = this.scene.iteration
        this.syncText()
    }

    update() {
        const { iteration } = this.scene
        const { fps } = this.game
        if((iteration - this.startIt)/fps > this.duration) this.remove()
        this.syncText()
    }

    syncText() {
        const { iteration } = this.scene
        const { fps } = this.game
        this.text = ceil((this.duration - (iteration - this.startIt)/fps))
    }
}