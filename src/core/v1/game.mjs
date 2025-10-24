function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var _Class, _GameObject3, _applyDecs$c, _Class2, _SceneCommon3, _applyDecs$c2, _Class3, _ActivableMixin3, _applyDecs$c3, _Class4, _HitMixin3, _applyDecs$c4, _Class5, _PhysicsMixin3, _applyDecs$c5, _Class6, _OwnerableMixin3, _applyDecs$c6, _AttackProps, _Class7, _AttackMixin3, _applyDecs$c7, _Class8, _CollectMixin3, _applyDecs$c8;
var _initClass, _classDecs, _GameObject2, _initClass2, _classDecs2, _SceneCommon2, _initClass3, _classDecs3, _ActivableMixin2, _initClass4, _classDecs4, _HitMixin2, _initClass5, _classDecs5, _PhysicsMixin2, _initClass6, _classDecs6, _OwnerableMixin2, _initClass7, _classDecs7, _AttackMixin2, _initClass8, _classDecs8, _CollectMixin2;
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _wrapNativeSuper(t) { var r = "function" == typeof Map ? new Map() : void 0; return _wrapNativeSuper = function _wrapNativeSuper(t) { if (null === t || !_isNativeFunction(t)) return t; if ("function" != typeof t) throw new TypeError("Super expression must either be null or a function"); if (void 0 !== r) { if (r.has(t)) return r.get(t); r.set(t, Wrapper); } function Wrapper() { return _construct(t, arguments, _getPrototypeOf(this).constructor); } return Wrapper.prototype = Object.create(t.prototype, { constructor: { value: Wrapper, enumerable: !1, writable: !0, configurable: !0 } }), _setPrototypeOf(Wrapper, t); }, _wrapNativeSuper(t); }
function _construct(t, e, r) { if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments); var o = [null]; o.push.apply(o, e); var p = new (t.bind.apply(t, o))(); return r && _setPrototypeOf(p, r.prototype), p; }
function _isNativeFunction(t) { try { return -1 !== Function.toString.call(t).indexOf("[native code]"); } catch (n) { return "function" == typeof t; } }
function _superPropGet(t, o, e, r) { var p = _get(_getPrototypeOf(1 & r ? t.prototype : t), o, e); return 2 & r && "function" == typeof p ? function (t) { return p.apply(e, t); } : p; }
function _get() { return _get = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function (e, t, r) { var p = _superPropBase(e, t); if (p) { var n = Object.getOwnPropertyDescriptor(p, t); return n.get ? n.get.call(arguments.length < 3 ? e : r) : n.value; } }, _get.apply(null, arguments); }
function _superPropBase(t, o) { for (; !{}.hasOwnProperty.call(t, o) && null !== (t = _getPrototypeOf(t));); return t; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _applyDecs(e, t, r, n, o, a) { function i(e, t, r) { return function (n, o) { return r && r(n), e[t].call(n, o); }; } function c(e, t) { for (var r = 0; r < e.length; r++) e[r].call(t); return t; } function s(e, t, r, n) { if ("function" != typeof e && (n || void 0 !== e)) throw new TypeError(t + " must " + (r || "be") + " a function" + (n ? "" : " or undefined")); return e; } function applyDec(e, t, r, n, o, a, c, u, l, f, p, d, h) { function m(e) { if (!h(e)) throw new TypeError("Attempted to access private element on non-instance"); } var y, v = t[0], g = t[3], b = !u; if (!b) { r || Array.isArray(v) || (v = [v]); var w = {}, S = [], A = 3 === o ? "get" : 4 === o || d ? "set" : "value"; f ? (p || d ? w = { get: _setFunctionName(function () { return g(this); }, n, "get"), set: function set(e) { t[4](this, e); } } : w[A] = g, p || _setFunctionName(w[A], n, 2 === o ? "" : A)) : p || (w = Object.getOwnPropertyDescriptor(e, n)); } for (var P = e, j = v.length - 1; j >= 0; j -= r ? 2 : 1) { var D = v[j], E = r ? v[j - 1] : void 0, I = {}, O = { kind: ["field", "accessor", "method", "getter", "setter", "class"][o], name: n, metadata: a, addInitializer: function (e, t) { if (e.v) throw Error("attempted to call addInitializer after decoration was finished"); s(t, "An initializer", "be", !0), c.push(t); }.bind(null, I) }; try { if (b) (y = s(D.call(E, P, O), "class decorators", "return")) && (P = y);else { var k, F; O["static"] = l, O["private"] = f, f ? 2 === o ? k = function k(e) { return m(e), w.value; } : (o < 4 && (k = i(w, "get", m)), 3 !== o && (F = i(w, "set", m))) : (k = function k(e) { return e[n]; }, (o < 2 || 4 === o) && (F = function F(e, t) { e[n] = t; })); var N = O.access = { has: f ? h.bind() : function (e) { return n in e; } }; if (k && (N.get = k), F && (N.set = F), P = D.call(E, d ? { get: w.get, set: w.set } : w[A], O), d) { if ("object" == _typeof(P) && P) (y = s(P.get, "accessor.get")) && (w.get = y), (y = s(P.set, "accessor.set")) && (w.set = y), (y = s(P.init, "accessor.init")) && S.push(y);else if (void 0 !== P) throw new TypeError("accessor decorators must return an object with get, set, or init properties or void 0"); } else s(P, (p ? "field" : "method") + " decorators", "return") && (p ? S.push(P) : w[A] = P); } } finally { I.v = !0; } } return (p || d) && u.push(function (e, t) { for (var r = S.length - 1; r >= 0; r--) t = S[r].call(e, t); return t; }), p || b || (f ? d ? u.push(i(w, "get"), i(w, "set")) : u.push(2 === o ? w[A] : i.call.bind(w[A])) : Object.defineProperty(e, n, w)), P; } function u(e, t) { return Object.defineProperty(e, Symbol.metadata || Symbol["for"]("Symbol.metadata"), { configurable: !0, enumerable: !0, value: t }); } if (arguments.length >= 6) var l = a[Symbol.metadata || Symbol["for"]("Symbol.metadata")]; var f = Object.create(null == l ? null : l), p = function (e, t, r, n) { var o, a, i = [], s = function s(t) { return _checkInRHS(t) === e; }, u = new Map(); function l(e) { e && i.push(c.bind(null, e)); } for (var f = 0; f < t.length; f++) { var p = t[f]; if (Array.isArray(p)) { var d = p[1], h = p[2], m = p.length > 3, y = 16 & d, v = !!(8 & d), g = 0 == (d &= 7), b = h + "/" + v; if (!g && !m) { var w = u.get(b); if (!0 === w || 3 === w && 4 !== d || 4 === w && 3 !== d) throw Error("Attempted to decorate a public method/accessor that has the same name as a previously decorated public method/accessor. This is not currently supported by the decorators plugin. Property name was: " + h); u.set(b, !(d > 2) || d); } applyDec(v ? e : e.prototype, p, y, m ? "#" + h : _toPropertyKey(h), d, n, v ? a = a || [] : o = o || [], i, v, m, g, 1 === d, v && m ? s : r); } } return l(o), l(a), i; }(e, t, o, f); return r.length || u(e, f), { e: p, get c() { var t = []; return r.length && [u(applyDec(e, [r], n, e.name, 5, f, t), f), c.bind(null, t, e)]; } }; }
function _setFunctionName(e, t, n) { "symbol" == _typeof(t) && (t = (t = t.description) ? "[" + t + "]" : ""); try { Object.defineProperty(e, "name", { configurable: !0, value: n ? n + " " + t : t }); } catch (e) {} return e; }
function _checkInRHS(e) { if (Object(e) !== e) throw TypeError("right-hand side of 'in' should be an object, got " + (null !== e ? _typeof(e) : "null")); return e; }
function _identity(t) { return t; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var assign = Object.assign,
  getPrototypeOf = Object.getPrototypeOf;
var abs = Math.abs,
  floor = Math.floor,
  ceil = Math.ceil,
  min = Math.min,
  max = Math.max,
  pow = Math.pow,
  sqrt = Math.sqrt,
  cos = Math.cos,
  sin = Math.sin,
  atan2 = Math.atan2,
  PI = Math.PI,
  random = Math.random,
  hypot = Math.hypot;
import * as utils from './utils.mjs';
var sumTo = utils.sumTo,
  newCanvas = utils.newCanvas,
  addCanvas = utils.addCanvas,
  cloneCanvas = utils.cloneCanvas,
  colorizeCanvas = utils.colorizeCanvas,
  newTextCanvas = utils.newTextCanvas,
  newDomEl = utils.newDomEl,
  addNewDomEl = utils.addNewDomEl,
  importJs = utils.importJs,
  hasKeys = utils.hasKeys,
  nbKeys = utils.nbKeys;
import { AudioEngine } from './audio.mjs';
import PhysicsEngine from './physics.mjs';
import { GraphicsProps, GraphicsEngine } from './graphics.mjs';
// TODO import only if necessary
import { gzip, ungzip } from '../../deps/pako.mjs';
import * as packLib from '../../deps/pack.mjs';
import * as unpackLib from '../../deps/unpack.mjs';
// useRecords: ensure that a Map is packed/unpacked as a Map
var packr = new packLib.Packr({
  useRecords: true
});
var unpackr = new unpackLib.Unpackr({
  useRecords: true
});
export function pack(val) {
  return packr.pack(val);
}
export function unpack(val) {
  return unpackr.unpack(val);
}
export var FPS = 30;
var CANVAS_MAX_WIDTH = 800;
var CANVAS_MAX_HEIGHT = 600;
var MAP_DEFAULT_WIDTH = 800;
var MAP_DEFAULT_HEIGHT = 600;
export var MSG_KEY_PING = 0;
export var MSG_KEY_IDENTIFY_CLIENT = 1;
export var MSG_KEY_JOIN_GAME = 2;
export var MSG_KEY_STATE = 3;
export var MSG_KEY_GAME_INSTRUCTION = 4;
export var MSG_KEY_GAME_REINIT = 5;
export var MSG_KEY_GAME_STOPPED = 6;
export var GAME_INSTR_START = 0;
export var GAME_INSTR_RESTART = 1;
export var GAME_INSTR_STOP = 2;
export var GAME_INSTR_PAUSE = 3;
export var GAME_INSTR_UNPAUSE = 4;
export var GAME_INSTR_STATE = 5;
var STATE_TYPE_FULL = "F";
var STATE_TYPE_INPUT = "I";
var IS_SERVER_ENV = typeof window === 'undefined';
var BASE_URL = import.meta.resolve("../../..");
var CATALOGS_PATH = "/static/catalogs";
//const CATALOGS_BASE_URL = import.meta.resolve("../../catalogs")
export var HAS_TOUCH = !IS_SERVER_ENV && ('ontouchstart' in window || navigator.msMaxTouchPoints > 0);
var SEND_PING_PERIOD = 3;
var SEND_STATE_PERIOD = 1;
var RESEND_INPUT_STATE_PERIOD = .5;

// CATALOG

/**
 * Imports and preloads a module.
 * @param {string} path The path to the module.
 * @returns {Promise<object>} The module.
 */
export function importAndPreload(_x) {
  return _importAndPreload.apply(this, arguments);
}
function _importAndPreload() {
  _importAndPreload = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee20(path) {
    var mod;
    return _regenerator().w(function (_context20) {
      while (1) switch (_context20.n) {
        case 0:
          _context20.n = 1;
          return import(path);
        case 1:
          mod = _context20.v;
          if (!mod.CATALOG) {
            _context20.n = 2;
            break;
          }
          _context20.n = 2;
          return mod.CATALOG.preloadAssets();
        case 2:
          return _context20.a(2, mod);
      }
    }, _callee20);
  }));
  return _importAndPreload.apply(this, arguments);
}
var None = /*#__PURE__*/_createClass(function None() {
  _classCallCheck(this, None);
});
var Image = !IS_SERVER_ENV && window.Image || None;
/**
 * Represents an image that can be loaded.
 * @param {string} src The source of the image.
 */
export var Img = /*#__PURE__*/function (_Image) {
  function Img(src) {
    var _this;
    _classCallCheck(this, Img);
    _this = _callSuper(this, Img);
    _this._src = src;
    _this.unloaded = true;
    return _this;
  }
  /**
   * Loads the image.
   * @returns {Promise<void>}
   */
  _inherits(Img, _Image);
  return _createClass(Img, [{
    key: "load",
    value: (function () {
      var _load = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        var _this2 = this;
        var loadPrm;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              if (!IS_SERVER_ENV) {
                _context.n = 1;
                break;
              }
              return _context.a(2);
            case 1:
              loadPrm = this._loadPrm || (this._loadPrm = new Promise(function (ok, ko) {
                _this2.src = _this2._src;
                _this2.onload = function () {
                  _this2.unloaded = false;
                  ok();
                };
                _this2.onerror = function () {
                  _this2.unloaded = false;
                  ko();
                };
              }));
              _context.n = 2;
              return loadPrm;
            case 2:
              return _context.a(2, _context.v);
          }
        }, _callee, this);
      }));
      function load() {
        return _load.apply(this, arguments);
      }
      return load;
    }())
  }]);
}(Image);

/**
 * Represents an audio that can be loaded.
 * @param {string} src The source of the audio.
 */
export var Aud = /*#__PURE__*/function () {
  function Aud(src) {
    _classCallCheck(this, Aud);
    this.src = src;
    this.unloaded = true;
  }
  /**
   * Loads the audio.
   * @returns {Promise<void>}
   */
  return _createClass(Aud, [{
    key: "load",
    value: (function () {
      var _load2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
        var _this3 = this;
        var loadPrm;
        return _regenerator().w(function (_context3) {
          while (1) switch (_context3.n) {
            case 0:
              if (!IS_SERVER_ENV) {
                _context3.n = 1;
                break;
              }
              return _context3.a(2);
            case 1:
              loadPrm = this._loadPrm || (this._loadPrm = new Promise(/*#__PURE__*/function () {
                var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(ok, ko) {
                  var res;
                  return _regenerator().w(function (_context2) {
                    while (1) switch (_context2.n) {
                      case 0:
                        _context2.n = 1;
                        return fetch(_this3.src, {
                          cache: 'force-cache'
                        });
                      case 1:
                        res = _context2.v;
                        _context2.n = 2;
                        return res.arrayBuffer();
                      case 2:
                        _this3.raw = _context2.v;
                        _this3.unloaded = false;
                        ok();
                      case 3:
                        return _context2.a(2);
                    }
                  }, _callee2);
                }));
                return function (_x2, _x3) {
                  return _ref.apply(this, arguments);
                };
              }()));
              _context3.n = 2;
              return loadPrm;
            case 2:
              return _context3.a(2, _context3.v);
          }
        }, _callee3, this);
      }));
      function load() {
        return _load2.apply(this, arguments);
      }
      return load;
    }())
  }]);
}();

/**
 * Represents a catalog of game objects and scenes.
 */
export var Catalog = /*#__PURE__*/function () {
  function Catalog() {
    _classCallCheck(this, Catalog);
    this.mods = {};
    this.objects = {};
    this.scenes = {};
  }
  /**
   * Adds module catalogs.
   * @param {string[]} paths The paths to the modules.
   */
  return _createClass(Catalog, [{
    key: "addModuleCatalogs",
    value: (function () {
      var _addModuleCatalogs = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(paths) {
        var _iterator, _step, _path, modPrms, mods, addItems, i, path, mod;
        return _regenerator().w(function (_context4) {
          while (1) switch (_context4.n) {
            case 0:
              _iterator = _createForOfIteratorHelper(paths);
              try {
                for (_iterator.s(); !(_step = _iterator.n()).done;) {
                  _path = _step.value;
                  this.mods[_path] = null;
                }
              } catch (err) {
                _iterator.e(err);
              } finally {
                _iterator.f();
              }
              modPrms = paths.map(function (path) {
                return import(path);
              });
              _context4.n = 1;
              return Promise.all(modPrms);
            case 1:
              mods = _context4.v;
              addItems = function addItems(path, modItems, items) {
                for (var key in modItems) {
                  var item = _objectSpread({}, modItems[key]);
                  item.path = path;
                  items[key] = item;
                }
              };
              for (i in paths) {
                path = paths[i], mod = mods[i];
                addItems(path, mod.CATALOG.objects, this.objects);
                addItems(path, mod.CATALOG.scenes, this.scenes);
              }
            case 2:
              return _context4.a(2);
          }
        }, _callee4, this);
      }));
      function addModuleCatalogs(_x4) {
        return _addModuleCatalogs.apply(this, arguments);
      }
      return addModuleCatalogs;
    }()
    /**
     * Preloads modules.
     * @param {string[]} paths The paths to the modules.
     * @returns {Promise<object[]>} The modules.
     */
    )
  }, {
    key: "preload",
    value: (function () {
      var _preload = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(paths) {
        var mods, i;
        return _regenerator().w(function (_context5) {
          while (1) switch (_context5.n) {
            case 0:
              _context5.n = 1;
              return Promise.all(paths.map(function (p) {
                return import(p);
              }));
            case 1:
              mods = _context5.v;
              for (i = 0; i < paths.length; ++i) this.mods[paths[i]] = mods[i];
              _context5.n = 2;
              return Promise.all(mods.map(function (m) {
                return m.CATALOG;
              }).filter(function (l) {
                return l;
              }).map(function (l) {
                return l.preloadAssets();
              }));
            case 2:
              return _context5.a(2, mods);
          }
        }, _callee5, this);
      }));
      function preload(_x5) {
        return _preload.apply(this, arguments);
      }
      return preload;
    }()
    /**
     * Preloads all modules.
     * @returns {Promise<object[]>} The modules.
     */
    )
  }, {
    key: "preloadAll",
    value: (function () {
      var _preloadAll = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
        return _regenerator().w(function (_context6) {
          while (1) switch (_context6.n) {
            case 0:
              _context6.n = 1;
              return this.preload(Object.keys(this.mods));
            case 1:
              return _context6.a(2, _context6.v);
          }
        }, _callee6, this);
      }));
      function preloadAll() {
        return _preloadAll.apply(this, arguments);
      }
      return preloadAll;
    }()
    /**
     * Returns the full key of an item.
     * @param {string} perspective The perspective.
     * @param {object} versions The versions.
     * @param {string} key The key.
     * @returns {string} The full key.
     */
    )
  }, {
    key: "getFullKey",
    value: function getFullKey(perspective, versions, key) {
      var modName = key.split(':')[0];
      var modVersion = versions[modName];
      return "".concat(modVersion, "/").concat(perspective, "/").concat(key);
    }
    /**
     * Returns a scene from the catalog.
     * @param {string} perspective The perspective.
     * @param {object} versions The versions.
     * @param {string} key The key of the scene.
     * @returns {object} The scene.
     */
  }, {
    key: "getScene",
    value: function getScene(perspective, versions, key) {
      var fullKey = this.getFullKey(perspective, versions, key);
      return this.scenes[fullKey];
    }
    /**
     * Returns a scene class from the catalog.
     * @param {string} perspective The perspective.
     * @param {object} versions The versions.
     * @param {string} key The key of the scene.
     * @returns {typeof SceneCommon} The scene class.
     */
  }, {
    key: "getSceneClass",
    value: function getSceneClass(perspective, versions, key) {
      var scnCat = this.getScene(perspective, versions, key);
      var mod = this.mods[scnCat.path];
      return mod[scnCat.name];
    }
    /**
     * Returns an object from the catalog.
     * @param {string} perspective The perspective.
     * @param {object} versions The versions.
     * @param {string} key The key of the object.
     * @returns {object} The object.
     */
  }, {
    key: "getObject",
    value: function getObject(perspective, versions, key) {
      var fullKey = this.getFullKey(perspective, versions, key);
      return this.objects[fullKey];
    }
    /**
     * Returns an object class from the catalog.
     * @param {string} perspective The perspective.
     * @param {object} versions The versions.
     * @param {string} key The key of the object.
     * @returns {typeof GameObject} The object class.
     */
  }, {
    key: "getObjectClass",
    value: function getObjectClass(perspective, versions, key) {
      var objCat = this.getObject(perspective, versions, key);
      var mod = this.mods[objCat.path];
      return mod[objCat.name];
    }
  }]);
}();

/**
 * Represents a module catalog.
 * @param {string} url The URL of the module.
 * @param {object} kwargs The properties of the module.
 */
