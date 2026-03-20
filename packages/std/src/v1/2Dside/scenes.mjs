const { assign } = Object
const { floor, round, ceil, min, max, hypot, PI } = Math
import {
    sumTo, newCanvas, newTextCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, addNewDomEl, importJs, hasKeys, nbKeys,
    CATALOG, IS_SERVER_ENV,
    MODE_CLIENT,
    StateProperty, StateBool, StateNumber,
    Dependencies, Scene, PhysicsEngine, GameObject, Category, Mixin, Text, hackMethod, GameObjectGroup, Img,
    pixiHelpers,
} from '../../../../core/v1/index.mjs'
import {
    ActivableMixin, CollectMixin, OwnerableMixin, BodyMixin, PhysicsMixin, AttackMixin, 
} from '../mixins.mjs'
import { ObjectBars } from '../utils.mjs'
import { Enemy, Wall, Star, HeroSpawnPoint, Ball } from './objects.mjs'
import { Hero } from './heros.mjs'

const REGISTER_COMMON_ARGS = {
    url: import.meta.url,
    version: "v1",
    perspective: "2Dside",
}


// TEAM MARK ////////////////////////////////////

const TeamMarkImg = new Img("/static/catalogs/std/v1/assets/team_mark.png")

@Dependencies.add(TeamMarkImg)
@OwnerableMixin.add({
    removedWithOwner: true,
})
export class TeamMark extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = 20
        this.height = 20
    }

    update() {
        super.update()
        this.syncPos()
    }

    syncPos() {
        const { owner } = this
        if (!owner) return
        this.x = owner.x
        this.y = owner.y - owner.height / 2 - 15
        this.z = owner.z
    }

    getBaseImg() {
        return TeamMarkImg
    }

    syncGraphics() {
        super.syncGraphics()
        const { owner, _graphics, scene } = this
        if (!_graphics || !owner) return
        const teamColor = scene.teamsManager?.getTeamColor?.(owner.team)
        if (teamColor) {
            pixiHelpers.tintSprite(_graphics, teamColor)
        }
    }
}


// MANAGERS ///////////////////////////////////////

@StateNumber.undefine("z")
@StateNumber.undefine("y")
@StateNumber.undefine("x")
@Category.append("manager")
export class Manager extends GameObject { }


@Category.append("border")
export class BorderManager extends Manager { }


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Block Border",
    showInBuilder: true,
})
export class BlockBorderManager extends BorderManager {

    update() {
        super.update()
        this.initWalls()
    }

    initWalls() {
        if (this._initWallsDone) return
        this._initWallsDone = true
        const { scene } = this, { width, height } = scene
        scene.addObject(Wall, { x1: 0, y1: 0, x2: width, y2: 0, visibility: 0 })
        scene.addObject(Wall, { x1: width, y1: 0, x2: width, y2: height, visibility: 0 })
        scene.addObject(Wall, { x1: width, y1: height, x2: 0, y2: height, visibility: 0 })
        scene.addObject(Wall, { x1: 0, y1: height, x2: 0, y2: 0, visibility: 0 })
    }
}


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
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
            if (x < -limit || x > width + limit || y < -limit || y > height + limit) {
                this.handleObjectOut(obj)
            }
        })
    }

    handleObjectOut(obj) {
        if (obj instanceof Hero) {
            obj.getDamaged(this.heroOutDamages)
            if (obj.getHealth() > 0) this.scene.spawnHero(obj)
        } else {
            obj.remove()
        }
    }
}


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Loop Border",
    showInBuilder: true,
})
export class LoopBorderManager extends BorderManager {

    update() {
        super.update()
        const { scene } = this, { width, height } = scene
        scene.objects.forEach(obj => {
            const { x, y } = obj
            if (x > width) obj.x -= width
            else if (x < 0) obj.x += width
            if (y > height) obj.y -= height
            else if (y < 0) obj.y += height
        })
    }
}


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
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
            if (!(obj instanceof Hero)) return
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
        if (deathsIts) {
            for (let playerId in deathsIts) {
                if (this.lives <= 0) break
                if (iteration >= (deathsIts[playerId] + (delay * fps))) {
                    scene.addHero(playerId)
                    delete deathsIts[playerId]
                    this.lives -= 1
                }
            }
            if (!hasKeys(deathsIts)) this.deathsIts = null
        }
    }
}


@Category.append("view")
export class ViewManager extends Manager { }


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
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
        if (heros.size===0) return
        if (localHero) {
            scn.setView(
                localHero.x - viewWidth / 2,
                localHero.y - viewHeight / 2,
            )
        } else {
            let sumX = 0, sumY = 0, nbHeros = 0
            heros.forEach(hero => {
                sumX += hero.x
                sumY += hero.y
                nbHeros += 1
            })
            scn.setView(
                sumX / nbHeros - viewWidth / 2,
                sumY / nbHeros - viewHeight / 2,
            )
        }
    }
}


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
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
        if (heros.size===0) return
        if (localHero) {
            scn.setView(
                localHero.x - viewWidth / 2,
                localHero.y - viewHeight / 2,
            )
        } else {
            const firstHero = scn.getFirstHero()
            if (firstHero) scn.setView(
                firstHero.x - viewWidth / 2,
                firstHero.y - viewHeight / 2,
            )
        }
    }

    spawnFarHeros() {
        const scn = this.scene
        const { heros, viewWidth, viewHeight } = scn
        const firstHero = scn.getFirstHero()
        if (!firstHero) return
        const { x: fhx, y: fhy } = firstHero
        heros.forEach((hero, playerId) => {
            if (playerId === firstHero.playerId) return
            const dx = hero.x - fhx, dy = hero.y - fhy
            if (dx < -viewWidth * .7 || dx > viewWidth * .7 || dy < -viewHeight * .7 || dy > viewHeight * .7) {
                this.spawnHero(hero)
            }
        })
    }

    spawnHero(hero) {
        const scn = this.scene
        const firstHero = scn.getFirstHero()
        let spawnX, spawnY
        if (!firstHero || hero === firstHero) {
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
    ...REGISTER_COMMON_ARGS,
    label: "Physics",
})
@StateNumber.define("gravityAcc", { default: 1000, precision: 100 })
@StateNumber.define("gravityMaxSpeed", { default: 1000, precision: 100 })
@Category.append("physics")
export class PhysicsManager extends Manager { }


