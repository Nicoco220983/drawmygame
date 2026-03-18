const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, cos, sin, atan2, PI, random, hypot } = Math
import {
    sign, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, importJs, cachedTransform, hasKeys,
    CATALOG, IS_SERVER_ENV,
    StateProperty, StateBool, StateNumber,
    GameObject, Category, Dependencies, LinkTrigger, LinkReaction, Mixin, Img, SpriteSheet, Aud, ObjectRefs, now, hackMethod,
    pixiHelpers,
} from '../../../../core/v1/index.mjs'
import {
    ActivableMixin, CollectMixin, OwnerableMixin, BodyMixin, PhysicsMixin, AttackMixin,
    applyForce,
} from '../mixins.mjs'
import {
    JoypadButton, StickButton
} from '../joypad.mjs'
import {
    JumpMixin
} from './mixins.mjs'
import {
    SlashAud, HandHitAud, Pop, SmokeExplosion,
    Weapon,
} from './objects.mjs'


const REGISTER_COMMON_ARGS = {
    url: import.meta.url,
    version: "v1",
    perspective: "2Dside",
}


@Category.append("hero")
@Dependencies.add(SmokeExplosion, Pop)
@CollectMixin.add({
    canCollect: true,
    canGetCollected: false,
})
@AttackMixin.add({
    canAttack: false,
    canGetAttacked: true,
})
@StateNumber.define("lastSpawnIt", { default: -Infinity, nullableWith: -Infinity })
@StateNumber.define("team", { default: null, nullableWith: null })
export class Hero extends GameObject {
    static IS_HERO = true

    init(kwargs) {
        super.init(kwargs)
        if (kwargs && kwargs.playerId !== undefined) this.setPlayerId(kwargs.playerId)
    }

    setPlayerId(playerId) {
        if (playerId === this.playerId) return
        this.playerId = playerId
        this.scene.syncHero(this)
    }

    isLocalHero() {
        return this === this.scene.localHero
    }

    initExtras() {
        const extras = this.extras ||= new ObjectRefs(this.scene)
        return extras
    }

    addExtra(extra) {
        const extras = this.initExtras()
        extras.add(extra.id)
    }

    onExtraDrop(extra) {
        const extras = this.extras
        if (extras) extras.delete(extra.id)
    }

    update() {
        super.update()
        //this.initTeam()
        this.updateSpawnEffect()
    }

    // initTeam() {
    //     if(this._initTeamDone) return
    //     this._initTeamDone = true
    //     if(this.scene.teamsManager) {
    //         this.scene.teamsManager.assignHeroTeam(this)
    //     }
    // }

    updateSpawnEffect() {
        const { lastSpawnIt } = this
        const { iteration } = this.scene
        const { fps } = this.game
        if (lastSpawnIt + fps > iteration) {
            if (!this._spawnEnt) this._spawnEnt = this.addSpawnEffect()
        } else {
            delete this._spawnEnt
            this.lastSpawnIt = -Infinity
        }
    }

    addSpawnEffect() {
        return this.scene.addVisual(Pop, {
            x: this.x,
            y: this.y,
        })
    }

    getState() {
        const state = super.getState()
        state.pid = this.playerId
        state.liv = this.lives
        const inputState = this.inputState
        if (inputState && hasKeys(inputState)) state.ist = inputState
        else delete state.ist
        const extras = this.extras
        if (extras && extras.size > 0) {
            const stExtras = state.extras ||= []
            stExtras.length = 0
            for (let exId of extras) stExtras.push(exId)
        } else if (state.extras) state.extras.length = 0
        return state
    }

    setState(state) {
        super.setState(state)
        this.setPlayerId(state.pid)
        this.inputState = state.ist
        if (this.extras || state.extras) {
            const extras = this.initExtras()
            extras.clear()
            if (state.extras) for (let exId of state.extras) extras.add(exId)
        }
    }

    getInputState() {
        const inputState = this._inputState ||= {}
        return inputState
    }

    setInputState(inputState) {
        this.inputState = inputState
        this.inputStateTime = now()
        this._isStateToSend = true
    }

    initJoypadButtons(joypadScn) { }

    spawn(x, y) {
        this.x = x + floor((this.scene.rand("spawn") - .5) * 50)
        this.y = y
        this.speedX = 0
        this.speedY = -200
        this.lastSpawnIt = this.scene.iteration
    }

