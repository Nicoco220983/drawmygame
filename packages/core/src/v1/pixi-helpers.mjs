/**
 * PixiJS helper functions for DrawMyGame
 * 
 * These helpers provide convenient utilities for working with PixiJS sprites,
 * animations, and effects while maintaining server compatibility.
 */

import * as utils from './utils.mjs'
const { IS_SERVER_ENV } = utils
import { PIXI } from './pixi.mjs'

/**
 * Create a sprite from a sprite sheet/texture atlas
 * @param {PIXI.Spritesheet} sheet - The sprite sheet
 * @param {string} frameName - Name of the frame to use
 * @returns {PIXI.Sprite|null}
 */
export function createSpriteFromSheet(sheet, frameName) {
    const pixi = getPixi()
    if (IS_SERVER_ENV || !pixi || !sheet) return null
    const texture = sheet.textures[frameName]
    if (!texture) return null
    return new pixi.Sprite(texture)
}

/**
 * Create a sprite from a canvas or image element
 * @param {HTMLCanvasElement|HTMLImageElement} source - Source element
 * @returns {PIXI.Sprite|null}
 */
export function createSpriteFromCanvas(source) {
    // If source is already a texture, use it directly
    if (source instanceof PIXI.Texture) {
        return new PIXI.Sprite(source)
    }
    // Convert canvas/image to texture
    const texture = PIXI.Texture.from(source)
    return new PIXI.Sprite(texture)
}

/**
 * Create text with standard styling
 * @param {string} text - Text content
 * @param {Object} options - Text options
 * @returns {PIXI.Text|null}
 */
export function createTextPixi(text, options = {}) {
    
    const defaultStyle = {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff,
        align: 'center',
        ...options
    }
    
    return new PIXI.Text(text, defaultStyle)
}

/**
 * Apply color tint to a sprite
 * @param {PIXI.Sprite} sprite - The sprite to colorize
 * @param {string|number} color - Color (hex string or number)
 * @returns {PIXI.Sprite|null}
 */
export function colorizeSprite(sprite, color) {
    
    // Convert string color to number if needed
    let tint = color
    if (typeof color === 'string') {
        // Remove # if present and parse
        const hex = color.replace('#', '')
        tint = parseInt(hex, 16)
    }
    
    sprite.tint = tint
    return sprite
}

/**
 * Reset sprite tint to white (no colorization)
 * @param {PIXI.Sprite} sprite - The sprite to reset
 */
export function resetSpriteColor(sprite) {
    sprite.tint = 0xffffff
}

/**
 * Set sprite alpha/visibility
 * @param {PIXI.Sprite} sprite - The sprite
 * @param {number} alpha - Alpha value (0-1)
 */
// export function setSpriteAlpha(sprite, alpha) {
//     sprite.alpha = alpha
// }

/**
 * Set sprite position
 * @param {PIXI.Sprite|PIXI.Container} obj - The object to position
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
// export function setPosition(obj, x, y) {
//     obj.x = x
//     obj.y = y
// }

/**
 * Set sprite anchor point (center by default)
 * @param {PIXI.Sprite} sprite - The sprite
 * @param {number} x - Anchor X (0-1)
 * @param {number} y - Anchor Y (0-1)
 */
// export function setAnchor(sprite, x = 0.5, y = 0.5) {
//     sprite.anchor.set(x, y)
// }

/**
 * Set sprite scale with flip support
 * @param {PIXI.Sprite} sprite - The sprite
 * @param {number} scaleX - X scale (negative for flip)
 * @param {number} scaleY - Y scale (negative for flip)
 */
// export function setScale(sprite, scaleX, scaleY) {
//     sprite.scale.set(scaleX, scaleY)
// }

/**
 * Set sprite rotation angle (in degrees)
 * @param {PIXI.Sprite} sprite - The sprite
 * @param {number} angle - Angle in degrees
 */