const DEFAULT_TEAMS_COLOR = ["blue", "red", "yellow", "green", "purple", "orange"]

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Attack",
})
@Category.append("teams")
@Dependencies.add(TeamMark)
@StateNumber.define("nbTeams", { default: 1, nullableWith: 1 })
export class TeamsManager extends Manager {

    init(kwargs) {
        super.init(kwargs)
        this.defaultHerosSpawnX = 50
        this.defaultHerosSpawnY = 50
        const { scene } = this
        hackMethod(scene, "onAddObject", -1, evt => {
            const obj = evt.inputArgs[0]
            if (obj instanceof Hero) this.hackHero(obj)
            if (obj instanceof HeroSpawnPoint) this.hackHeroSpawnPoint(obj)
        })
    }

    hackHero(hero) {
        this.assignHeroTeam(hero)
        if (hero.team !== null) this.scene.addObject(TeamMark, { owner: hero })
    }

    assignHeroTeam(hero) {
        if(hero.team !== null) return
        const { nbTeams } = this
        if(nbTeams < 2 || nbTeams === Infinity) return
        const nbHerosByTeams = new Map()
        this.scene.heros.forEach(hero2 => {
            const { team } = hero2
            if(team === null) return
            nbHerosByTeams.set(team, (nbHerosByTeams.get(team) ?? 0) + 1)
        })
        let lowestNb = Infinity, lowestTeam = null
        for(let team=1; team<=nbTeams; ++team) {
            const nb = nbHerosByTeams.get(team) ?? 0
            if(nb < lowestNb) {
                lowestNb = nb
                lowestTeam = team
            }
        }
        hero.team = (lowestTeam === null) ? 1 : lowestTeam
    }

    hackHeroSpawnPoint(point) {
        this.assignHeroSpawnPointTeam(point)
    }

    assignHeroSpawnPointTeam(point) {
        if(point.team !== null) return
        const { nbTeams } = this
        if(nbTeams < 2 || nbTeams === Infinity) return
        const nbPointsByTeams = new Map()
        const spawnPoints = this.scene.filterObjects("heroSpawnPoints", obj => obj instanceof HeroSpawnPoint)
        spawnPoints.forEach(point2 => {
            const { team } = point2
            if(team === null) return
            nbPointsByTeams.set(team, (nbPointsByTeams.get(team) ?? 0) + 1)
        })
        let lowestNb = Infinity, lowestTeam = null
        for(let team=1; team<=nbTeams; ++team) {
            const nb = nbPointsByTeams.get(team) ?? 0
            if(nb < lowestNb) {
                lowestNb = nb
                lowestTeam = team
            }
        }
        point.team = (lowestTeam === null) ? 1 : lowestTeam
    }

    spawnHero(hero) {
        const { scene } = this
        const spawnPoints = scene.filterObjects("heroSpawnPoints", obj => obj instanceof HeroSpawnPoint)
        const spawnPointsSameTeam = spawnPoints.filter(point => point.team === hero.team)
        const nbSpawnPoints = spawnPointsSameTeam.length
        if(nbSpawnPoints == 0) return hero.spawn(this.defaultHerosSpawnX, this.defaultHerosSpawnY)
        const r = scene.rand("spawnHero")
        const numSpawnPoint = (nbSpawnPoints == 1) ? 0 : floor(r * nbSpawnPoints)
        const spawnPoint = spawnPointsSameTeam[numSpawnPoint]
        hero.spawn(spawnPoint.x, spawnPoint.y)
    }

    canTeamAttack(team1, team2) {
        return true
    }
    canTeamDamage(team1, team2) {
        return team1 === null || team1 != team2
    }

    getTeamColor(team) {
        if(!team) return null
        return DEFAULT_TEAMS_COLOR[(team-1)%DEFAULT_TEAMS_COLOR.length]
    }
}


// NOTIFS ////////////////////////////////////////////

export class HeadsUpDisplay extends GameObject {

    static MARGIN = 5
    static BAR_WIDTH = 100
    static BAR_HEIGHT = 10
    static ICON_SIZE = 15
    static ROW_HEIGHT = 20
    static FONT_SIZE = 15

    init(kwargs) {
        super.init(kwargs)
        this.showHerosHealths = kwargs?.showHerosHealths ?? true
        this.showPlayersScores = kwargs?.showPlayersScores ?? true
        this.playersLinesSorter = kwargs?.playersLinesSorter ?? null
        this._playerRows = new Map()
        this._playerIds = []
    }

    update() {
        this._syncRows()
        this._updateRows()
    }