    die(killer) {
        this.remove()
        const { x, y } = this
        this.scene.addVisual(SmokeExplosion, { x, y })
    }

    remove() {
        super.remove()
        this.scene.syncHero(this)
    }

    syncGraphics() {
        super.syncGraphics()
        if(this.getDamagedAge <= 5) pixiHelpers.colorizeSprite(this._graphics, "red")
        else pixiHelpers.resetSpriteColor(this._graphics) 
    }

    /**
     * Create Pixi container for hero with body sprite
     * @returns {PIXI.Container|null}
     */
    // createGraphics() {
    //     // Create main container
    //     const container = pixiHelpers.createContainer()
    //     if (!container) return null
        
    //     // Create body sprite container
    //     container.bodyContainer = pixiHelpers.createContainer()
    //     pixiHelpers.addChild(container, container.bodyContainer)
        
    //     // Create extras container for attached items
    //     container.extrasContainer = pixiHelpers.createContainer()
    //     pixiHelpers.addChild(container, container.extrasContainer)
        
    //     // Create initial body sprite
    //     this.updateHeroBodySprite(container)
        
    //     return container
    // }

    /**
     * Update the hero's body sprite based on current state
     * @param {PIXI.Container} container
     */
    // updateHeroBodySprite(container) {
    //     if (!container?.bodyContainer) return
        
    //     const img = this.getBaseTexture()
    //     if (!img) return
        
    //     // Create new sprite
    //     const sprite = pixiHelpers.createSpriteFromCanvas(img)
    //     if (!sprite) return
        
    //     pixiHelpers.setAnchor(sprite, 0.5, 0.5)
        
    //     // Clear old sprites and add new one
    //     const bodyContainer = container.bodyContainer
    //     while (bodyContainer.children[0]) {
    //         pixiHelpers.safeDestroy(bodyContainer.children[0], false)
    //         bodyContainer.removeChild(bodyContainer.children[0])
    //     }
        
    //     pixiHelpers.addChild(bodyContainer, sprite)
    //     container.bodySprite = sprite
        
    //     // Apply player color tint
    //     const player = this.game.players?.[this.playerId]
    //     if (player?.color) {
    //         pixiHelpers.colorizeSprite(sprite, player.color)
    //     }
    // }

    // syncGraphics() {
    //     // Update container position
    //     pixiHelpers.setPosition(pixiObj, this.x, this.y)
        
    //     // Update body sprite
    //     const bodySprite = pixiObj.bodySprite
    //     if (bodySprite) {
    //         // Update size
    //         bodySprite.width = this.width
    //         bodySprite.height = this.height
            
    //         // Handle direction flipping
    //         const scaleX = Math.abs(bodySprite.scale.x) * (this.dirX >= 0 ? 1 : -1)
    //         bodySprite.scale.x = scaleX
            
    //         // Update visibility
    //         pixiHelpers.setSpriteAlpha(bodySprite, this.visibility ?? 1)
            
    //         // Check if we need to update the texture (animation frame changed)
    //         // This is a simple check - subclasses can override for more complex animations
    //         this.updateHeroAnimation(bodySprite, pixiObj)
    //     }
        
    //     // Update z-index
    //     if (this.z !== undefined) {
    //         pixiHelpers.setZIndex(pixiObj, this.z)
    //     }
    // }

    /**
     * Update hero animation frame
     * @param {PIXI.Sprite} bodySprite
     * @param {PIXI.Container} container
     */
    // updateHeroAnimation(bodySprite, container) {
    //     // Override in subclasses for sprite sheet animation
    //     // This base implementation just updates the texture if the image changed
    //     const currentImg = this.getBaseTexture()
    //     if (currentImg && bodySprite.texture && window.PIXI) {
    //         // Only update if image source changed
    //         const currentSource = bodySprite.texture.baseTexture?.resource?.source
    //         if (currentSource !== currentImg) {
    //             this.updateHeroBodySprite(container)
    //         }
    //     }
    // }
}


// NICO

const HandImg = new Img("/static/catalogs/std/v1/2Dside/assets/hand.png")

@BodyMixin.add({
    width: 25,
    height: 25,
})
@Dependencies.add(HandImg, SlashAud, HandHitAud)
class NicoHand extends Weapon {

