const { floor } = Math
import { GameScene, FocusFirstHeroScene, GameObject, StateProperty, StateInt, Component, Sprite, Hero, ScoresBoard, ModuleCatalog, CountDown, hackMethod } from '../../core/game.mjs'

export const CATALOG = new ModuleCatalog("std")


@StateInt.define("lives", { default: 3, nullableWith: Infinity, showInBuilder: true })
class HerosResurectionsComponent extends Component {
    initActor(scn, kwargs) {
        hackMethod(scn, "addActor", -1, evt => {
            const act = evt.returnValue
            if(!(act instanceof Hero)) return
            hackMethod(act, "die", -1, evt => {
                scn.addHero(act.playerId)
            })
        })
    }
}


// CATCH ALL STARS

@CATALOG.registerScene("catch_all_stars")
@HerosResurectionsComponent.add()
export class CatchAllStarsScene extends FocusFirstHeroScene {
    update() {
        super.update()
        if(this.step == "GAME" && this.nbStars === 0) this.step = "VICTORY"
    }
}


// TAG

@CATALOG.registerScene("tag")
export class TagScene extends GameScene {
    
    constructor(game, scnId) {
        super(game, scnId)
        this.step = "INIT"
        this.initDuration = 3
        this.duration = 3 * 60 + this.initDuration
        this.actors.on("new", "registerHerosTagEvent", ent => this.tuneHeros(ent))
    }
    loadMap(map) {
        super.loadMap(map)
        this.addActor(Tag, { id: "tag" })
    }
    tuneHeros(hero) {
        if(!(hero instanceof Hero)) return
        hero.lives = hero.health = Infinity
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
        const { iteration, duration } = this
        const { fps } = this.game
        super.updateStepGame()
        if(iteration % fps == 0) this.incrNonTaggedPlayerScores()
        if(iteration > duration * fps) this.step = "GAMEOVER"
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