    _syncRows() {
        const { game, showHerosHealths, showPlayersScores } = this
        const { players } = game
        const container = this._graphics
        if (!container) return

        // Add rows for new players
        for (const playerId in players) {
            if (this._playerRows.has(playerId)) continue

            const row = this._createPlayerRow(playerId)
            this._playerRows.set(playerId, row)
            container.addChild(row.container)
        }

        // Remove rows for disconnected players
        for (const [playerId, row] of this._playerRows) {
            if (!(playerId in players)) {
                container.removeChild(row.container)
                row.container.destroy({ children: true })
                this._playerRows.delete(playerId)
            }
        }

        // Sort player IDs if sorter provided
        this._playerIds = Array.from(this._playerRows.keys())
        if (this.playersLinesSorter) {
            this._playerIds.sort(this.playersLinesSorter)
        }
    }

    _createPlayerRow(playerId) {
        const { MARGIN, BAR_WIDTH, BAR_HEIGHT, ICON_SIZE, ROW_HEIGHT, FONT_SIZE } = HeadsUpDisplay
        const rowContainer = new window.PIXI.Container()

        // Icon (colored circle representing player)
        const icon = new window.PIXI.Graphics()
        icon.circle(0, 0, ICON_SIZE / 2)
        icon.x = ICON_SIZE / 2 + MARGIN
        icon.y = ROW_HEIGHT / 2
        rowContainer.addChild(icon)

        let currentX = ICON_SIZE + MARGIN * 2

        // Health bar
        let healthBarBg = null
        let healthBarFill = null
        if (this.showHerosHealths) {
            healthBarBg = new window.PIXI.Graphics()
            healthBarBg.rect(0, 0, BAR_WIDTH, BAR_HEIGHT)
            healthBarBg.fill({ color: 0x808080 }) // grey
            healthBarBg.x = currentX
            healthBarBg.y = (ROW_HEIGHT - BAR_HEIGHT) / 2
            rowContainer.addChild(healthBarBg)

            healthBarFill = new window.PIXI.Graphics()
            healthBarFill.x = currentX
            healthBarFill.y = (ROW_HEIGHT - BAR_HEIGHT) / 2
            rowContainer.addChild(healthBarFill)

            currentX += BAR_WIDTH + MARGIN
        }

        // Score text
        let scoreText = null
        if (this.showPlayersScores) {
            const style = new window.PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: FONT_SIZE,
                fontWeight: 'bold',
                fill: 0x000000
            })
            scoreText = new window.PIXI.Text({ text: '0', style })
            scoreText.anchor.set(0, 0.5)
            scoreText.x = currentX
            scoreText.y = ROW_HEIGHT / 2
            rowContainer.addChild(scoreText)
        }

        return {
            container: rowContainer,
            icon,
            healthBarBg,
            healthBarFill,
            scoreText,
            playerId
        }
    }

    _updateRows() {
        const { MARGIN, BAR_WIDTH, BAR_HEIGHT, ROW_HEIGHT } = HeadsUpDisplay
        const { players } = this.game
        const { scores } = this.scene

        let yOffset = MARGIN

        for (const playerId of this._playerIds) {
            const row = this._playerRows.get(playerId)
            if (!row) continue

            const player = players[playerId]
            const hero = this.scene.getHero(playerId)

            // Update icon color
            row.icon.clear()
            row.icon.circle(0, 0, HeadsUpDisplay.ICON_SIZE / 2)
            row.icon.fill({ color: player?.color ?? 0xffffff })
            row.icon.stroke({ color: 0x000000, width: 1 })

            // Update health bar
            if (row.healthBarFill && hero) {
                const healthRatio = hero.getHealth() / hero.maxHealth
                const fillWidth = Math.max(0, BAR_WIDTH * healthRatio)
                row.healthBarFill.clear()
                if (fillWidth > 0) {
                    row.healthBarFill.rect(0, 0, fillWidth, BAR_HEIGHT)
                    row.healthBarFill.fill({ color: 0xff0000 }) // red
                }
            }

            // Update score
            if (row.scoreText) {
                row.scoreText.text = String(floor(scores.get(playerId) ?? 0))
            }

            // Position row
            row.container.x = MARGIN
            row.container.y = yOffset
            yOffset += ROW_HEIGHT + MARGIN
        }
    }

    syncGraphics() {
        // Ensure rows are synced (creates row containers if needed)
        this._syncRows()
        
        const container = this._graphics
        if (!container) return
        container.x = this.x
        container.y = this.y
        container.zIndex = this.z
    }
}


class QrCode extends GameObject {

    init(kwargs) {
        super.init(kwargs)
        this.width = 200
        this.height = 200
        this._qrcodeImg = null
        this.initQrcodeImg()
    }

    async initQrcodeImg() {
        const qrcodeImg = await this.game.initQrcodeImg()
        const can = newCanvas(ceil(qrcodeImg.width * 1.2), ceil(qrcodeImg.height * 1.2))
        const ctx = can.getContext("2d")
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, can.width, can.height)
        ctx.drawImage(qrcodeImg, floor((can.width - qrcodeImg.width) / 2), floor((can.height - qrcodeImg.height) / 2))
        this._qrcodeImg = qrcodeImg
    }

    syncGraphics() {
        const container = this._graphics
        if (!container) return
        const qrcodeImg = this._qrcodeImg
        if (!qrcodeImg) return
        
        // Lazy-create sprite if needed (at local origin, container handles position)
        let sprite = this._qrSprite
        if (!sprite) {
            const texture = window.PIXI.Texture.from(qrcodeImg)
            sprite = pixiHelpers.createSpriteFromCanvas(texture)
            sprite.anchor.set(0.5)
            container.addChild(sprite)
            this._qrSprite = sprite
        }
        
        // Let base class handle container transform
        super.syncGraphics()
    }
}