    init(kwargs) {
        super.init(kwargs)
        this.syncPos()
        this.attackKnockback = 200
        this.initIt = this.scene.iteration
        this.game.audio.playSound(SlashAud)
    }

    update() {
        super.update()
        this.syncPos()
        this.canAttack = this.scene.iteration == this.initIt
    }

    syncPos() {
        const { owner } = this
        if (!owner) return
        this.x = owner.x + owner.dirX * 28
        this.y = owner.y
        this.dirX = owner.dirX
    }

    getAttackProps(obj) {
        const props = super.getAttackProps(obj)
        props.knockbackAngle = this.dirX > 0 ? -45 : -135
        return props
    }

    onAttack(obj, props) {
        this.game.audio.playSound(HandHitAud)
    }

    getBaseTexture() {
        return HandImg.getTexture()
    }
}


const ArrowsSpriteSheetImg = new Img("/static/catalogs/std/v1/2Dside/assets/arrows.png")
const ArrowsSpriteSheet = new SpriteSheet(ArrowsSpriteSheetImg, 4, 1)

const OuchAud = new Aud("/static/catalogs/std/v1/2Dside/assets/ouch.opus")

const NicoImg = new Img("/static/catalogs/std/v1/2Dside/assets/nico.png")
const NicoBaseSpriteSheet = new Img("/static/catalogs/std/v1/2Dside/assets/nico_full.png")
const NicoColorableSpriteSheet = new Img("/static/catalogs/std/v1/2Dside/assets/nico_full_colorable.png")
const NicoSpriteSheets = {
    spritesheets: {},
    get: function (color) {
        return this.spritesheets[color] ||= new SpriteSheet((() => {
            if (!color) return NicoBaseSpriteSheet
            const coloredImg = colorizeCanvas(cloneCanvas(NicoColorableSpriteSheet), color)
            return addCanvas(cloneCanvas(NicoBaseSpriteSheet), coloredImg)
        })(), 4, 1)
    },
}


@CATALOG.registerObject({
    ...REGISTER_COMMON_ARGS,
    label: "Nico",
    icon: NicoImg,
})
@Dependencies.add(NicoBaseSpriteSheet, NicoColorableSpriteSheet, OuchAud, ArrowsSpriteSheetImg, NicoHand)
@JumpMixin.add({
    jumpSpeed: 500,
    nullJumpSpeed: 800,
    maxJumpBlockAngle: 90,
})
@AttackMixin.modify({
    maxHealth: 100,
})
@PhysicsMixin.add()
@BodyMixin.add({
    width: 40,
    height: 45,
})
@StateNumber.define("handRemIt", { nullableWith: null, default: null })
@StateProperty.modify("dirX", { showInBuilder: true })
export class Nico extends Hero {

    init(kwargs) {
        super.init(kwargs)
        this.handDur = ceil(.1 * this.game.fps)
        this.hand = null
    }

    update() {
        super.update()
        this.applyInputState()
        this.updateHand()
    }

    updateHand() {
        if (this.handRemIt == this.handDur) {
            this.hand ||= this.scene.addObject(NicoHand, {
                owner: this
            })
        } else if (this.hand && !this.handRemIt) {
            this.hand.remove()
            this.hand = null
        }
    }

    applyInputState() {
        const { dt } = this.game
        if (this.getHealth() == 0) return
        const { inputState } = this
        if (!inputState || !inputState.walkX) {
            this.physicsStaticFriction = 500
            this.physicsDynamicFriction = 2
        } else if (inputState.walkX > 0) {
            this.dirX = 1
            this.speedX = sumTo(this.speedX, 1000 * dt, 300)
            this.physicsStaticFriction = this.physicsDynamicFriction = 0
        } else if (inputState.walkX < 0) {
            this.dirX = -1
            this.speedX = sumTo(this.speedX, 1000 * dt, -300)
            this.physicsStaticFriction = this.physicsDynamicFriction = 0
        }
        if (inputState && inputState.jump) this.mayJump()
        if (this.handRemIt) this.handRemIt -= 1
        if (inputState && inputState.obj) this.act()
        else if (this.handRemIt === 0) this.handRemIt = null
    }

    act() {
        const actionExtra = this.getActionExtra()
        if (actionExtra) actionExtra.act()
        else if (this.handRemIt === null) this.handRemIt = this.handDur
    }

    getHitBox() {
        return {
            left: this.x - 20,
            width: 40,
            top: this.y - 25,
            height: 50,
        }
    }

