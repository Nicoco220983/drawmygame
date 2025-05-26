import { GameScene, Entity, Sprite, Entities, Hero, ScoresPanel } from '../game.mjs'


const TagSprite = new Sprite("/static/assets/tag.png")

class Tag extends Entity {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = 30
        this.height = 30
        this.owner = null
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
        if(this.owner) {
            const owner = this.scene.entities.get(this.owner)
            if(!owner || owner.deleted) this.owner = null
        }
        if(!this.owner) this.findOwner()
    }

    findOwner() {
        let hero = null
        this.scene.entities.forEach(ent => {
            if(!hero && ent instanceof Hero) hero = ent
        })
        if(!hero) return
        this.setOwner(hero.id)
    }

    setOwner(owner) {
        this.owner = owner
        this.sync()
    }

    sync() {
        if(!this.owner) return
        const owner = this.scene.entities.get(this.owner)
        this.x = owner.x
        this.y = owner.y - 50
    }

    getSprite() {
        return TagSprite
    }

    getState() {
        const state = super.getState()
        state.owner = this.owner
        return state
    }

    setState(state) {
        super.setState(state)
        this.owner = state.owner
    }
}
Entities.register("tag", Tag)


export default class TagScene extends GameScene {
    constructor(game, scnId) {
        super(game, scnId)
        this.duration = 300
        this.entities.on("new", "registerHerosTagEvent", ent => this.registerHerosTagEvent(ent))
    }
    loadMap(map) {
        super.loadMap(map)
        this.newEntity(Tag, { id: "tag" })
    }
    registerHerosTagEvent(ent) {
        if(!(ent instanceof Hero)) return
        ent.on("damage", "tag", kwargs => {
            const { damager } = kwargs
            const tag = this.entities.get("tag")
            if(!tag || !damager || tag.owner != damager.id) return
            tag.setOwner(ent.id)
        })
    }
    updateStepGame() {
        const { iteration, duration } = this
        const { fps } = this.game
        super.updateStepGame()
        if(iteration % fps == 0) this.addNonTaggedPlayerScores()
        if(iteration > duration * fps) this.step = "GAMEOVER"
    }
    addNonTaggedPlayerScores() {
        const tag = this.entities.get("tag")
        const taggedHero = this.entities.get(tag.owner)
        if(!taggedHero) return
        const taggedPlayerId = taggedHero.playerId
        for(let playerId in this.game.players) {
            if(playerId == taggedPlayerId) continue
            this.addScore(playerId, 1)
        }
    }
    updateStepGameOver() {
        const { scores } = this
        if(!this.scoresPanel) this.scoresPanel = this.notifs.new(ScoresPanel, { scores })
    }
}