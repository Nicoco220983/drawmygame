import { GameScene, Entity, Sprite, Entities, Hero, ScoresBoard } from '../game.mjs'


export default class TagScene extends GameScene {
    constructor(game, scnId) {
        super(game, scnId)
        this.duration = 1
        this.entities.on("new", "registerHerosTagEvent", ent => this.tuneHeros(ent))
    }
    loadMap(map) {
        super.loadMap(map)
        this.newEntity(Tag, { id: "tag" })
    }
    tuneHeros(hero) {
        if(!(hero instanceof Hero)) return
        hero.lives = hero.health = Infinity
        hero.on("damage", "tag", kwargs => {
            const { damager } = kwargs
            const tag = this.entities.get("tag")
            if(!tag || !damager || tag.owner != damager.id) return
            tag.setOwner(hero.id)
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
        if(!this.scoresBoard) this.scoresBoard = this.notifs.new(ScoresBoard, {
            x: this.width/2,
            y: this.height/2,
            scores,
        })
    }
}


const TagSprite = new Sprite("/static/assets/tag.png")

class Tag extends Entity {
    constructor(group, id, kwargs) {
        super(group, id, kwargs)
        this.width = 30
        this.height = 30
        this.ownerId = null
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
            const owner = this.scene.entities.get(this.ownerId)
            if(!owner || owner.deleted) this.ownerId = null
        }
        if(!this.ownerId) this.findOwner()
    }

    findOwner() {
        let hero = null
        this.scene.entities.forEach(ent => {
            if(!hero && ent instanceof Hero) hero = ent
        })
        if(!hero) return
        this.setOwner(hero.id)
    }

    setOwner(ownerId) {
        this.ownerId = ownerId
        this.sync()
    }

    sync() {
        if(!this.ownerId) return
        const owner = this.scene.entities.get(this.ownerId)
        this.x = owner.x
        this.y = owner.y - 50
    }

    getSprite() {
        return this.ownerId ? TagSprite : null
    }

    getState() {
        const state = super.getState()
        state.own = this.ownerId
        return state
    }

    setState(state) {
        super.setState(state)
        this.ownerId = state.own
    }
}
Entities.register("tag", Tag)