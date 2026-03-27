const { abs, round, PI } = Math
const { assign } = Object
import * as utils from './utils.mjs'
const { IS_SERVER_ENV, urlAbsPath, checkHit, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, addNewDomEl, importJs } = utils

// Export PIXI as null on server, or the actual module on client
export let PIXI = IS_SERVER_ENV ? null : window.PIXI
export let pixiApp = null

/**
 * Initialize a PixiJS Application for the game
 * @param {HTMLElement} parentEl - Parent element to append the canvas to
 * @param {Object} options - Options for the Pixi application
 * @returns {PIXI.Application|null} The created Pixi application or null if not available
 */
export async function initPixiApp(parentEl, options = {}) {
    if (IS_SERVER_ENV || !window.PIXI) return null
    
    const defaultOptions = {
        width: 800,
        height: 600,
        backgroundColor: 0x000000,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        preference: 'canvas',  // Use Canvas2D for stability
    }
    
    const pixiApp = new PIXI.Application()
    await pixiApp.init({ ...defaultOptions, ...options })
    
    if (parentEl) {
        parentEl.appendChild(pixiApp.canvas)
    }
    
    return pixiApp
}


export function getCachedTexture(img) {
    if(!img || img.unloaded) return null
    const texture = img._pixiTexture ||= PIXI.Texture.from(img)
    return texture
}


/**
 * Converts a color string to PIXI color number
 * @param {string|number} color - Color string (hex, rgb, named) or number
 * @param {number} defaultColor - Default color if conversion fails (default: 0xffffff)
 * @returns {number}
 */
export function toPixiColor(color, defaultColor = 0xffffff) {
    if (typeof color === 'number') return color
    if (typeof color !== 'string') return defaultColor
    
    const str = color.trim().toLowerCase()
    
    // Hex format: #ffffff or 0xffffff
    if (str.startsWith('#')) {
        return parseInt(str.slice(1), 16) || defaultColor
    }
    if (str.startsWith('0x')) {
        return parseInt(str, 16) || defaultColor
    }
    
    // RGB format: rgb(r,g,b) or rgba(r,g,b,a)
    if (str.startsWith('rgb')) {
        const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (match) {
            const r = parseInt(match[1])
            const g = parseInt(match[2])
            const b = parseInt(match[3])
            return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
        }
        return defaultColor
    }
    
    // Named colors
    const NAMED_COLORS = {
        white: 0xffffff, black: 0x000000, red: 0xff0000, green: 0x00ff00,
        blue: 0x0000ff, yellow: 0xffff00, cyan: 0x00ffff, magenta: 0xff00ff,
        grey: 0x808080, gray: 0x808080, lightgrey: 0xd3d3d3, lightgray: 0xd3d3d3,
        darkgrey: 0xa9a9a9, darkgray: 0xa9a9a9, orange: 0xffa500, purple: 0x800080,
        pink: 0xffc0cb, brown: 0xa52a2a, lime: 0x00ff00, navy: 0x000080,
        teal: 0x008080, olive: 0x808000, silver: 0xc0c0c0, maroon: 0x800000,
    }
    
    return NAMED_COLORS[str] ?? defaultColor
}

// PixiJS helper functions

/**
 * Get the PIXI module (for internal use)
 * @returns {Object|null}
 */
function getPixi() {
    return IS_SERVER_ENV ? null : window.PIXI
}

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
 * Create a sprite from img, canvas or texture
 * @param {HTMLCanvasElement|HTMLImageElement|PIXI.TExture} source - Source element
 * @returns {PIXI.Sprite|null}
 */
export function createSprite(source) {
    if(!source || source.unloaded) return null
    const texture = (source instanceof PIXI.Texture) ? source : getCachedTexture(source)
    if(!texture) return null
    return new PIXI.Sprite(texture)
}

export function addNewSpriteTo(container, img) {
    const sprite = new PIXI.Sprite()
    sprite.anchor.set(0.5)
    if(img) sprite.texture = getCachedTexture(img)
    container.addChild(sprite)
    return sprite
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
export function tintSprite(sprite, color) {
    sprite.tint = color ? toPixiColor(color) : 0xffffff
    return sprite
}

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
    graphics.beginFill(toPixiColor(color), alpha)
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
    graphics.beginFill(toPixiColor(color), alpha)
    graphics.drawCircle(x, y, radius)
    graphics.endFill()
}

function scaleTo(pixiObj, width, height, dirX=1, dirY=1) {
    const bounds = pixiObj.getBounds()
    pixiObj.scale.x = width / bounds.width * abs(pixiObj.scale.x) * dirX
    pixiObj.scale.y = height / bounds.height * abs(pixiObj.scale.y) * dirY
}

function scaleSpriteTo(sprite, width, height, dirX=1, dirY=1) {
    if (!sprite) return
    const texture = sprite.texture
    if (!texture) return
    const texWidth = texture.orig.width
    const texHeight = texture.orig.height
    if (texWidth === 0 || texHeight === 0) return
    sprite.scale.x = width / texWidth * dirX
    sprite.scale.y = height / texHeight * dirY
}

// pixiHelpers namespace for backward compatibility
export const pixiHelpers = {
    getCachedTexture,

    createSpriteFromSheet,
    createTextPixi,
    addNewSpriteTo,
    tintSprite,
    drawRect,
    drawCircle,
    toPixiColor,
    
    // Aliases for compatibility
    createSprite: createSprite,
    setPosition: (obj, x, y) => { if (obj) { obj.x = x; obj.y = y } },
    setAnchor: (sprite, x, y) => { if (sprite?.anchor) sprite.anchor.set(x, y) },
    setScale: (sprite, x, y) => { if (sprite?.scale) sprite.scale.set(x, y ?? x) },
    setSpriteAlpha: (sprite, alpha) => { if (sprite) sprite.alpha = alpha },
    setZIndex: (obj, zIndex) => { if (obj) obj.zIndex = zIndex },
    safeDestroy: (obj, destroyChildren = true) => {
        if (obj && !obj._destroyed) {
            obj.destroy({ children: destroyChildren })
            obj._destroyed = true
        }
    },
    scaleTo,
    scaleSpriteTo,
}