export var ModuleCatalog = /*#__PURE__*/function () {
  function ModuleCatalog(url, kwargs) {
    _classCallCheck(this, ModuleCatalog);
    this.path = '/' + url.substring(BASE_URL.length);
    this.name = kwargs?.name ?? this.path.substring(CATALOGS_PATH.length + 1).split('/')[0];
    this.version = kwargs?.version;
    this.perspective = kwargs?.perspective;
    this.objects = {};
    this.scenes = {};
    this.assets = [];
  }
  /**
   * Registers an object.
   * @param {object} kwargs The properties of the object.
   * @returns {function(typeof GameObject):typeof GameObject} The decorator.
   */
  return _createClass(ModuleCatalog, [{
    key: "registerObject",
    value: function registerObject(kwargs) {
      var _this4 = this;
      return function (target) {
        var key = "".concat(_this4.name, ":").concat(target.name);
        var fullKey = "".concat(_this4.version, "/").concat(_this4.perspective, "/").concat(key);
        var objCat = _this4.objects[fullKey] = {};
        objCat.key = key;
        objCat.path = _this4.path;
        objCat.name = target.name;
        objCat.category = target.CATEGORY;
        objCat.label = kwargs?.label ?? key;
        objCat.icon = kwargs?.icon ?? null;
        objCat.showInBuilder = kwargs?.showInBuilder ?? true;
        objCat.isHero = target.IS_HERO == true;
        target.KEY = key;
        target.STATEFUL = kwargs?.stateful ?? true;
        return target;
      };
    }
    /**
     * Registers a scene.
     * @param {object} kwargs The properties of the scene.
     * @returns {function(typeof SceneCommon):typeof SceneCommon} The decorator.
     */
  }, {
    key: "registerScene",
    value: function registerScene(kwargs) {
      var _this5 = this;
      return function (target) {
        var key = "".concat(_this5.name, ":").concat(target.name);
        var fullKey = "".concat(_this5.version, "/").concat(_this5.perspective, "/").concat(key);
        var scnCat = _this5.scenes[fullKey] = {};
        scnCat.key = key;
        scnCat.path = _this5.path;
        scnCat.name = target.name;
        scnCat.label = kwargs?.label ?? key;
        scnCat.showInBuilder = kwargs?.showInBuilder ?? true;
        target.KEY = key;
        return target;
      };
    }
    /**
     * Registers an image.
     * @param {string} path The path to the image.
     * @returns {Img} The image.
     */
  }, {
    key: "registerImage",
    value: function registerImage(path) {
      var img = new Img(path);
      this.assets.push(img);
      return img;
    }
    /**
     * Registers an audio.
     * @param {string} path The path to the audio.
     * @returns {Aud} The audio.
     */
  }, {
    key: "registerAudio",
    value: function registerAudio(path) {
      var aud = new Aud(path);
      this.assets.push(aud);
      return aud;
    }
    /**
     * Preloads the assets.
     */
  }, {
    key: "preloadAssets",
    value: (function () {
      var _preloadAssets = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7() {
        return _regenerator().w(function (_context7) {
          while (1) switch (_context7.n) {
            case 0:
              if (!IS_SERVER_ENV) {
                _context7.n = 1;
                break;
              }
              return _context7.a(2);
            case 1:
              _context7.n = 2;
              return Promise.all(this.assets.map(function (a) {
                return a.load();
              }));
            case 2:
              return _context7.a(2);
          }
        }, _callee7, this);
      }));
      function preloadAssets() {
        return _preloadAssets.apply(this, arguments);
      }
      return preloadAssets;
    }())
  }]);
}();

// MAP

/**
 * Represents a game map.
 */
export var GameMap = /*#__PURE__*/function () {
  function GameMap() {
    _classCallCheck(this, GameMap);
    this.perspective = "2Dside";
    this.versions = {
      "std": "v1"
    };
    this.heros = [{
      key: "std:Nico"
    }];
    this.scenes = {
      "0": {
        key: "std:StandardScene",
        width: MAP_DEFAULT_WIDTH,
        height: MAP_DEFAULT_HEIGHT,
        borderManager: {
          key: "std:BlockBorderManager"
        },
        herosLivesManager: {
          key: "std:HerosLivesManager"
        },
        viewManager: {
          key: "std:ViewHerosCenterManager"
        },
        physicsManager: {
          key: "std:PhysicsManager"
        },
        attackManager: {
          key: "std:AttackManager"
        },
        objects: new Map()
      }
    };
  }

  /**
   * Exports the map as a binary format.
   * @returns {Uint8Array} The binary data.
   */
  return _createClass(GameMap, [{
    key: "exportAsBinary",
    value: function exportAsBinary() {
      var outScns = {};
      for (var scnId in this.scenes) {
        outScns[scnId] = this.scenes[scnId];
      }
      var outObj = {
        hs: this.heros,
        ss: outScns
      };
      var outPack = pack(outObj);
      var outZip = compress(outPack);
      return outZip;
    }
    /**
     * Exports the map as a safe base64 string.
     * @returns {Promise<string>} The base64 string.
     */
  }, {
    key: "exportAsSafeBase64",
    value: (function () {
      var _exportAsSafeBase = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8() {
        var outBin, outSB64;
        return _regenerator().w(function (_context8) {
          while (1) switch (_context8.n) {
            case 0:
              outBin = this.exportAsBinary();
              _context8.n = 1;
              return binToSafeB64(outBin);
            case 1:
              outSB64 = _context8.v;
              return _context8.a(2, outSB64);
          }
        }, _callee8, this);
      }));
      function exportAsSafeBase64() {
        return _exportAsSafeBase.apply(this, arguments);
      }
      return exportAsSafeBase64;
    }()
    /**
     * Imports a map from a safe base64 string.
     * @param {string} inSB64 The base64 string.
     */
    )
  }, {
    key: "importFromSafeBase64",
    value: (function () {
      var _importFromSafeBase = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9(inSB64) {
        var inBin;
        return _regenerator().w(function (_context9) {
          while (1) switch (_context9.n) {
            case 0:
              _context9.n = 1;
              return safeB64ToBin(inSB64);
            case 1:
              inBin = _context9.v;
              this.importFromBinary(inBin);
            case 2:
              return _context9.a(2);
          }
        }, _callee9, this);
      }));
      function importFromSafeBase64(_x6) {
        return _importFromSafeBase.apply(this, arguments);
      }
      return importFromSafeBase64;
    }()
    /**
     * Imports a map from a binary format.
     * @param {Uint8Array} inZip The binary data.
     */
    )
  }, {
    key: "importFromBinary",
    value: function importFromBinary(inZip) {
      var inPack = decompress(inZip);
      var inObj = unpack(inPack);
      this.heros = inObj.hs;
      var scns = this.scenes = {};
      for (var scnId in inObj.ss) {
        scns[scnId] = inObj.ss[scnId];
      }
    }
  }]);
}();

/**
 * Compresses data.
 * @param {Uint8Array} bytes The data to compress.
 * @returns {Uint8Array} The compressed data.
 */
function compress(bytes) {
  return gzip(new Uint8Array(bytes));
}

/**
 * Decompresses data.
 * @param {Uint8Array} compressedBytes The data to decompress.
 * @returns {Uint8Array} The decompressed data.
 */
function decompress(compressedBytes) {
  return ungzip(new Uint8Array(compressedBytes));
}
var BIN_AS_B64_DATA_URL_PREFIX = "data:application/octet-stream;base64,";

/**
 * Converts binary data to a safe base64 string.
 * @param {Uint8Array} bytes The binary data.
 * @returns {Promise<string>} The base64 string.
 */
function binToSafeB64(bytes) {
  return new Promise(function (ok, ko) {
    var reader = new FileReader();
    reader.onload = function () {
      if (!reader.result.startsWith(BIN_AS_B64_DATA_URL_PREFIX)) ko("Invalid binary encoding");else ok(encodeURIComponent(reader.result.substring(BIN_AS_B64_DATA_URL_PREFIX.length)));
    };
    reader.readAsDataURL(new Blob([bytes]));
  });
}

/**
 * Converts a safe base64 string to binary data.
 * @param {string} sb64 The base64 string.
 * @returns {Promise<ArrayBuffer>} The binary data.
 */
