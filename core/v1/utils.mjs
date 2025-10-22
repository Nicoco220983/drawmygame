const { assign } = Object
const { min, max, round } = Math

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
// function colorizeCanvas(canvas, color) {
//     const { width, height } = canvas
//     const ctx = canvas.getContext("2d")
//     const colorCanvas = newCanvas(width, height, color)
//     const colorCtx = colorCanvas.getContext("2d")
//     colorCtx.save()
//     colorCtx.globalCompositeOperation = "destination-in"
//     colorCtx.drawImage(canvas, 0, 0, width, height)
//     colorCtx.globalCompositeOperation = "saturation"
//     colorCtx.drawImage(canvas, 0, 0, width, height)
//     colorCtx.restore()
//     return colorCanvas
// }


function incrCanvasHue(canvas, delta) {
    const { width, height } = canvas;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const res = document.createElement("canvas");
    res.width = width;
    res.height = height;
    const resCtx = res.getContext("2d");
    const resData = resCtx.createImageData(width, height);
    const out = resData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;

        // --- Convertir RGB -> HSL
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0; // gris
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        // --- Incrémenter la teinte
        h = (h + delta / 360) % 1;
        if (h < 0) h += 1;

        // --- Convertir HSL -> RGB
        let r2, g2, b2;
        if (s === 0) {
            r2 = g2 = b2 = l; // gris
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r2 = hue2rgb(p, q, h + 1 / 3);
            g2 = hue2rgb(p, q, h);
            b2 = hue2rgb(p, q, h - 1 / 3);
        }

        out[i] = Math.round(r2 * 255);
        out[i + 1] = Math.round(g2 * 255);
        out[i + 2] = Math.round(b2 * 255);
        out[i + 3] = data[i + 3]; // alpha inchangé
    }

    resCtx.putImageData(resData, 0, 0);
    return res;
}

function colorizeCanvas(canvas, color) {
    return colorizeCanvasGlobal(canvas, "red", color)
}

function colorizeCanvasGlobal(canvas, fromColor, toColor) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Convert base & target colors to HSV
  const fromRGB = cssColorToRGB(fromColor);
  const toRGB = cssColorToRGB(toColor);
  const fromHSV = rgbToHSV(fromRGB.r, fromRGB.g, fromRGB.b);
  const toHSV = rgbToHSV(toRGB.r, toRGB.g, toRGB.b);

  // Compute transformation factors
  const deltaH = ((toHSV.h - fromHSV.h + 540) % 360) - 180; // shortest rotation
  const satFactor = toHSV.s / (fromHSV.s || 1);
  const valFactor = toHSV.v / (fromHSV.v || 1);

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue; // fully transparent → skip entirely

    const r = data[i], g = data[i + 1], b = data[i + 2];
    const hsv = rgbToHSV(r, g, b);

    hsv.h = (hsv.h + deltaH + 360) % 360;
    hsv.s = Math.min(1, hsv.s * satFactor);
    hsv.v = Math.min(1, hsv.v * valFactor);

    const newRGB = hsvToRGB(hsv.h, hsv.s, hsv.v);
    data[i]     = newRGB.r;
    data[i + 1] = newRGB.g;
    data[i + 2] = newRGB.b;
    // ✅ Do NOT touch alpha channel:
    // data[i + 3] = a;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function cssColorToRGB(css) {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = css;
  const computed = ctx.fillStyle;
  const m = computed.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const i = parseInt(m[1], 16);
    return { r: (i >> 16) & 255, g: (i >> 8) & 255, b: i & 255 };
  }
  const temp = document.createElement("div");
  temp.style.color = css;
  document.body.appendChild(temp);
  const cs = getComputedStyle(temp).color.match(/\d+/g);
  document.body.removeChild(temp);
  return { r: +cs[0], g: +cs[1], b: +cs[2] };
}

function rgbToHSV(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + 360) % 360;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hsvToRGB(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
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
    incrCanvasHue,
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