function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _wrapNativeSuper(t) { var r = "function" == typeof Map ? new Map() : void 0; return _wrapNativeSuper = function _wrapNativeSuper(t) { if (null === t || !_isNativeFunction(t)) return t; if ("function" != typeof t) throw new TypeError("Super expression must either be null or a function"); if (void 0 !== r) { if (r.has(t)) return r.get(t); r.set(t, Wrapper); } function Wrapper() { return _construct(t, arguments, _getPrototypeOf(this).constructor); } return Wrapper.prototype = Object.create(t.prototype, { constructor: { value: Wrapper, enumerable: !1, writable: !0, configurable: !0 } }), _setPrototypeOf(Wrapper, t); }, _wrapNativeSuper(t); }
function _construct(t, e, r) { if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments); var o = [null]; o.push.apply(o, e); var p = new (t.bind.apply(t, o))(); return r && _setPrototypeOf(p, r.prototype), p; }
function _isNativeFunction(t) { try { return -1 !== Function.toString.call(t).indexOf("[native code]"); } catch (n) { return "function" == typeof t; } }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _superPropGet(t, o, e, r) { var p = _get(_getPrototypeOf(1 & r ? t.prototype : t), o, e); return 2 & r && "function" == typeof p ? function (t) { return p.apply(e, t); } : p; }
function _get() { return _get = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function (e, t, r) { var p = _superPropBase(e, t); if (p) { var n = Object.getOwnPropertyDescriptor(p, t); return n.get ? n.get.call(arguments.length < 3 ? e : r) : n.value; } }, _get.apply(null, arguments); }
function _superPropBase(t, o) { for (; !{}.hasOwnProperty.call(t, o) && null !== (t = _getPrototypeOf(t));); return t; }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
var assign = Object.assign;
var abs = Math.abs,
  floor = Math.floor,
  ceil = Math.ceil,
  min = Math.min,
  max = Math.max,
  sqrt = Math.sqrt,
  atan2 = Math.atan2,
  PI = Math.PI,
  random = Math.random;
import * as utils from './utils.mjs';
var sumTo = utils.sumTo,
  newCanvas = utils.newCanvas,
  newDomEl = utils.newDomEl,
  addNewDomEl = utils.addNewDomEl;
import * as game from './game.mjs';
var GameCommon = game.GameCommon,
  SceneCommon = game.SceneCommon,
  DefaultScene = game.DefaultScene,
  GameObject = game.GameObject,
  ObjectLink = game.ObjectLink;

// BUILDER //////////////////////////

/**
 * Game builder
 * @extends {GameCommon}
 */
