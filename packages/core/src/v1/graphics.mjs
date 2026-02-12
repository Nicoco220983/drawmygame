const { round, PI } = Math
const { assign } = Object
import * as utils from './utils.mjs'
const { IS_SERVER_ENV, urlAbsPath, checkHit, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, addNewDomEl, importJs } = utils
//import { PIXI, initPixi, pixiApp, isPixiAvailable, safeDestroy } from './pixi.mjs'
import * as pixiHelpers from './pixi-helpers.mjs'

// Re-export Pixi-related modules
//export { PIXI, initPixi, pixiApp, isPixiAvailable, safeDestroy, pixiHelpers }
export { pixiHelpers }

// Legacy GraphicsProps class - deprecated, kept for backward compatibility
// TODO: Remove after all catalog code is migrated to PixiJS
export class GraphicsProps {
    static {
        assign(this.prototype, {
            color: null,
            img: null,
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            dirX: 1,
            dirY: 1,
            angle: 0,
            order: 0,
            visibility: 1,
            colorize: null,
        })
    }

    constructor(kwargs) {
        assign(this, kwargs)
    }

    draw(drawer) {
        // Deprecated - use PixiJS sprites instead
        console.warn('GraphicsProps.draw() is deprecated, use PixiJS sprites')
    }
}

// Legacy GraphicsEngine class - deprecated, kept for backward compatibility
// TODO: Remove after all catalog code is migrated to PixiJS
export class GraphicsEngine {
    constructor(scn) {
        this.scene = scn
    }

    draw(...propss) {
        // Deprecated - use PixiJS rendering instead
        console.warn('GraphicsEngine.draw() is deprecated, use PixiJS rendering')
    }
}

// PixiJS-specific rendering utilities

/**
 * Converts a DOM image/canvas to a PixiJS Texture
 * @param {HTMLImageElement|HTMLCanvasElement} source - Source image or canvas
 * @returns {PIXI.Texture|null}
 */
// export function sourceToTexture(source) {
//     if (IS_SERVER_ENV || !PIXI || !source) return null
//     return PIXI.Texture.from(source)
// }

/**
 * Converts a color string to PIXI color number
 * @param {string|number} color - Color string (hex) or number
 * @returns {number}
 */
export function toPixiColor(color) {
    if (typeof color === 'number') return color
    if (typeof color === 'string') {
        return parseInt(color.replace('#', ''), 16)
    }
    return 0xffffff
}

/**
 * Create a sprite from an image source with proper settings for game objects
 * @param {HTMLImageElement|HTMLCanvasElement|PIXI.Texture} source - Image source
 * @param {Object} options - Options for the sprite
 * @returns {PIXI.Sprite|null}
 */
// export function createGameSprite(source, options = {}) {
//     if (IS_SERVER_ENV || !PIXI || !source) return null
    
//     const texture = source instanceof PIXI.Texture ? source : PIXI.Texture.from(source)
//     const sprite = new PIXI.Sprite(texture)
    
//     // Default to centered anchor
//     sprite.anchor.set(0.5)
    
//     // Apply options
//     if (options.x !== undefined) sprite.x = options.x
//     if (options.y !== undefined) sprite.y = options.y
//     if (options.width !== undefined) sprite.width = options.width
//     if (options.height !== undefined) sprite.height = options.height
//     if (options.alpha !== undefined) sprite.alpha = options.alpha
//     if (options.tint !== undefined) sprite.tint = toPixiColor(options.tint)
//     if (options.visible !== undefined) sprite.visible = options.visible
    
//     return sprite
// }

/**
 * Update a sprite's transform based on game object properties
 * @param {PIXI.Sprite} sprite - The sprite to update
 * @param {Object} obj - Game object with x, y, width, height, dirX, dirY, angle
 * @param {Object} options - Additional options
 */
// export function updateSpriteTransform(sprite, obj, options = {}) {
//     if (IS_SERVER_ENV || !sprite) return
    
//     const { x, y, width, height, dirX, dirY, angle } = obj
    
//     // Position
//     if (x !== undefined) sprite.x = x
//     if (y !== undefined) sprite.y = y
    
//     // Size (scale based on original texture size if not specified)
//     if (width !== undefined && sprite.texture) {
//         const origWidth = sprite.texture.orig?.width || sprite.texture.width || 1
//         sprite.scale.x = (width / origWidth) * (dirX || 1)
//     }
//     if (height !== undefined && sprite.texture) {
//         const origHeight = sprite.texture.orig?.height || sprite.texture.height || 1
//         sprite.scale.y = (height / origHeight) * (dirY || 1)
//     }
    
//     // Direction/flip
//     if (dirX !== undefined && width === undefined) {
//         sprite.scale.x = Math.abs(sprite.scale.x) * (dirX >= 0 ? 1 : -1)
//     }
//     if (dirY !== undefined && height === undefined) {
//         sprite.scale.y = Math.abs(sprite.scale.y) * (dirY >= 0 ? 1 : -1)
//     }
    
//     // Rotation
//     if (angle !== undefined) {
//         sprite.rotation = (angle * PI) / 180
//     }
    
//     // Visibility
//     if (obj.visibility !== undefined) {
//         sprite.alpha = obj.visibility
//     }
// }

/**
 * Create a PIXI container for a game object with body sprite and extras
 * @param {Object} options - Container options
 * @returns {PIXI.Container|null}
 */
// export function createGameContainer(options = {}) {
//     if (IS_SERVER_ENV || !PIXI) return null
    
//     const container = new PIXI.Container()
    
//     // Create body sprite container
//     const bodyContainer = new PIXI.Container()
//     container.addChild(bodyContainer)
//     container.bodyContainer = bodyContainer
    
//     // Create extras container (for items, effects attached to object)
//     const extrasContainer = new PIXI.Container()
//     container.addChild(extrasContainer)
//     container.extrasContainer = extrasContainer
    
//     return container
// }

/**
 * Create a tiled background sprite
 * @param {PIXI.Texture} texture - Texture to tile
 * @param {number} width - Width of the tiled area
 * @param {number} height - Height of the tiled area
 * @returns {PIXI.TilingSprite|null}
 */
// export function createTiledBackground(texture, width, height) {
//     if (IS_SERVER_ENV || !PIXI || !texture) return null
//     return new PIXI.TilingSprite(texture, width, height)
// }