function safeB64ToBin(sb64) {
  return new Promise(function (ok, ko) {
    var b64 = decodeURIComponent(sb64);
    fetch("".concat(BIN_AS_B64_DATA_URL_PREFIX).concat(b64)).then(/*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0(res) {
        var reader, _t, _t2;
        return _regenerator().w(function (_context0) {
          while (1) switch (_context0.n) {
            case 0:
              reader = new FileReader();
              reader.onload = function () {
                return ok(reader.result);
              };
              _t = reader;
              _context0.n = 1;
              return res.blob();
            case 1:
              _t2 = _context0.v;
              _t.readAsArrayBuffer.call(_t, _t2);
            case 2:
              return _context0.a(2);
          }
        }, _callee0);
      }));
      return function (_x7) {
        return _ref2.apply(this, arguments);
      };
    }());
  });
}

// GAME UTILS ///////////////////////

/**
 * Returns the current time in seconds.
 * @returns {number} The current time in seconds.
 */
export function now() {
  return Date.now() / 1000;
}

/**
 * Returns an array of numbers in a given range.
 * @param {number} start The start of the range.
 * @param {number} end The end of the range.
 * @returns {number[]} The array of numbers.
 */
export function range(start, end) {
  var res = [];
  for (var i = start; i < end; ++i) res.push(i);
  return res;
}
var _round = Math.round;
/**
 * Rounds a number to a given precision.
 * @param {number} val The number to round.
 * @param {number} precision The precision.
 * @returns {number} The rounded number.
 */
export function round(val) {
  var precision = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  return _round(val / precision) * precision;
}

/**
 * Represents a sprite sheet.
 * @param {HTMLImageElement} img The image of the sprite sheet.
 * @param {number} nbCols The number of columns.
 * @param {number} nbRows The number of rows.
 */
export var SpriteSheet = /*#__PURE__*/function () {
  function SpriteSheet(img, nbCols, nbRows) {
    _classCallCheck(this, SpriteSheet);
    this.img = img;
    this.nbCols = nbCols;
    this.nbRows = nbRows;
    this.imgs = [];
    if (IS_SERVER_ENV) return;
    this.unloaded = true;
    this.initImgs();
  }
  /**
   * Initializes the images of the sprite sheet.
   */
  return _createClass(SpriteSheet, [{
    key: "initImgs",
    value: function initImgs() {
      if (!this.unloaded) return;
      var img = this.img,
        nbRows = this.nbRows,
        nbCols = this.nbCols;
      if (img.unloaded) return;
      var frameWidth = floor(img.width / nbCols);
      var frameHeight = floor(img.height / nbRows);
      for (var j = 0; j < nbRows; ++j) for (var i = 0; i < nbCols; ++i) {
        var can = document.createElement("canvas");
        can.width = frameWidth;
        can.height = frameHeight;
        can.getContext("2d").drawImage(img, ~~(-i * frameWidth), ~~(-j * frameHeight));
        this.imgs[i + j * nbCols] = can;
      }
      this.unloaded = false;
    }
    /**
     * Returns an image from the sprite sheet.
     * @param {number} num The number of the image.
     * @param {boolean} loop Whether to loop.
     * @returns {HTMLCanvasElement} The image.
     */
  }, {
    key: "get",
    value: function get(num) {
      var loop = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      this.initImgs();
      var imgs = this.imgs,
        nbImgs = imgs.length;
      if (nbImgs == 0) return null;
      if (loop) num = num % nbImgs;else if (num >= nbImgs) return null;
      return imgs[num];
    }
  }]);
}();

// CATEGORY //////////////////////////

/**
 * Represents a category.
 */
export var Category = /*#__PURE__*/function () {
  function Category() {
    _classCallCheck(this, Category);
  }
  return _createClass(Category, null, [{
    key: "append",
    value:
    /**
     * Appends a category to a target.
     * @param {string} cat The category to append.
     * @returns {function(object):object} The decorator.
     */
    function append(cat) {
      return function (target) {
        target.CATEGORY = (target.CATEGORY ?? "/") + cat + "/";
      };
    }
  }]);
}();

// STATE PROPERTY ////////////////////

/**
 * Represents a state property.
 */
export var StateProperty = /*#__PURE__*/function () {
  function StateProperty(key, kwargs) {
    _classCallCheck(this, StateProperty);
    this.key = key;
    this.initKwargs = kwargs;
    this.defaultStateValue = this.constructor.DEFAULT_STATE_VALUE;
    if (kwargs?.default !== undefined) this.defaultStateValue = kwargs?.default;
    if (kwargs?.nullableWith !== undefined) this.nullableWith = kwargs.nullableWith;
    this.showInBuilder = kwargs?.showInBuilder ?? false;
  }
  return _createClass(StateProperty, [{
    key: "initObjectClass",
    value: function initObjectClass(cls) {
      if (!cls.hasOwnProperty('STATE_PROPS')) cls.STATE_PROPS = new Map(cls.STATE_PROPS);
      cls.STATE_PROPS.set(this.key, this);
      this.initObjectClassProp(cls);
    }
  }, {
    key: "initObjectClassProp",
    value: function initObjectClassProp(cls) {
      this.setObjectPropFromState(cls.prototype, this.defaultStateValue);
    }
  }, {
    key: "initObject",
    value: function initObject(obj, kwargs) {}
    // state
  }, {
    key: "getObjectPropState",
    value: function getObjectPropState(obj) {
      var val = obj[this.key];
      if (val === (this.nullableWith ?? null)) return null;else return val;
    }
  }, {
    key: "setObjectPropFromState",
    value: function setObjectPropFromState(obj, valState) {
      var key = this.key;
      if (valState === undefined) return delete obj[key];
      if (valState === null) return obj[key] = this.nullableWith ?? null;
      obj[key] = valState;
    }
  }, {
    key: "syncStateFromObject",
    value: function syncStateFromObject(obj, state) {
      var key = this.key;
      if (!obj.hasOwnProperty(key)) return;
      var val = obj[key],
        protoVal = getPrototypeOf(obj)[key];
      if (val === undefined || val === protoVal) return;
      var valState = this.getObjectPropState(obj);
      if (valState === undefined) return;
      state[key] = valState;
    }
  }, {
    key: "syncObjectFromState",
    value: function syncObjectFromState(state, obj) {
      this.setObjectPropFromState(obj, state[this.key]);
    }
    // inputs
  }, {
    key: "createObjectInput",
    value: function createObjectInput(obj) {
      var _this6 = this;
      var val = this.getObjectPropState(obj);
      var wrapperEl = newDomEl("div", {
        style: {
          display: "flex",
          flexDirection: "row",
          gap: ".5em"
        }
      });
      addNewDomEl(wrapperEl, "span", {
        text: this.key
      });
      var nullEl = null,
        nullTxtEl = null;
      if (this.nullableWith !== undefined) {
        nullEl = addNewDomEl(wrapperEl, "input", {
          type: "checkbox"
        });
        if (val === null) nullEl.checked = true;
        nullTxtEl = addNewDomEl(wrapperEl, "div", {
          text: this.nullableWith
        });
        nullEl.addEventListener("change", function () {
          syncEls();
          if (nullEl.checked) _this6.setObjectPropFromState(obj, null);else _this6.syncObjectFromInput(valEl, obj);
        });
      }
      var valEl = this.createObjectBaseInput(obj);
      wrapperEl.appendChild(valEl);
      valEl.addEventListener("change", function () {
        return syncEls();
      });
      var syncEls = function syncEls() {
        valEl.style.display = nullEl?.checked ? "none" : "block";
        if (nullTxtEl) nullTxtEl.style.display = nullEl?.checked ? "block" : "none";
      };
      syncEls();
      return wrapperEl;
    }
    // TODO: remove it for generic StateProperty
  }, {
    key: "createObjectBaseInput",
    value: function createObjectBaseInput(obj) {
      var _this7 = this;
      var val = this.getObjectPropState(obj);
      var inputEl = newDomEl("input", {
        type: "text",
        value: typeof val === "string" ? val : ""
      });
      inputEl.addEventListener("change", function () {
        return _this7.syncObjectFromInput(inputEl, obj);
      });
      return inputEl;
    }
  }, {
    key: "syncObjectFromInput",
    value: function syncObjectFromInput(inputEl, obj) {
      var val = inputEl.value;
      this.setObjectPropFromState(obj, val == "" ? this.defaultStateValue : val);
    }
  }], [{
    key: "define",
    value:
    /**
     * Defines a state property.
     * @param {string} key The key of the property.
     * @param {object} kwargs The properties of the property.
     * @returns {function(object):object} The decorator.
     */
    function define(key, kwargs) {
      var _this8 = this;
      return function (target) {
        if (target.IS_MIXIN) {
          target.addTargetDecorator(_this8, "define", key, kwargs);
          return target;
        }
        var prop = new _this8(key, kwargs);
        prop.initObjectClass(target);
        return target;
      };
    }

    /**
     * Undefines a state property.
     * @param {string} key The key of the property.
     * @returns {function(object):object} The decorator.
     */
  }, {
    key: "undefine",
    value: function undefine(key) {
      var _this9 = this;
      return function (target) {
        if (target.IS_MIXIN) {
          target.addTargetDecorator(_this9, "undefine", key);
          return target;
        }
        if (!target.STATE_PROPS || !target.STATE_PROPS.has(key)) throw Error("StateProperty \"".concat(key, "\" does not exist in ").concat(target.name));
        if (!target.hasOwnProperty('STATE_PROPS')) target.STATE_PROPS = new Map(target.STATE_PROPS);
        target.STATE_PROPS["delete"](key);
        return target;
      };
    }

    /**
     * Modifies a state property.
     * @param {string} key The key of the property.
     * @param {object} kwargs The properties to modify.
     * @returns {function(object):object} The decorator.
     */
  }, {
    key: "modify",
    value: function modify(key, kwargs) {
      var _this0 = this;
      return function (target) {
        if (target.IS_MIXIN) {
          target.addTargetDecorator(_this0, "modify", key, kwargs);
          return target;
        }
        if (!target.STATE_PROPS || !target.STATE_PROPS.has(key)) throw Error("StateProperty \"".concat(key, "\" does not exist in ").concat(target.name));
        var parentProp = target.STATE_PROPS.get(key);
        var prop = new _this0(key, _objectSpread(_objectSpread({}, parentProp.initKwargs), kwargs));
        prop.initObjectClass(target);
        return target;
      };
    }
  }]);
}();
_defineProperty(StateProperty, "DEFAULT_STATE_VALUE", null);
export var StateBool = /*#__PURE__*/function (_StateProperty2) {
  function StateBool() {
    _classCallCheck(this, StateBool);
    return _callSuper(this, StateBool, arguments);
  }
  _inherits(StateBool, _StateProperty2);
  return _createClass(StateBool, [{
    key: "createObjectBaseInput",
    value: function createObjectBaseInput(obj) {
      var _this1 = this;
      var val = this.getObjectPropState(obj);
      var inputEl = newDomEl("input", {
        type: "checkbox",
        checked: Boolean(val)
      });
      inputEl.addEventListener("change", function () {
        return _this1.syncObjectFromInput(inputEl, obj);
      });
      return inputEl;
    }
  }, {
    key: "syncObjectFromInput",
    value: function syncObjectFromInput(inputEl, obj) {
      this.setObjectPropFromState(obj, inputEl.checked);
    }
  }]);
}(StateProperty);
_defineProperty(StateBool, "DEFAULT_STATE_VALUE", false);
export var StateNumber = /*#__PURE__*/function (_StateProperty3) {
  function StateNumber(key, kwargs) {
    var _this10;
    _classCallCheck(this, StateNumber);
    _this10 = _callSuper(this, StateNumber, [key, kwargs]);
    _this10.precision = kwargs?.precision ?? 1;
    _this10.min = kwargs?.min ?? 0;
    _this10.max = kwargs?.max ?? null;
    var kwargsDefault = kwargs?.default;
    if (typeof kwargsDefault == 'number') _this10.defaultStateValue = kwargsDefault / _this10.precision;
    return _this10;
  }
  _inherits(StateNumber, _StateProperty3);
  return _createClass(StateNumber, [{
    key: "getObjectPropState",
    value: function getObjectPropState(obj) {
      var val = obj[this.key];
      if (val === (this.nullableWith ?? null)) return null;else return round(val / this.precision);
    }
  }, {
    key: "setObjectPropFromState",
    value: function setObjectPropFromState(obj, valState) {
      var key = this.key;
      if (valState === undefined) return delete obj[key];
      if (valState === null) return obj[key] = this.nullableWith ?? null;
      obj[key] = valState * this.precision;
    }
  }, {
    key: "createObjectBaseInput",
    value: function createObjectBaseInput(obj) {
      var _this11 = this;
      var val = this.getObjectPropState(obj);
      var inputEl = newDomEl("input", {
        type: "number",
        value: typeof val === "number" ? val * this.precision : ""
      });
      inputEl.setAttribute("min", this.min);
      if (this.max !== null) inputEl.setAttribute("max", this.max);
      inputEl.setAttribute("step", this.precision);
      inputEl.addEventListener("change", function () {
        return _this11.syncObjectFromInput(inputEl, obj);
      });
      return inputEl;
    }
  }, {
    key: "syncObjectFromInput",
    value: function syncObjectFromInput(inputEl, obj) {
      var val = inputEl.value;
      val = val == "" ? this.defaultStateValue : parseFloat(val);
      val = round(val / this.precision);
      this.setObjectPropFromState(obj, val);
    }
  }]);
}(StateProperty);
_defineProperty(StateNumber, "DEFAULT_STATE_VALUE", 0);
export var StateEnum = /*#__PURE__*/function (_StateProperty4) {
  function StateEnum(key, kwargs) {
    var _this12;
    _classCallCheck(this, StateEnum);
    _this12 = _callSuper(this, StateEnum, [key, kwargs]);
    _this12.options = kwargs.options;
    return _this12;
  }
  _inherits(StateEnum, _StateProperty4);
  return _createClass(StateEnum, [{
    key: "createObjectBaseInput",
    value: function createObjectBaseInput(obj) {
      var _this13 = this;
      var options = this.options;
      var val = this.getObjectPropState(obj);
      var inputEl = newDomEl("select");
      for (var optVal in options) {
        addNewDomEl(inputEl, "option", {
          value: optVal,
          text: options[optVal]
        });
      }
      inputEl.value = val;
      inputEl.addEventListener("change", function () {
        return _this13.syncObjectFromInput(inputEl, obj);
      });
      return inputEl;
    }
  }]);
}(StateProperty);
export var StateIntEnum = /*#__PURE__*/function (_StateEnum) {
  function StateIntEnum() {
    _classCallCheck(this, StateIntEnum);
    return _callSuper(this, StateIntEnum, arguments);
  }
  _inherits(StateIntEnum, _StateEnum);
  return _createClass(StateIntEnum, [{
    key: "syncObjectFromInput",
    value: function syncObjectFromInput(inputEl, obj) {
      var val = inputEl.value;
      this.setObjectPropFromState(obj, val == "" ? this.defaultStateValue : parseInt(val));
    }
  }]);
}(StateEnum);
_defineProperty(StateIntEnum, "DEFAULT_STATE_VALUE", 0);
export var StateString = /*#__PURE__*/function (_StateProperty5) {
  function StateString() {
    _classCallCheck(this, StateString);
    return _callSuper(this, StateString, arguments);
  }
  _inherits(StateString, _StateProperty5);
  return _createClass(StateString, [{
    key: "createObjectBaseInput",
    value: function createObjectBaseInput(obj) {
      var _this14 = this;
      var val = this.getObjectPropState(obj);
      var inputEl = newDomEl("input", {
        type: "text",
        value: typeof val === "string" ? val : ""
      });
      inputEl.addEventListener("change", function () {
        return _this14.syncObjectFromInput(inputEl, obj);
      });
      return inputEl;
    }
  }, {
    key: "syncObjectFromInput",
    value: function syncObjectFromInput(inputEl, obj) {
      var val = inputEl.value;
      this.setObjectPropFromState(obj, val == "" ? this.defaultStateValue : val);
    }
  }]);
}(StateProperty);
_defineProperty(StateString, "DEFAULT_STATE_VALUE", "");
export var StateObjectRef = /*#__PURE__*/function (_StateProperty6) {
  function StateObjectRef() {
    _classCallCheck(this, StateObjectRef);
    return _callSuper(this, StateObjectRef, arguments);
  }
  _inherits(StateObjectRef, _StateProperty6);
  return _createClass(StateObjectRef, [{
    key: "initObjectClassProp",
    value: function initObjectClassProp(cls) {
      cls.prototype[this.key] = this.nullableWith ?? null;
    }
  }, {
    key: "getObjectPropState",
    value: function getObjectPropState(obj) {
      var val = obj[this.key];
      if (val === (this.nullableWith ?? null)) return null;
      return val.id;
    }
  }, {
    key: "setObjectPropFromState",
    value: function setObjectPropFromState(obj, valState) {
      var key = this.key;
      if (!valState) obj[key] = this.nullableWith ?? null;else obj[key] = obj.scene.objects.get(valState);
    }
  }]);
}(StateProperty);

// OBJECT LINK ///////////////////////

export var LinkTrigger = /*#__PURE__*/function () {
  function LinkTrigger(funcName, kwargs) {
    _classCallCheck(this, LinkTrigger);
    this.funcName = funcName;
    this.label = kwargs?.label ?? funcName;
    this.isDefault = kwargs?.isDefault ?? false;
  }
  return _createClass(LinkTrigger, [{
    key: "initObjectClass",
    value: function initObjectClass(cls) {
      if (!cls.hasOwnProperty('LINK_TRIGGERS')) cls.LINK_TRIGGERS = new Map(cls.LINK_TRIGGERS);
      cls.LINK_TRIGGERS.set(this.funcName, this);
      if (this.isDefault) cls.DEFAULT_LINK_TRIGGER = this.funcName;
    }
  }], [{
    key: "add",
    value: function add(funcName, kwargs) {
      var _this15 = this;
      return function (target) {
        if (target.IS_MIXIN) {
          target.addTargetDecorator(_this15, "add", funcName, kwargs);
          return target;
        }
        var linkTrig = new _this15(funcName, kwargs);
        linkTrig.initObjectClass(target);
        return target;
      };
    }
  }]);
}();
export var LinkReaction = /*#__PURE__*/function () {
  function LinkReaction(funcName, kwargs) {
    _classCallCheck(this, LinkReaction);
    this.funcName = funcName;
    this.label = kwargs?.label ?? funcName;
    this.isDefault = kwargs?.isDefault ?? false;
  }
  return _createClass(LinkReaction, [{
    key: "initObjectClass",
    value: function initObjectClass(cls) {
      if (!cls.hasOwnProperty('LINK_REACTIONS')) cls.LINK_REACTIONS = new Map(cls.LINK_REACTIONS);
      cls.LINK_REACTIONS.set(this.funcName, this);
      if (this.isDefault) cls.DEFAULT_LINK_REACTION = this.funcName;
    }
  }], [{
    key: "add",
    value: function add(funcName, kwargs) {
      var _this16 = this;
      return function (target) {
        if (target.IS_MIXIN) {
          target.addTargetDecorator(_this16, "add", funcName, kwargs);
          return target;
        }
        var linkReact = new _this16(funcName, kwargs);
        linkReact.initObjectClass(target);
        return target;
      };
    }
  }]);
}();
export var LinkMessage = /*#__PURE__*/_createClass(function LinkMessage(value) {
  _classCallCheck(this, LinkMessage);
  this.value = value;
});
export var ObjectLink = /*#__PURE__*/_createClass(function ObjectLink(trigObj, trigKey, reactObj, reactKey, threshold) {
  _classCallCheck(this, ObjectLink);
  this.triggerObject = trigObj;
  this.triggerKey = trigKey;
  this.reactionObject = reactObj;
  this.reactionKey = reactKey;
  this.threshold = threshold;
});

// CORE
_classDecs = [LinkTrigger.add("isRemoved", {
  isDefault: true
}), LinkReaction.add("reactRemove", {
  label: "remove",
  isDefault: true
}), StateNumber.define("angle"), StateIntEnum.define("dirY", {
  "default": 1,
  options: {
    '1': "Up",
    '-1': "Down"
  }
}), StateIntEnum.define("dirX", {
  "default": 1,
  options: {
    '1': "Right",
    '-1': "Left"
  }
}), StateNumber.define("z", {
  precision: .1,
  showInBuilder: true
}), StateNumber.define("y", {
  precision: .1,
  showInBuilder: true
}), StateNumber.define("x", {
  precision: .1,
  showInBuilder: true
})];
var _GameObject;
new (_GameObject2 = (_GameObject3 = /*#__PURE__*/function () {
  // static STATE_PROPS = new Map()  // already done by x/y/z/... state props
  // static LINK_TRIGGERS = new Map()  // already done by isRemoved/reactRemove links
  // static LINK_REACTIONS = new Map()  // same...

  function GameObject(scn, kwargs) {
    _classCallCheck(this, GameObject);
    this.scene = scn;
    this.game = scn.game;
    this.init(kwargs);
  }
  return _createClass(GameObject, [{
    key: "init",
    value: function init(kwargs) {
      var _this17 = this;
      if (kwargs) {
        if (kwargs.id !== undefined) this.id = kwargs.id;
        if (kwargs.key !== undefined) this.key = kwargs.key;
        if (kwargs.x !== undefined) this.x = kwargs.x;
        if (kwargs.y !== undefined) this.y = kwargs.y;
        if (kwargs.size !== undefined) this.width = this.height = kwargs.size;
        if (kwargs.width !== undefined) this.width = kwargs.width;
        if (kwargs.height !== undefined) this.height = kwargs.height;
        if (kwargs.dirX !== undefined) this.dirX = kwargs.dirX;
        if (kwargs.dirY !== undefined) this.dirY = kwargs.dirY;
        if (kwargs.color !== undefined) this.color = kwargs.color;
        if (kwargs.visibility !== undefined) this.visibility = kwargs.visibility;
      }
      this.constructor.STATE_PROPS.forEach(function (prop) {
        return prop.initObject(_this17, kwargs);
      });
      this.constructor.MIXINS.forEach(function (mixin) {
        return mixin.init.call(_this17, kwargs);
      });
    }
  }, {
    key: "getKey",
    value: function getKey() {
      return this.key ?? this.constructor.KEY;
    }
  }, {
    key: "getPriority",
    value: function getPriority() {
      return 0;
    }
  }, {
    key: "update",
    value: function update() {
      var _this18 = this;
      this.constructor.MIXINS.forEach(function (mixin) {
        return mixin.update.call(_this18);
      });
      this.requestLinkMessages();
    }
  }, {
    key: "getHitBox",
    value: function getHitBox() {
      var x = this.x,
        y = this.y,
        width = this.width,
        height = this.height;
      return {
        left: x - width / 2,
        width: width,
        top: y - height / 2,
        height: height
      };
    }
  }, {
    key: "checkHitTouches",
    value: function checkHitTouches() {
      var scn = this.scene;
      var _this$getHitBox = this.getHitBox(),
        left = _this$getHitBox.left,
        width = _this$getHitBox.width,
        top = _this$getHitBox.top,
        height = _this$getHitBox.height;
      left += scn.x;
      top += scn.y;
      var _iterator2 = _createForOfIteratorHelper(this.game.touches),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var touch = _step2.value;
          var isDown = touch.isDown,
            touchX = touch.x,
            touchY = touch.y;
          if (isDown && left <= touchX && left + width > touchX && top <= touchY && top + height > touchY) return true;
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
      return false;
    }
  }, {
    key: "remove",
    value: function remove() {
      this.removed = true;
    }
  }, {
    key: "isRemoved",
    value: function isRemoved() {
      return Boolean(this.removed);
    }
  }, {
    key: "addObjectLink",
    value: function addObjectLink(trigObj, trigKey, reactKey, threshold) {
      var objLinks = this.objectLinks || (this.objectLinks = []);
      if (!trigKey) trigKey = trigObj.constructor.DEFAULT_LINK_TRIGGER;
      if (!reactKey) reactKey = this.constructor.DEFAULT_LINK_REACTION;
      if (threshold === undefined) threshold = .5;
      objLinks.push(new ObjectLink(trigObj, trigKey, this, reactKey, threshold));
    }
  }, {
    key: "requestLinkMessages",
    value: function requestLinkMessages() {
      var objLinks = this.objectLinks;
      if (!objLinks) return;
      var _iterator3 = _createForOfIteratorHelper(objLinks),
        _step3;
      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var objLink = _step3.value;
          var trigObj = objLink.triggerObject;
          var msg = trigObj[objLink.triggerKey]();
          if (typeof msg == "boolean") msg = msg ? 1 : 0;
          if (typeof msg == "number") {
            var _msg = this._linkResp || (this._linkResp = new LinkMessage());
            _msg.value = msg;
            msg = _msg;
          }
          msg.triggerObject = trigObj;
          this[objLink.reactionKey](msg);
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }
    }
  }, {
    key: "reactRemove",
    value: function reactRemove(msg) {
      if (msg.value > .5) this.remove();
    }
  }, {
    key: "getState",
    value: function getState() {
      var _this19 = this;
      var isInitState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var state = {};
      state.key = this.getKey();
      var id = this.id;
      if (id !== undefined) state.id = id;
      this.constructor.STATE_PROPS.forEach(function (prop) {
        return prop.syncStateFromObject(_this19, state);
      });
      this.constructor.MIXINS.forEach(function (mixin) {
        return mixin.syncStateFromObject(_this19, state);
      });
      return state;
    }
  }, {
    key: "getObjectLinksState",
    value: function getObjectLinksState() {
      var objLinks = this.objectLinks;
      if (!objLinks) return null;
      var state = [];
      var _iterator4 = _createForOfIteratorHelper(objLinks),
        _step4;
      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          var objLink = _step4.value;
          state.push([this.id, objLink.triggerObject.id, objLink.triggerKey, objLink.reactionKey, objLink.threshold]);
        }
      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }
      return state;
    }
  }, {
    key: "setState",
    value: function setState(state) {
      var _this20 = this;
      var isInitState = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      this.constructor.STATE_PROPS.forEach(function (prop) {
        return prop.syncObjectFromState(state, _this20);
      });
      this.constructor.MIXINS.forEach(function (mixin) {
        return mixin.syncObjectFromState(state, _this20);
      });
    }
  }, {
    key: "addObjectLinkFromState",
    value: function addObjectLinkFromState(objLinkState) {
      var _objLinkState = _slicedToArray(objLinkState, 5),
        reactObjId = _objLinkState[0],
        trigObjId = _objLinkState[1],
        trigKey = _objLinkState[2],
        reactKey = _objLinkState[3],
        threshold = _objLinkState[4];
      var trigObj = this.scene.objects.get(trigObjId);
      this.addObjectLink(trigObj, trigKey, reactKey, threshold);
    }
  }, {
    key: "draw",
    value: function draw(drawer) {
      var props = this.getGraphicsProps();
      if (props) drawer.draw(props);
    }
  }, {
    key: "getGraphicsProps",
    value: function getGraphicsProps() {
      var color = this.color;
      var img = this.getBaseImg();
      if (!color && !img) return null;
      var props = new GraphicsProps();
      props.color = color;
      props.img = img;
      props.x = this.x;
      props.y = this.y;
      props.width = this.width ?? 50;
      props.height = this.height ?? 50;
      props.dirX = this.dirX;
      props.dirY = this.dirY;
      props.angle = this.angle;
      props.order = this.z;
      props.visibility = this.visibility;
      return props;
    }
  }, {
    key: "getBaseImg",
    value: function getBaseImg() {}
  }]);
}(), _applyDecs$c = _slicedToArray(_applyDecs(_GameObject3, [], _classDecs).c, 2), _GameObject = _applyDecs$c[0], _initClass = _applyDecs$c[1], _GameObject3), _Class = /*#__PURE__*/function (_identity2) {
  function _Class() {
    var _this21;
    _classCallCheck(this, _Class);
    _this21 = _callSuper(this, _Class, [_GameObject]), _defineProperty(_assertThisInitialized(_this21), "MIXINS", new Map()), function () {
      assign(_this21.prototype, {
        width: 10,
        height: 10,
        color: null,
        visibility: 1,
        removed: false
      });
    }(), _initClass();
    return _this21;
  }
  _inherits(_Class, _identity2);
  return _createClass(_Class);
}(_identity), _defineProperty(_Class, _GameObject2, void 0), _Class)();
export { _GameObject as GameObject };
_GameObject.StateProperty = /*#__PURE__*/function (_StateProperty) {
  function _class(key, kwargs) {
    var _this22;
    _classCallCheck(this, _class);
    _this22 = _callSuper(this, _class, [key, kwargs]);
    _this22.filter = kwargs?.filter;
    return _this22;
  }
  _inherits(_class, _StateProperty);
  return _createClass(_class, [{
    key: "initObjectClassProp",
    value: function initObjectClassProp(cls) {
      cls.prototype[this.key] = this.nullableWith ?? null;
    }
  }, {
    key: "getObjectPropState",
    value: function getObjectPropState(obj) {
      var val = obj[this.key];
      if (val === (this.nullableWith ?? null)) return null;
      return val.getState();
    }
  }, {
    key: "setObjectPropFromState",
    value: function setObjectPropFromState(obj, valState) {
      var key = this.key;
      if (!valState) return valState = this.nullableWith ?? null;
      var objVal = obj[key];
      if (!objVal || objVal.getKey() != valState.key) {
        var _obj$game = obj.game,
          catalog = _obj$game.catalog,
          map = _obj$game.map;
        var cls = catalog.getObjectClass(map.perspective, map.versions, valState.key);
        var scn = obj instanceof _SceneCommon ? obj : obj.scene;
        objVal = new cls(scn);
        obj[key] = objVal;
      }
      objVal.setState(valState);
    }
  }, {
    key: "initObject",
    value: function initObject(obj, kwargs) {
      _superPropGet(_class, "initObject", this, 3)([obj, kwargs]);
      if (!obj.hasOwnProperty(this.key) && this.defaultStateValue) {
        this.setObjectPropFromState(obj, this.defaultStateValue);
      }
    }
  }, {
    key: "createObjectInput",
    value: function createObjectInput(obj) {
      var _this23 = this;
      var wrapperEl = newDomEl("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: ".2em"
        }
      });
      var superWrapperEl = _superPropGet(_class, "createObjectInput", this, 3)([obj]);
      var inputEl = superWrapperEl.querySelector("dmg-object-selector");
      wrapperEl.appendChild(superWrapperEl);
      var stateEl = this.createObjectStateInput(obj);
      wrapperEl.appendChild(stateEl);
      inputEl.addEventListener("change", function () {
        _this23.syncObjectFromInput(inputEl, obj);
        stateEl.showAndInit(obj[_this23.key]);
      });
      return wrapperEl;
    }
  }, {
    key: "createObjectBaseInput",
    value: function createObjectBaseInput(obj) {
      var _this24 = this;
      var objVal = obj[this.key];
      var _obj$game2 = obj.game,
        catalog = _obj$game2.catalog,
        map = _obj$game2.map;
      var inputEl = addNewDomEl(inputEl, "dmg-object-selector");
      var filterFun = null;
      if (this.filter) filterFun = function filterFun(obj) {
        return filterObject(_this24.filter, obj);
      };
      inputEl.initCatalog(map.perspective, map.versions, catalog, filterFun);
      if (objVal) inputEl.setSelectedObject(objVal.getKey());
      return inputEl;
    }
  }, {
    key: "createObjectStateInput",
    value: function createObjectStateInput(obj) {
      var objVal = obj[this.key];
      var stateEl = newDomEl("dmg-object-state", {
        style: {
          display: "none"
        }
      });
      stateEl.showAndInit = function (objVal) {
        stateEl.style.display = "";
        stateEl.initObject(objVal);
      };
      if (objVal) stateEl.showAndInit(objVal);
      return stateEl;
    }
  }, {
    key: "syncObjectFromInput",
    value: function syncObjectFromInput(inputEl, obj) {
      var objKey = inputEl.value;
      this.setObjectPropFromState(obj, {
        key: objKey
      });
    }
  }]);
}(StateProperty);
export function filterObject(filterDesc, obj) {
  if (filterDesc.and) {
    var _iterator5 = _createForOfIteratorHelper(filterDesc.and),
      _step5;
    try {
      for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
        var f = _step5.value;
        if (!filterObject(f, obj)) return false;
      }
    } catch (err) {
      _iterator5.e(err);
    } finally {
      _iterator5.f();
    }
    return true;
  }
  if (filterDesc.or) {
    var _iterator6 = _createForOfIteratorHelper(filterDesc.or),
      _step6;
    try {
      for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
        var _f = _step6.value;
        if (filterObject(_f, obj)) return true;
      }
    } catch (err) {
      _iterator6.e(err);
    } finally {
      _iterator6.f();
    }
    return false;
  }
  if (filterDesc.not) {
    return !filterObject(filterDesc.not, obj);
  }
  if (filterDesc.category) {
    var objCat = obj.category;
    if (!objCat || objCat.indexOf('/' + filterDesc.category + '/') < 0) return false;
  }
  return true;
}
export var Text = /*#__PURE__*/function (_GameObject4) {
  function Text() {
    _classCallCheck(this, Text);
    return _callSuper(this, Text, arguments);
  }
  _inherits(Text, _GameObject4);
  return _createClass(Text, [{
    key: "init",
    value: function init(kwargs) {
      _superPropGet(Text, "init", this, 3)([kwargs]);
      this.textArgs = kwargs;
      this.updateText(kwargs?.text ?? "");
    }
  }, {
    key: "updateText",
    value: function updateText(text) {
      this.text = text;
      this.initBaseImg();
    }
  }, {
    key: "initBaseImg",
    value: function initBaseImg() {
      var img = this._baseImg = newTextCanvas(this.text, this.textArgs);
      this.width = img?.width ?? 0;
      this.height = img?.height ?? 0;
    }
  }, {
    key: "getBaseImg",
    value: function getBaseImg() {
      return this._baseImg;
    }
  }]);
}(_GameObject);
var CenteredText = /*#__PURE__*/function (_Text) {
  function CenteredText() {
    _classCallCheck(this, CenteredText);
    return _callSuper(this, CenteredText, arguments);
  }
  _inherits(CenteredText, _Text);
  return _createClass(CenteredText, [{
    key: "getGraphicsProps",
    value: function getGraphicsProps() {
      var _this$scene = this.scene,
        viewWidth = _this$scene.viewWidth,
        viewHeight = _this$scene.viewHeight;
      var props = _superPropGet(CenteredText, "getGraphicsProps", this, 3)([]);
      props.x = viewWidth / 2;
      props.y = viewHeight / 2;
      return props;
    }
  }]);
}(Text);
export var GameObjectGroup = /*#__PURE__*/function () {
  function GameObjectGroup(scn, kwargs) {
    _classCallCheck(this, GameObjectGroup);
    this.scene = scn;
    this.game = scn.game;
    this.init(kwargs);
  }
  return _createClass(GameObjectGroup, [{
    key: "init",
    value: function init(kwargs) {
      var scene = this.scene,
        chunkSize = scene.chunkSize;
      this.nbChunksX = chunkSize == Infinity ? 1 : ceil(scene.width / chunkSize);
      this.nbChunksY = chunkSize == Infinity ? 1 : ceil(scene.height / chunkSize);
      this.chunks = new Map();
      this.objMap = new Map();
      this._nextAutoStatefulObjId = 0;
      this._nextAutoStatelessObjId = -1;
      this.x = kwargs?.x ?? 0;
      this.y = kwargs?.y ?? 0;
      if (kwargs?.onAdd) this.onAdd = kwargs.onAdd;
    }
  }, {
    key: "getChunkId",
    value: function getChunkId(obj) {
      var x = obj.x,
        y = obj.y;
      var nbChunksX = this.nbChunksX,
        chunkSize = this.scene.chunkSize;
      var res = floor(x / chunkSize) + nbChunksX * floor(y / chunkSize);
      return res;
    }
  }, {
    key: "getChunk",
    value: function getChunk(chunkId) {
      var chunks = this.chunks;
      var res = chunks.get(chunkId);
      if (res === undefined) {
        res = [];
        chunks.set(chunkId, res);
      }
      return res;
    }
  }, {
    key: "nextAutoId",
    value: function nextAutoId(cls) {
      if (cls.STATEFUL) {
        var res = this._nextAutoStatefulObjId;
        this._nextAutoStatefulObjId += 1;
        return res;
      } else {
        var _res = this._nextAutoStatelessObjId;
        this._nextAutoStatelessObjId -= 1;
        return _res;
      }
    }
  }, {
    key: "syncAutoId",
    value: function syncAutoId(objId) {
      objId = parseInt(objId);
      if (objId >= 0) {
        this._nextAutoStatefulObjId = max(this._nextAutoStatefulObjId, objId + 1);
      } else {
        this._nextAutoStatelessObjId = min(this._nextAutoStatelessObjId, objId - 1);
      }
    }
  }, {
    key: "add",
    value: function add(cls, kwargs) {
      kwargs || (kwargs = {});
      var obj;
      if (typeof cls === 'string') {
        obj = this.scene.createObjectFromKey(cls, kwargs);
      } else {
        obj = new cls(this.scene, kwargs);
      }
      if (obj.id === undefined) obj.id = this.nextAutoId(obj.constructor);else this.syncAutoId(obj.id);
      this.objMap.set(obj.id, obj);
      this.getChunk(this.getChunkId(obj)).push(obj);
      this.onAdd(obj);
      return obj;
    }
  }, {
    key: "onAdd",
    value: function onAdd(obj) {}
  }, {
    key: "get",
    value: function get(objId) {
      return this.objMap.get(objId);
    }
  }, {
    key: "forEach",
    value: function forEach(next) {
      this.objMap.forEach(function (obj) {
        if (!obj.removed) next(obj);
      });
    }
  }, {
    key: "update",
    value: function update() {
      var _this25 = this;
      this.chunks.forEach(function (chunk, chunkId) {
        _this25.sortItems(chunk);
        chunk.forEach(function (obj) {
          return obj.update();
        });
      });
      this.chunks.forEach(function (chunk, chunkId) {
        _this25.cleanChunk(chunkId, chunk);
      });
    }
  }, {
    key: "cleanChunk",
    value: function cleanChunk(chunkId, chunk) {
      var objMap = this.objMap;
      var idx = 0,
        nbEnts = chunk.length;
      while (idx < nbEnts) {
        var obj = chunk[idx];
        if (obj.removed) {
          // case: removed obj
          chunk.splice(idx, 1);
          nbEnts -= 1;
          objMap["delete"](obj.id);
        } else {
          var newChunkId = this.getChunkId(obj);
          if (chunkId != newChunkId) {
            // case: obj changed chunk
            chunk.splice(idx, 1);
            nbEnts -= 1;
            this.getChunk(newChunkId).push(obj);
          } else {
            // case: default
            idx += 1;
          }
        }
      }
    }
  }, {
    key: "sortItems",
    value: function sortItems(chunk) {
      chunk.sort(function (a, b) {
        return b.getPriority() - a.getPriority();
      });
    }
  }, {
    key: "draw",
    value: function draw(drawer) {
      var _this26 = this;
      var propss = [];
      var objDrawer = this._objDrawer || (this._objDrawer = {});
      objDrawer.draw = function (props) {
        if (!props) return;
        props.x += _this26.x;
        props.y += _this26.y;
        propss.push(props);
      };
      this.forEach(function (obj) {
        return obj.draw(objDrawer);
      });
      drawer.draw.apply(drawer, propss);
    }
  }, {
    key: "getState",
    value: function getState() {
      var isInitState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var state = new Map();
      this.chunks.forEach(function (chunk, chunkId) {
        var chunkState = [];
        state.set(chunkId, chunkState);
        chunk.forEach(function (obj) {
          if (obj.removed) return;
          if (obj.getKey() && (isInitState || obj.constructor.STATEFUL)) {
            chunkState.push(obj.getState(isInitState));
          }
        });
      });
      return state;
    }
  }, {
    key: "setState",
    value: function setState(state) {
      var _this27 = this;
      var isInitState = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      if (isInitState) {
        // initState has only 1 chunk
        var chunkState = state.get(0);
        for (var idx in chunkState) {
          var objState = chunkState[idx];
          var objId = objState.id;
          this.scene.addObject("A#".concat(idx), {
            id: objId
          });
        }
      } else {
        var objMap = this.objMap;
        // store stateful objs ids, and remove them from chunks
        var prevStatefullObjIds = new Set();
        state.forEach(function (_, chunkId) {
          var chunk = _this27.getChunk(chunkId);
          var idx = 0,
            nbEnts = chunk.length;
          while (idx < nbEnts) {
            var obj = chunk[idx];
            if (obj.constructor.STATEFUL) {
              chunk.splice(idx, 1);
              nbEnts -= 1;
              prevStatefullObjIds.add(obj.id);
            } else {
              idx += 1;
            }
          }
        });
        // update/create statefull objs in chunks
        state.forEach(function (chunkState, chunkId) {
          var chunk = _this27.getChunk(chunkId);
          for (var _idx in chunkState) {
            var _objState = chunkState[_idx];
            var _objId = _objState.id,
              key = _objState.key;
            var obj = objMap.get(_objId);
            // case (re-)create obj
            if (!obj || obj.getKey() != key) {
              if (obj) obj.remove();
              obj = _this27.add(key, {
                id: _objId
              });
            }
            // case update obj
            else chunk.push(obj);
            obj.setState(_objState, isInitState);
            prevStatefullObjIds["delete"](_objId);
          }
        });
        // remove remaining objs in prevStatefullObjIds
        var _iterator7 = _createForOfIteratorHelper(prevStatefullObjIds),
          _step7;
        try {
          for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
            var _objId2 = _step7.value;
            var obj = objMap.get(_objId2);
            obj.remove();
          }
        } catch (err) {
          _iterator7.e(err);
        } finally {
          _iterator7.f();
        }
      }
    }
  }, {
    key: "clear",
    value: function clear() {
      this.forEach(function (item) {
        return item.remove();
      });
      this.chunks.clear();
      this.objMap.clear();
    }
  }]);
}();
export var ObjectRefs = /*#__PURE__*/function (_Set) {
  function ObjectRefs(scn) {
    var _this28;
    _classCallCheck(this, ObjectRefs);
    _this28 = _callSuper(this, ObjectRefs);
    _this28.scene = scn;
    _this28.game = scn.game;
    return _this28;
  }
  _inherits(ObjectRefs, _Set);
  return _createClass(ObjectRefs, [{
    key: "update",
    value: function update() {
      this.clearRemoved();
    }
  }, {
    key: "clearRemoved",
    value: function clearRemoved() {
      var scene = this.scene;
      var _iterator8 = _createForOfIteratorHelper(this),
        _step8;
      try {
        for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
          var id = _step8.value;
          var obj = scene.objects.get(id);
          if (!obj || obj.removed) this["delete"](id);
        }
      } catch (err) {
        _iterator8.e(err);
      } finally {
        _iterator8.f();
      }
    }
  }, {
    key: "forEach",
    value: function forEach(next) {
      var scene = this.scene;
      var _iterator9 = _createForOfIteratorHelper(this),
        _step9;
      try {
        for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
          var id = _step9.value;
          var obj = scene.objects.get(id);
          if (!obj || obj.removed) this["delete"](id);else next(obj);
        }
      } catch (err) {
        _iterator9.e(err);
      } finally {
        _iterator9.f();
      }
    }
  }, {
    key: "getState",
    value: function getState() {
      if (this.size == 0) return null;
      var state = [];
      this.forEach(function (obj) {
        return state.push(obj.id);
      });
      return state;
    }
  }, {
    key: "setState",
    value: function setState(state) {
      if (state === null) return this.clear();
      var _iterator0 = _createForOfIteratorHelper(state),
        _step0;
      try {
        for (_iterator0.s(); !(_step0 = _iterator0.n()).done;) {
          var _id = _step0.value;
          this.add(_id);
        }
      } catch (err) {
        _iterator0.e(err);
      } finally {
        _iterator0.f();
      }
      if (state.length < this.size) {
        var _iterator1 = _createForOfIteratorHelper(this),
          _step1;
        try {
          for (_iterator1.s(); !(_step1 = _iterator1.n()).done;) {
            var id = _step1.value;
            if (state.indexOf(id) < 0) this["delete"](id);
          }
        } catch (err) {
          _iterator1.e(err);
        } finally {
          _iterator1.f();
        }
      }
    }
  }]);
}(/*#__PURE__*/_wrapNativeSuper(Set));
ObjectRefs.StateProperty = /*#__PURE__*/function (_StateProperty7) {
  function _class2() {
    _classCallCheck(this, _class2);
    return _callSuper(this, _class2, arguments);
  }
  _inherits(_class2, _StateProperty7);
  return _createClass(_class2, [{
    key: "initObjectClassProp",
    value:
    // nullableWith is not implemented here
    function initObjectClassProp(cls) {}
  }, {
    key: "initObject",
    value: function initObject(obj, kwargs) {
      _superPropGet(_class2, "initObject", this, 3)([obj, kwargs]);
      obj[this.key] = new ObjectRefs(obj.scene);
    }
  }, {
    key: "getObjectPropState",
    value: function getObjectPropState(obj) {
      var val = obj[this.key];
      if (val.size == 0) return undefined;else return val.getState();
    }
  }, {
    key: "setObjectPropFromState",
    value: function setObjectPropFromState(obj, valState) {
      var val = obj[this.key];
      val.setState(valState ?? null);
    }
  }, {
    key: "createObjectBaseInput",
    value: function createObjectBaseInput(obj) {
      // TODO
    }
  }]);
}(StateProperty);
export var MODE_LOCAL = 0;
export var MODE_SERVER = 1;
export var MODE_CLIENT = 2;
export var GameCommon = /*#__PURE__*/function () {
  function GameCommon(parentEl, catalog, map, kwargs) {
    _classCallCheck(this, GameCommon);
    this.mode = kwargs && kwargs.mode || MODE_LOCAL;
    this.isServerEnv = IS_SERVER_ENV;
    if (!this.isServerEnv) {
      this.parentEl = parentEl;
      this.canvas = document.createElement("canvas");
      this.canvas.setAttribute('tabindex', '0');
      assign(this.canvas.style, {
        outline: "2px solid grey"
      });
      parentEl.appendChild(this.canvas);
    }
    this.game = this;
    this.gameLoop = null;
    this.iteration = -1;
    this.time = 0;
    this.fps = FPS;
    this.dt = 1 / this.fps;
    this.catalog = catalog;
    this.map = map;
    this.isDebugMode = kwargs && kwargs.debug == true;
    this.scenesPosSizes = {
      game: {
        visible: true,
        x: 0,
        y: 0,
        viewWidth: 0,
        viewHeight: 0
      },
      joypad: {
        visible: false,
        x: 0,
        y: 0,
        viewWidth: 0,
        viewHeight: 0
      }
    };
    this.scenes = {
      game: new DefaultScene(this)
    };
    this.gameVisible = true;
    this.joypadVisible = false;
    this.syncSize();
  }
  return _createClass(GameCommon, [{
    key: "initTouches",
    value: function initTouches() {
      var _this29 = this;
      if (this.touches) return;
      this.touches = [];
      var el = this.game.canvas;
      var _updTouches = function _updTouches(isDown, evtTouches) {
        _this29.touches.length = 0;
        var rect = el.getBoundingClientRect();
        var _iterator10 = _createForOfIteratorHelper(evtTouches),
          _step10;
        try {
          for (_iterator10.s(); !(_step10 = _iterator10.n()).done;) {
            var evtTouch = _step10.value;
            _this29.touches.push({
              isDown: isDown,
              x: (evtTouch.clientX - rect.left) * el.width / rect.width,
              y: (evtTouch.clientY - rect.top) * el.height / rect.height
            });
          }
        } catch (err) {
          _iterator10.e(err);
        } finally {
          _iterator10.f();
        }
        _this29.onTouch();
      };
      if (HAS_TOUCH) {
        el.addEventListener("touchmove", function (evt) {
          return _updTouches(true, evt.touches);
        });
        el.addEventListener("touchstart", function (evt) {
          return _updTouches(true, evt.touches);
        });
        document.addEventListener("touchend", function (evt) {
          return _updTouches(true, evt.touches);
        });
      } else {
        var isDown = false;
        el.addEventListener("mousemove", function (evt) {
          return _updTouches(isDown, [evt]);
        });
        el.addEventListener("mousedown", function (evt) {
          isDown = true;
          _updTouches(isDown, [evt]);
        });
        document.addEventListener("mouseup", function (evt) {
          isDown = false;
          _updTouches(isDown, [evt]);
        });
      }
    }
  }, {
    key: "onTouch",
    value: function onTouch() {
      var _this$scenes = this.scenes,
        joypadScn = _this$scenes.joypad,
        joypadPauseScn = _this$scenes.joypadPause;
      if (joypadPauseScn) joypadPauseScn.onTouch();else if (joypadScn) joypadScn.onTouch();
    }
  }, {
    key: "run",
    value: function run() {
      var _this30 = this;
      if (this.gameLoop) return;
      this.startTime = this.nextFrameTime = now();
      var _tryUpdateGameLoop = function tryUpdateGameLoop() {
        _this30.gameLoop = setTimeout(function () {
          try {
            if (now() >= _this30.nextFrameTime) {
              _this30.updateGameLoop();
              _this30.nextFrameTime = max(now(), _this30.nextFrameTime + 1 / _this30.fps);
            }
            _tryUpdateGameLoop();
          } catch (err) {
            console.error(err);
            // gracefully stop game to not kill server
            _this30.stop();
          }
        }, 5);
      };
      _tryUpdateGameLoop();
    }
  }, {
    key: "stop",
    value: function stop() {
      if (!this.gameLoop) return;
      clearTimeout(this.gameLoop);
      this.gameLoop = null;
      this.onStop();
    }
  }, {
    key: "onStop",
    value: function onStop() {
      // to be replaced by game owner
    }
  }, {
    key: "loadGameScenes",
    value: function () {
      var _loadGameScenes = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1() {
        var scnMapId, scnMap;
        return _regenerator().w(function (_context1) {
          while (1) switch (_context1.n) {
            case 0:
              scnMapId = "0";
              scnMap = this.map.scenes[scnMapId];
              _context1.n = 1;
              return this.loadScenesFromMap(scnMap.key, scnMapId);
            case 1:
              return _context1.a(2);
          }
        }, _callee1, this);
      }));
      function loadGameScenes() {
        return _loadGameScenes.apply(this, arguments);
      }
      return loadGameScenes;
    }()
  }, {
    key: "loadScenesFromMap",
    value: function () {
      var _loadScenesFromMap = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10(scnKey) {
        var scnMapId,
          scnId,
          catalog,
          map,
          scnCat,
          paths,
          scnMap,
          objsMaps,
          objsChunkIdStr,
          objsChunkMap,
          _iterator11,
          _step11,
          objMap,
          mods,
          _args2 = arguments;
        return _regenerator().w(function (_context10) {
          while (1) switch (_context10.n) {
            case 0:
              scnMapId = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : undefined;
              scnId = _args2.length > 2 && _args2[2] !== undefined ? _args2[2] : undefined;
              catalog = this.catalog, map = this.map;
              scnCat = catalog.getScene(map.perspective, map.versions, scnKey);
              paths = new Set([scnCat.path]);
              map.heros.forEach(function (heroMap) {
                paths.add(catalog.getObject(map.perspective, map.versions, heroMap.key).path);
              });
              scnMap = scnMapId !== undefined ? map.scenes[scnMapId] : null;
              objsMaps = scnMap?.objects;
              if (objsMaps) for (objsChunkIdStr in objsMaps) {
                objsChunkMap = objsMaps[objsChunkIdStr];
                _iterator11 = _createForOfIteratorHelper(objsChunkMap);
                try {
                  for (_iterator11.s(); !(_step11 = _iterator11.n()).done;) {
                    objMap = _step11.value;
                    paths.add(catalog.getObject(map.perspective, map.versions, objMap.key).path);
                  }
                } catch (err) {
                  _iterator11.e(err);
                } finally {
                  _iterator11.f();
                }
              }
              _context10.n = 1;
              return catalog.preload(Array.from(paths));
            case 1:
              mods = _context10.v;
              _context10.n = 2;
              return this.loadScenes(mods[0][scnCat.name], scnMapId, scnId);
            case 2:
              return _context10.a(2);
          }
        }, _callee10, this);
      }));
      function loadScenesFromMap(_x8) {
        return _loadScenesFromMap.apply(this, arguments);
      }
      return loadScenesFromMap;
    }()
  }, {
    key: "loadScenes",
    value: function () {
      var _loadScenes = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee11(cls) {
        var scnMapId,
          scnId,
          scn,
          _args3 = arguments;
        return _regenerator().w(function (_context11) {
          while (1) switch (_context11.n) {
            case 0:
              scnMapId = _args3.length > 1 && _args3[1] !== undefined ? _args3[1] : undefined;
              scnId = _args3.length > 2 && _args3[2] !== undefined ? _args3[2] : undefined;
              scn = this.createScene(cls, {
                id: scnId
              });
              if (scnMapId !== undefined) scn.loadMap(scnMapId);
              this.scenes.game = scn;
              if (!this.joypadVisible) {
                _context11.n = 1;
                break;
              }
              _context11.n = 1;
              return this.loadJoypadScene();
            case 1:
              this.syncSize();
            case 2:
              return _context11.a(2);
          }
        }, _callee11, this);
      }));
      function loadScenes(_x9) {
        return _loadScenes.apply(this, arguments);
      }
      return loadScenes;
    }()
  }, {
    key: "setJoypadSceneVisibility",
    value: function () {
      var _setJoypadSceneVisibility = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee12(val) {
        return _regenerator().w(function (_context12) {
          while (1) switch (_context12.n) {
            case 0:
              if (!(val == this.joypadVisible)) {
                _context12.n = 1;
                break;
              }
              return _context12.a(2);
            case 1:
              this.joypadVisible = val;
              if (!val) {
                _context12.n = 3;
                break;
              }
              _context12.n = 2;
              return this.loadJoypadScene();
            case 2:
              _context12.n = 4;
              break;
            case 3:
              delete this.scenes.joypad;
            case 4:
              this.syncSize();
            case 5:
              return _context12.a(2);
          }
        }, _callee12, this);
      }));
      function setJoypadSceneVisibility(_x0) {
        return _setJoypadSceneVisibility.apply(this, arguments);
      }
      return setJoypadSceneVisibility;
    }()
  }, {
    key: "createScene",
    value: function createScene(cls, kwargs) {
      var map = this.game.map;
      this._nextSceneId || (this._nextSceneId = 0);
      if (kwargs?.id !== undefined) this._nextSceneId = kwargs.id;else {
        kwargs || (kwargs = {});
        kwargs.id = this._nextSceneId;
      }
      if (typeof cls === 'string') cls = this.catalog.getSceneClass(map.perspective, map.versions, cls);
      var scn = new cls(this, kwargs);
      this._nextSceneId += 1;
      return scn;
    }
  }, {
    key: "updateGameLoop",
    value: function updateGameLoop() {
      var mode = this.mode;
      this.update();
      if (mode != MODE_SERVER) this.mayDraw();
    }
  }, {
    key: "update",
    value: function update() {
      this.iteration += 1;
      this.time = this.iteration * this.dt;
      var _this$scenes2 = this.scenes,
        gameScn = _this$scenes2.game,
        joypadScn = _this$scenes2.joypad;
      if (!gameScn.paused) {
        gameScn.update();
        if (joypadScn) joypadScn.update();
      }
      this.syncPauseScenes();
      var _this$scenes3 = this.scenes,
        pauseScn = _this$scenes3.pause,
        joypadPauseScn = _this$scenes3.joypadPause;
      if (pauseScn) pauseScn.update();
      if (joypadPauseScn) joypadPauseScn.update();
    }
  }, {
    key: "mayDraw",
    value: function mayDraw() {
      var _this31 = this;
      this._drawing || (this._drawing = false);
      if (this._drawing) return;
      this._drawing = true;
      window.requestAnimationFrame(function () {
        _this31.draw();
        _this31._drawing = false;
      });
    }
  }, {
    key: "draw",
    value: function draw() {
      var _this$scenes4 = this.scenes,
        gameScn = _this$scenes4.game,
        pauseScn = _this$scenes4.pause,
        joypadScn = _this$scenes4.joypad,
        joypadPauseScn = _this$scenes4.joypadPause;
      this.drawScene(gameScn);
      this.drawScene(pauseScn);
      this.drawScene(joypadScn);
      this.drawScene(joypadPauseScn);
    }
  }, {
    key: "drawScene",
    value: function drawScene(scn) {
      if (!scn || !scn.visible) return;
      var can = scn.draw();
      if (can.width == 0 || can.height == 0) return;
      this.canvas.getContext("2d").drawImage(can, scn.x, scn.y);
    }
  }, {
    key: "syncSize",
    value: function syncSize() {
      var _this32 = this;
      var gameVisible = this.gameVisible,
        joypadVisible = this.joypadVisible;
      var _this$scenes5 = this.scenes,
        gameScn = _this$scenes5.game,
        joypadScn = _this$scenes5.joypad;
      // game
      var gamePS = this.scenesPosSizes.game;
      gamePS.visible = gameVisible;
      gamePS.x = 0;
      gamePS.y = 0;
      gamePS.viewWidth = min(gameScn.width, CANVAS_MAX_WIDTH);
      gamePS.viewHeight = min(gameScn.height, CANVAS_MAX_HEIGHT);
      // joypad
      var joypadPS = this.scenesPosSizes.joypad;
      if (joypadVisible && joypadScn) {
        joypadPS.visible = joypadVisible;
        joypadPS.x = 0;
        joypadPS.y = gameVisible ? gamePS.viewHeight : 0;
        joypadPS.viewWidth = gamePS.viewWidth;
        joypadPS.viewHeight = floor(gamePS.viewWidth * 9 / 16);
      }
      // game
      var width = gamePS.viewWidth;
      var height = max(joypadPS.viewHeight, (gameVisible ? gamePS.viewHeight : 0) + (joypadVisible && joypadScn ? joypadPS.viewHeight : 0));
      assign(this, {
        width: width,
        height: height
      });
      if (!this.isServerEnv) {
        assign(this.parentEl.style, {
          width: "".concat(width, "px"),
          height: "".concat(height, "px")
        });
        assign(this.canvas, {
          width: width,
          height: height
        });
        this.syncCanvasAspectRatio();
        window.addEventListener("resize", function () {
          return _this32.syncCanvasAspectRatio();
        });
      }
    }
  }, {
    key: "syncCanvasAspectRatio",
    value: function syncCanvasAspectRatio() {
      var width = this.width,
        height = this.height;
      var gameIsMoreLandscapeThanScreen = width / window.innerWidth / (height / window.innerHeight) >= 1;
      assign(this.canvas.style, {
        width: gameIsMoreLandscapeThanScreen ? "100%" : null,
        height: gameIsMoreLandscapeThanScreen ? null : "100%",
        aspectRatio: width / height
      });
    }
  }, {
    key: "isFullscreened",
    value: function isFullscreened() {
      return document.fullscreenElement == this.parentEl;
    }
  }, {
    key: "requestFullscreen",
    value: function requestFullscreen(orientation) {
      this.parentEl.requestFullscreen();
      if (orientation !== undefined && screen.orientation && screen.orientation.lock) {
        screen.orientation.lock(orientation)["catch"](console.error);
      }
      this.focus();
    }
  }, {
    key: "focus",
    value: function focus() {
      this.canvas.focus();
    }
  }, {
    key: "hasFocus",
    value: function hasFocus() {
      return document.activeElement === this.canvas;
    }
  }, {
    key: "pause",
    value: function pause(val) {
      var _this$scenes6;
      // game
      this.scenes.game.pause(val);
      if (val) (_this$scenes6 = this.scenes).pause || (_this$scenes6.pause = this.scenes.game.createPauseScene());else delete this.scenes.pause;
      // joypad
      if (this.scenes.joypad) {
        var _this$scenes7;
        this.scenes.joypad.pause(val);
        if (val) (_this$scenes7 = this.scenes).joypadPause || (_this$scenes7.joypadPause = this.scenes.joypad.createPauseScene());else delete this.scenes.joypadPause;
      }
      // state
      if (this.mode == MODE_CLIENT) return this.sendGameInstruction(val ? GAME_INSTR_PAUSE : GAME_INSTR_UNPAUSE);
      if (this.mode == MODE_SERVER) this.getAndSendFullState();
      // sync
      this.syncSize();
    }
  }, {
    key: "togglePause",
    value: function togglePause() {
      this.pause(!this.scenes.game.paused);
    }

    // TODO: remove me
  }, {
    key: "log",
    value: function log() {
      var _console;
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      (_console = console).log.apply(_console, [this.iteration, ((now() - this.startTime) / this.dt - this.iteration).toFixed(1)].concat(args));
      if (this.onLog) this.onLog.apply(this, args);
    }
  }, {
    key: "pushMetric",
    value: function pushMetric(key, val, maxNb) {
      var metrics = this.metrics || (this.metrics = {});
      var keyMetrics = metrics[key] || (metrics[key] = []);
      keyMetrics.push(val);
      if (keyMetrics.length > maxNb) keyMetrics.splice(0, keyMetrics.length - maxNb);
    }
  }]);
}();
_classDecs2 = [StateNumber.define("gridSize", {
  "default": 50,
  showInBuilder: true
}), StateNumber.define("height", {
  "default": 600,
  showInBuilder: true
}), StateNumber.define("width", {
  "default": 800,
  showInBuilder: true
})];
var _SceneCommon;
new (_SceneCommon2 = (_SceneCommon3 = /*#__PURE__*/function () {
  // static STATE_PROPS = new Map()  // already done by width & height state props

  function SceneCommon(game, kwargs) {
    _classCallCheck(this, SceneCommon);
    this.game = game;
    this.init(kwargs);
  }
  return _createClass(SceneCommon, [{
    key: "init",
    value: function init(kwargs) {
      var _this33 = this;
      this.id = kwargs?.id;
      this.visible = true;
      this.chunkSize = kwargs?.chunkSize ?? 1000;
      this.x = 0;
      this.y = 0;
      this.viewX = 0;
      this.viewY = 0;
      this.viewSpeed = 100;
      this.viewWidth = this.width;
      this.viewHeight = this.height;
      this.backgroundColor = "white";
      this.backgroundAlpha = 1;
      this.iteration = 0;
      this.time = 0;
      this.paused = false;
      if (!this.game.isServerEnv) {
        this.backgroundCanvas = null;
        this.canvas = document.createElement("canvas");
        this.graphicsEngine = new GraphicsEngine(this);
      }
      this.objects = new GameObjectGroup(this, {
        onAdd: function onAdd(obj) {
          return _this33.onAddObject(obj);
        }
      });
      this.visuals = new GameObjectGroup(this);
      this.notifs = new GameObjectGroup(this);
      this.heros = {};
      this.map = null;
      this.doCreateObjectMapProto = true;
      this.constructor.STATE_PROPS.forEach(function (prop) {
        return prop.initObject(_this33, kwargs);
      });
      this.constructor.MIXINS.forEach(function (mixin) {
        return mixin.init.call(_this33, kwargs);
      });
    }
  }, {
    key: "isPausable",
    value: function isPausable() {
      return false;
    }
  }, {
    key: "pause",
    value: function pause(val) {
      if (!this.isPausable()) return;
      this.paused = val;
    }
  }, {
    key: "setView",
    value: function setView(viewX, viewY) {
      var viewWidth = this.viewWidth,
        viewHeight = this.viewHeight;
      this.viewX = sumTo(this.viewX, this.viewSpeed, viewX);
      this.viewY = sumTo(this.viewY, this.viewSpeed, viewY);
      this.viewX = max(0, min(this.width - viewWidth, this.viewX));
      this.viewY = max(0, min(this.height - viewHeight, this.viewY));
    }
  }, {
    key: "loadMap",
    value: function loadMap(scnMapId) {
      this.mapId = scnMapId;
      this.map = this.game.map.scenes[scnMapId];
      this.setState(this.map, true);
    }
  }, {
    key: "addObject",
    value: function addObject(cls, kwargs) {
      return this.objects.add(cls, kwargs);
    }
  }, {
    key: "onAddObject",
    value: function onAddObject(obj) {}
  }, {
    key: "createObjectFromKey",
    value: function createObjectFromKey(key, kwargs) {
      var map = this.game.map;
      var mapState = this.getObjectMapState(key);
      var origKey;
      if (mapState) {
        origKey = key;
        key = mapState.key;
      }
      var cls = this.game.catalog.getObjectClass(map.perspective, map.versions, key);
      var obj;
      if (mapState) {
        if (this.doCreateObjectMapProto) {
          var proto = new cls(this);
          proto.setState(mapState, true);
          obj = Object.create(proto);
          obj.init(kwargs);
          obj.key = origKey;
        } else {
          obj = new cls(this, kwargs);
          obj.setState(mapState, true);
        }
      } else {
        obj = new cls(this, kwargs);
      }
      return obj;
    }
  }, {
    key: "getObjectMapState",
    value: function getObjectMapState(key) {
      var dotIdx = key.indexOf('.');
      var props = null;
      if (dotIdx >= 0) {
        key = key.substring(0, dotIdx);
        props = key.substring(dotIdx + 1).split('.');
      }
      var res = null;
      if (key.startsWith('A#')) {
        var mapNum = parseInt(key.substring(2));
        // initState has only 1 chunk
        res = this.map.objects.get(0)[mapNum];
      } else if (key.startsWith('H#')) {
        var _mapNum = parseInt(key.substring(2));
        res = this.game.map.heros[_mapNum];
      }
      if (props) {
        var _iterator12 = _createForOfIteratorHelper(props),
          _step12;
        try {
          for (_iterator12.s(); !(_step12 = _iterator12.n()).done;) {
            var prop = _step12.value;
            res = res[prop];
          }
        } catch (err) {
          _iterator12.e(err);
        } finally {
          _iterator12.f();
        }
      }
      return res;
    }
  }, {
    key: "addVisual",
    value: function addVisual(cls, kwargs) {
      return this.visuals.add(cls, kwargs);
    }
  }, {
    key: "addNotif",
    value: function addNotif(cls, kwargs) {
      return this.notifs.add(cls, kwargs);
    }
  }, {
    key: "syncHero",
    value: function syncHero(hero) {
      if (hero.removed) {
        delete this.heros[hero.playerId];
        if (hero === this.localHero) this.setLocalHero(null);
      } else {
        this.heros[hero.playerId] = hero;
        if (hero !== this.localHero && hero.playerId === this.game.localPlayerId) this.setLocalHero(hero);
      }
    }
  }, {
    key: "setLocalHero",
    value: function setLocalHero(hero) {
      this.localHero = hero;
    }
  }, {
    key: "update",
    value: function update() {
      this.syncPosSize();
      this.updateWorld();
      this.notifs.update();
    }
  }, {
    key: "syncPosSize",
    value: function syncPosSize() {
      var _this$game$scenesPosS = this.game.scenesPosSizes.game,
        visible = _this$game$scenesPosS.visible,
        x = _this$game$scenesPosS.x,
        y = _this$game$scenesPosS.y,
        viewWidth = _this$game$scenesPosS.viewWidth,
        viewHeight = _this$game$scenesPosS.viewHeight;
      assign(this, {
        visible: visible,
        x: x,
        y: y,
        viewWidth: viewWidth,
        viewHeight: viewHeight
      });
    }
  }, {
    key: "updateWorld",
    value: function updateWorld() {
      var _this34 = this;
      this.constructor.MIXINS.forEach(function (mixin) {
        return mixin.update.call(_this34);
      });
      this.objects.update();
      this.visuals.update();
    }
  }, {
    key: "rand",
    value: function rand(key) {
      var seed = 0;
      for (var i = 0; i < key.length; ++i) {
        seed = (seed << 5) - seed + key.charCodeAt(i);
      }
      seed = seed + this.iteration + this.seed & 0x7FFFFFFF;
      if (seed === 0) seed = 1;
      var a = 1103515245;
      var c = 12345;
      var m = 2147483647;
      seed = (a * seed + c) % m;
      return seed / m;
    }
  }, {
    key: "draw",
    value: function draw() {
      var can = this.canvas;
      can.width = this.viewWidth;
      can.height = this.viewHeight;
      var ctx = can.getContext("2d");
      ctx.reset();
      var drawer = this.graphicsEngine;
      this.drawBackground(drawer);
      this.objects.x = -this.viewX;
      this.objects.y = -this.viewY;
      this.objects.draw(drawer);
      this.visuals.x = -this.viewX;
      this.visuals.y = -this.viewY;
      this.visuals.draw(drawer);
      this.notifs.draw(drawer);
      return can;
    }
  }, {
    key: "drawBackground",
    value: function drawBackground(drawer) {
      drawer.draw(this.getBackgroundGraphicsProps());
    }
  }, {
    key: "getBackgroundGraphicsProps",
    value: function getBackgroundGraphicsProps() {
      var props = this._backgroundGraphicsProps || (this._backgroundGraphicsProps = new GraphicsProps());
      props.color = this.backgroundColor;
      props.x = this.viewWidth / 2;
      props.y = this.viewHeight / 2;
      props.width = this.viewWidth;
      props.height = this.viewHeight;
      props.visibility = this.backgroundAlpha;
      return props;
    }
  }, {
    key: "loadJoypadScene",
    value: function () {
      var _loadJoypadScene = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee13() {
        return _regenerator().w(function (_context13) {
          while (1) switch (_context13.n) {
            case 0:
              return _context13.a(2, null);
          }
        }, _callee13);
      }));
      function loadJoypadScene() {
        return _loadJoypadScene.apply(this, arguments);
      }
      return loadJoypadScene;
    }()
  }, {
    key: "createPauseScene",
    value: function createPauseScene() {
      return null;
    }
  }, {
    key: "getState",
    value: function getState() {
      var _this35 = this;
      var isInitState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var state = {};
      state.key = this.constructor.KEY;
      state.id = this.id;
      if (!isInitState) {
        if (this.mapId) state.map = this.mapId;
        if (this.paused) state.paused = true;
      } else {
        state.width = this.width;
        state.height = this.height;
      }
      this.constructor.STATE_PROPS.forEach(function (prop) {
        return prop.syncStateFromObject(_this35, state);
      });
      this.constructor.MIXINS.forEach(function (mixin) {
        return mixin.syncStateFromObject(_this35, state);
      });
      return state;
    }
  }, {
    key: "setState",
    value: function setState(state) {
      var _this36 = this;
      var isInitState = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      if (!isInitState) {
        this.paused = state.paused === true;
      }
      this.constructor.STATE_PROPS.forEach(function (prop) {
        return prop.syncObjectFromState(state, _this36);
      });
      this.constructor.MIXINS.forEach(function (mixin) {
        return mixin.syncObjectFromState(state, _this36);
      });
    }
  }]);
}(), _applyDecs$c2 = _slicedToArray(_applyDecs(_SceneCommon3, [], _classDecs2).c, 2), _SceneCommon = _applyDecs$c2[0], _initClass2 = _applyDecs$c2[1], _SceneCommon3), _Class2 = /*#__PURE__*/function (_identity3) {
  function _Class2() {
    var _this37;
    _classCallCheck(this, _Class2);
    _this37 = _callSuper(this, _Class2, [_SceneCommon]), _defineProperty(_assertThisInitialized(_this37), "MIXINS", new Map()), _initClass2();
    return _this37;
  }
  _inherits(_Class2, _identity3);
  return _createClass(_Class2);
}(_identity), _defineProperty(_Class2, _SceneCommon2, void 0), _Class2)(); // GAME //////////////////////////
export { _SceneCommon as SceneCommon };
export var GAME_STEP_DEFAULT = 0;
export var GAME_STEP_WAITING = 1;
export var GAME_STEP_GAMING = 2;
export var Game = /*#__PURE__*/function (_GameCommon) {
  function Game(parentEl, catalog, map, playerId, kwargs) {
    var _this38;
    _classCallCheck(this, Game);
    _this38 = _callSuper(this, Game, [parentEl, catalog, map, kwargs]);
    _this38.step = GAME_STEP_DEFAULT;
    _this38.players = {};
    _this38.localPlayerId = playerId;
    _this38.lag = 0;
    _this38.sendPing = kwargs && kwargs.sendPing || null;
    _this38.sendStates = kwargs && kwargs.sendStates || null;
    _this38.sendGameInstruction = kwargs && kwargs.sendGameInstruction || null;
    _this38.onLog = kwargs && kwargs.onLog || null;
    _this38.inputStates = [];
    if (_this38.mode != MODE_LOCAL) {
      _this38.statesToSend = [];
      _this38.receivedStates = [];
      _this38.receivedAppliedStates = [];
    }
    _this38.initKeyListeners();
    if (_this38.isDebugMode) _this38.setDebugSceneVisibility(true);
    _this38.audio = new AudioEngine(_this38);
    return _this38;
  }
  _inherits(Game, _GameCommon);
  return _createClass(Game, [{
    key: "initKeyListeners",
    value: function initKeyListeners() {
      var _this39 = this;
      this.keysPressed = {};
      if (this.mode != MODE_SERVER) {
        var onKey = function onKey(evt, val) {
          if (!_this39.hasFocus()) return;
          _this39.setInputKey(evt.key, val);
          if (val === false && evt.key == "o") _this39.togglePause();
          evt.stopPropagation();
          evt.preventDefault();
        };
        document.addEventListener('keydown', function (evt) {
          return onKey(evt, true);
        });
        document.addEventListener('keyup', function (evt) {
          return onKey(evt, false);
        });
      }
    }
  }, {
    key: "setGameSceneVisibility",
    value: function setGameSceneVisibility(val) {
      if (val == this.gameVisible) return;
      this.gameVisible = val;
      var scn = this.scenes.game;
      if (!scn) return;
      this.syncSize();
    }
  }, {
    key: "loadJoypadScene",
    value: function () {
      var _loadJoypadScene2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee14() {
        var joypadScn;
        return _regenerator().w(function (_context14) {
          while (1) switch (_context14.n) {
            case 0:
              _context14.n = 1;
              return this.scenes.game.loadJoypadScene();
            case 1:
              joypadScn = _context14.v;
              if (joypadScn) this.scenes.joypad = joypadScn;else delete this.scenes.joypad;
            case 2:
              return _context14.a(2);
          }
        }, _callee14, this);
      }));
      function loadJoypadScene() {
        return _loadJoypadScene2.apply(this, arguments);
      }
      return loadJoypadScene;
    }()
  }, {
    key: "loadWaitingScenes",
    value: function () {
      var _loadWaitingScenes = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee15() {
        return _regenerator().w(function (_context15) {
          while (1) switch (_context15.n) {
            case 0:
              _context15.n = 1;
              return this.loadScenes("std:WaitingScene");
            case 1:
              return _context15.a(2);
          }
        }, _callee15, this);
      }));
      function loadWaitingScenes() {
        return _loadWaitingScenes.apply(this, arguments);
      }
      return loadWaitingScenes;
    }()
  }, {
    key: "setDebugSceneVisibility",
    value: function setDebugSceneVisibility(val) {
      if (val) this.debugScene || (this.debugScene = new DebugScene(this));else delete this.debugScene;
      this.syncSize();
    }
  }, {
    key: "syncPauseScenes",
    value: function syncPauseScenes() {
      var _this$scenes8 = this.scenes,
        gameScn = _this$scenes8.game,
        joypadScn = _this$scenes8.joypad;
      if (gameScn.paused) {
        var _this$scenes9, _this$scenes0;
        (_this$scenes9 = this.scenes).pause || (_this$scenes9.pause = gameScn.createPauseScene(this));
        (_this$scenes0 = this.scenes).joypadPause || (_this$scenes0.joypadPause = joypadScn && joypadScn.createPauseScene(this));
      } else {
        delete this.scenes.pause;
        delete this.scenes.joypadPause;
      }
    }
  }, {
    key: "updateGameLoop",
    value: function updateGameLoop() {
      _superPropGet(Game, "updateGameLoop", this, 3)([]);
      var mode = this.mode;
      var updStartTime = now();
      if (this.isDebugMode) this.pushMetric("updateDur", now() - updStartTime, this.fps * 5);
      if (mode != MODE_LOCAL) this.getAndMaySendStates();
      if (this.isDebugMode && mode == MODE_CLIENT) this.maySendPing();
    }
  }, {
    key: "update",
    value: function update() {
      // TODO solve code duplication with GameCommon
      var _this$scenes1 = this.scenes,
        gameScn = _this$scenes1.game,
        joypadScn = _this$scenes1.joypad;
      if (this.mode == MODE_LOCAL) this.updateGame();else this.updateGameApplyingReceivedStates();
      if (joypadScn && !gameScn.paused) joypadScn.update();
      this.syncPauseScenes();
      var _this$scenes10 = this.scenes,
        pauseScn = _this$scenes10.pause,
        joypadPauseScn = _this$scenes10.joypadPause;
      if (pauseScn) pauseScn.update();
      if (joypadPauseScn) joypadPauseScn.update();
      if (this.debugScene) this.debugScene.update();
    }
  }, {
    key: "updateGame",
    value: function updateGame() {
      var scn = this.scenes.game;
      if (scn.paused) return;
      this.iteration += 1;
      this.time = this.iteration * this.dt;
      this.applyInputStates();
      if (scn.visible) scn.update();
    }
  }, {
    key: "applyInputStates",
    value: function applyInputStates() {
      var _iterator13 = _createForOfIteratorHelper(this.inputStates),
        _step13;
      try {
        for (_iterator13.s(); !(_step13 = _iterator13.n()).done;) {
          var inputState = _step13.value;
          var hero = this.scenes.game.getHero(inputState.pid);
          if (hero) hero.setInputState(inputState.is);
        }
      } catch (err) {
        _iterator13.e(err);
      } finally {
        _iterator13.f();
      }
      this.inputStates.length = 0;
    }
  }, {
    key: "updateGameApplyingReceivedStates",
    value: function updateGameApplyingReceivedStates() {
      var receivedStates = this.receivedStates,
        receivedAppliedStates = this.receivedAppliedStates;
      var targetIteration = this.iteration + 1;
      // full state
      var lastReceivedFullState = null;
      for (var i = receivedStates.length - 1; i >= 0; i--) {
        var state = receivedStates[0];
        if (state.t == STATE_TYPE_FULL) {
          lastReceivedFullState = state;
          receivedStates.splice(0, i + 1);
          break;
        }
      }
      if (lastReceivedFullState !== null) {
        this.setState(lastReceivedFullState);
        var newTargetIteration = max(this.iteration, targetIteration - 1);
        if (newTargetIteration != targetIteration) {
          if (this.isDebugMode) this.log("Fix iteration", targetIteration, "=>", newTargetIteration);
          targetIteration = newTargetIteration;
        }
      }
      // other states
      if (this.scenes.game.paused) return;
      while (this.iteration < targetIteration) {
        while (receivedStates.length > 0) {
          var _state = receivedStates[0];
          if (_state.it >= targetIteration) break;
          if (_state.t == STATE_TYPE_INPUT) this.inputStates.push(_state);
          receivedAppliedStates.push(_state);
          receivedStates.shift();
        }
        if (this.iteration < targetIteration) this.updateGame();
      }
    }
  }, {
    key: "draw",
    value: function draw() {
      var drawStartTime = now();
      _superPropGet(Game, "draw", this, 3)([]);
      if (this.isDebugMode) this.pushMetric("drawDur", now() - drawStartTime, this.fps * 5);
      this.drawScene(this.debugScene);
    }
  }, {
    key: "startGame",
    value: function () {
      var _startGame = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee16() {
        return _regenerator().w(function (_context16) {
          while (1) switch (_context16.n) {
            case 0:
              if (!(this.mode == MODE_CLIENT)) {
                _context16.n = 1;
                break;
              }
              return _context16.a(2, this.sendGameInstruction(GAME_INSTR_START));
            case 1:
              if (!(this.scenes.game instanceof GameScene)) {
                _context16.n = 2;
                break;
              }
              return _context16.a(2);
            case 2:
              _context16.n = 3;
              return this.loadGameScenes();
            case 3:
              if (this.mode == MODE_SERVER) this.getAndSendFullState();
            case 4:
              return _context16.a(2);
          }
        }, _callee16, this);
      }));
      function startGame() {
        return _startGame.apply(this, arguments);
      }
      return startGame;
    }()
  }, {
    key: "restartGame",
    value: function () {
      var _restartGame = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee17() {
        return _regenerator().w(function (_context17) {
          while (1) switch (_context17.n) {
            case 0:
              if (!(this.mode == MODE_CLIENT)) {
                _context17.n = 1;
                break;
              }
              return _context17.a(2, this.sendGameInstruction(GAME_INSTR_RESTART));
            case 1:
              if (this.scenes.game instanceof GameScene) {
                _context17.n = 2;
                break;
              }
              return _context17.a(2);
            case 2:
              _context17.n = 3;
              return this.loadGameScenes();
            case 3:
              if (this.mode == MODE_SERVER) this.getAndSendFullState();
            case 4:
              return _context17.a(2);
          }
        }, _callee17, this);
      }));
      function restartGame() {
        return _restartGame.apply(this, arguments);
      }
      return restartGame;
    }()
  }, {
    key: "addPlayer",
    value: function addPlayer(playerId, kwargs) {
      var gameScn = this.scenes.game;
      if (this.players[playerId] === undefined) {
        if (this.map.heros.length > 0) kwargs.heroKey = "H#0"; // TODO: impl hero selection
        this.players[playerId] = kwargs;
      }
      if (gameScn.addHero) gameScn.addHero(playerId);
      if (this.mode == MODE_SERVER) this.getAndSendFullState();
    }
  }, {
    key: "rmPlayer",
    value: function rmPlayer(playerId) {
      var player = this.players[playerId];
      if (!player) return;
      var gameScn = this.scenes.game;
      if (gameScn.rmHero) gameScn.rmHero(playerId);
      delete this.players[playerId];
    }
  }, {
    key: "getFirstPlayerId",
    value: function getFirstPlayerId() {
      var firstPlayerId = null,
        firstPlayer = null;
      var players = this.players;
      for (var playerId in players) {
        var player = players[playerId];
        if (firstPlayerId === null || player.num < firstPlayer.num) {
          firstPlayerId = playerId;
          firstPlayer = player;
        }
      }
      return firstPlayerId;
    }
  }, {
    key: "isKeyPressed",
    value: function isKeyPressed(key) {
      return this.keysPressed[key];
    }
  }, {
    key: "setInputKey",
    value: function setInputKey(key, val) {
      if (Boolean(this.keysPressed[key]) === val) return;
      this.keysPressed[key] = val;
      this.getAndMayPushLocalHeroInputState();
    }
  }, {
    key: "getAndMayPushLocalHeroInputState",
    value: function getAndMayPushLocalHeroInputState() {
      var _this40 = this;
      var gameScn = this.scenes.game;
      if (!gameScn.getHero) return;
      var localHero = gameScn.getHero(this.localPlayerId);
      if (!localHero) return;
      var inputState = localHero.getInputState();
      if (!inputState || !hasKeys(inputState)) inputState = null;
      var inputStateWiIt = {
        t: STATE_TYPE_INPUT,
        pid: this.localPlayerId,
        it: this.iteration,
        is: inputState
      };
      if (this.mode != MODE_CLIENT) {
        this.inputStates.push(inputStateWiIt);
      } else {
        this.statesToSend.push(inputStateWiIt);
        this._inputStateSendCount || (this._inputStateSendCount = 0);
        var inputStateSendCount = this._inputStateSendCount += 1;
        if (inputState) setTimeout(function () {
          if (_this40._inputStateSendCount != inputStateSendCount) return;
          _this40.getAndMayPushLocalHeroInputState();
        }, RESEND_INPUT_STATE_PERIOD * 1000);
      }
    }
  }, {
    key: "maySendPing",
    value: function maySendPing() {
      this.pingLastTime || (this.pingLastTime = -SEND_PING_PERIOD);
      this.waitingPing || (this.waitingPing = false);
      var nowS = now();
      if (!this.waitingPing && nowS > this.pingLastTime + SEND_PING_PERIOD) {
        this.sendPing();
        this.pingLastTime = nowS;
        this.waitingPing = true;
      }
    }
  }, {
    key: "receivePing",
    value: function receivePing() {
      this.pushMetric("lag", now() - this.pingLastTime, 5);
      this.waitingPing = false;
    }
  }, {
    key: "getState",
    value: function getState() {
      var state = {
        t: STATE_TYPE_FULL
      };
      state.it = this.iteration;
      state.step = this.step;
      state.players = this.players;
      var gameScn = this.scenes.game;
      state.game = gameScn.getState();
      return state;
    }
  }, {
    key: "setState",
    value: function () {
      var _setState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee18(state) {
        var gameScn, gameState, scnId, scnMapId, scnMapKey;
        return _regenerator().w(function (_context18) {
          while (1) switch (_context18.n) {
            case 0:
              this.iteration = state.it;
              this.step = state.step;
              this.players = state.players;
              gameScn = this.scenes.game, gameState = state.game;
              scnId = gameState.id, scnMapId = gameState.map, scnMapKey = gameState.key;
              if (!(gameScn.id != scnId || gameScn.mapId != scnMapId || gameScn.constructor.KEY != scnMapKey)) {
                _context18.n = 2;
                break;
              }
              _context18.n = 1;
              return this.loadScenesFromMap(scnMapKey, scnMapId, scnId);
            case 1:
              gameScn = this.scenes.game;
            case 2:
              gameScn.setState(gameState);
            case 3:
              return _context18.a(2);
          }
        }, _callee18, this);
      }));
      function setState(_x1) {
        return _setState.apply(this, arguments);
      }
      return setState;
    }() // server only
  }, {
    key: "getAndMaySendStates",
    value: function getAndMaySendStates() {
      var receivedAppliedStates = this.receivedAppliedStates,
        statesToSend = this.statesToSend;
      if (this.mode == MODE_SERVER) {
        // full state
        this._lastSendFullStateTime || (this._lastSendFullStateTime = -Infinity);
        if (this.time > this._lastSendFullStateTime + SEND_STATE_PERIOD) {
          this.getAndSendFullState();
        }
        // forward
        while (receivedAppliedStates.length > 0) {
          statesToSend.push.apply(statesToSend, _toConsumableArray(receivedAppliedStates));
          receivedAppliedStates.length = 0;
        }
      }
      if (statesToSend.length > 0) {
        if (this.isDebugMode) this.log("sendStates", statesToSend);
        this.sendStates(pack(statesToSend));
        statesToSend.length = 0;
      }
    }
  }, {
    key: "getAndSendFullState",
    value: function getAndSendFullState() {
      var state = this.getState();
      this.statesToSend.length = 0;
      this.statesToSend.push(state);
      this._lastSendFullStateTime = this.time;
    }
  }, {
    key: "receiveStatesFromPlayer",
    value: function receiveStatesFromPlayer(playerId, statesBin) {
      var states = unpack(statesBin);
      if (this.isDebugMode) this.log("receiveStatesFromPlayer", playerId, states);
      var _iterator14 = _createForOfIteratorHelper(states),
        _step14;
      try {
        for (_iterator14.s(); !(_step14 = _iterator14.n()).done;) {
          var state = _step14.value;
          if (state.pid != playerId) continue;
          if (state.t == STATE_TYPE_INPUT) this.handleInputStateFromPlayer(state);
          this.addReceivedState(state);
        }
      } catch (err) {
        _iterator14.e(err);
      } finally {
        _iterator14.f();
      }
    }
  }, {
    key: "handleInputStateFromPlayer",
    value: function handleInputStateFromPlayer(inputStateWiIt) {
      var _this41 = this;
      // fix iteration
      var receivedInputStatePrevDit = this._receivedInputStatePrevDit || (this._receivedInputStatePrevDit = {});
      var playerId = inputStateWiIt.pid,
        clientIt = inputStateWiIt.it,
        prevDit = receivedInputStatePrevDit[playerId] || 0;
      inputStateWiIt.it = this.iteration;
      if (prevDit !== 0) inputStateWiIt.it = max(inputStateWiIt.it, clientIt + prevDit);
      if (inputStateWiIt.is) receivedInputStatePrevDit[playerId] = max(prevDit, this.iteration - clientIt);else delete receivedInputStatePrevDit[playerId];
      // schedule input state stop
      this._lastReceivedInputStateCount || (this._lastReceivedInputStateCount = 0);
      var lastReceivedInputStateCount = this._lastReceivedInputStateCount += 1;
      if (inputStateWiIt.is) setTimeout(function () {
        if (lastReceivedInputStateCount != _this41._lastReceivedInputStateCount) return;
        _this41.addReceivedState({
          t: STATE_TYPE_INPUT,
          pid: inputStateWiIt.pid,
          it: _this41.iteration,
          is: null
        });
      }, RESEND_INPUT_STATE_PERIOD * 2 * 1000);
    }
  }, {
    key: "receiveStatesFromLeader",
    value: function receiveStatesFromLeader(statesBin) {
      var _this42 = this;
      var receivedStates = this.receivedStates;
      this._lastFullStateIt || (this._lastFullStateIt = 0);
      var states = unpack(statesBin);
      if (this.isDebugMode) this.log("receiveStatesFromLeader", states);
      var _iterator15 = _createForOfIteratorHelper(states),
        _step15;
      try {
        for (_iterator15.s(); !(_step15 = _iterator15.n()).done;) {
          var state = _step15.value;
          this.addReceivedState(state);
          if (state.t == STATE_TYPE_FULL) {
            this._lastFullStateIt = state.it;
            var _iterator16 = _createForOfIteratorHelper(this.receivedAppliedStates),
              _step16;
            try {
              for (_iterator16.s(); !(_step16 = _iterator16.n()).done;) {
                var state2 = _step16.value;
                this.addReceivedState(state2);
              }
            } catch (err) {
              _iterator16.e(err);
            } finally {
              _iterator16.f();
            }
            this.receivedAppliedStates.length = 0;
          }
        }
      } catch (err) {
        _iterator15.e(err);
      } finally {
        _iterator15.f();
      }
      receivedStates.splice(0, receivedStates.findLastIndex(function (s) {
        return s.it < _this42._lastFullStateIt;
      }) + 1);
    }
  }, {
    key: "addReceivedState",
    value: function addReceivedState(state) {
      var receivedStates = this.receivedStates;
      receivedStates.push(state);
      var getOrder = function getOrder(s) {
        return s.it + (s.t == STATE_TYPE_INPUT ? .5 : 0);
      };
      if (receivedStates.length >= 2) receivedStates.sort(function (a, b) {
        return getOrder(a) - getOrder(b);
      });
    }
  }, {
    key: "initQrcodeImg",
    value: function () {
      var _initQrcodeImg = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee19() {
        var qrcodeImg, wrapperEl, url;
        return _regenerator().w(function (_context19) {
          while (1) switch (_context19.n) {
            case 0:
              if (!IS_SERVER_ENV) {
                _context19.n = 1;
                break;
              }
              return _context19.a(2);
            case 1:
              qrcodeImg = this.qrcodeImg;
              if (qrcodeImg) {
                _context19.n = 3;
                break;
              }
              _context19.n = 2;
              return importJs('../static/deps/qrcode.min.js');
            case 2:
              wrapperEl = document.createElement("div");
              url = URL.parse(window.location);
              url.searchParams.set("game", "0");
              url.searchParams.set("joypad", "1");
              new QRCode(wrapperEl, {
                text: url.toString(),
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
              });
              qrcodeImg = this.qrcodeImg = wrapperEl.children[0];
            case 3:
              return _context19.a(2, qrcodeImg);
          }
        }, _callee19, this);
      }));
      function initQrcodeImg() {
        return _initQrcodeImg.apply(this, arguments);
      }
      return initQrcodeImg;
    }()
  }]);
}(GameCommon);
export var DefaultScene = /*#__PURE__*/function (_SceneCommon4) {
  function DefaultScene() {
    _classCallCheck(this, DefaultScene);
    return _callSuper(this, DefaultScene, arguments);
  }
  _inherits(DefaultScene, _SceneCommon4);
  return _createClass(DefaultScene, [{
    key: "buildBackground",
    value: function buildBackground() {
      var viewWidth = this.viewWidth,
        viewHeight = this.viewHeight;
      var can = document.createElement("canvas");
      assign(can, {
        width: viewWidth,
        height: viewHeight
      });
      var ctx = can.getContext("2d");
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, viewWidth, viewHeight);
      var text = newTextCanvas("DRAWMYGAME", {
        fillStyle: "white"
      });
      ctx.drawImage(text, floor((viewWidth - text.width) / 2), floor((viewHeight - text.height) / 2));
      return can;
    }
  }]);
}(_SceneCommon);
export var GameScene = /*#__PURE__*/function (_SceneCommon5) {
  function GameScene() {
    _classCallCheck(this, GameScene);
    return _callSuper(this, GameScene, arguments);
  }
  _inherits(GameScene, _SceneCommon5);
  return _createClass(GameScene, [{
    key: "init",
    value: function init(kwargs) {
      _superPropGet(GameScene, "init", this, 3)([kwargs]);
      this.step = "GAME";
      this.herosSpawnX = 50;
      this.herosSpawnY = 50;
      this.scores = new Map();
      this.seed = floor(random() * 1000);
    }
  }, {
    key: "isPausable",
    value: function isPausable() {
      return true;
    }
  }, {
    key: "loadMap",
    value: function loadMap(scnMapId) {
      _superPropGet(GameScene, "loadMap", this, 3)([scnMapId]);
      this.initHeros();
      this.physics = new PhysicsEngine(this);
    }
  }, {
    key: "initHeros",
    value: function initHeros() {
      this.initHerosSpawnPos();
      if (this.game.mode == MODE_CLIENT) return; // objects are init by first full state
      for (var playerId in this.game.players) this.addHero(playerId);
    }
  }, {
    key: "addHero",
    value: function addHero(playerId) {
      var player = this.game.players[playerId];
      if (!player) return;
      var prevHero = this.getHero(playerId);
      if (prevHero && !prevHero.removed) return;
      var heroKey = player.heroKey;
      if (!heroKey) return;
      var hero = this.addObject(heroKey, {
        playerId: playerId
      });
      this.spawnHero(hero);
      return hero;
    }
  }, {
    key: "getHero",
    value: function getHero(playerId) {
      return this.heros[playerId];
    }
  }, {
    key: "getFirstHero",
    value: function getFirstHero() {
      var firstPlayerId = this.game.getFirstPlayerId();
      if (firstPlayerId === null) return null;
      return this.heros[firstPlayerId];
    }
  }, {
    key: "rmHero",
    value: function rmHero(playerId) {
      var hero = this.getHero(playerId);
      if (hero) hero.remove();
    }
  }, {
    key: "spawnHero",
    value: function spawnHero(hero) {
      hero.spawn(this.herosSpawnX, this.herosSpawnY);
    }
  }, {
    key: "incrScore",
    value: function incrScore(playerId, val) {
      var scores = this.scores;
      scores.set(playerId, (scores.get(playerId) ?? 0) + val);
    }
  }, {
    key: "update",
    value: function update() {
      var step = this.step;
      this.iteration += 1;
      this.time = this.iteration * this.game.dt;
      if (step == "GAME") this.updateStepGame();else if (step == "GAMEOVER") this.updateStepGameOver();else if (step == "VICTORY") this.updateStepVictory();
      this.notifs.update();
    }
  }, {
    key: "updateWorld",
    value: function updateWorld() {
      var dt = this.game.dt;
      this.physics.apply(dt, this.objects);
      _superPropGet(GameScene, "updateWorld", this, 3)([]);
    }
  }, {
    key: "updateStepGame",
    value: function updateStepGame() {
      this.updateWorld();
    }
  }, {
    key: "updateStepGameOver",
    value: function updateStepGameOver() {
      this.updateWorld();
      this.initGameOverNotifs();
    }
  }, {
    key: "updateStepVictory",
    value: function updateStepVictory() {
      this.initVictoryNotifs();
    }
  }, {
    key: "draw",
    value: function draw() {
      var res = _superPropGet(GameScene, "draw", this, 3)([]);
      var drawer = this.graphicsEngine;
      this.notifs.draw(drawer);
      if (this.step == "VICTORY" && this.victoryNotifs) this.victoryNotifs.draw(drawer);
      if (this.step == "GAMEOVER" && this.gameOverNotifs) this.gameOverNotifs.draw(drawer);
      return res;
    }
  }, {
    key: "filterObjects",
    value: function filterObjects(key, filter) {
      var objsCache = this._filteredObjectsCache || (this._filteredObjectsCache = new Map());
      if (objsCache.iteration !== this.iteration) {
        objsCache.clear();
        objsCache.iteration = this.iteration;
      }
      if (!objsCache.has(key)) {
        var cache = [];
        this.objects.forEach(function (obj) {
          if (filter(obj)) cache.push(obj);
        });
        objsCache.set(key, cache);
      }
      return objsCache.get(key);
    }
  }, {
    key: "initVictoryNotifs",
    value: function initVictoryNotifs() {
      if (this.victoryNotifs) return;
      this.victoryNotifs = new GameObjectGroup(this);
      this.victoryNotifs.add(CenteredText, {
        text: "VICTORY !",
        font: "100px serif"
      });
    }
  }, {
    key: "initGameOverNotifs",
    value: function initGameOverNotifs() {
      if (this.gameOverNotifs) return;
      this.gameOverNotifs = new GameObjectGroup(this);
      this.gameOverNotifs.add(CenteredText, {
        text: "GAME OVER",
        font: "100px serif"
      });
    }
  }, {
    key: "initHerosSpawnPos",
    value: function initHerosSpawnPos() {}
  }, {
    key: "setHerosSpawnPos",
    value: function setHerosSpawnPos(x, y) {
      this.herosSpawnX = floor(x);
      this.herosSpawnY = floor(y);
    }
  }, {
    key: "getState",
    value: function getState() {
      var isInitState = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var state = _superPropGet(GameScene, "getState", this, 3)([isInitState]);
      if (isInitState) {
        state.width = this.width;
        state.height = this.height;
      } else {
        state.it = this.iteration;
        state.step = this.step;
        state.hsx = this.herosSpawnX;
        state.hsy = this.herosSpawnY;
        state.sco = {};
        this.scores.forEach(function (val, pid) {
          return state.sco[pid] = floor(val);
        });
        state.seed = this.seed;
      }
      state.objects = this.objects.getState(isInitState);
      if (isInitState) state.links = this.getObjectLinksState();
      return state;
    }
  }, {
    key: "getObjectLinksState",
    value: function getObjectLinksState() {
      var res = [];
      this.objects.forEach(function (obj) {
        var linksState = obj.getObjectLinksState();
        if (linksState) {
          var _iterator17 = _createForOfIteratorHelper(linksState),
            _step17;
          try {
            for (_iterator17.s(); !(_step17 = _iterator17.n()).done;) {
              var linkState = _step17.value;
              res.push(linkState);
            }
          } catch (err) {
            _iterator17.e(err);
          } finally {
            _iterator17.f();
          }
        }
      });
      return res;
    }
  }, {
    key: "setState",
    value: function setState(state) {
      var isInitState = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      _superPropGet(GameScene, "setState", this, 3)([state, isInitState]);
      if (!isInitState) {
        this.iteration = state.it;
        this.step = state.step;
        this.setHerosSpawnPos(state.hsx, state.hsy);
        this.scores.clear();
        for (var pid in state.sco) this.scores.set(pid, state.sco[pid]);
        this.seed = state.seed;
      }
      this.objects.setState(state.objects, isInitState);
      if (isInitState) this.setObjectLinksFromState(state.links);
    }
  }, {
    key: "setObjectLinksFromState",
    value: function setObjectLinksFromState(state) {
      if (!state) return;
      var _iterator18 = _createForOfIteratorHelper(state),
        _step18;
      try {
        for (_iterator18.s(); !(_step18 = _iterator18.n()).done;) {
          var linkState = _step18.value;
          var actionObjId = linkState[0];
          var actionObj = this.objects.get(actionObjId);
          actionObj.addObjectLinkFromState(linkState);
        }
      } catch (err) {
        _iterator18.e(err);
      } finally {
        _iterator18.f();
      }
    }
  }, {
    key: "createPauseScene",
    value: function createPauseScene() {
      return new PauseScene(this.game);
    }
  }]);
}(_SceneCommon);