export var GameBuilder = /*#__PURE__*/function (_GameCommon) {
  /**
   * @param {HTMLElement} canvasParentEl
   * @param {HTMLElement} selectionMenuEl
   * @param {game.Catalog} catalog
   * @param {object} map
   * @param {object} kwargs
   */
  function GameBuilder(canvasParentEl, selectionMenuEl, catalog, map, kwargs) {
    var _this;
    _classCallCheck(this, GameBuilder);
    _this = _callSuper(this, GameBuilder, [canvasParentEl, catalog, map, kwargs]);
    _this.isBuilder = true;
    _this.selectionMenuEl = selectionMenuEl;
    _this.copiedObjectState = null;
    _this.scenes.game = new DefaultScene(_this);
    _this.scenes.draft = new DraftScene(_this);
    _superPropGet((_this, GameBuilder), "syncSize", _this, 3)([]);
    _this.setMode("move");
    _this.initTouches();
    _this.initKeysListeners();
    return _this;
  }

  /**
   * Initializes keyboard listeners for builder actions.
   */
  _inherits(GameBuilder, _GameCommon);
  return _createClass(GameBuilder, [{
    key: "initKeysListeners",
    value: function initKeysListeners() {
      var _this2 = this;
      this.pressedKeys = new Set();
      document.body.addEventListener("keydown", function (evt) {
        var key = evt.key,
          ctrlKey = evt.ctrlKey;
        _this2.pressedKeys.add(key);
        if (key == "Escape") {
          if (_this2.mode != "cursor") _this2.setMode("cursor");else _this2.clearSelection();
        }
        if (key == "Delete") {
          _this2.removeSelectedObject();
        }
        if (ctrlKey && (key === 'c' || key === 'x')) {
          var draftScn = _this2.scenes.draft;
          var objState = draftScn.getSelectedObjectState();
          if (objState) {
            _this2.setMode("object", objState);
            if (key === 'x') _this2.removeSelectedObject();
          }
          evt.preventDefault();
          return;
        }
      });
      document.body.addEventListener("keyup", function (evt) {
        _this2.pressedKeys["delete"](evt.key);
      });
    }

    /**
     * Creates a new scene.
     * @param {typeof SceneCommon} cls
     * @param {object} kwargs
     * @returns {SceneCommon}
     */
  }, {
    key: "createScene",
    value: function createScene(cls, kwargs) {
      kwargs || (kwargs = {});
      kwargs.chunkSize = Infinity;
      var scn = new cls(this, kwargs);
      scn.doCreateObjectMapProto = false;
      return scn;
    }

    /**
     * Sets the builder mode.
     * @param {string} mode
     * @param {string|null} kwargs
     */
  }, {
    key: "setMode",
    value: function setMode(mode, kwargs) {
      this.mode = mode;
      if (mode == "move") this.canvas.style.cursor = "move";else this.canvas.style.cursor = "cell";
      this.scenes.draft.syncMode(mode, kwargs);
    }

    /**
     * Sets the anchor mode for the draft scene.
     * @param {boolean} val
     */
  }, {
    key: "setAnchor",
    value: function setAnchor(val) {
      this.scenes.draft.anchor = val;
    }

    /**
     * Syncs the game scene state to the map.
     */
  }, {
    key: "syncMap",
    value: function syncMap() {
      this.map.scenes["0"] = this.scenes.game.getState(true);
    }

    /**
     * Updates the builder state.
     */
  }, {
    key: "update",
    value: function update() {
      this.scenes.draft.update();
      var touch = this.touches[0];
      this.prevTouchIsDown = Boolean(touch) && touch.isDown;
    }

    /**
     * Removes the selected object(s).
     */
  }, {
    key: "removeSelectedObject",
    value: function removeSelectedObject() {
      var _iterator = _createForOfIteratorHelper(this.scenes.draft.selections),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var obj = _step.value;
          if (obj instanceof GameObject) {
            obj.remove();
            // remove all links associated to this object
            this.scenes.game.objects.forEach(function (obj) {
              var lnks = obj.objectLinks;
              if (lnks) {
                var _iterator2 = _createForOfIteratorHelper(lnks),
                  _step2;
                try {
                  for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
                    var lnk = _step2.value;
                    if (lnk.reactionObject == obj || lnk.triggerObject == obj) {
                      lnks.splice(lnks.indexOf(lnk), 1);
                    }
                  }
                } catch (err) {
                  _iterator2.e(err);
                } finally {
                  _iterator2.f();
                }
              }
            });
          } else if (obj instanceof ObjectLink) {
            var lnks = obj.reactionObject.objectLinks;
            lnks.splice(lnks.indexOf(obj), 1);
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      this.clearSelection();
    }

    /**
     * Clears the current selection.
     */
  }, {
    key: "clearSelection",
    value: function clearSelection() {
      this.scenes.draft.clearSelection();
    }

    /**
     * Draws the builder scenes.
     */
  }, {
    key: "draw",
    value: function draw() {
      _superPropGet(GameBuilder, "draw", this, 3)([]);
      this.drawScene(this.scenes.draft);
    }
  }]);
}(GameCommon);

/**
 * Draft scene for the builder
 * @extends {SceneCommon}
 */