    onGetAttacked(val, damager) {
        this.game.audio.playSound(OuchAud)
    }

    initJoypadButtons(joypadScn) {
        const { width, height } = joypadScn
        const size = height * .45
        //joypadScn.addButton(JoypadButton, { inputKey: "ArrowLeft", x: width * .15, y: height * .27, size, icon: ArrowsSpriteSheet.get(3) })
        //joypadScn.addButton(JoypadButton, { inputKey: "ArrowRight", x: width * .3, y: height * .73, size, icon: ArrowsSpriteSheet.get(1) })
        const walkButton = joypadScn.addButton(StickButton, { x: width * .25, y: height * .5, size: height * .8 })
        walkButton.onInput = pos => {
            this.game.setInputKey("ArrowRight", (pos && pos.x > 10))
            this.game.setInputKey("ArrowLeft", (pos && pos.x < -10))
        }
        joypadScn.addButton(JoypadButton, { inputKey: "ArrowUp", x: width * .85, y: height * .27, size, icon: ArrowsSpriteSheet.getTexture(0) })
        this.actionButton = joypadScn.addButton(JoypadButton, { inputKey: " ", x: width * .7, y: height * .73, size, icon: HandImg })
        this.syncJoypadActionButton()
    }

    syncJoypadActionButton() {
        const { actionButton } = this
        if(!actionButton) return
        const actionExtra = this.getActionExtra()
        actionButton.icon = actionExtra ? actionExtra.getBaseTexture() : HandImg
    }

    addExtra(extra) {
        super.addExtra(extra)
        if (extra.isActionExtra) this.syncJoypadActionButton()
    }

    getActionExtra() {
        const { extras } = this
        if (!extras) return null
        let actionExtra = null
        extras.forEach(extra => {
            if (extra.isActionExtra) actionExtra = extra
        })
        return actionExtra
    }

    getBaseTexture() {
        const { iteration } = this.scene
        const { dt, players } = this.game
        const player = players && players[this.playerId]
        const color = player && player.color
        const spriteSheet = NicoSpriteSheets.get(color)
        if (iteration > 0 && (this.handRemIt || !this.canJump())) return spriteSheet.getTexture(1)
        else if (this.speedX == 0) return spriteSheet.getTexture(0)
        else return spriteSheet.getTexture(1 + floor((iteration * dt * 6) % 3))
    }

    /**
     * Get current animation frame index for Nico
     * @returns {number}
     */
    // getAnimationFrame() {
    //     const { iteration } = this.scene
    //     const { dt } = this.game
    //     if (iteration > 0 && (this.handRemIt || !this.canJump())) return 1
    //     else if (this.speedX == 0) return 0
    //     else return 1 + floor((iteration * dt * 6) % 3)
    // }

    /**
     * Update hero animation - optimized for Nico's sprite sheet
     * @param {PIXI.Sprite} bodySprite
     * @param {PIXI.Container} container
     */
    // updateHeroAnimation(bodySprite, container) {
    //     if (!bodySprite) return
        
    //     const player = this.game.players?.[this.playerId]
    //     const color = player?.color
    //     const frameIndex = this.getAnimationFrame()
        
    //     // Get the correct sprite sheet frame
    //     const spriteSheet = NicoSpriteSheets.get(color)
    //     const newImg = spriteSheet.get(frameIndex)
        
    //     if (newImg && window.PIXI) {
    //         // Only update texture if it changed
    //         const currentSource = bodySprite.texture?.baseTexture?.resource?.source
    //         if (currentSource !== newImg) {
    //             bodySprite.texture = window.PIXI.Texture.from(newImg)
    //         }
    //     }
        
    //     // Apply color tint if player has a color
    //     if (player?.color && !color) {
    //         pixiHelpers.colorizeSprite(bodySprite, player.color)
    //     }
    // }

    getInputState() {
        const { game } = this
        const inputState = super.getInputState()
        // walk
        delete inputState.walkX
        if (game.isKeyPressed("ArrowRight")) inputState.walkX = 1
        else if (game.isKeyPressed("ArrowLeft")) inputState.walkX = -1
        // jump
        delete inputState.jump
        if (game.isKeyPressed("ArrowUp")) inputState.jump = true
        // action
        delete inputState.obj
        if (game.isKeyPressed(" ")) inputState.obj = true
        return inputState
    }
}