// MIXIN ///////////////////////////////

export var Mixin = /*#__PURE__*/function () {
  function Mixin(kwargs) {
    _classCallCheck(this, Mixin);
    this.initKwargs = kwargs;
  }
  return _createClass(Mixin, [{
    key: "initClass",
    value: function initClass(cls, kwargs) {
      if (!cls.hasOwnProperty('MIXINS')) cls.MIXINS = new Map(cls.MIXINS);
      cls.MIXINS.set(this.constructor.KEY, this);
      this.constructor.TARGET_DECORATORS.forEach(function (deco) {
        var _deco = _slicedToArray(deco, 3),
          decoCls = _deco[0],
          funcName = _deco[1],
          args = _deco[2];
        decoCls[funcName].apply(decoCls, _toConsumableArray(args))(cls, kwargs);
      });
    }
  }, {
    key: "init",
    value: function init(kwargs) {}
  }, {
    key: "update",
    value: function update() {}
  }, {
    key: "syncStateFromObject",
    value: function syncStateFromObject(obj, state) {} // TODO: useful ?
  }, {
    key: "syncObjectFromState",
    value: function syncObjectFromState(state, obj) {}
  }], [{
    key: "addTargetDecorator",
    value: function addTargetDecorator(cls, funcName) {
      if (!this.hasOwnProperty('TARGET_DECORATORS')) this.TARGET_DECORATORS = _toConsumableArray(this.TARGET_DECORATORS);
      for (var _len2 = arguments.length, args = new Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
        args[_key2 - 2] = arguments[_key2];
      }
      this.TARGET_DECORATORS.push([cls, funcName, args]);
    }
  }, {
    key: "add",
    value: function add(kwargs) {
      var _this43 = this;
      return function (target) {
        if (target.IS_MIXIN) {
          target.addTargetDecorator(_this43, "add", kwargs);
          return target;
        }
        var mixin = new _this43(kwargs);
        mixin.initClass(target, mixin.initKwargs);
        return target;
      };
    }
  }, {
    key: "modify",
    value: function modify(kwargs) {
      var _this44 = this;
      return function (target) {
        if (target.IS_MIXIN) {
          target.addTargetDecorator(_this44, "modify", kwargs);
          return target;
        }
        var key = _this44.KEY;
        if (!target.MIXINS || !target.MIXINS.has(key)) throw Error("Mixin \"".concat(key, "\" does not exist in ").concat(target.name));
        var parentMixin = target.MIXINS.get(key);
        var mixin = new _this44(_objectSpread(_objectSpread({}, parentMixin.initKwargs), kwargs));
        mixin.initClass(target, mixin.initKwargs);
        return target;
      };
    }
  }, {
    key: "addIfAbsent",
    value: function addIfAbsent(kwargs) {
      var _this45 = this;
      return function (target) {
        if (target.IS_MIXIN) {
          target.addTargetDecorator(_this45, "addIfAbsent", kwargs);
          return target;
        }
        var key = _this45.KEY;
        var parentMixin = target.MIXINS && target.MIXINS.has(key);
        if (parentMixin) _this45.modify(kwargs)(target);else _this45.add(kwargs)(target);
      };
    }
  }, {
    key: "delete",
    value: function _delete() {
      var _this46 = this;
      return function (target) {
        if (target.IS_MIXIN) {
          target.addTargetDecorator(_this46, "delete");
          return target;
        }
        if (!target.hasOwnProperty('MIXINS')) target.MIXINS = new Map(target.MIXINS);
        target.MIXINS["delete"](_this46.KEY);
      };
    }
  }]);
}();
_defineProperty(Mixin, "IS_MIXIN", true);
_defineProperty(Mixin, "TARGET_DECORATORS", []);
_classDecs3 = [LinkReaction.add("reactToggle", {
  label: "Toggle",
  isDefault: true
}), StateBool.define("activated", {
  showInBuilder: true,
  "default": true
})];
var _ActivableMixin;
new (_ActivableMixin2 = (_ActivableMixin3 = /*#__PURE__*/function (_Mixin) {
  function ActivableMixin() {
    _classCallCheck(this, ActivableMixin);
    return _callSuper(this, ActivableMixin, arguments);
  }
  _inherits(ActivableMixin, _Mixin);
  return _createClass(ActivableMixin, [{
    key: "initClass",
    value: function initClass(cls, kwargs) {
      _superPropGet(ActivableMixin, "initClass", this, 3)([cls, kwargs]);
      var proto = cls.prototype;
      proto.origActivated = true;
      proto.reactToggle = this.reactToggle;
    }
  }, {
    key: "init",
    value: function init(kwargs) {
      _superPropGet(ActivableMixin, "init", this, 3)([kwargs]);
      this.origActivated = this.activated;
    }
  }, {
    key: "reactToggle",
    value: function reactToggle(resp) {
      this.activated = resp.value >= .5 ? !this.origActivated : this.origActivated;
    }
  }]);
}(Mixin), _applyDecs$c3 = _slicedToArray(_applyDecs(_ActivableMixin3, [], _classDecs3, 0, void 0, Mixin).c, 2), _ActivableMixin = _applyDecs$c3[0], _initClass3 = _applyDecs$c3[1], _ActivableMixin3), _Class3 = /*#__PURE__*/function (_identity4) {
  function _Class3() {
    var _this47;
    _classCallCheck(this, _Class3);
    _this47 = _callSuper(this, _Class3, [_ActivableMixin]), _defineProperty(_assertThisInitialized(_this47), "KEY", "activable"), _initClass3();
    return _this47;
  }
  _inherits(_Class3, _identity4);
  return _createClass(_Class3);
}(_identity), _defineProperty(_Class3, _ActivableMixin2, void 0), _Class3)();
export { _ActivableMixin as ActivableMixin };
export var BodyMixin = /*#__PURE__*/function (_Mixin2) {
  function BodyMixin() {
    _classCallCheck(this, BodyMixin);
    return _callSuper(this, BodyMixin, arguments);
  }
  _inherits(BodyMixin, _Mixin2);
  return _createClass(BodyMixin, [{
    key: "initClass",
    value: function initClass(cls, kwargs) {
      _superPropGet(BodyMixin, "initClass", this, 3)([cls, kwargs]);
      var proto = cls.prototype;
      proto.shape = kwargs?.shape ?? "box";
      proto.width = kwargs?.width ?? 50;
      proto.height = kwargs?.height ?? 50;
      proto.radius = kwargs?.radius ?? 50;
      proto.getBodyPolygon || (proto.getBodyPolygon = this.getBodyPolygon);
    }
  }, {
    key: "getBodyPolygon",
    value: function getBodyPolygon() {
      var pol = this._bodyPolygons || (this._bodyPolygons = []);
      pol.length = 0;
      if (this.shape == "box") {
        var x = this.x,
          y = this.y,
          width = this.width,
          height = this.height;
        var hWidth = width / 2,
          hHeight = height / 2;
        var xMin = x - hWidth,
          yMin = y - hHeight,
          xMax = x + hWidth,
          yMax = y + hHeight;
        pol.push(xMin, yMin, xMax, yMin, xMax, yMax, xMin, yMax);
      }
      return pol;
    }
  }]);
}(Mixin);
_defineProperty(BodyMixin, "KEY", "body");
_classDecs4 = [BodyMixin.addIfAbsent()];
var _HitMixin;
new (_HitMixin2 = (_HitMixin3 = /*#__PURE__*/function (_Mixin3) {
  function HitMixin() {
    _classCallCheck(this, HitMixin);
    return _callSuper(this, HitMixin, arguments);
  }
  _inherits(HitMixin, _Mixin3);
  return _createClass(HitMixin, [{
    key: "initClass",
    value: function initClass(cls, kwargs) {
      _superPropGet(HitMixin, "initClass", this, 3)([cls, kwargs]);
      var proto = cls.prototype;
      proto.canHitGroup || (proto.canHitGroup = function (group) {
        return false;
      });
      proto.canBeHitAsGroup || (proto.canBeHitAsGroup = function (group) {
        return false;
      });
      proto.canHitObject || (proto.canHitObject = function (obj) {
        return false;
      });
      proto.hit || (proto.hit = function (obj, details) {});
      proto.getHitProps || (proto.getHitProps = this.getHitProps);
    }
  }, {
    key: "getHitProps",
    value: function getHitProps(dt) {
      var props = this._hitProps || (this._hitProps = {});
      props.polygon = this.getBodyPolygon();
      props.dx = (this.speedX ?? 0) * dt;
      props.dy = (this.speedY ?? 0) * dt;
      props.uniDirX = props.uniDirY = null;
      return props;
    }
  }]);
}(Mixin), _applyDecs$c4 = _slicedToArray(_applyDecs(_HitMixin3, [], _classDecs4, 0, void 0, Mixin).c, 2), _HitMixin = _applyDecs$c4[0], _initClass4 = _applyDecs$c4[1], _HitMixin3), _Class4 = /*#__PURE__*/function (_identity5) {
  function _Class4() {
    var _this48;
    _classCallCheck(this, _Class4);
    _this48 = _callSuper(this, _Class4, [_HitMixin]), _defineProperty(_assertThisInitialized(_this48), "KEY", "hit"), _initClass4();
    return _this48;
  }
  _inherits(_Class4, _identity5);
  return _createClass(_Class4);
}(_identity), _defineProperty(_Class4, _HitMixin2, void 0), _Class4)();
export { _HitMixin as HitMixin };
_classDecs5 = [StateNumber.define("speedY"), StateNumber.define("speedX"), _HitMixin.addIfAbsent(), BodyMixin.addIfAbsent()];
var _PhysicsMixin;
new (_PhysicsMixin2 = (_PhysicsMixin3 = /*#__PURE__*/function (_Mixin4) {
  function PhysicsMixin() {
    _classCallCheck(this, PhysicsMixin);
    return _callSuper(this, PhysicsMixin, arguments);
  }
  _inherits(PhysicsMixin, _Mixin4);
  return _createClass(PhysicsMixin, [{
    key: "initClass",
    value: function initClass(cls, kwargs) {
      _superPropGet(PhysicsMixin, "initClass", this, 3)([cls, kwargs]);
      var proto = cls.prototype;
      proto.canMove = kwargs?.canMove ?? true;
      proto.affectedByGravity = kwargs?.affectedByGravity ?? proto.canMove;
      proto.canBlock = kwargs?.canBlock ?? false;
      proto.canGetBlocked = kwargs?.canGetBlocked ?? proto.canMove;
      proto.checkBlockAnyway = kwargs?.checkBlockAnyway ?? false;
      proto.checkGetBlockedAnyway = kwargs?.checkGetBlockedAnyway ?? false;
      proto.physicsBounciness = kwargs?.physicsBounciness ?? 0;
      proto.physicsStaticFriction = kwargs?.physicsStaticFriction ?? Infinity;
      proto.physicsDynamicFriction = kwargs?.physicsDynamicFriction ?? Infinity;
      proto.onBlock || (proto.onBlock = function (obj, details) {});
      proto.onGetBlocked || (proto.onGetBlocked = function (obj, details) {});
      var origCanHitGroup = proto.canHitGroup;
      proto.canHitGroup = function (group) {
        if (group == "physics" && (this.canBlock || this.checkBlockAnyway)) return true;
        return origCanHitGroup.call(this, group);
      };
      var origCanBeHitAsGroup = proto.canBeHitAsGroup;
      proto.canBeHitAsGroup = function (group) {
        if (group == "physics" && (this.canGetBlocked || this.checkGetBlockedAnyway)) return true;
        return origCanBeHitAsGroup.call(this, group);
      };
      proto.canReallyBlockObject = function (obj) {
        return (this.canBlock || this.checkBlockAnyway) && (obj.canGetBlocked || obj.checkGetBlockedAnyway) && !(this.canBlock && obj.canGetBlocked) // in this case the check is already done by physics engine
        ;
      };
      var origCanHitObject = proto.canHitObject;
      proto.canHitObject = function (obj) {
        return this.canReallyBlockObject(obj) || origCanHitObject.call(this, obj);
      };
      var origHit = proto.hit;
      proto.hit = function (obj, details) {
        origHit.call(this, obj, details);
        if ((this.canBlock || this.checkBlockAnyway) && obj.canGetBlocked) this.onBlock(obj, details);
        if ((obj.canGetBlocked || obj.checkGetBlockedAnyway) && this.canBlock) obj.onGetBlocked(this, details);
      };
    }
  }, {
    key: "init",
    value: function init(kwargs) {
      _superPropGet(PhysicsMixin, "init", this, 3)([kwargs]);
      if (kwargs?.speedX !== undefined) this.speedX = kwargs.speedX;
      if (kwargs?.speedY !== undefined) this.speedY = kwargs.speedY;
    }
  }, {
    key: "update",
    value: function update() {
      // done by physics engine
    }
  }]);
}(Mixin), _applyDecs$c5 = _slicedToArray(_applyDecs(_PhysicsMixin3, [], _classDecs5, 0, void 0, Mixin).c, 2), _PhysicsMixin = _applyDecs$c5[0], _initClass5 = _applyDecs$c5[1], _PhysicsMixin3), _Class5 = /*#__PURE__*/function (_identity6) {
  function _Class5() {
    var _this49;
    _classCallCheck(this, _Class5);
    _this49 = _callSuper(this, _Class5, [_PhysicsMixin]), _defineProperty(_assertThisInitialized(_this49), "KEY", "physics"), _initClass5();
    return _this49;
  }
  _inherits(_Class5, _identity6);
  return _createClass(_Class5);
}(_identity), _defineProperty(_Class5, _PhysicsMixin2, void 0), _Class5)();
export { _PhysicsMixin as PhysicsMixin };
_classDecs6 = [StateObjectRef.define("owner")];
var _OwnerableMixin;
new (_OwnerableMixin2 = (_OwnerableMixin3 = /*#__PURE__*/function (_Mixin5) {
  function OwnerableMixin() {
    _classCallCheck(this, OwnerableMixin);
    return _callSuper(this, OwnerableMixin, arguments);
  }
  _inherits(OwnerableMixin, _Mixin5);
  return _createClass(OwnerableMixin, [{
    key: "initClass",
    value: function initClass(cls, kwargs) {
      _superPropGet(OwnerableMixin, "initClass", this, 3)([cls, kwargs]);
      var proto = cls.prototype;
      proto.removedWithOwner = kwargs?.removedWithOwner ?? true;
    }
  }, {
    key: "init",
    value: function init(kwargs) {
      _superPropGet(OwnerableMixin, "init", this, 3)([kwargs]);
      this.owner = kwargs?.owner ?? null;
    }
  }, {
    key: "update",
    value: function update() {
      _superPropGet(OwnerableMixin, "update", this, 3)([]);
      var owner = this.owner;
      if (owner && owner.removed) {
        this.owner = null;
        if (this.removedWithOwner) this.remove();
      }
    }
  }]);
}(Mixin), _applyDecs$c6 = _slicedToArray(_applyDecs(_OwnerableMixin3, [], _classDecs6, 0, void 0, Mixin).c, 2), _OwnerableMixin = _applyDecs$c6[0], _initClass6 = _applyDecs$c6[1], _OwnerableMixin3), _Class6 = /*#__PURE__*/function (_identity7) {
  function _Class6() {
    var _this50;
    _classCallCheck(this, _Class6);
    _this50 = _callSuper(this, _Class6, [_OwnerableMixin]), _defineProperty(_assertThisInitialized(_this50), "KEY", "ownerable"), _initClass6();
    return _this50;
  }
  _inherits(_Class6, _identity7);
  return _createClass(_Class6);
}(_identity), _defineProperty(_Class6, _OwnerableMixin2, void 0), _Class6)();
export { _OwnerableMixin as OwnerableMixin };
var AttackProps = /*#__PURE__*/_createClass(function AttackProps(attacker, kwargs) {
  _classCallCheck(this, AttackProps);
  this.attacker = attacker;
  assign(this, kwargs);
});
_AttackProps = AttackProps;
assign(_AttackProps.prototype, {
  damages: 0,
  knockback: 0,
  knockbackAngle: 0
});
_classDecs7 = [_HitMixin.addIfAbsent(), StateNumber.define("damages"), StateProperty.define("attackAges")];
var _AttackMixin;
new (_AttackMixin2 = (_AttackMixin3 = /*#__PURE__*/function (_Mixin6) {
  function AttackMixin() {
    _classCallCheck(this, AttackMixin);
    return _callSuper(this, AttackMixin, arguments);
  }
  _inherits(AttackMixin, _Mixin6);
  return _createClass(AttackMixin, [{
    key: "initClass",
    value: function initClass(cls, kwargs) {
      _superPropGet(AttackMixin, "initClass", this, 3)([cls, kwargs]);
      var proto = cls.prototype;
      proto.canAttack = kwargs?.canAttack ?? true;
      proto.canGetAttacked = kwargs?.canGetAttacked ?? true;
      proto.maxHealth = kwargs?.maxHealth ?? 100;
      proto.attackDamages = kwargs?.attackDamages ?? 0;
      proto.attackKnockback = kwargs?.attackKnockback ?? 0;
      proto.attackPeriod = kwargs?.attackPeriod ?? 1;
      proto.getDamagedAge = Infinity;
      var origCanHitGroup = proto.canHitGroup;
      proto.canHitGroup = function (group) {
        if (group == "health" && this.canAttack) return true;
        return origCanHitGroup.call(this, group);
      };
      var origCanBeHitAsGroup = proto.canBeHitAsGroup;
      proto.canBeHitAsGroup = function (group) {
        if (group == "health" && this.canGetAttacked) return true;
        return origCanBeHitAsGroup.call(this, group);
      };
      proto.getHealth || (proto.getHealth = this.getHealth);
      var canReallyAttackObject = function canReallyAttackObject(obj) {
        if (!this.canAttack) return false;
        if (!this.scene.attackManager.canTeamAttack(this.team, obj.team)) return false;
        var attackPeriod = this.attackPeriod,
          attackAges = this.attackAges;
        if (attackPeriod != 0 && attackAges) {
          var attackAge = attackAges[obj.id];
          if (attackAge !== undefined && attackAge <= attackPeriod * this.game.fps) return false;
        }
        if (!(obj.canGetAttacked && obj.canGetAttackedByObject(this))) return false;
        return this.canAttackObject(obj);
      };
      proto.canGetAttackedByObject || (proto.canGetAttackedByObject = function (obj) {
        return true;
      });
      proto.canAttackObject || (proto.canAttackObject = function (obj) {
        return true;
      });
      var origCanHitObject = proto.canHitObject;
      proto.canHitObject = function (obj) {
        return canReallyAttackObject.call(this, obj) || origCanHitObject.call(this, obj);
      };
      var origHit = proto.hit;
      proto.hit = function (obj, details) {
        origHit.call(this, obj, details);
        if (canReallyAttackObject.call(this, obj)) this.attack(obj);
      };
      proto.getAttackProps || (proto.getAttackProps = _AttackMixin.getAttackProps);
      proto.attack = this.attack;
      proto.onAttack || (proto.onAttack = function (obj, props) {});
      proto.getAttacked || (proto.getAttacked = this.getAttacked);
      proto.onGetAttacked || (proto.onGetAttacked = function (props) {});
      proto.getDamaged || (proto.getDamaged = this.getDamaged);
      proto.die || (proto.die = this.die);
      var origGetGraphicsProps = proto.getGraphicsProps;
      proto.getGraphicsProps = function () {
        var props = origGetGraphicsProps.call(this);
        if (this.getDamagedAge <= 5) props.colorize = "red";
        return props;
      };
    }
  }, {
    key: "update",
    value: function update() {
      var attackPeriod = this.attackPeriod,
        attackAges = this.attackAges;
      if (attackPeriod != 0 && attackAges) {
        var attackPeriodIt = attackPeriod * this.game.fps;
        var atLeastOneId = false;
        for (var id in attackAges) {
          var age = attackAges[id];
          if (age > attackPeriodIt) delete attackAges[id];else {
            attackAges[id] = age + 1;
            atLeastOneId = true;
          }
        }
        if (!atLeastOneId) this.attackAges = null;
      }
      this.getDamagedAge += 1;
    }
  }, {
    key: "getHealth",
    value: function getHealth() {
      return this.maxHealth - this.damages;
    }
  }, {
    key: "attack",
    value: function attack(obj) {
      if (this.attackPeriod != 0) {
        var attackAges = this.attackAges || (this.attackAges = {});
        attackAges[obj.id] = 0;
      }
      var props = this.getAttackProps(obj);
      obj.getAttacked(props);
      this.onAttack(obj, props);
    }
  }, {
    key: "getAttacked",
    value: function getAttacked(props) {
      if (this.getHealth() <= 0) return;
      var attacker = props.attacker,
        damages = props.damages;
      if (this.scene.attackManager.canTeamDamage(attacker.team, this.team)) {
        this.getDamaged(damages, props);
      }
      var knockback = props?.knockback;
      if (knockback) {
        var knockbackAngle = props.knockbackAngle * PI / 180;
        this.speedX = knockback * cos(knockbackAngle);
        this.speedY = knockback * sin(knockbackAngle);
      }
      this.onGetAttacked(props);
    }
  }, {
    key: "getDamaged",
    value: function getDamaged(damages, props) {
      this.damages += damages;
      this.getDamagedAge = 0;
      var attacker = props?.attacker;
      if (this.getHealth() <= 0) {
        this.die(attacker);
      } else if (attacker) {
        this.speedY = -200;
        this.speedX = 200 * (this.x > attacker.x ? 1 : -1);
      }
    }
  }, {
    key: "die",
    value: function die(killer) {
      this.remove();
    }
  }]);
}(Mixin), _applyDecs$c7 = _slicedToArray(_applyDecs(_AttackMixin3, [], _classDecs7, 0, void 0, Mixin).c, 2), _AttackMixin = _applyDecs$c7[0], _initClass7 = _applyDecs$c7[1], _AttackMixin3), _Class7 = /*#__PURE__*/function (_identity8) {
  function _Class7() {
    var _this51;
    _classCallCheck(this, _Class7);
    _this51 = _callSuper(this, _Class7, [_AttackMixin]), _defineProperty(_assertThisInitialized(_this51), "KEY", "attack"), _initClass7();
    return _this51;
  }
  _inherits(_Class7, _identity8);
  return _createClass(_Class7);
}(_identity), _defineProperty(_Class7, _AttackMixin2, void 0), _Class7)();
export { _AttackMixin as AttackMixin };
_AttackMixin.getAttackProps = function (obj) {
  var props = this._attackProps || (this._attackProps = new AttackProps(this, {
    damages: this.attackDamages,
    knockback: this.attackKnockback,
    knockbackAngle: atan2(obj.y - this.y, obj.x - this.x) * 180 / PI
  }));
  return props;
};
_classDecs8 = [_HitMixin.addIfAbsent(), _OwnerableMixin.addIfAbsent()];
var _CollectMixin;
new (_CollectMixin2 = (_CollectMixin3 = /*#__PURE__*/function (_Mixin7) {
  function CollectMixin() {
    _classCallCheck(this, CollectMixin);
    return _callSuper(this, CollectMixin, arguments);
  }
  _inherits(CollectMixin, _Mixin7);
  return _createClass(CollectMixin, [{
    key: "initClass",
    value: function initClass(cls, kwargs) {
      _superPropGet(CollectMixin, "initClass", this, 3)([cls, kwargs]);
      var proto = cls.prototype;
      proto.canCollect = kwargs?.canCollect ?? true;
      proto.canGetCollected = kwargs?.canGetCollected ?? true;
      var origCanHitGroup = proto.canHitGroup;
      proto.canHitGroup = function (group) {
        if (group == "collect" && this.canCollect) return true;
        return origCanHitGroup.call(this, group);
      };
      var origCanBeHitAsGroup = proto.canBeHitAsGroup;
      proto.canBeHitAsGroup = function (group) {
        if (group == "collect" && this.canGetCollected) return true;
        return origCanBeHitAsGroup.call(this, group);
      };
      var canReallyCollectObject = function canReallyCollectObject(obj) {
        if (!this.canCollect) return false;
        if (obj.owner) return false;
        if (!(obj.canGetCollected && obj.canGetCollectedByObject(this))) return false;
        return this.canCollectObject(obj);
      };
      proto.canGetCollectedByObject || (proto.canGetCollectedByObject = function (obj) {
        return true;
      });
      proto.canCollectObject || (proto.canCollectObject = function (obj) {
        return true;
      });
      var origCanHitObject = proto.canHitObject;
      proto.canHitObject = function (obj) {
        return canReallyCollectObject.call(this, obj) || origCanHitObject.call(this, obj);
      };
      var origHit = proto.hit;
      proto.hit = function (obj, details) {
        origHit.call(this, obj, details);
        if (canReallyCollectObject.call(this, obj)) this.collect(obj);
      };
      proto.collect = this.collect;
      proto.onCollect || (proto.onCollect = function (obj) {});
      proto.getCollected || (proto.getCollected = this.getCollected);
      proto.onGetCollected || (proto.onGetCollected = function (collector) {});
      proto.drop = this.drop;
      proto.onDrop || (proto.onDrop = function (owner) {});
      var origRemove = proto.remove;
      proto.remove = function () {
        origRemove.call(this);
        this.drop();
      };
    }
  }, {
    key: "collect",
    value: function collect(obj) {
      if (obj.getCollected) obj.getCollected(this);
      this.onCollect(obj);
    }
  }, {
    key: "getCollected",
    value: function getCollected(collector) {
      this.owner = collector;
      this.onGetCollected(collector);
    }
  }, {
    key: "drop",
    value: function drop() {
      var owner = this.owner;
      if (!owner) return;
      this.owner = null;
      this.onDrop(owner);
    }
  }]);
}(Mixin), _applyDecs$c8 = _slicedToArray(_applyDecs(_CollectMixin3, [], _classDecs8, 0, void 0, Mixin).c, 2), _CollectMixin = _applyDecs$c8[0], _initClass8 = _applyDecs$c8[1], _CollectMixin3), _Class8 = /*#__PURE__*/function (_identity9) {
  function _Class8() {
    var _this52;
    _classCallCheck(this, _Class8);
    _this52 = _callSuper(this, _Class8, [_CollectMixin]), _defineProperty(_assertThisInitialized(_this52), "KEY", "collect"), _initClass8();
    return _this52;
  }
  _inherits(_Class8, _identity9);
  return _createClass(_Class8);
}(_identity), _defineProperty(_Class8, _CollectMixin2, void 0), _Class8)(); // OBJECTS ///////////////////////////////////
export { _CollectMixin as CollectMixin };
var PauseScene = /*#__PURE__*/function (_SceneCommon6) {
  function PauseScene() {
    _classCallCheck(this, PauseScene);
    return _callSuper(this, PauseScene, arguments);
  }
  _inherits(PauseScene, _SceneCommon6);
  return _createClass(PauseScene, [{
    key: "init",
    value: function init(kwargs) {
      _superPropGet(PauseScene, "init", this, 3)([kwargs]);
      this.backgroundColor = "lightgrey";
      this.backgroundAlpha = .5;
      this.pauseText = this.addNotif(Text, {
        text: "PAUSE",
        font: "bold 50px arial",
        fillStyle: "black"
      });
      this.syncPosSize();
      this.syncTextPos();
    }
  }, {
    key: "update",
    value: function update() {
      this.syncPosSize();
      this.syncTextPos();
    }
  }, {
    key: "syncTextPos",
    value: function syncTextPos() {
      assign(this.pauseText, {
        x: this.viewWidth / 2,
        y: this.viewHeight / 2
      });
    }
  }, {
    key: "draw",
    value: function draw() {
      var can = this.canvas;
      can.width = this.viewWidth;
      can.height = this.viewHeight;
      var ctx = can.getContext("2d");
      ctx.reset();
      var drawer = this.graphicsEngine;
      this.drawBackground(drawer);
      this.notifs.draw(drawer);
      return this.canvas;
    }
  }]);
}(_SceneCommon);
export var PlayerIcon = /*#__PURE__*/function (_GameObject5) {
  function PlayerIcon() {
    _classCallCheck(this, PlayerIcon);
    return _callSuper(this, PlayerIcon, arguments);
  }
  _inherits(PlayerIcon, _GameObject5);
  return _createClass(PlayerIcon, [{
    key: "init",
    value: function init(kwargs) {
      _superPropGet(PlayerIcon, "init", this, 3)([kwargs]);
      this.playerId = kwargs.playerId;
      this.strokeColor = kwargs?.strokeColor ?? "black";
    }
  }, {
    key: "getBaseImg",
    value: function getBaseImg() {
      var baseImg = this._baseImg;
      if (baseImg) return baseImg;
      var playerId = this.playerId;
      var player = this.game.players[playerId];
      baseImg = this._baseImg = document.createElement("canvas");
      baseImg.width = baseImg.height = 36;
      var ctx = baseImg.getContext("2d");
      ctx.beginPath();
      ctx.arc(floor(baseImg.width / 2), floor(baseImg.height / 2), 15, 0, 2 * PI);
      ctx.strokeStyle = this.strokeColor;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = player.color;
      ctx.fill();
      return baseImg;
    }
  }]);
}(_GameObject);
export var PlayerText = /*#__PURE__*/function (_Text2) {
  function PlayerText() {
    _classCallCheck(this, PlayerText);
    return _callSuper(this, PlayerText, arguments);
  }
  _inherits(PlayerText, _Text2);
  return _createClass(PlayerText, [{
    key: "init",
    value: function init(kwargs) {
      _superPropGet(PlayerText, "init", this, 3)([kwargs]);
      this.playerId = kwargs.playerId;
    }
  }, {
    key: "update",
    value: function update() {
      var playerId = this.playerId;
      var player = this.game.players[playerId];
      if (player) this.text = player.name;
    }
  }]);
}(Text);
var DebugScene = /*#__PURE__*/function (_SceneCommon7) {
  function DebugScene() {
    _classCallCheck(this, DebugScene);
    return _callSuper(this, DebugScene, arguments);
  }
  _inherits(DebugScene, _SceneCommon7);
  return _createClass(DebugScene, [{
    key: "init",
    value: function init(kwargs) {
      _superPropGet(DebugScene, "init", this, 3)([kwargs]);
      this.backgroundColor = null;
      var fontArgs = {
        font: "20px arial",
        fillStyle: "grey"
      };
      this.syncPosSize();
      this.updDurTxt = this.addNotif(Text, assign({
        x: this.game.width - 90,
        y: 15
      }, fontArgs));
      this.drawDurTxt = this.addNotif(Text, assign({
        x: this.game.width - 90,
        y: 40
      }, fontArgs));
      this.lagTxt = this.addNotif(Text, assign({
        x: this.game.width - 90,
        y: 65
      }, fontArgs));
    }
  }, {
    key: "update",
    value: function update() {
      this.syncPosSize();
      var metrics = this.game.metrics;
      if (metrics) {
        var updDurMts = metrics["updateDur"];
        if (updDurMts) this.updDurTxt.updateText("Upd: ".concat(arrAvg(updDurMts).toFixed(3), " / ").concat(arrMax(updDurMts).toFixed(3)));
        var drawDurMts = metrics["drawDur"];
        if (drawDurMts) this.drawDurTxt.updateText("Draw: ".concat(arrAvg(drawDurMts).toFixed(3), " / ").concat(arrMax(drawDurMts).toFixed(3)));
        var lagMts = metrics["lag"];
        if (lagMts) this.lagTxt.updateText("Lag: ".concat(arrAvg(lagMts).toFixed(3), " / ").concat(arrMax(lagMts).toFixed(3)));
      }
    }
  }, {
    key: "draw",
    value: function draw() {
      var can = this.canvas;
      can.width = this.viewWidth;
      can.height = this.viewHeight;
      var ctx = can.getContext("2d");
      ctx.reset();
      var drawer = this.graphicsEngine;
      this.updDurTxt.draw(drawer);
      this.drawDurTxt.draw(drawer);
      this.lagTxt.draw(drawer);
      return this.canvas;
    }
  }]);
}(_SceneCommon);
function arrAvg(arr) {
  var sum = 0,
    nb = arr.length;
  if (nb === 0) return 0;
  var _iterator19 = _createForOfIteratorHelper(arr),
    _step19;
  try {
    for (_iterator19.s(); !(_step19 = _iterator19.n()).done;) {
      var v = _step19.value;
      sum += v;
    }
  } catch (err) {
    _iterator19.e(err);
  } finally {
    _iterator19.f();
  }
  return sum / nb;
}
function arrMax(arr) {
  var res = 0;
  var _iterator20 = _createForOfIteratorHelper(arr),
    _step20;
  try {
    for (_iterator20.s(); !(_step20 = _iterator20.n()).done;) {
      var v = _step20.value;
      if (v > res) res = v;
    }
  } catch (err) {
    _iterator20.e(err);
  } finally {
    _iterator20.f();
  }
  return res;
}
var HackEvent = /*#__PURE__*/function () {
  function HackEvent(inputArgs) {
    _classCallCheck(this, HackEvent);
    this.inputArgs = inputArgs;
    this.returnValue = undefined;
    this["continue"] = true;
  }
  return _createClass(HackEvent, [{
    key: "stopPropagation",
    value: function stopPropagation() {
      this["continue"] = false;
    }
  }]);
}();
var Hack = /*#__PURE__*/function () {
  function Hack(obj, methodName, hackFun) {
    _classCallCheck(this, Hack);
    this.obj = obj;
    this.methodName = methodName;
    this.hackFun = hackFun;
    this.removed = false;
  }
  return _createClass(Hack, [{
    key: "remove",
    value: function remove() {
      if (this.removed) return;
      var obj = this.obj,
        methodName = this.methodName,
        hackFun = this.hackFun;
      var hacks = obj[methodName]?.hacks;
      if (!hacks) return;
      var idx = hacks.indexOf(hackFun);
      if (idx < 0) return;
      hacks.splice(idx, 1);
      obj[methodName].hackPriorities.splice(idx, 1);
      this.removed = true;
    }
  }]);
}();
export function hackMethod(obj, methodName, priority, hackFun) {
  if (obj[methodName].hacks === undefined) {
    var origMethod = obj[methodName];
    var _hacks = [],
      _hackPriorities = [];
    obj[methodName] = function () {
      for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }
      var evt = new HackEvent(args);
      var idx = 0,
        nbHacks = _hacks.length;
      for (; idx < nbHacks; ++idx) {
        if (_hackPriorities[idx] < 0) break;
        _hacks[idx](evt);
        if (!evt["continue"]) return evt.returnValue;
      }
      evt.returnValue = origMethod.apply(obj, evt.inputArgs);
      for (; idx < nbHacks; ++idx) {
        _hacks[idx](evt);
        if (!evt["continue"]) return evt.returnValue;
      }
      return evt.returnValue;
    };
    obj[methodName].hacks = _hacks;
    obj[methodName].hackPriorities = _hackPriorities;
  }
  var hacks = obj[methodName].hacks;
  var hackPriorities = obj[methodName].hackPriorities;
  var idx;
  for (idx in hacks) if (hackPriorities[idx] < priority) break;
  hacks.splice(idx, 0, hackFun);
  hackPriorities.splice(idx, 0, priority);
  return new Hack(obj, methodName, hackFun);
}
