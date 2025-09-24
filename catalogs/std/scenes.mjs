const { assign } = Object
const { floor, round } = Math
import { GameScene, GameObject, Category, StateProperty, StateBool, StateInt, Mixin, OwnerableMixin, Sprite, Hero, Enemy, ScoresBoard, ModuleCatalog, CountDown, hackMethod, hasKeys, GameObjectGroup, PlayerIcon } from '../../core/game.mjs'
import { Star } from './objects.mjs'

export const CATALOG = new ModuleCatalog("std")


@StateInt.modify("y", { showInBuilder: false })
@StateInt.modify("x", { showInBuilder: false })
@Category.append("manager")
export class Manager extends GameObject {}


@CATALOG.registerObject("heroslivesmng", {
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


@CATALOG.registerObject("viewheroscentermng", {
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


@CATALOG.registerObject("viewfirstheromng", {
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


@CATALOG.registerObject("physicsmng")
@StateInt.define("gravityAcc", { default: 1000 })
@StateInt.define("gravityMaxSpeed", { default: 1000 })
@Category.append("physics")
export class PhysicsManager extends Manager {}


@CATALOG.registerObject("attackmng")
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
        this.heroLineHeight = 20
        this.barWidth = 100
        this.globalElems = new GameObjectGroup(this.scene)
        this.herosElems = new Map()
        this.showHerosHealths = kwargs?.showHerosHealths ?? true
    }
    addGlobalHudElem(cls, args) {
        this.globalElems.add(cls, args)
    }
    initHeroElements(hero) {
        const { game, herosElems, heroLineHeight: lineHeight } = this
        for(let playerId in game.players) {
            if(herosElems.has(playerId)) continue
            const grp = new GameObjectGroup(this.scene, { x: 5, y: 5 + herosElems.size * lineHeight })
            herosElems.set(playerId, grp)
            grp.nbBarElems = 0
            grp.add(PlayerIcon, { x: lineHeight/2, y: lineHeight/2, width: lineHeight, height: lineHeight, playerId })
            if(this.showHerosHealths) this.addHeroElement(grp, HealthBar, { playerId })
        }
        return herosElems
    }
    addHeroElement(grp, cls, args) {
        const { heroLineHeight: lineHeight } = this
        const elem = grp.add(cls, args)
        if(elem instanceof BarNotif) {
            elem.barElemNum = grp.nbBarElems
            assign(elem, {
                width: 100,
                height: 10,
                x: lineHeight + 5 + 100 / 2,
                y: lineHeight / 2, // TODO: adapt if several bars
            })
            grp.nbBarElems += 1
        }
        return elem
    }
    update() {
        this.initHeroElements()
        this.globalElems.update()
        this.herosElems.forEach(elems => elems.update())
    }
    drawTo(ctx) {
        super.drawTo(ctx)
        this.globalElems.drawTo(ctx)
        this.herosElems.forEach(elems => elems.drawTo(ctx))
    }
}


class BarNotif extends GameObject {
    init(args) {
        super.init(args)
        this.color = "white"
        this.value = 1  // from 0 to 1
        this.width = 100
        this.height = 10
    }
    drawTo(ctx) {
        const { x, y, width, height } = this
        const left = ~~(x-width/2), top = ~~(y-height/2)
        const valWidth = ~~(width * this.value)
        ctx.fillStyle = "grey"
        ctx.fillRect(left, top, width, height)
        ctx.fillStyle = this.color
        ctx.fillRect(left, top, valWidth, height)
        ctx.strokeStyle = "black"
        ctx.lineWidth = 1
        ctx.strokeRect(left, top, width, height)
    }
}


class HealthBar extends BarNotif {
    init(args) {
        super.init(args)
        this.color = "red"
        this.playerId = args.playerId
    }
    update() {
        const hero = this.scene.getHero(this.playerId)
        this.value = hero ? (hero.getHealth() / hero.maxHealth) : 0
    }
}


// Standard

@CATALOG.registerScene("std")
@StateBool.define("killAllEnemies", { default: false, showInBuilder: true })
@StateBool.define("catchAllStars", { default: false, showInBuilder: true })
@GameObject.StateProperty.define("herosLivesManager", {
    filter: { category: "manager/heroslives" },
    default: { key: "heroslivesmng" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("viewManager", {
    filter: { category: "manager/view" },
    default: { key: "viewheroscentermng" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("attackManager", {
    filter: { category: "manager/attack" },
    default: { key: "attackmng" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("physicsManager", {
    filter: { category: "manager/physics" },
    default: { key: "physicsmng" },
    showInBuilder: true,
})
export class StandardScene extends GameScene {
    init(args) {
        super.init(args)
        this.hud = new HeadsUpDisplay(this)
    }
    update() {
        super.update()
        this.hud.update()
        this.viewManager.update()
        this.herosLivesManager.update()
        this.attackManager.update()
        this.physicsManager.update()
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

    drawTo(ctx) {
        super.drawTo(ctx)
        this.hud.drawTo(ctx)
    }
}


// TAG

@CATALOG.registerScene("tag")
@StateInt.define("duration", { default: 3 * 60, showInBuilder: true })
@GameObject.StateProperty.define("attackManager", {
    filter: { category: "manager/attack" },
    default: { key: "attackmng" },
    showInBuilder: true,
})
@GameObject.StateProperty.define("physicsManager", {
    filter: { category: "manager/physics" },
    default: { key: "physicsmng" },
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

    onAddObject(obj) {
        super.onAddObject(obj)
        if(obj instanceof Hero) this.hackHero(obj)
    }

    hackHero(hero) {
        hero.maxHealth = Infinity
        hackMethod(hero, "onGetAttacked", 0, evt => {
            const attacker = evt.inputArgs[0]
            const tag = this.tag
            if(!tag || !attacker || tag.ownerId != attacker.id) return
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

    handleHerosOut() {
        const { heros } = this
        for(let playerId in heros) {
            const hero = heros[playerId]
            if(hero.y > this.map.height) hero.y -= this.map.height
            if(hero.x > this.map.width) hero.x -= this.map.width
            if(hero.x < 0) hero.x += this.map.width
        }
    }

    drawTo(ctx) {
        super.drawTo(ctx)
        this.hud.drawTo(ctx)
    }
}


const TagSprite = new Sprite(CATALOG.registerImage("/static/catalogs/std/assets/tag.png"))

@CATALOG.registerObject("tag", {
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

    getPhysicsProps() {
        return null
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

    getSprite() {
        return this.owner ? TagSprite : null
    }
}