/**
 * PixiJS integration module for DrawMyGame
 * 
 * This module provides PixiJS exports with IS_SERVER_ENV guards to ensure
 * no Pixi objects are created or referenced on the server.
 */

import * as utils from './utils.mjs'
const { IS_SERVER_ENV } = utils

// Export PIXI as null on server, or the actual module on client
export let PIXI = IS_SERVER_ENV ? null : window.PIXI
export let pixiApp = null

/**
 * Initialize PixiJS application
 * @param {HTMLElement} parentEl - Parent element to attach canvas to
 * @param {Object} options - PixiJS application options
 * @returns {Object|null} PixiJS Application instance or null on server
 */
// export function initPixi(parentEl, options = {}) {
//     if (IS_SERVER_ENV) return null
    
//     // Dynamic import of PixiJS to prevent server-side loading
//     const pixiModule = window.PIXI || null
//     if (!pixiModule) {
//         console.error('PixiJS not loaded. Make sure to include PixiJS script.')
//         return null
//     }
    
//     // Store PIXI reference
//     PIXI = pixiModule
    
//     // Default options
//     const defaultOptions = {
//         width: 800,
//         height: 600,
//         backgroundColor: 0x000000,
//         resolution: window.devicePixelRatio || 1,
//         autoDensity: true,
//         antialias: false,
//         ...options
//     }
    
//     // Create PixiJS Application
//     pixiApp = new PIXI.Application(defaultOptions)
    
//     // Append canvas to parent element
//     if (parentEl) {
//         parentEl.appendChild(pixiApp.view)
//     }
    
//     return pixiApp
// }

/**
 * Check if PixiJS is available (client-side only)
 * @returns {boolean}
 */
// export function isPixiAvailable() {
//     return !IS_SERVER_ENV && PIXI !== null
// }

/**
 * Safely destroy a Pixi object if it exists
 * @param {Object} obj - Pixi object to destroy
 * @param {boolean} [destroyChildren=true] - Whether to destroy children
 */
// export function safeDestroy(obj, destroyChildren = true) {
//     if (typeof obj.destroy === 'function') {
//         obj.destroy({ children: destroyChildren })
//     }
// }

/**
 * Create a container if on client, return null on server
 * @returns {PIXI.Container|null}
 */
// export function newContainer() {
//     if (IS_SERVER_ENV || !PIXI) return null
//     return new PIXI.Container()
// }

/**
 * Create a sprite from a texture/source if on client
 * @param {PIXI.Texture|HTMLImageElement|HTMLCanvasElement|string} source - Texture source
 * @returns {PIXI.Sprite|null}
 */
// export function newSprite(source) {
//     if (IS_SERVER_ENV || !PIXI) return null
//     if (typeof source === 'string') {
//         return PIXI.Sprite.from(source)
//     }
//     return new PIXI.Sprite(source)
// }

/**
 * Create text if on client
 * @param {string} text - Text content
 * @param {Object} style - Text style options
 * @returns {PIXI.Text|null}
 */
// export function newText(text, style = {}) {
//     if (IS_SERVER_ENV || !PIXI) return null
//     return new PIXI.Text(text, style)
// }

/**
 * Create graphics if on client
 * @returns {PIXI.Graphics|null}
 */
// export function newGraphics() {
//     if (IS_SERVER_ENV || !PIXI) return null
//     return new PIXI.Graphics()
// }
