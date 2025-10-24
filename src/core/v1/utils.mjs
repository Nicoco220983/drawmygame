var assign = Object.assign;
var min = Math.min,
  max = Math.max,
  round = Math.round;
var IS_SERVER_ENV = typeof window === 'undefined';

/**
 * Creates a new HTML canvas element
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 * @param {?string} [color] - Optional fill color for the canvas
 * @returns {HTMLCanvasElement | null} Canvas element or null if in server environment
 */
function newCanvas(width, height, color) {
  if (IS_SERVER_ENV) return null;
  var canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  if (color) {
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
  }
  return canvas;
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
  var flipX = kwargs && kwargs.flipX || false;
  var flipY = kwargs && kwargs.flipY || false;
  var scaleX = kwargs && kwargs.scaleX || 1;
  var scaleY = kwargs && kwargs.scaleY || 1;
  var numCol = kwargs && kwargs.col && kwargs.col[0] || 0;
  var nbCols = kwargs && kwargs.col && kwargs.col[1] || 1;
  var numRow = kwargs && kwargs.row && kwargs.row[0] || 0;
  var nbRows = kwargs && kwargs.row && kwargs.row[1] || 1;
  var dx = kwargs && kwargs.dx || 0;
  var dy = kwargs && kwargs.dy || 0;
  var width = kwargs && kwargs.width || canvas.width * scaleX / nbCols;
  var height = kwargs && kwargs.height || canvas.height * scaleY / nbRows;
  var res = document.createElement("canvas");
  assign(res, {
    width: width,
    height: height
  });
  var ctx = res.getContext("2d");
  ctx.save();
  if (flipX) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  if (flipY) {
    ctx.translate(0, height);
    ctx.scale(1, -1);
  }
  if (numCol !== 0 || dx !== 0) ctx.translate(dx - width * numCol, 0);
  if (numRow !== 0 || dy !== 0) ctx.translate(0, dy - height * numRow);
  if (scaleX !== 1) ctx.scale(scaleX, 1);
  if (scaleY !== 1) ctx.scale(1, scaleY);
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();
  return res;
}

/**
 * Colorizes a canvas by shifting the hue of its pixels.
 * @param {HTMLCanvasElement} canvas - The canvas to colorize.
 * @param {string} toColor - The target color.
 * @param {string} [fromColor="red"] - The source color to be replaced.
 * @returns {HTMLCanvasElement} The colorized canvas.
 */
function colorizeCanvas(canvas, toColor) {
  var fromColor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "red";
  var ctx = canvas.getContext("2d");
  var width = canvas.width,
    height = canvas.height;
  var imgData = ctx.getImageData(0, 0, width, height);
  var data = imgData.data;

  // Convert base & target colors to HSV
  var fromRGB = cssColorToRGB(fromColor);
  var toRGB = cssColorToRGB(toColor);
  var fromHSV = rgbToHSV(fromRGB.r, fromRGB.g, fromRGB.b);
  var toHSV = rgbToHSV(toRGB.r, toRGB.g, toRGB.b);

  // Compute transformation factors
  var deltaH = (toHSV.h - fromHSV.h + 540) % 360 - 180; // shortest rotation
  var satFactor = toHSV.s / (fromHSV.s || 1);
  var valFactor = toHSV.v / (fromHSV.v || 1);
  for (var i = 0; i < data.length; i += 4) {
    var a = data[i + 3];
    if (a === 0) continue; // fully transparent → skip entirely

    var r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    var hsv = rgbToHSV(r, g, b);
    hsv.h = (hsv.h + deltaH + 360) % 360;
    hsv.s = Math.min(1, hsv.s * satFactor);
    hsv.v = Math.min(1, hsv.v * valFactor);
    var newRGB = hsvToRGB(hsv.h, hsv.s, hsv.v);
    data[i] = newRGB.r;
    data[i + 1] = newRGB.g;
    data[i + 2] = newRGB.b;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Converts a CSS color string to an RGB object.
 * @param {string} css - The CSS color string.
 * @returns {{r: number, g: number, b: number}} The RGB object.
 */
function cssColorToRGB(css) {
  var ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = css;
  var computed = ctx.fillStyle;
  var m = computed.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    var i = parseInt(m[1], 16);
    return {
      r: i >> 16 & 255,
      g: i >> 8 & 255,
      b: i & 255
    };
  }
  var temp = document.createElement("div");
  temp.style.color = css;
  document.body.appendChild(temp);
  var cs = getComputedStyle(temp).color.match(/\d+/g);
  document.body.removeChild(temp);
  return {
    r: +cs[0],
    g: +cs[1],
    b: +cs[2]
  };
}

/**
 * Converts an RGB color value to HSV.
 * @param {number} r - The red color value.
 * @param {number} g - The green color value.
 * @param {number} b - The blue color value.
 * @returns {{h: number, s: number, v: number}} The HSV color value.
 */
function rgbToHSV(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  var max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  var d = max - min;
  var h = 0;
  if (d !== 0) {
    if (max === r) h = (g - b) / d % 6;else if (max === g) h = (b - r) / d + 2;else h = (r - g) / d + 4;
  }
  h = (h * 60 + 360) % 360;
  var s = max === 0 ? 0 : d / max;
  var v = max;
  return {
    h: h,
    s: s,
    v: v
  };
}

/**
 * Converts an HSV color value to RGB.
 * @param {number} h - The hue color value.
 * @param {number} s - The saturation color value.
 * @param {number} v - The value color value.
 * @returns {{r: number, g: number, b: number}} The RGB color value.
 */
function hsvToRGB(h, s, v) {
  var c = v * s;
  var x = c * (1 - Math.abs(h / 60 % 2 - 1));
  var m = v - c;
  var r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255
  };
}