// BACKGROUND //////////////////////////////////////////////

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
        this.x = this.width / 2
        this.y = this.height / 2
    }
}


const GreenLandscapeImg = new Img("/static/catalogs/std/v1/2Dside/assets/backgrounds/green_landscape.jpg")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Green Landscape",
})
@Dependencies.add(GreenLandscapeImg)
export class GreenLandscapeBackground extends Background {
    getBaseImg() {
        return GreenLandscapeImg
    }
}


const RockMountainsImg = new Img("/static/catalogs/std/v1/2Dside/assets/backgrounds/rock_mountains.jpg")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Rock Mountains",
})
@Dependencies.add(RockMountainsImg)
export class RockMountainsBackground extends Background {
    getBaseImg() {
        return RockMountainsImg
    }
}


const SnowMountainsImg = new Img("/static/catalogs/std/v1/2Dside/assets/backgrounds/snow_mountains.jpg")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Snow Mountains",
})
@Dependencies.add(SnowMountainsImg)
export class SnowMountainsBackground extends Background {
    getBaseImg() {
        return SnowMountainsImg
    }
}


const DarkForestImg = new Img("/static/catalogs/std/v1/2Dside/assets/backgrounds/dark_forest.jpg")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Dark Forest",
})
@Dependencies.add(DarkForestImg)
export class DarkForestBackground extends Background {
    getBaseImg() {
        return DarkForestImg
    }
}


const DarkCityImg = new Img("/static/catalogs/std/v1/2Dside/assets/backgrounds/dark_city.jpg")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Dark City",
})
@Dependencies.add(DarkCityImg)
export class DarkCityBackground extends Background {
    getBaseImg() {
        return DarkCityImg
    }
}


// SCENES ///////////////////////////////////////

export class GameScene extends Scene {
    init(kwargs) {
        super.init(kwargs)
        this.step = "GAME"
        this.deaultHerosSpawnX = 50
        this.defaultHerosSpawnY = 50
        this.scores = new Map()
        this.isGameScene = true // TODO: remove me
    }

    isPausable() {
        return true
    }

    loadMap(scnMapId) {
        super.loadMap(scnMapId)
        this.initHeros()
        this.physics = new PhysicsEngine(this)
    }

    initHeros() {
        //this.initHerosSpawnPos()
        if(this.game.mode == MODE_CLIENT) return  // objects are init by first full state
        for(let playerId in this.game.players) this.addHero(playerId)
    }

    addHero(playerId) {
        const player = this.game.players[playerId]
        if(!player) return
        const prevHero = this.getHero(playerId)
        if(prevHero && !prevHero.removed) return
        const { heroKey } = player
        if(!heroKey) return
        const hero = this.addObject(heroKey, { playerId })
        this.spawnHero(hero)
        return hero
    }

    getHero(playerId) {
        return this.heros.get(playerId)
    }

    getFirstHero() {
        const firstPlayerId = this.game.getFirstPlayerId()
        if(firstPlayerId === null) return null
        return this.heros.get(firstPlayerId)
    }

    rmHero(playerId) {
        const hero = this.getHero(playerId)
        if(hero) hero.remove()
    }

    spawnHero(hero) {
        if(this.teamsManager) this.teamsManager.spawnHero(hero)
        else hero.spawn(this.defaultHerosSpawnX, this.defaultHerosSpawnY)
    }

    incrScore(playerId, val) {
        const { scores } = this
        scores.set(playerId, (scores.get(playerId) ?? 0) + val)
   }

    update() {
        const { step } = this
        this.iteration += 1
        this.time = this.iteration * this.game.dt
        if(step == "GAME") this.updateStepGame()
        else if(step == "GAMEOVER") this.updateStepGameOver()
        else if(step == "VICTORY") this.updateStepVictory()
        this.notifs.update()
    }

    updateWorld() {
        const { dt } = this.game
        this.physics.apply(dt, this.objects)
        super.updateWorld()
    }

    updateStepGame() {
        this.updateWorld()
    }

    updateStepGameOver() {
        this.updateWorld()
        this.initGameOverNotifs()
    }

    updateStepVictory() {
        this.initVictoryNotifs()
    }

    filterObjects(key, filter) {
        const objsCache = this._filteredObjectsCache ||= new Map()
        if(objsCache.iteration !== this.iteration) {
            objsCache.clear()
            objsCache.iteration = this.iteration
        }
        if(!objsCache.has(key)) {
            const cache = []
            this.objects.forEach(obj => {
                if(filter(obj)) cache.push(obj)
            })
            objsCache.set(key, cache)
        }
        return objsCache.get(key)
    }

    initVictoryNotifs() {
        if(this.victoryNotifs) return
        this.victoryNotifs = new GameObjectGroup(this)
        this.victoryNotifs.add(
            Text,
            {
                text: "VICTORY !",
                font: "100px serif",
                x: this.viewWidth / 2,
                y: this.viewHeight / 2,
            },
        )
    }

    initGameOverNotifs() {
        if(this.gameOverNotifs) return
        this.gameOverNotifs = new GameObjectGroup(this)
        this.gameOverNotifs.add(
            Text,
            {
                text: "GAME OVER",
                font: "100px serif",
                x: this.viewWidth / 2,
                y: this.viewHeight / 2,
            },
        )
    }