// export function setRotation(sprite, angle) {
//     sprite.rotation = (angle * Math.PI) / 180
// }

/**
 * Create an animated sprite from a sprite sheet
 * @param {PIXI.Spritesheet} sheet - Sprite sheet with animations
 * @param {string} animationName - Name of the animation
 * @returns {PIXI.AnimatedSprite|null}
 */
export function createAnimatedSprite(sheet, animationName) {
    
    const animations = sheet.animations
    if (!animations || !animations[animationName]) return null
    
    const sprite = new PIXI.AnimatedSprite(animations[animationName])
    sprite.anchor.set(0.5)
    return sprite
}

/**
 * Update animated sprite frame based on time
 * @param {PIXI.AnimatedSprite} sprite - The animated sprite
 * @param {number} frameIndex - Frame index to show
 */
export function setAnimationFrame(sprite, frameIndex) {
    if (sprite.totalFrames > 0) {
        sprite.gotoAndStop(frameIndex % sprite.totalFrames)
    }
}

/**
 * Create a graphics object for drawing shapes
 * @param {Function} drawFn - Function that receives PIXI.Graphics to draw
 * @returns {PIXI.Graphics|null}
 */
// export function createGraphics(drawFn) {
    
//     const graphics = new PIXI.Graphics()
//     if (drawFn) drawFn(graphics)
//     return graphics
// }

/**
 * Draw a rectangle with PIXI.Graphics
 * @param {PIXI.Graphics} graphics - Graphics object
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {number|string} color - Fill color
 * @param {number} alpha - Alpha (0-1)
 */
export function drawRect(graphics, x, y, width, height, color = 0xffffff, alpha = 1) {
    
    let fillColor = color
    if (typeof color === 'string') {
        fillColor = parseInt(color.replace('#', ''), 16)
    }
    
    graphics.beginFill(fillColor, alpha)
    graphics.drawRect(x - width / 2, y - height / 2, width, height)
    graphics.endFill()
}

/**
 * Draw a circle with PIXI.Graphics
 * @param {PIXI.Graphics} graphics - Graphics object
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Radius
 * @param {number|string} color - Fill color
 * @param {number} alpha - Alpha (0-1)
 */
export function drawCircle(graphics, x, y, radius, color = 0xffffff, alpha = 1) {
    
    let fillColor = color
    if (typeof color === 'string') {
        fillColor = parseInt(color.replace('#', ''), 16)
    }
    
    graphics.beginFill(fillColor, alpha)
    graphics.drawCircle(x, y, radius)
    graphics.endFill()
}

/**
 * Create a container for grouping sprites
 * @returns {PIXI.Container|null}
 */
// export function createContainer() {
//     return new PIXI.Container()
// }

/**
 * Add a child to a container
 * @param {PIXI.Container} parent - Parent container
 * @param {PIXI.DisplayObject} child - Child to add
 */
// export function addChild(parent, child) {
//     parent.addChild(child)
// }

/**
 * Remove a child from a container
 * @param {PIXI.Container} parent - Parent container
 * @param {PIXI.DisplayObject} child - Child to remove
 */
// export function removeChild(parent, child) {
//     parent.removeChild(child)
// }

/**
 * Set the visibility of a display object
 * @param {PIXI.DisplayObject} obj - The object
 * @param {boolean} visible - Whether it should be visible
 */
// export function setVisible(obj, visible) {
//     obj.visible = visible
// }

/**
 * Set z-index/order of a display object
 * @param {PIXI.DisplayObject} obj - The object
 * @param {number} zIndex - Z-index value
 */
// export function setZIndex(obj, zIndex) {
//     obj.zIndex = zIndex
// }

/**
 * Enable sorting by z-index for a container
 * @param {PIXI.Container} container - The container
 */
// export function enableSortableChildren(container) {
//     container.sortableChildren = true
// }

// Re-export for convenience
//export { safeDestroy }