var DraftScene = /*#__PURE__*/function (_SceneCommon) {
  function DraftScene() {
    _classCallCheck(this, DraftScene);
    return _callSuper(this, DraftScene, arguments);
  }
  _inherits(DraftScene, _SceneCommon);
  return _createClass(DraftScene, [{
    key: "init",
    value:
    /**
     * Initializes the draft scene.
     * @param {object} kwargs
     */
    function init(kwargs) {
      _superPropGet(DraftScene, "init", this, 3)([kwargs]);
      this.backgroundColor = null;
      this.viewSpeed = Infinity;
      this.anchor = true;
      this.draftObject = null;
      this.touchedObj = null;
      this.linkedObject = null;
      this.selections = [];
      this.syncPosSize();
    }

    /**
     * Syncs the draft object with the current builder mode.
     */
  }, {
    key: "syncMode",
    value: function syncMode(mode, kwargs) {
      this.prevPos = null;
      this.setDraftObject(null);
      if (mode == "object" || mode == "wall") {
        this.setDraftObject(kwargs.key, kwargs);
      }
    }
    /**
     * Sets the draft object using the given key or clears it if no key.
     * @param {string} key - The object key.
     * @param {object} kwargs - Additional arguments.
     */
  }, {
    key: "setDraftObject",
    value: function setDraftObject(key, kwargs) {
      if (key) this.draftObject = this.createObjectFromKey(key, kwargs);else {
        if (this.draftObject) this.draftObject.remove();
        this.draftObject = null;
      }
    }
    /**
     * Gets the state of the last selected GameObject.
     * @returns {object|undefined}
     */
  }, {
    key: "getSelectedObjectState",
    value: function getSelectedObjectState() {
      var selections = this.selections;
      if (selections.length > 0) {
        var lastSelected = selections[selections.length - 1];
        if (lastSelected instanceof GameObject) {
          return lastSelected.getState();
        }
      }
    }

    /**
     * Updates the draft scene.
     */
  }, {
    key: "update",
    value: function update() {
      this.syncPosSize();
      var mode = this.game.mode;
      this.updateDraftObject();
      if (mode == "object") this.addPointedObject();else if (mode == "wall") this.addPointedWall();else if (mode == "cursor") this.cursorUpdate();
    }

    /**
     * Handles updates when the mode is 'cursor'.
     */
  }, {
    key: "cursorUpdate",
    value: function cursorUpdate() {
      var _this$game = this.game,
        touches = _this$game.touches,
        prevTouchIsDown = _this$game.prevTouchIsDown;
      var touch = touches[0];
      if (touch && touch.isDown) {
        if (!prevTouchIsDown) {
          this.touchedObj = this.checkTouchSelect(touch);
          this.initMove(touch, this.touchedObj);
        } else {
          var touchedObj = this.checkTouchSelect(touch, this.touchedObj);
          this.linkedObject = touchedObj instanceof GameObject ? touchedObj : null;
          this.updateMove(touch);
        }
      } else {
        if (prevTouchIsDown) {
          if (!this.hasMoved()) {
            if (this.touchedObj) this.select(this.touchedObj);else this.clearSelection();
          } else {
            if (this.linkedObject) {
              this.addObjectLink(this.linkedObject);
              this.cancelMove();
            }
          }
        }
        this.touchedObj = null;
        this.linkedObject = null;
        this.clearMove();
      }
    }

    /**
     * Checks for object/link selection at a given touch position.
     * @param {object} touch
     * @param {GameObject|ObjectLink|null} ignore
     * @returns {GameObject|ObjectLink|null}
     */
  }, {
    key: "checkTouchSelect",
    value: function checkTouchSelect(touch) {
      var ignore = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var gameScn = this.game.scenes.game;
      var x = touch.x + gameScn.viewX,
        y = touch.y + gameScn.viewY;
      var res = null;
      // objects
      gameScn.objects.forEach(function (obj) {
        if (obj == ignore) return;
        if (obj.x1 !== undefined) {
          if (distancePointSegment(x, y, obj.x1, obj.y1, obj.x2, obj.y2) <= 5) {
            res = obj;
          }
        } else {
          var _obj$getHitBox = obj.getHitBox(),
            left = _obj$getHitBox.left,
            width = _obj$getHitBox.width,
            top = _obj$getHitBox.top,
            height = _obj$getHitBox.height;
          if (left <= x && left + width >= x && top <= y && top + height >= y) {
            res = obj;
          }
        }
      });
      if (res) return res;
      // links
      gameScn.objects.forEach(function (obj) {
        if (!obj.objectLinks) return;
        obj.objectLinks.forEach(function (lnk) {
          var _lnk$triggerObject = lnk.triggerObject,
            x1 = _lnk$triggerObject.x,
            y1 = _lnk$triggerObject.y;
          var _lnk$reactionObject = lnk.reactionObject,
            x2 = _lnk$reactionObject.x,
            y2 = _lnk$reactionObject.y;
          if (distancePointSegment(x, y, x1, y1, x2, y2) <= 5) {
            res = lnk;
          }
        });
      });
      return res;
    }

    /**
     * Initializes a move action.
     * @param {object} touch
     * @param {GameObject|ObjectLink} obj
     */
  }, {
    key: "initMove",
    value: function initMove(touch, obj) {
      var _this3 = this;
      var _this$game$scenes$gam = this.game.scenes.game,
        viewX = _this$game$scenes$gam.viewX,
        viewY = _this$game$scenes$gam.viewY;
      var orig = this._moveOrig = {
        touchX: touch.x,
        touchY: touch.y,
        viewX: viewX,
        viewY: viewY,
        objs: null,
        objsX: null,
        objsY: null
      };
      if (obj) {
        var objs = this.selections.concat([obj]).filter(function (obj) {
          return _this3.canMove(obj);
        });
        if (objs.length > 0) {
          orig.objs = objs;
          orig.objsX = objs.map(function (o) {
            return o.x;
          });
          orig.objsY = objs.map(function (o) {
            return o.y;
          });
        }
      }
    }

    /**
     * Checks if an object can be moved.
     * @param {GameObject|ObjectLink} obj
     * @returns {boolean}
     */
  }, {
    key: "canMove",
    value: function canMove(obj) {
      return obj instanceof GameObject;
    }

    /**
     * Updates a move action.
     * @param {object} touch
     */
  }, {
    key: "updateMove",
    value: function updateMove(touch) {
      var orig = this._moveOrig,
        objs = orig.objs;
      if (!orig) return;
      if (!objs) {
        // update scene view
        var viewX = orig.viewX - (touch.x - orig.touchX);
        var viewY = orig.viewY - (touch.y - orig.touchY);
        this.setView(viewX, viewY);
        this.game.scenes.game.setView(viewX, viewY);
      } else {
        // update selected objects positions
        for (var idx in objs) {
          var obj = objs[idx];
          var origX = orig.objsX[idx];
          var origY = orig.objsY[idx];
          var newPos = {
            x: origX + (touch.x - orig.touchX),
            y: origY + (touch.y - orig.touchY)
          };
          if (obj.constructor.STUCK_TO_GRID) this.applyAnchor(newPos, true);
          obj.x = newPos.x;
          obj.y = newPos.y;
        }
      }
    }

    /**
     * Checks if the object has moved.
     * @returns {boolean}
     */
  }, {
    key: "hasMoved",
    value: function hasMoved() {
      var orig = this._moveOrig,
        objs = orig.objs;
      if (!objs) return false;
      var objsX = orig.objsX,
        objsY = orig.objsY;
      return objs[0].x != objsX[0] || objs[0].y != objsY[0];
    }

    /**
     * Cancels the current move action.
     */
  }, {
    key: "cancelMove",
    value: function cancelMove() {
      var orig = this._moveOrig;
      if (!orig) return;
      var objs = orig.objs;
      if (!objs) {
        this.setView(orig.viewX, orig.viewY);
        this.game.scenes.game.setView(orig.viewX, orig.viewY);
      } else {
        for (var idx in orig.objs) {
          var obj = orig.objs[idx];
          obj.x = orig.objsX[idx];
          obj.y = orig.objsY[idx];
        }
      }
    }

    /**
     * Clears the move action state.
     */
  }, {
    key: "clearMove",
    value: function clearMove() {
      this._moveOrig = null;
    }

    /**
     * Adds an object link.
     * @param {GameObject} trigObj
     */
  }, {
    key: "addObjectLink",
    value: function addObjectLink(trigObj) {
      var orig = this._moveOrig;
      if (!orig) return;
      var objs = orig.objs;
      if (!objs) return;
      for (var idx in orig.objs) {
        var obj = orig.objs[idx];
        obj.addObjectLink(trigObj);
      }
    }

    /**
     * Updates the position of the draft object.
     */
  }, {
    key: "updateDraftObject",
    value: function updateDraftObject() {
      if (!this.draftObject) return;
      var mode = this.game.mode;
      var touch = this.game.touches[0];
      if (touch) {
        var gameScn = this.game.scenes.game;
        var draftPos = {
          x: touch.x + gameScn.viewX,
          y: touch.y + gameScn.viewY
        };
        if (mode == "object") {
          if (this.draftObject.constructor.STUCK_TO_GRID) this.applyAnchor(draftPos, true);
          this.draftObject.x = draftPos.x - gameScn.viewX;
          this.draftObject.y = draftPos.y - gameScn.viewY;
        } else if (mode == "wall") {
          this.applyAnchor(draftPos);
          this.draftObject.x2 = draftPos.x - gameScn.viewX;
          this.draftObject.y2 = draftPos.y - gameScn.viewY;
        }
      }
    }

    /**
     * Adds an object at the pointed position.
     */
  }, {
    key: "addPointedObject",
    value: function addPointedObject() {
      var _this$game2 = this.game,
        touches = _this$game2.touches,
        prevTouchIsDown = _this$game2.prevTouchIsDown;
      var draftObject = this.draftObject;
      var touch = touches[0];
      if (touch && touch.isDown && !prevTouchIsDown) {
        var gameScn = this.game.scenes.game;
        var pos = {
          x: touch.x + gameScn.viewX,
          y: touch.y + gameScn.viewY
        };
        if (draftObject && draftObject.constructor.STUCK_TO_GRID) this.applyAnchor(pos, true);
        var objState = draftObject.getState();
        delete objState.id;
        gameScn.addObject(objState.key, _objectSpread(_objectSpread({}, objState), {}, {
          x: floor(pos.x),
          y: floor(pos.y)
        }));
      }
    }

    /**
     * Adds a wall at the pointed position.
     */
  }, {
    key: "addPointedWall",
    value: function addPointedWall() {
      var _this$game3 = this.game,
        touches = _this$game3.touches,
        prevTouchIsDown = _this$game3.prevTouchIsDown;
      var draftObject = this.draftObject;
      var touch = touches[0];
      if (touch && touch.isDown && !prevTouchIsDown) {
        var gameScn = this.game.scenes.game;
        var pos = {
          x: touch.x + gameScn.viewX,
          y: touch.y + gameScn.viewY
        };
        this.applyAnchor(pos);
        if (this.prevPos !== null) {
          gameScn.addObject(draftObject.getKey(), {
            x1: this.prevPos.x,
            y1: this.prevPos.y,
            x2: pos.x,
            y2: pos.y
          });
        }
        this.draftObject.x1 = pos.x - gameScn.viewX;
        this.draftObject.y1 = pos.y - gameScn.viewY;
        this.prevPos = pos;
      }
    }

    /**
     * Applies grid anchoring to a position.
     * @param {{x: number, y: number}} pos
     * @param {boolean} targetCenters
     */
  }, {
    key: "applyAnchor",
    value: function applyAnchor(pos, targetCenters) {
      if (!this.anchor) return;
      var gridSize = this.game.scenes.game.gridSize;
      var x = pos.x,
        y = pos.y;
      if (targetCenters) {
        x -= gridSize / 2;
        y -= gridSize / 2;
      }
      var x1 = floor(x / gridSize) * gridSize,
        x2 = x1 + gridSize;
      pos.x = x - x1 < x2 - x ? x1 : x2;
      var y1 = floor(y / gridSize) * gridSize,
        y2 = y1 + gridSize;
      pos.y = y - y1 < y2 - y ? y1 : y2;
      if (targetCenters) {
        pos.x += gridSize / 2;
        pos.y += gridSize / 2;
      }
    }

    /**
     * Selects an object or a link.
     * @param {GameObject|ObjectLink} obj
     */
  }, {
    key: "select",
    value: function select(obj) {
      if (this.game.pressedKeys.has("Shift")) {
        var idx = this.selections.indexOf(obj);
        if (idx >= 0) this.selections.splice(idx, 1);else this.selections.push(obj);
      } else {
        this.clearSelection();
        this.selections.push(obj);
      }
      var selMenuEl = this.game.selectionMenuEl;
      selMenuEl.innerHTML = "";
      if (obj instanceof GameObject) {
        var stateEl = addNewDomEl(selMenuEl, "dmg-object-state");
        stateEl.initObject(obj);
      } else if (obj instanceof ObjectLink) {
        var linkEl = addNewDomEl(selMenuEl, "dmg-object-link");
        linkEl.initObjectLink(obj);
      }
    }

    /**
     * Clears the current selection.
     */
  }, {
    key: "clearSelection",
    value: function clearSelection() {
      this.selections.length = 0;
      this.game.selectionMenuEl.innerHTML = "";
    }

    /**
     * Draws the draft scene.
     */
  }, {
    key: "draw",
    value: function draw() {
      var _this$game$scenes$gam2 = this.game.scenes.game,
        viewX = _this$game$scenes$gam2.viewX,
        viewY = _this$game$scenes$gam2.viewY;
      var can = this.canvas;
      can.width = this.viewWidth;
      can.height = this.viewHeight;
      var ctx = can.getContext("2d");
      ctx.reset();
      var drawer = this.graphicsEngine;
      var gridImg = this.initGridImg();
      if (gridImg) ctx.drawImage(gridImg, ~~-viewX, ~~-viewY);
      if (this.draftObject) {
        var props = this.draftObject.getGraphicsProps();
        if (props) {
          props.visibility = .5;
          drawer.draw(props);
        }
      }
      this.drawSelections(ctx);
      this.drawLinkedObject(ctx);
      this.drawObjectLinks(ctx);
      return can;
    }

    /**
     * Initializes the grid background image.
     * @returns {HTMLCanvasElement}
     */
  }, {
    key: "initGridImg",
    value: function initGridImg() {
      var gridImg = this._gridImg;
      var _this$game$scenes$gam3 = this.game.scenes.game,
        width = _this$game$scenes$gam3.width,
        height = _this$game$scenes$gam3.height,
        gridSize = _this$game$scenes$gam3.gridSize;
      if (gridImg && gridImg.width == width && gridImg.height == height && gridImg.gridSize == gridSize) return gridImg;
      gridImg = this._gridImg = newCanvas(width, height);
      assign(gridImg, {
        gridSize: gridSize
      });
      var ctx = gridImg.getContext("2d");
      ctx.strokeStyle = "lightgrey";
      var addLine = function addLine(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      };
      var nbCols = ceil(width / gridSize),
        nbRows = ceil(height / gridSize);
      for (var x = 1; x < nbCols; ++x) addLine(gridSize * x, 0, gridSize * x, height);
      for (var y = 1; y < nbRows; ++y) addLine(0, gridSize * y, width, gridSize * y);
      return gridImg;
    }

    /**
     * Draws the selection boxes.
     * @param {CanvasRenderingContext2D} ctx
     */
  }, {
    key: "drawSelections",
    value: function drawSelections(ctx) {
      var _this$game$scenes$gam4 = this.game.scenes.game,
        viewX = _this$game$scenes$gam4.viewX,
        viewY = _this$game$scenes$gam4.viewY;
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "grey";
      var _iterator3 = _createForOfIteratorHelper(this.selections),
        _step3;
      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var sel = _step3.value;
          var left = void 0,
            top = void 0,
            width = void 0,
            height = void 0;
          if (sel instanceof GameObject) {
            if (sel.x1 !== undefined) {
              left = min(sel.x1, sel.x2);
              top = min(sel.y1, sel.y2);
              width = abs(sel.x1 - sel.x2);
              height = abs(sel.y1 - sel.y2);
            } else {
              var hitBox = sel.getHitBox();
              left = hitBox.left;
              top = hitBox.top;
              width = hitBox.width;
              height = hitBox.height;
            }
          } else if (sel instanceof ObjectLink) {
            var _sel$triggerObject = sel.triggerObject,
              x1 = _sel$triggerObject.x,
              y1 = _sel$triggerObject.y;
            var _sel$reactionObject = sel.reactionObject,
              x2 = _sel$reactionObject.x,
              y2 = _sel$reactionObject.y;
            left = x1;
            top = y1;
            width = x2 - x1;
            height = y2 - y1;
          }
          ctx.beginPath();
          ctx.setLineDash([5, 5]);
          ctx.rect(~~(left - viewX), ~~(top - viewY), width, height);
          ctx.stroke();
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }
      ctx.restore();
    }

    /**
     * Draws the outline of the object being linked to.
     * @param {CanvasRenderingContext2D} ctx
     */
  }, {
    key: "drawLinkedObject",
    value: function drawLinkedObject(ctx) {
      var _this$game$scenes$gam5 = this.game.scenes.game,
        viewX = _this$game$scenes$gam5.viewX,
        viewY = _this$game$scenes$gam5.viewY;
      if (!this.linkedObject) return;
      var _this$linkedObject$ge = this.linkedObject.getHitBox(),
        left = _this$linkedObject$ge.left,
        top = _this$linkedObject$ge.top,
        width = _this$linkedObject$ge.width,
        height = _this$linkedObject$ge.height;
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "red";
      ctx.beginPath();
      ctx.rect(~~(left - viewX), ~~(top - viewY), width, height);
      ctx.stroke();
      ctx.restore();
    }

    /**
     * Draws the object links.
     * @param {CanvasRenderingContext2D} ctx
     */
  }, {
    key: "drawObjectLinks",
    value: function drawObjectLinks(ctx) {
      var gameScn = this.game.scenes.game;
      var viewX = gameScn.viewX,
        viewY = gameScn.viewY;
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "red";
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      gameScn.objects.forEach(function (obj) {
        var objLinks = obj.objectLinks;
        if (objLinks) objLinks.forEach(function (objLink) {
          var trigObj = objLink.triggerObject;
          ctx.moveTo(~~(obj.x - viewX), ~~(obj.y - viewY));
          ctx.lineTo(~~(trigObj.x - viewX), ~~(trigObj.y - viewY));
        });
      });
      ctx.stroke();
      ctx.restore();
    }
  }]);
}(SceneCommon);
/**
 * Custom element for selecting a game object.
 * @extends {HTMLElement}
 */