    getState(isInitState=false) {
        const state = super.getState(isInitState)
        if(isInitState) {
            state.width = this.width
            state.height = this.height
        } else {
            state.it = this.iteration
            state.step = this.step
            // state.hsx = this.herosSpawnX
            // state.hsy = this.herosSpawnY
            state.sco = {}
            this.scores.forEach((val, pid) => state.sco[pid] = floor(val))
        }
        state.objects = this.objects.getState(isInitState)
        if(isInitState) state.links = this.getObjectLinksState()
        return state
    }

    getObjectLinksState() {
        const res = []
        this.objects.forEach(obj => {
            const linksState = obj.getObjectLinksState()
            if(linksState) for(let linkState of linksState) res.push(linkState)
        })
        return res
    }

    setState(state, isInitState=false) {
        super.setState(state, isInitState)
        if(!isInitState) {
            this.iteration = state.it
            this.step = state.step
            // this.setHerosSpawnPos(state.hsx, state.hsy)
            this.scores.clear()
            for(let pid in state.sco) this.scores.set(pid, state.sco[pid])
        }
        this.objects.setState(state.objects, isInitState)
        if(isInitState) this.setObjectLinksFromState(state.links)
    }

    setObjectLinksFromState(state) {
        if(!state) return
        for(let linkState of state) {
            const actionObjId = linkState[0]
            const actionObj = this.objects.get(actionObjId)
            actionObj.addObjectLinkFromState(linkState)
        }
    }

    createPauseScene() {
        return new PauseScene(this.game)
    }
}

class PauseScene extends Scene {

    init(kwargs) {
        super.init(kwargs)
        this.z = 1000
        this.backgroundColor = "lightgrey"
        this.backgroundAlpha = .5
        this.pauseText = this.addNotif(Text, {
            text: "PAUSE",
            font: "bold 50px arial",
            fillStyle: "black",
        })
        this.syncPosSize()
        this.syncTextPos()
    }

    update() {
        this.syncPosSize()
        this.syncTextPos()
    }

    syncTextPos() {
        assign(this.pauseText, { x: this.viewWidth/2, y: this.viewHeight/2 })
    }
}


// Standard

@CATALOG.registerScene(REGISTER_COMMON_ARGS)
@Dependencies.add(GreenLandscapeBackground)
@StateBool.define("killAllEnemies", { default: false, showInBuilder: true })
@StateBool.define("catchAllStars", { default: false, showInBuilder: true })
@GameObject.StateProperty.define("teamsManager", {
    filter: { category: "manager/teams" },
    default: { key: "std:TeamsManager" },
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
        this.hud = new HeadsUpDisplay(this)
    }

    initGraphics() {
        super.initGraphics()
        this.background.initGraphics()
        this.hud.initGraphics()
    }

    syncGraphics() {
        super.syncGraphics()
        this.background.syncGraphics()
        this.hud.syncGraphics()
    }

    update() {
        super.update()
        this.background.update()
        this.borderManager.update()
        this.viewManager.update()
        this.herosLivesManager.update()
        this.physicsManager.update()
        this.teamsManager.update()
        this.hud.update()
        if (this.step == "GAME") {
            let allOk = null
            if (allOk !== false && this.catchAllStars) {
                const stars = this.filterObjects("stars", obj => obj instanceof Star && !obj.owner)
                allOk = (stars.length == 0)
            }
            if (allOk !== false && this.killAllEnemies) {
                const enemies = this.filterObjects("enemies", obj => obj instanceof Enemy)
                allOk = (enemies.length == 0)
            }
            if (allOk) this.step = "VICTORY"
        }
    }

    async loadJoypadScene() {
        const { JoypadGameScene } = await import("/static/catalogs/std/v1/joypad.mjs")
        await JoypadGameScene.load()
        return new JoypadGameScene(this.game)
    }
}


// TAG

