const { floor } = Math
import { GameObject } from '../../../core/v1/index.mjs'
import { OwnerableMixin } from './mixins.mjs'


/**
 * Generic class to display a horizontal bar of object icons above an owner.
 * Child classes must provide:
 * - getObjectTexture(): Returns the PIXI.Texture to use for each icon
 * - getObjectCount(): Returns the number of objects to display
 */
@OwnerableMixin.add()
export class ObjectBars extends GameObject {

    static ICON_SIZE = 16
    static ICON_SPACING = 2

    init(kwargs) {
        super.init(kwargs)
        this._lastCount = -1
    }

    update() {
        super.update()
        this.syncPosition()
    }

    /**
     * Position the bar above the owner. Override for custom positioning.
     */
    syncPosition() {
        const { owner } = this
        if (owner) {
            this.x = owner.x
            this.y = owner.y - owner.height / 2 - 15
        }
    }

    /**
     * Get the PIXI.Texture for the object icons.
     * Must be implemented by child classes.
     */
    getObjectTexture() {
        throw new Error("getObjectTexture() must be implemented by subclass")
    }

    /**
     * Get the number of objects to display.
     * Must be implemented by child classes.
     */
    getObjectCount() {
        throw new Error("getObjectCount() must be implemented by subclass")
    }

    /**
     * Get the size of each icon. Override to customize.
     */
    getIconSize() {
        return this.constructor.ICON_SIZE
    }

    /**
     * Get the spacing between icons. Override to customize.
     */
    getIconSpacing() {
        return this.constructor.ICON_SPACING
    }

    createGraphics() {
        this._container = new window.PIXI.Container()
        this._iconSprites = []
        return this._container
    }

    syncGraphics() {
        const pixiObj = this._container
        if (!pixiObj) return

        pixiObj.x = this.x
        pixiObj.y = this.y
        pixiObj.zIndex = this.z
        pixiObj.visible = this.visibility

        const { owner } = this
        if (!owner) {
            pixiObj.visible = false
            return
        }

        const count = this.getObjectCount()

        // Only rebuild sprites if count changed
        if (count !== this._lastCount) {
            this._lastCount = count
            this._rebuildIconSprites(count)
        }
    }

    _rebuildIconSprites(count) {
        const { _container, _iconSprites } = this
        const iconSize = this.getIconSize()
        const iconSpacing = this.getIconSpacing()

        // Remove excess sprites
        while (_iconSprites.length > count) {
            const sprite = _iconSprites.pop()
            _container.removeChild(sprite)
            sprite.destroy()
        }

        // Add new sprites if needed
        const texture = this.getObjectTexture()
        while (_iconSprites.length < count) {
            const sprite = new window.PIXI.Sprite(texture)
            sprite.anchor.set(0.5)
            sprite.width = iconSize
            sprite.height = iconSize
            _iconSprites.push(sprite)
            _container.addChild(sprite)
        }

        // Position all sprites in a horizontal bar, centered
        const totalWidth = count * iconSize + (count - 1) * iconSpacing
        let currentX = -totalWidth / 2 + iconSize / 2

        for (const sprite of _iconSprites) {
            sprite.x = currentX
            sprite.y = 0
            currentX += iconSize + iconSpacing
        }
    }
}