/**
 * Draws one canvas onto another at specified coordinates
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {HTMLCanvasElement} canvas2 - Source canvas to draw
 * @param {number} [x=0] - X coordinate
 * @param {number} [y=0] - Y coordinate
 * @returns {HTMLCanvasElement} The target canvas
 */
function addCanvas(canvas, canvas2) {
  var x = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var y = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(canvas2, x, y);
  return canvas;
}

/**
 * Creates a canvas containing rendered text
 * @param {string} text - Text to render
 * @param {Partial<CanvasRenderingContext2D>} [kwargs] - Canvas context properties (fillStyle, font, etc.)
 * @returns {HTMLCanvasElement | null} Canvas with text rendered, or null if in server environment
 */
function newTextCanvas(text, kwargs) {
  if (IS_SERVER_ENV) return null;
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  ctx.save();
  ctx.fillStyle = "black";
  ctx.font = "30px serif";
  assign(ctx, kwargs);
  var metrics = ctx.measureText(text);
  canvas.width = max(1, metrics.width);
  canvas.height = max(1, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
  ctx.fillStyle = "black";
  ctx.font = "30px serif";
  assign(ctx, kwargs);
  ctx.fillText(text, 0, metrics.actualBoundingBoxAscent);
  ctx.restore();
  return canvas;
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
  var cache = obj._transformCache || (obj._transformCache = {});
  var res = cache[cacheKey];
  if (res === undefined) res = cache[cacheKey] = tranformFun();
  return res;
}

/**
 * Returns the sign of a number
 * @param {number} val - Value to check
 * @returns {-1 | 0 | 1} -1 for negative, 0 for zero, 1 for positive
 */
function sign(val) {
  if (val == 0) return 0;else if (val > 0) return 1;else return -1;
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
  if (val == target) return target;else if (target > val) return min(val + dv, target);else return max(val - dv, target);
}

/**
 * Creates a new DOM element with properties
 * @param {string} tag - HTML tag name
 * @param {{ style?: Partial<CSSStyleDeclaration>, value?: string, checked?: boolean, text?: string, [key: string]: any }} [kwargs] - Element properties and attributes
 * @returns {HTMLElement} Created element
 */
function newDomEl(tag, kwargs) {
  var el = document.createElement(tag);
  for (var key in kwargs) {
    var val = kwargs[key];
    if (key == "style") assign(el.style, val);else if (key == "value") el.value = val;else if (key == "checked") el.checked = val;else if (key == "text") el.textContent = val;else el.setAttribute(key, val);
  }
  return el;
}

/**
 * Creates and appends a new DOM element to a parent
 * @param {HTMLElement | null} parentEl - Parent element to append to
 * @param {string} tag - HTML tag name
 * @param {Parameters<typeof newDomEl>[1]} [kwargs] - Element properties and attributes
 * @returns {HTMLElement} Created element
 */
function addNewDomEl(parentEl, tag, kwargs) {
  var el = newDomEl(tag, kwargs);
  if (parentEl) parentEl.appendChild(el);
  return el;
}

/** @type {Record<string, Promise<Event>>} */
var importJsPrms = {};

/**
 * Dynamically imports a JavaScript file into the document
 * @param {string} src - Script source URL
 * @returns {Promise<Event>} Promise that resolves when script loads
 */
function importJs(src) {
  return importJsPrms[src] || (importJsPrms[src] = new Promise(function (ok, ko) {
    var scriptEl = document.createElement("script");
    scriptEl.src = src;
    document.body.appendChild(scriptEl);
    scriptEl.onload = ok;
    scriptEl.onerror = ko;
  }));
}

/**
 * Checks if an object has any enumerable keys
 * @param {object} obj - Object to check
 * @returns {boolean} True if object has at least one key
 */
function hasKeys(obj) {
  for (var _ in obj) return true;
  return false;
}

/**
 * Counts the number of enumerable keys in an object
 * @param {object} obj - Object to count keys for
 * @returns {number} Number of keys
 */
function nbKeys(obj) {
  var res = 0;
  for (var _ in obj) res += 1;
  return res;
}
export { newCanvas, cloneCanvas, colorizeCanvas, addCanvas, newTextCanvas, cachedTransform, sign, sumTo, newDomEl, addNewDomEl, importJs, hasKeys, nbKeys };