@CATALOG.registerScene(REGISTER_COMMON_ARGS)
@Dependencies.add(GreenLandscapeBackground)
@StateNumber.define("duration", { default: 3 * 60, precision: 30, showInBuilder: true })
@GameObject.StateProperty.define("teamsManager", {
    filter: { category: "manager/teams" },
    default: { key: "std:TeamsManager" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("physicsManager", {
    filter: { category: "manager/physics" },
    default: { key: "std:PhysicsManager" },
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
export class TagScene extends GameScene {

    init(args) {
        super.init(args)
        this.step = "INIT"
        this.initDuration = 3
        this.hud = new HeadsUpDisplay(this, {
            showHerosHealths: false
        })
    }

    loadMap(map) {
        super.loadMap(map)
        this.addObject(Tag)
    }

    initGraphics() {
        super.initGraphics()
        this.background.initGraphics()
        this.hud.initGraphics()
    }

    syncGraphics() {
        super.syncGraphics()
        this.background.syncGraphics()
        this.hud.syncGraphics()
    }

    onAddObject(obj) {
        super.onAddObject(obj)
        if (obj instanceof Hero) this.hackHero(obj)
    }

    hackHero(hero) {
        hero.maxHealth = Infinity
        hackMethod(hero, "onGetAttacked", 0, evt => {
            const attackProps = evt.inputArgs[0]
            const { attacker } = attackProps
            const tag = this.tag
            if (!tag || !attacker || tag.owner != attacker) return
            tag.owner = hero
        })
    }

    update() {
        super.update()
        this.background.update()
        this.borderManager.update()
        this.physicsManager.update()
        this.teamsManager.update()
        this.hud.update()
        this.checkTaggedHero()
        this.preventTaggedHeroToMove(this.step == "INIT")
        if (this.step == "INIT") this.updateStepInit()
    }

    checkTaggedHero() {
        const taggedHero = this.tag.owner
        if (taggedHero && !taggedHero.removed) return
        let heros = []
        this.objects.forEach(ent => {
            if (ent instanceof Hero) heros.push(ent)
        })
        if (heros.length == 0) return
        const numHero = floor(this.rand("tag") * heros.length)
        this.tag.owner = heros[numHero]
    }

    preventTaggedHeroToMove(val) {
        const taggedHero = this.tag.owner
        if (!taggedHero || taggedHero.removed) return
        if (val) {
            this.taggedHeroPreventMoveHack ||= hackMethod(taggedHero, "getInputState", 1, evt => {
                evt.stopPropagation()
            })
        } else if (this.taggedHeroPreventMoveHack) {
            this.taggedHeroPreventMoveHack.remove()
            this.taggedHeroPreventMoveHack = null
        }
    }

    updateStepInit() {
        const { iteration, initDuration } = this
        const { fps } = this.game
        this.initCountDown()
        this.updateWorld()
        if (iteration > initDuration * fps) {
            this.step = "GAME"
            delete this.countDown
        }
    }

    initCountDown() {
        this.countDown ||= this.notifs.add(CountDown, {
            x: this.width / 2,
            y: this.height / 2,
            duration: 3,
            font: "bold 200px arial",
            fillStyle: "black",
        })
    }

    updateStepGame() {
        const { iteration, initDuration, duration } = this
        const { fps } = this.game
        super.updateStepGame()
        if (iteration % fps == 0) this.incrNonTaggedPlayerScores()
        if (iteration > (initDuration + duration) * fps) this.step = "GAMEOVER"
    }

    incrNonTaggedPlayerScores() {
        const { tag } = this
        const taggedHero = tag.owner
        if (!taggedHero) return
        const taggedPlayerId = taggedHero.playerId
        for (let playerId in this.game.players) {
            if (playerId == taggedPlayerId) continue
            this.incrScore(playerId, 1)
        }
    }

    updateStepGameOver() {
        const { scores } = this
        if (!this.scoresBoard) this.scoresBoard = this.notifs.add(ScoresBoard, {
            x: this.width / 2,
            y: this.height / 2,
            scores,
        })
    }

    async loadJoypadScene() {
        const { JoypadGameScene } = await import("/static/catalogs/std/v1/joypad.mjs")
        await JoypadGameScene.load()
        return new JoypadGameScene(this.game)
    }
}


const TagImg = new Img("/static/catalogs/std/v1/2Dside/assets/tag.png")

@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    showInBuilder: false
})
@Dependencies.add(TagImg)
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
        if (!owner) return
        this.x = owner.x
        this.y = owner.y - 50
    }

    getBaseImg() {
        return TagImg
    }

    syncGraphics() {
        this.visibility = Boolean(this.owner)
        super.syncGraphics()
    }
}


const StarImg = new Img("/static/catalogs/std/v1/2Dside/assets/star.png")

@Dependencies.add(StarImg)
class StarsBar extends ObjectBars {

    getObjectImg() {
        return StarImg
    }

    getObjectCount() {
        const { owner } = this
        return owner ? countStarExtras(owner) : 0
    }

}


function countStarExtras(hero) {
    let nbStars = 0
    if (hero.extras) hero.extras.forEach(extra => {
        if (extra instanceof Star) nbStars += 1
    })
    return nbStars
}


@CATALOG.registerScene(REGISTER_COMMON_ARGS)
@Dependencies.add(GreenLandscapeBackground, StarsBar)
@StateNumber.define("duration", { default: 3 * 60, precision: 30, showInBuilder: true })
@GameObject.StateProperty.define("teamsManager", {
    filter: { category: "manager/teams" },
    default: { key: "std:TeamsManager" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("physicsManager", {
    filter: { category: "manager/physics" },
    default: { key: "std:PhysicsManager" },
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

    initGraphics() {
        super.initGraphics()
        this.background.initGraphics()
        this.hud.initGraphics()
    }

    syncGraphics() {
        super.syncGraphics()
        this.background.syncGraphics()
        this.hud.syncGraphics()
    }

    onAddObject(obj) {
        super.onAddObject(obj)
        if (obj instanceof Hero) this.hackHero(obj)
    }

    hackHero(hero) {
        hero.maxHealth = Infinity
        hackMethod(hero, "onGetAttacked", 0, evt => {
            let oneDropped = false
            if (hero.extras) hero.extras.forEach(extra => {
                if (oneDropped) return
                if (extra instanceof Star) {
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
        this.background.update()
        this.borderManager.update()
        this.physicsManager.update()
        this.teamsManager.update()
        this.hud.update()
    }

    updateStepGame() {
        super.updateStepGame()
        this.updatePlayersScore()
        if (this.iteration > this.duration * this.game.fps) this.step = "GAMEOVER"
    }

    updatePlayersScore() {
        for (let playerId in this.game.players) {
            const hero = this.getHero(playerId)
            if (!hero) continue
            const nbStars = countStarExtras(hero)
            this.incrScore(playerId, nbStars / this.game.fps)
        }
    }

    updateStepGameOver() {
        const { scores } = this
        if (!this.scoresBoard) this.scoresBoard = this.notifs.add(ScoresBoard, {
            x: this.width / 2,
            y: this.height / 2,
            scores,
        })
    }

    async loadJoypadScene() {
        const { JoypadGameScene } = await import("/static/catalogs/std/v1/joypad.mjs")
        await JoypadGameScene.load()
        return new JoypadGameScene(this.game)
    }
}


// BALL

@CATALOG.registerScene(REGISTER_COMMON_ARGS)
@Dependencies.add(GreenLandscapeBackground)
@StateNumber.define("goalsSize", { default: 150, precision: 10, showInBuilder: true })
@StateNumber.define("duration", { default: 3 * 60, precision: 30, showInBuilder: true })
@GameObject.StateProperty.define("teamsManager", {
    filter: { category: "manager/teams" },
    default: { key: "std:TeamsManager", nbTeams: 2 },
    showInBuilder: true,
})
@GameObject.StateProperty.define("physicsManager", {
    filter: { category: "manager/physics" },
    default: { key: "std:PhysicsManager" },
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
export class BallScene extends GameScene {

    init(args) {
        super.init(args)
        this.step = "INIT"
        this.initDuration = 3
        this.hud = new HeadsUpDisplay(this, {
            showHerosHealths: false
        })
    }

    initGraphics() {
        super.initGraphics()
        this.background.initGraphics()
        this.hud.initGraphics()
    }

    syncGraphics() {
        super.syncGraphics()
        this.background.syncGraphics()
        this.hud.syncGraphics()
    }

    onAddObject(obj) {
        super.onAddObject(obj)
        if (obj instanceof Ball) this.hackBall(obj)
        if (obj instanceof HeroSpawnPoint) this.hackHeroSpawnPoint(obj)
    }

    hackBall(ball) {
        ball._startX = ball.x
        ball._startY = ball.y
    }

    hackHeroSpawnPoint(point) {
        const scene = this
        point.initGoalSprite = function() {
            if(this.team===null) return
            const teamColor = scene.teamsManager?.getTeamColor?.(this.team) ?? "white"
            const goalsSize = scene.goalsSize
            
            // Check if rebuild is needed
            const needsRebuild = !this._goalSprite || 
                                 this._goalSpriteTeamColor !== teamColor ||
                                 this._goalSpriteGoalsSize !== goalsSize
            
            if(!needsRebuild) return
            
            // Remove old sprite if exists
            if(this._goalSprite) {
                this._graphics.removeChild(this._goalSprite)
                this._goalSprite.destroy()
                this._goalSprite = null
            }
            
            // Create new dashed circle
            const goalSprite = new window.PIXI.Graphics()
            const radius = goalsSize / 2
            const dashCount = 16
            const dashAngle = (2 * PI) / dashCount
            
            goalSprite.stroke({ color: teamColor, width: 2 })
            
            for (let i = 0; i < dashCount; i += 2) {
                const startAngle = i * dashAngle
                const endAngle = (i + 1) * dashAngle
                goalSprite.arc(0, 0, radius, startAngle, endAngle)
                goalSprite.stroke({ color: teamColor, width: 2 })
            }
            
            this._graphics.addChild(goalSprite)
            this._goalSprite = goalSprite
            this._goalSpriteTeamColor = teamColor
            this._goalSpriteGoalsSize = goalsSize
        }
        hackMethod(point, "syncGraphics", -1, evt => {
            if(point._graphics) {
                point.initGoalSprite()
                pixiHelpers.scaleTo(point._graphics, this.goalsSize, this.goalsSize)
                console.log("TMP HeroSpawnPoint.syncGraphics", point._graphics.x, point._graphics.y)
            }
        })
    }

    update() {
        super.update()
        this.background.update()
        this.borderManager.update()
        this.physicsManager.update()
        this.teamsManager.update()
        this.hud.update()
        //this.initTeams()
        this.preventHerosToMove(this.step == "INIT")
        this.checkBallGoals()
        if (this.step == "INIT") this.updateStepInit()
    }

    preventHerosToMove(val) {
        if(this._herosPreventedToMove === val) return
        this._herosPreventedToMove = val
        const heros = this.filterObjects("heros", obj => obj.constructor.IS_HERO)
        heros.forEach(hero => {
            if (val) {
                hero._preventMoveHack ||= hackMethod(hero, "getInputState", 1, evt => {
                    evt.stopPropagation()
                })
            } else if (hero._preventMoveHack) {
                hero._preventMoveHack.remove()
                delete hero._preventMoveHack
            }
        })
    }

    checkBallGoals() {
        const balls = this.filterObjects("balls", obj => obj instanceof Ball)
        const heroSpawnPoints = this.filterObjects("heroSpawnPoints", obj => obj instanceof HeroSpawnPoint)
        const goalsRadius = this.goalsSize/2
        balls.forEach(ball => heroSpawnPoints.forEach(point => {
            if(hypot(ball.x-point.x, ball.y-point.y) < goalsRadius) {
                this.handleBallGoal(ball, point)
            }
        }))
    }

    handleBallGoal(ball, heroSpawnPoint) {
        // incr other teams scores
        const { team } = heroSpawnPoint
        const heros = this.filterObjects("heros", obj => obj.constructor.IS_HERO)
        const otherTeamsHeros = heros.filter(hero => hero.team !== team)
        otherTeamsHeros.forEach(hero => this.incrScore(hero.playerId, 1))
        // respawn ball
        ball.x = ball._startX
        ball.y = ball._startY
        ball.speedX = 0
        ball.speedY = 0
    }

    updateStepInit() {
        const { iteration, initDuration } = this
        const { fps } = this.game
        this.initCountDown()
        this.updateWorld()
        if (iteration > initDuration * fps) {
            this.step = "GAME"
            delete this.countDown
        }
    }

    initCountDown() {
        this.countDown ||= this.notifs.add(CountDown, {
            x: this.width / 2,
            y: this.height / 2,
            duration: 3,
            font: "bold 200px arial",
            fillStyle: "black",
        })
    }

    updateStepGame() {
        const { iteration, initDuration, duration } = this
        const { fps } = this.game
        super.updateStepGame()
        if (iteration > (initDuration + duration) * fps) this.step = "GAMEOVER"
    }

    updateStepGameOver() {
        const { scores } = this
        if (!this.scoresBoard) this.scoresBoard = this.notifs.add(ScoresBoard, {
            x: this.width / 2,
            y: this.height / 2,
            scores,
        })
    }

    async loadJoypadScene() {
        const { JoypadGameScene } = await import("/static/catalogs/std/v1/joypad.mjs")
        await JoypadGameScene.load()
        return new JoypadGameScene(this.game)
    }
}


// WAIGTING

@CATALOG.registerScene({
    ...REGISTER_COMMON_ARGS,
    showInBuilder: false,
})
export class WaitingScene extends Scene {

    init(kwargs) {
        super.init(kwargs)
        this.backgroundColor = "black"
        this.playerList = this.addNotif(PlayerList, {})
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
            titleTxt.x = this.viewWidth / 2
            titleTxt.y = this.viewHeight / 6
        }
        hackMethod(titleTxt, "update", 0, evt => titleTxt.syncPos())
        titleTxt.syncPos()
    }

    update() {
        this.notifs.update()
        this.playerList.x = this.viewWidth * .1
        this.playerList.y = this.viewHeight * .3
        this.playerList.setPlayers(this.game.players)
    }

    initQrcodeImg() {
        if (!this.game.hasGraphics) return
        if (this._qrcodeObj) return
        this._qrcodeObj = this.addNotif(QrCode)
        this._qrcodeObj.x = this.viewWidth * .75
        this._qrcodeObj.y = this.viewHeight * .6
    }

    async loadJoypadScene() {
        const { JoypadWaitingScene } = await import("/static/catalogs/std/v1/joypad.mjs")
        await JoypadWaitingScene.load()
        return new JoypadWaitingScene(this.game)
    }
}


export class PlayerList extends GameObject {

    static ROW_HEIGHT = 40
    static ICON_SIZE = 30
    static FONT_SIZE = 24

    init(kwargs) {
        super.init(kwargs)
        this._playerIds = []
    }

    setPlayers(players) {
        this._players = players
    }

    syncGraphics() {
        const container = this._graphics
        if (!container) return
        
        // Ensure _rows is initialized
        if (!this._rows) this._rows = {}
        container.x = this.x
        container.y = this.y

        const players = this._players ?? {}
        const { ROW_HEIGHT, ICON_SIZE, FONT_SIZE } = PlayerList

        // add rows for new players
        for (const playerId in players) {
            if (!this._rows[playerId]) {
                const player = players[playerId]
                const row = new window.PIXI.Container()

                // icon: colored circle
                const icon = new window.PIXI.Graphics()
                icon.circle(0, 0, ICON_SIZE / 2)
                icon.fill({ color: player.color ?? 0xffffff })
                icon.stroke({ color: 0xffffff, width: 2 })
                icon.x = ICON_SIZE / 2
                icon.y = ROW_HEIGHT / 2
                row.addChild(icon)

                // name text
                const style = new window.PIXI.TextStyle({ fontFamily: 'Arial', fontSize: FONT_SIZE, fontWeight: 'bold', fill: 0xffffff })
                const txt = new window.PIXI.Text({ text: player.name ?? '', style })
                txt.anchor.set(0, 0.5)
                txt.x = ICON_SIZE + 8
                txt.y = ROW_HEIGHT / 2
                row.addChild(txt)
                row._txt = txt

                this._rows[playerId] = row
                container.addChild(row)
            }
        }

        // update & position rows, remove stale ones
        let rowIndex = 0
        for (const playerId in this._rows) {
            const row = this._rows[playerId]
            if (!(playerId in players)) {
                container.removeChild(row)
                delete this._rows[playerId]
            } else {
                row._txt.text = players[playerId].name ?? ''
                row.y = rowIndex * ROW_HEIGHT
                rowIndex++
            }
        }
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
        const fontHeight = floor(lineHeight * .7)
        const fontArgs = {
            font: `${fontHeight}px arial`,
            fillStyle: "black"
        }
        const titleCan = newTextCanvas("Scores:", {
            ...fontArgs,
            font: `bold ${fontHeight}px arial`,
        })
        ctx.drawImage(titleCan, (width - titleCan.width) / 2, lineHeight / 4)
        const sortedPlayerScores = Object.keys(players).map(pid => [pid, scores.get(pid) ?? 0]).sort((a, b) => b[1] - a[1])
        for (let i in sortedPlayerScores) {
            const [playerId, score] = sortedPlayerScores[i]
            const playerName = players[playerId].name
            const lineCan = newTextCanvas(`${playerName}: ${floor(score)}`, fontArgs)
            ctx.drawImage(lineCan, (width - lineCan.width) / 2, headerHeight + i * lineHeight)
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
        if ((iteration - this.startIt) / fps > this.duration) this.remove()
        this.syncText()
    }

    syncText() {
        const { iteration } = this.scene
        const { fps } = this.game
        this.updateText(ceil((this.duration - (iteration - this.startIt) / fps)))
    }
}