var ObjectSelectorElement = /*#__PURE__*/function (_HTMLElement) {
  function ObjectSelectorElement() {
    var _this4;
    _classCallCheck(this, ObjectSelectorElement);
    _this4 = _callSuper(this, ObjectSelectorElement);
    _this4.value = null;
    _this4.attachShadow({
      mode: 'open'
    });
    var styleEl = document.createElement('style');
    styleEl.textContent = "\n            cs-option {\n                display: flex;\n                flex-direction: row;\n                width: 150px;\n                height: 20px;\n                padding: .2em;\n                cursor: pointer;\n                background: white;\n            }\n            cs-option:hover {\n                background-color: #eee;\n            }\n        ";
    var selectWrapperEl = newDomEl("div", {
      tabindex: "0",
      style: {
        position: "relative"
      }
    });
    _this4.shadowRoot.append(styleEl, selectWrapperEl);
    _this4.selectEl = addNewDomEl(selectWrapperEl, "cs-option", {
      style: {
        border: "1px solid black"
      }
    });
    _this4.optionsEl = addNewDomEl(selectWrapperEl, "div", {
      style: {
        border: "1px solid black",
        position: "absolute",
        top: "100%",
        left: "0",
        display: "none",
        zIndex: 99
      }
    });
    _this4.selectEl.onclick = function () {
      return _this4.setOptionsVisibility(true);
    };
    selectWrapperEl.onblur = function () {
      return _this4.setOptionsVisibility(false);
    };
    return _this4;
  }

  /**
   * Initializes the selector with catalog objects.
   * @param {string} perspective
   * @param {string[]} versions
   * @param {game.Catalog} catalog
   * @param {Function} filter
   */
  _inherits(ObjectSelectorElement, _HTMLElement);
  return _createClass(ObjectSelectorElement, [{
    key: "initCatalog",
    value: function initCatalog(perspective, versions, catalog, filter) {
      var _this5 = this;
      this.perspective = perspective;
      this.versions = versions;
      this.catalog = catalog;
      this.optionsEl.innerHTML = "";
      var _loop = function _loop() {
          var objCat = catalog.objects[objFullKey];
          if (!objCat.showInBuilder) return 0; // continue
          if (filter && !filter(objCat)) return 0; // continue
          var optionEl = addNewDomEl(_this5.optionsEl, "cs-option");
          _this5.setOptionKey(optionEl, objCat.key);
          optionEl.onclick = function () {
            _this5.setSelectedObject(objCat.key);
            _this5.setOptionsVisibility(false);
          };
        },
        _ret;
      for (var objFullKey in catalog.objects) {
        _ret = _loop();
        if (_ret === 0) continue;
      }
    }
    /**
     * Sets the content of an option element.
     * @param {HTMLElement} optionEl
     * @param {string} objKey
     */
  }, {
    key: "setOptionKey",
    value: function setOptionKey(optionEl, objKey) {
      var objCat = this.catalog.getObject(this.perspective, this.versions, objKey);
      var label = objCat.label;
      var icon = objCat.icon;
      optionEl.innerHTML = "";
      if (icon) optionEl.appendChild(icon.cloneNode(true));
      addNewDomEl(optionEl, "span", {
        text: label,
        style: {
          paddingLeft: ".5em"
        }
      });
    }
    /**
     * Sets the visibility of the options list.
     * @param {boolean} val
     */
  }, {
    key: "setOptionsVisibility",
    value: function setOptionsVisibility(val) {
      this.optionsEl.style.display = val ? "block" : "none";
    }
    /**
     * Sets the selected object.
     * @param {string} objKey
     */
  }, {
    key: "setSelectedObject",
    value: function setSelectedObject(objKey) {
      this.value = objKey;
      this.setOptionKey(this.selectEl, objKey);
      // this.dispatchEvent(new CustomEvent("select", {
      //     detail: { key: objKey }
      // }))
      this.dispatchEvent(new CustomEvent("change", {
        detail: {
          key: objKey
        }
      }));
    }
  }]);
}(/*#__PURE__*/_wrapNativeSuper(HTMLElement));
customElements.define('dmg-object-selector', ObjectSelectorElement);

