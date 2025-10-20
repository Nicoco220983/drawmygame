const { assign } = Object
const { min, max } = Math

const IS_SERVER_ENV = (typeof window === 'undefined')


/**
 * Creates a new HTML canvas element
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 * @param {?string} [color] - Optional fill color for the canvas
 * @returns {HTMLCanvasElement | null} Canvas element or null if in server environment
 */
function newCanvas(width, height, color) {
    if(IS_SERVER_ENV) return null
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    if(color) {
        const ctx = canvas.getContext("2d")
        ctx.fillStyle = color
        ctx.fillRect(0, 0, width, height)
    }
    return canvas
}

/**
 * Clones a canvas with optional transformations and cropping
 * @param {HTMLCanvasElement} canvas - Source canvas to clone
 * @param {{
 *   flipX?: boolean,
 *   flipY?: boolean,
 *   scaleX?: number,
 *   scaleY?: number,
 *   col?: [number, number],
 *   row?: [number, number],
 *   dx?: number,
 *   dy?: number,
 *   width?: number,
 *   height?: number
 * }} [kwargs] - Optional transformation parameters
 * @returns {HTMLCanvasElement} New canvas with transformations applied
 */
function cloneCanvas(canvas, kwargs) {
    const flipX = (kwargs && kwargs.flipX) || false
    const flipY = (kwargs && kwargs.flipY) || false
    const scaleX = (kwargs && kwargs.scaleX) || 1
    const scaleY = (kwargs && kwargs.scaleY) || 1
    const numCol = (kwargs && kwargs.col && kwargs.col[0]) || 0
    const nbCols = (kwargs && kwargs.col && kwargs.col[1]) || 1
    const numRow = (kwargs && kwargs.row && kwargs.row[0]) || 0
    const nbRows = (kwargs && kwargs.row && kwargs.row[1]) || 1
    const dx = (kwargs && kwargs.dx) || 0
    const dy = (kwargs && kwargs.dy) || 0
    const width = (kwargs && kwargs.width) || canvas.width * scaleX / nbCols
    const height = (kwargs && kwargs.height) || canvas.height * scaleY / nbRows
    const res = document.createElement("canvas")
    assign(res, { width, height })
    const ctx = res.getContext("2d")
    ctx.save()
    if(flipX) {
        ctx.translate(width, 0)
        ctx.scale(-1, 1)
    }
    if(flipY) {
        ctx.translate(0, height)
        ctx.scale(1, -1)
    }
    if(numCol !== 0 || dx !== 0) ctx.translate(dx - width * numCol, 0)
    if(numRow !== 0 || dy !== 0) ctx.translate(0, dy - height * numRow)
    if(scaleX !== 1) ctx.scale(scaleX, 1)
    if(scaleY !== 1) ctx.scale(1, scaleY)
    ctx.drawImage(canvas, 0, 0)
    ctx.restore()
    return res
}

/**
 * Applies a color tint to a canvas in-place
 * @param {HTMLCanvasElement} canvas - Canvas to colorize
 * @param {string} color - Color to apply as tint
 * @returns {HTMLCanvasElement} The modified canvas
 */
function colorizeCanvas(canvas, color) {
    const { width, height } = canvas
    const colorCanvas = newCanvas(width, height, color)
    const colorCtx = colorCanvas.getContext("2d")
    colorCtx.globalCompositeOperation = "destination-in"
    colorCtx.drawImage(canvas, 0, 0, width, height)
    const ctx = canvas.getContext("2d")
    ctx.save()
    ctx.globalCompositeOperation = "color"
    ctx.drawImage(colorCanvas, 0, 0, width, height)
    ctx.restore()
    return canvas
}

/**
 * Draws one canvas onto another at specified coordinates
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {HTMLCanvasElement} canvas2 - Source canvas to draw
 * @param {number} [x=0] - X coordinate
 * @param {number} [y=0] - Y coordinate
 * @returns {HTMLCanvasElement} The target canvas
 */
function addCanvas(canvas, canvas2, x=0, y=0) {
    const ctx = canvas.getContext("2d")
    ctx.drawImage(canvas2, x, y)
    return canvas
}

/**
 * Creates a canvas containing rendered text
 * @param {string} text - Text to render
 * @param {Partial<CanvasRenderingContext2D>} [kwargs] - Canvas context properties (fillStyle, font, etc.)
 * @returns {HTMLCanvasElement | null} Canvas with text rendered, or null if in server environment
 */
