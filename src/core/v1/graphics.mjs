function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var _GraphicsProps;
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var round = Math.round,
  PI = Math.PI;
var assign = Object.assign;
import * as utils from './utils.mjs';
var urlAbsPath = utils.urlAbsPath,
  checkHit = utils.checkHit,
  sumTo = utils.sumTo,
  newCanvas = utils.newCanvas,
  addCanvas = utils.addCanvas,
  cloneCanvas = utils.cloneCanvas,
  colorizeCanvas = utils.colorizeCanvas,
  newDomEl = utils.newDomEl,
  addNewDomEl = utils.addNewDomEl,
  importJs = utils.importJs;

/**
 * The graphical properties of an object.
 * It contains all the information needed to draw an object.
 * @param {object} kwargs The properties to assign.
 */
export var GraphicsProps = /*#__PURE__*/function () {
  function GraphicsProps(kwargs) {
    _classCallCheck(this, GraphicsProps);
    assign(this, kwargs);
  }

  /**
   * Draws the object.
   * @param {GraphicsEngine} drawer The graphics engine to use.
   */
  return _createClass(GraphicsProps, [{
    key: "draw",
    value: function draw(drawer) {
      drawer.draw(this);
    }
  }]);
}();

/**
 * The graphics engine of the game.
 * It is responsible for drawing objects on the screen.
 * @param {Scene} scn The scene to draw.
 */
_GraphicsProps = GraphicsProps;
assign(_GraphicsProps.prototype, {
  /** @type {string} */
  color: null,
  /** @type {HTMLImageElement} */
  img: null,
  /** @type {number} */
  x: 0,
  /** @type {number} */
  y: 0,
  /** @type {number} */
  width: 50,
  /** @type {number} */
  height: 50,
  /** @type {number} */
  dirX: 1,
  /** @type {number} */
  dirY: 1,
  /** @type {number} */
  angle: 0,
  /** @type {number} */
  order: 0,
  /** @type {number} */
  visibility: 1,
  /** @type {string} */
  colorize: null
});
export var GraphicsEngine = /*#__PURE__*/function () {
  function GraphicsEngine(scn) {
    _classCallCheck(this, GraphicsEngine);
    this.scene = scn;
  }

  /**
   * Draws the objects.
   * @param  {...GraphicsProps} propss The properties of the objects to draw.
   */
  return _createClass(GraphicsEngine, [{
    key: "draw",
    value: function draw() {
      for (var _len = arguments.length, propss = new Array(_len), _key = 0; _key < _len; _key++) {
        propss[_key] = arguments[_key];
      }
      propss.sort(function (p1, p2) {
        return p1.order - p2.order;
      });
      var scn = this.scene,
        can = scn.canvas;
      var ctx = can.getContext("2d");
      for (var _i = 0, _propss = propss; _i < _propss.length; _i++) {
        var props = _propss[_i];
        if (props.color) {
          ctx.save();
          ctx.fillStyle = props.color;
          ctx.globalAlpha = props.visibility;
          ctx.fillRect(~~(props.x - props.width / 2), ~~(props.y - props.height / 2), props.width, props.height);
          ctx.restore();
        }
        if (props.img) {
          var img = this.transformImg(props.img, props.width, props.height, props.dirX, props.dirY, props.angle, props.visibility, props.colorize);
          if (img && img.width > 0 && img.height > 0) {
            ctx.drawImage(img, ~~(props.x - img.width / 2), ~~(props.y - img.height / 2));
          }
        }
      }
    }

    /**
     * Transforms an image.
     * It can resize, flip, rotate, and colorize an image.
     * @param {HTMLImageElement} baseImg The image to transform.
     * @param {number} width The new width of the image.
     * @param {number} height The new height of the image.
     * @param {number} dirX The direction of the x-axis.
     * @param {number} dirY The direction of the y-axis.
     * @param {number} angle The angle of rotation.
     * @param {number} visibility The visibility of the image.
     * @param {string} colorize The color to use for colorization.
     * @returns {HTMLCanvasElement} The transformed image.
     */
  }, {
    key: "transformImg",
    value: function transformImg(baseImg, width, height, dirX, dirY, angle, visibility, colorize) {
      width = round(width);
      height = round(height);
      angle = round(angle);
      var key = "".concat(width, ":").concat(height, ":").concat(dirX, ":").concat(dirY, ":").concat(angle, ":").concat(visibility, ":").concat(colorize);
      var transImgs = baseImg._transImgs || (baseImg._transImgs = {});
      var resImg = transImgs[key];
      if (resImg) return resImg;
      if (baseImg.unloaded || baseImg.width == 0 || baseImg.height == 0) return null; // TODO: deprecate it
      var baseWidth = baseImg.width,
        baseHeight = baseImg.height;
      resImg = transImgs[key] = newCanvas(width, height);
      var ctx = resImg.getContext("2d");
      ctx.save();
      ctx.scale(width / baseWidth * dirX, height / baseHeight * dirY);
      ctx.translate(baseWidth / 2 * dirX, baseHeight / 2 * dirY);
      ctx.rotate(angle * PI / 180);
      ctx.globalAlpha = visibility;
      ctx.drawImage(baseImg, -baseWidth / 2, -baseHeight / 2);
      ctx.restore();
      if (colorize) colorizeCanvas(resImg, colorize);
      return resImg;
    }
  }]);
}();