/**
 * Custom element for editing the state of a game object.
 * @extends {HTMLElement}
 */
var ObjectStateElement = /*#__PURE__*/function (_HTMLElement2) {
  function ObjectStateElement() {
    var _this6;
    _classCallCheck(this, ObjectStateElement);
    _this6 = _callSuper(this, ObjectStateElement);
    _this6.value = null;
    _this6.attachShadow({
      mode: 'open'
    });
    var styleEl = document.createElement('style');
    styleEl.textContent = "";
    _this6.propsEl = newDomEl("div", {
      style: {
        padding: ".5em",
        display: "none",
        flexDirection: "column",
        gap: ".2em",
        border: "1px solid lightgrey"
      }
    });
    _this6.shadowRoot.append(styleEl, _this6.propsEl);
    return _this6;
  }

  /**
   * Initializes the state editor for a given object.
   * @param {GameObject} obj
   */
  _inherits(ObjectStateElement, _HTMLElement2);
  return _createClass(ObjectStateElement, [{
    key: "initObject",
    value: function initObject(obj) {
      var _this7 = this;
      this.propsEl.style.display = "none";
      this.propsEl.innerHTML = "";
      obj.constructor.STATE_PROPS.forEach(function (prop) {
        if (!prop.showInBuilder) return;
        _this7.propsEl.style.display = "flex";
        _this7.propsEl.appendChild(prop.createObjectInput(obj));
      });
    }

    /**
     * Sets the content of an option element.
     * @param {HTMLElement} optionEl
     * @param {string} objKey
     */
  }, {
    key: "setOptionKey",
    value: function setOptionKey(optionEl, objKey) {
      var objCat = this.catalog.objects[objKey];
      var label = objCat.label;
      var icon = objCat.icon;
      optionEl.innerHTML = "";
      if (icon) optionEl.appendChild(icon.cloneNode(true));
      addNewDomEl(optionEl, "span", {
        text: label,
        style: {
          paddingLeft: ".5em"
        }
      });
    }

    /**
     * Sets the visibility of the options list.
     * @param {boolean} val
     */
  }, {
    key: "setOptionsVisibility",
    value: function setOptionsVisibility(val) {
      this.optionsEl.style.display = val ? "block" : "none";
    }

    /**
     * Sets the selected object.
     * @param {string} objKey
     */
  }, {
    key: "setSelectedObject",
    value: function setSelectedObject(objKey) {
      this.value = objKey;
      this.setOptionKey(this.selectEl, objKey);
      this.dispatchEvent(new CustomEvent("change", {
        detail: {
          key: objKey
        }
      }));
    }
  }]);
}(/*#__PURE__*/_wrapNativeSuper(HTMLElement));
customElements.define('dmg-object-state', ObjectStateElement);

