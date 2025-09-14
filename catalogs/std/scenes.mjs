const { floor } = Math
import { GameScene, GameObject, Category, StateProperty, StateBool, StateInt, Component, Actor, Sprite, Hero, Enemy, ScoresBoard, ModuleCatalog, CountDown, hackMethod, hasKeys } from '../../core/game.mjs'
import { Star } from './actors.mjs'

export const CATALOG = new ModuleCatalog("std")


@StateInt.modify("y", { showInBuilder: false })
@StateInt.modify("x", { showInBuilder: false })
@Category.append("manager")
export class Manager extends Actor {}


@CATALOG.registerActor("heroslivesmng", {
    showInBuilder: true,
})
@StateProperty.define("deathsIts")
@StateInt.define("delay", { default: 1, showInBuilder: true })
@StateInt.define("lives", { default: 3, nullableWith: Infinity, showInBuilder: true })
@Category.append("heroslives")
export class HerosLivesManager extends Manager {

    init(kwargs) {
        super.init(kwargs)
        const { scene } = this
        hackMethod(scene, "addActor", -1, evt => {
            const act = evt.returnValue
            if(!(act instanceof Hero)) return
            hackMethod(act, "die", -1, evt => {
                const deathsIts = this.deathsIts ||= {}
                deathsIts[act.playerId] = scene.iteration
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


@CATALOG.registerActor("viewheroscentermng", {
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


@CATALOG.registerActor("viewfirstheromng", {
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


@CATALOG.registerActor("physicsmng")
@StateInt.define("gravityAcc", { default: 1000 })
@StateInt.define("gravityMaxSpeed", { default: 1000 })
@Category.append("physics")
export class PhysicsManager extends Manager {}


@CATALOG.registerActor("hitmng")
@Category.append("hit")
export class HitManager extends Manager {

    canTeamHit(team1, team2) {
        return true
    }
    canTeamDamage(team1, team2) {
        return team1 != team2
    }
}


// Standard

@CATALOG.registerScene("std")
@Actor.StateProperty.define("herosLivesManager", {
    filter: { category: "manager/heroslives" },
    default: { key: "heroslivesmng" },
    showInBuilder: true,
})
@Actor.StateProperty.define("viewManager", {
    filter: { category: "manager/view" },
    default: { key: "viewheroscentermng" },
    showInBuilder: true,
})
@Actor.StateProperty.define("hitManager", {
    filter: { category: "manager/hit" },
    default: { key: "hitmng" },
    showInBuilder: true,
})
@Actor.StateProperty.define("physicsManager", {
    filter: { category: "manager/physics" },
    default: { key: "physicsmng" },
    showInBuilder: true,
})
@StateBool.define("killAllEnemies", { default: false, showInBuilder: true })
@StateBool.define("catchAllStars", { default: false, showInBuilder: true })
export class StandardScene extends GameScene {
    update() {
        super.update()
        this.viewManager.update()
        this.herosLivesManager.update()
        if(this.step == "GAME") {
            let allOk = null
            if(allOk!==false && this.catchAllStars) {
                const stars = this.filterActors("stars", act => act instanceof Star)
                allOk = (stars.length == 0)
            }
            if(allOk!==false && this.killAllEnemies) {
                const enemies = this.filterActors("enemies", act => act instanceof Enemy)
                allOk = (enemies.length == 0)
            }
            if(allOk) this.step = "VICTORY"
        }
    }
}


// TAG

@CATALOG.registerScene("tag")
@StateInt.define("duration", { default: 3 * 60, showInBuilder: true })
@Actor.StateProperty.define("hitManager", {
    filter: { category: "manager/hit" },
    default: { key: "hitmng" },
    showInBuilder: true,
})
@Actor.StateProperty.define("physicsManager", {
    filter: { category: "manager/physics" },
    default: { key: "physicsmng" },
    showInBuilder: true,
})
export class TagScene extends GameScene {
    
    constructor(game, scnId) {
        super(game, scnId)
        this.step = "INIT"
        this.initDuration = 3
        this.actors.on("new", "registerHerosTagEvent", ent => this.tuneHeros(ent))
    }
    loadMap(map) {
        super.loadMap(map)
        this.addActor(Tag, { id: "tag" })
    }
    tuneHeros(hero) {
        if(!(hero instanceof Hero)) return
        hero.maxHealth = Infinity
        hero.on("damage", "tag", kwargs => {
            const { damager } = kwargs
            const tag = this.actors.get("tag")
            if(!tag || !damager || tag.ownerId != damager.id) return
            tag.setOwner(hero.id)
        })
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
    update() {
        super.update()
        if(this.step == "INIT") this.updateStepInit()
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
    updateStepGame() {
        const { iteration, initDuration, duration } = this
        const { fps } = this.game
        super.updateStepGame()
        if(iteration % fps == 0) this.incrNonTaggedPlayerScores()
        if(iteration > (initDuration + duration) * fps) this.step = "GAMEOVER"
    }
    incrNonTaggedPlayerScores() {
        const tag = this.actors.get("tag")
        const taggedHero = this.actors.get(tag.ownerId)
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
    handleHerosOut() {
        const { heros } = this
        for(let playerId in heros) {
            const hero = heros[playerId]
            if(hero.y > this.map.height) hero.y -= this.map.height
            if(hero.x > this.map.width) hero.x -= this.map.width
            if(hero.x < 0) hero.x += this.map.width
        }
    }
}


const TagSprite = new Sprite(CATALOG.registerImage("/static/catalogs/std/assets/tag.png"))

@CATALOG.registerActor("tag", {
    showInBuilder: false
})
@StateProperty.define("ownerId")
export class Tag extends GameObject {

    constructor(scn, kwargs) {
        super(scn, kwargs)
        this.width = 30
        this.height = 30
        this.ownerId = null
    }

    getOwner() {
        const { ownerId } = this
        if(ownerId === null) return null
        return this.scene.actors.get(ownerId)
    }

    getPhysicsProps() {
        return null
    }

    update() {
        super.update()
        this.checkOwner()
        this.sync()
    }

    checkOwner() {
        if(this.ownerId) {
            const owner = this.getOwner()
            if(!owner || owner.deleted) this.ownerId = null
        }
        if(!this.ownerId) this.findOwner()
    }

    findOwner() {
        let heros = []
        this.scene.actors.forEach(ent => {
            if(ent instanceof Hero) heros.push(ent)
        })
        if(heros.length == 0) return
        const numHero = floor(this.scene.rand("tag")*heros.length)
        const hero = heros[numHero]
        this.setOwner(hero.id)
    }

    setOwner(ownerId) {
        this.ownerId = ownerId
        this.sync()
    }

    sync() {
        const owner = this.getOwner()
        if(!owner) return
        this.x = owner.x
        this.y = owner.y - 50
        if(this.scene.step == "INIT") owner.getInputState = () => null
        else delete owner.getInputState
    }

    getSprite() {
        return (this.ownerId !== null) ? TagSprite : null
    }

    getState() {
        const state = super.getState()
        if(this.ownerId !== null) state.own = this.ownerId
        else delete state.own
        return state
    }

    setState(state) {
        super.setState(state)
        if(state.own !== undefined) this.ownerId = state.own
        else this.ownerId = null
    }
}