function newTextCanvas(text, kwargs) {
    if(IS_SERVER_ENV) return null
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    ctx.save()
    ctx.fillStyle = "black"
    ctx.font = "30px serif"
    assign(ctx, kwargs)
    const metrics = ctx.measureText(text)
    canvas.width = max(1, metrics.width)
    canvas.height = max(1, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
    ctx.fillStyle = "black"
    ctx.font = "30px serif"
    assign(ctx, kwargs)
    ctx.fillText(text, 0, metrics.actualBoundingBoxAscent)
    ctx.restore()
    return canvas
}

/**
 * Caches the result of a transformation function on an object
 * @template T
 * @template {string | number | symbol} K
 * @param {{ _transformCache?: Record<K, T> }} obj - Object to cache on
 * @param {K} cacheKey - Cache key
 * @param {() => T} tranformFun - Transform function to execute if cache miss
 * @returns {T} Cached or newly computed result
 */
function cachedTransform(obj, cacheKey, tranformFun) {
    const cache = obj._transformCache ||= {}
    let res = cache[cacheKey]
    if(res === undefined) res = cache[cacheKey] = tranformFun()
    return res
}


/**
 * Returns the sign of a number
 * @param {number} val - Value to check
 * @returns {-1 | 0 | 1} -1 for negative, 0 for zero, 1 for positive
 */
function sign(val) {
    if(val == 0) return 0
    else if(val > 0) return 1
    else return -1
}

/**
 * Moves a value toward a target by a delta amount
 * @param {number} val - Current value
 * @param {number} dv - Delta value (should always be > 0)
 * @param {number} target - Target value
 * @returns {number} New value moved toward target
 */
function sumTo(val, dv, target) {
    // dv should always be > 0
    if(val == target) return target
    else if(target > val) return min(val + dv, target)
    else return max(val - dv, target)
}

/**
 * Creates a new DOM element with properties
 * @param {string} tag - HTML tag name
 * @param {{ style?: Partial<CSSStyleDeclaration>, value?: string, checked?: boolean, text?: string, [key: string]: any }} [kwargs] - Element properties and attributes
 * @returns {HTMLElement} Created element
 */
function newDomEl(tag, kwargs) {
    const el = document.createElement(tag)
    for(let key in kwargs) {
        const val = kwargs[key]
        if(key == "style") assign(el.style, val)
        else if(key == "value") el.value = val
        else if(key == "checked") el.checked = val
        else if(key == "text") el.textContent = val
        else el.setAttribute(key, val)
    }
    return el
}

/**
 * Creates and appends a new DOM element to a parent
 * @param {HTMLElement | null} parentEl - Parent element to append to
 * @param {string} tag - HTML tag name
 * @param {Parameters<typeof newDomEl>[1]} [kwargs] - Element properties and attributes
 * @returns {HTMLElement} Created element
 */
function addNewDomEl(parentEl, tag, kwargs) {
    const el = newDomEl(tag, kwargs)
    if(parentEl) parentEl.appendChild(el)
    return el
}


/** @type {Record<string, Promise<Event>>} */
const importJsPrms = {}

/**
 * Dynamically imports a JavaScript file into the document
 * @param {string} src - Script source URL
 * @returns {Promise<Event>} Promise that resolves when script loads
 */
function importJs(src) {
    return importJsPrms[src] ||= new Promise((ok, ko) => {
        const scriptEl = document.createElement("script")
        scriptEl.src = src
        document.body.appendChild(scriptEl)
        scriptEl.onload = ok
        scriptEl.onerror = ko
    })
}

/**
 * Checks if an object has any enumerable keys
 * @param {object} obj - Object to check
 * @returns {boolean} True if object has at least one key
 */
function hasKeys(obj) {
    for(let _ in obj) return true
    return false
}

/**
 * Counts the number of enumerable keys in an object
 * @param {object} obj - Object to count keys for
 * @returns {number} Number of keys
 */
function nbKeys(obj) {
    let res = 0
    for(let _ in obj) res += 1
    return res
}

export {
    newCanvas,
    cloneCanvas,
    colorizeCanvas,
    addCanvas,
    newTextCanvas,
    cachedTransform,
    sign,
    sumTo,
    newDomEl,
    addNewDomEl,
    importJs,
    hasKeys,
    nbKeys,
}