/**
 * Custom element for editing an object link.
 * @extends {HTMLElement}
 */
var ObjectLinkElement = /*#__PURE__*/function (_HTMLElement3) {
  function ObjectLinkElement() {
    var _this8;
    _classCallCheck(this, ObjectLinkElement);
    _this8 = _callSuper(this, ObjectLinkElement);
    _this8.attachShadow({
      mode: 'open'
    });
    var styleEl = document.createElement('style');
    styleEl.textContent = "";
    _this8.wrapperEl = newDomEl("div", {
      display: "flex",
      flexDirection: "column"
    });
    _this8.shadowRoot.append(styleEl, _this8.wrapperEl);
    _this8.objectLink = null;
    return _this8;
  }

  /**
   * Initializes the editor for a given object link.
   * @param {ObjectLink} objLink
   */
  _inherits(ObjectLinkElement, _HTMLElement3);
  return _createClass(ObjectLinkElement, [{
    key: "initObjectLink",
    value: function initObjectLink(objLink) {
      this.objectLink = objLink;
      this.wrapperEl.innerHTML = "";
      var keysEl = addNewDomEl(this.wrapperEl, "div", {
        display: "flex",
        flexDirection: "row"
      });
      addNewDomEl(keysEl, "span", {
        text: "trigger:"
      });
      var trigKeyEl = addNewDomEl(keysEl, "select");
      objLink.triggerObject.constructor.LINK_TRIGGERS.forEach(function (trig, funcName) {
        addNewDomEl(trigKeyEl, "option", {
          value: funcName,
          text: trig.label
        });
      });
      trigKeyEl.value = objLink.triggerKey;
      trigKeyEl.addEventListener("change", function () {
        return objLink.triggerKey = trigKeyEl.value;
      });
      addNewDomEl(keysEl, "span", {
        text: "reaction:"
      });
      var reactKeyEl = addNewDomEl(keysEl, "select");
      objLink.reactionObject.constructor.LINK_REACTIONS.forEach(function (trig, funcName) {
        addNewDomEl(reactKeyEl, "option", {
          value: funcName,
          text: trig.label
        });
      });
      reactKeyEl.value = objLink.reactionKey;
      reactKeyEl.addEventListener("change", function () {
        return objLink.reactionKey = reactKeyEl.value;
      });
    }
  }]);
}(/*#__PURE__*/_wrapNativeSuper(HTMLElement));
customElements.define('dmg-object-link', ObjectLinkElement);

/**
 * Calculates the distance between a point and a line segment.
 * @param {number} x
 * @param {number} y
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
function distancePointSegment(x, y, x1, y1, x2, y2) {
  var dx = x2 - x1,
    dy = y2 - y1;
  var t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  var px = x1 + t * dx,
    py = y1 + t * dy;
  if (t < 0) return sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));else if (t > 1) return sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2));else return sqrt((x - px) * (x - px) + (y - py) * (y - py));
}
