function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
 * @fileoverview This file contains the physics engine for the game.
 * @author ncarrez
 */
var abs = Math.abs,
  floor = Math.floor,
  ceil = Math.ceil,
  min = Math.min,
  max = Math.max,
  pow = Math.pow,
  sqrt = Math.sqrt,
  hypot = Math.hypot,
  atan2 = Math.atan2,
  PI = Math.PI,
  random = Math.random;
var assign = Object.assign;
import * as utils from './utils.mjs';
var FLOAT_PRECISION_CORRECTION = .00001;
var DEFAULT_GRAVITY_ACC = 1000;
var DEFAULT_GRAVITY_MAX_SPEED = 1000;
var colRes = {},
  blockerColRes = {},
  projRes = {};

/**
 * @class PhysicsEngine
 * @description Handles physics simulation for the game.
 */
var PhysicsEngine = /*#__PURE__*/function () {
  /**
   * @param {object} scn - The scene object.
   */
  function PhysicsEngine(scn) {
    _classCallCheck(this, PhysicsEngine);
    this.scene = scn;
    this.gravityAcc = scn?.physicsManager.gravityAcc ?? DEFAULT_GRAVITY_ACC;
    this.gravityMaxSpeed = scn?.physicsManager.gravityMaxSpeed ?? DEFAULT_GRAVITY_MAX_SPEED;
  }

  /**
   * @description Get the hit properties of an object.
   * @param {object} obj - The game object.
   * @param {number} dt - The delta time.
   * @returns {object} The hit properties of the object.
   */
  return _createClass(PhysicsEngine, [{
    key: "getObjectHitProps",
    value: function getObjectHitProps(obj, dt) {
      var props = obj.getHitProps(dt);
      props.obj = obj;
      var polygon = props.polygon,
        dx = props.dx,
        dy = props.dy;
      // min/max
      var minDx = dx < 0 ? dx : 0,
        minDy = dy < 0 ? dy : 0;
      var maxDx = dx > 0 ? dx : 0,
        maxDy = dy > 0 ? dy : 0;
      var minX, minY, maxX, maxY, sMinX, sMinY, sMaxX, sMaxY;
      for (var i = 0; i < polygon.length; i += 2) {
        var x = polygon[i],
          y = polygon[i + 1];
        if (i == 0) {
          minX = maxX = x;
          minY = maxY = y;
          sMinX = x + minDx;
          sMinY = y + minDy;
          sMaxX = x + maxDx;
          sMaxY = y + maxDy;
        } else {
          minX = min(minX, x);
          minY = min(minY, y);
          maxX = max(maxX, x);
          maxY = max(maxY, y);
          sMinX = min(sMinX, x + minDx);
          sMinY = min(sMinY, y + minDy);
          sMaxX = max(sMaxX, x + maxDx);
          sMaxY = max(sMaxY, y + maxDy);
        }
      }
      assign(props, {
        minX: minX,
        minY: minY,
        maxX: maxX,
        maxY: maxY,
        sMinX: sMinX,
        sMinY: sMinY,
        sMaxX: sMaxX,
        sMaxY: sMaxY
      });
      // normals
      var normals = props.normals || (props.normals = []);
      normals.length = 0;
      for (var _i = 0; _i < polygon.length / 2; _i += 2) {
        // /2 because of symetry
        var edgeX = polygon[_i + 2] - polygon[_i];
        var edgeY = polygon[_i + 3] - polygon[_i + 1];
        //if(edgeX == 0 || edgeY == 0) continue  // case already managed by min/max
        var size = max(1, hypot(edgeX, edgeY));
        normals.push(edgeY / size, -edgeX / size);
      }
      if (dx != 0 && dy != 0) normals.push(dy, -dx);
      return props;
    }

    /**
     * @description Apply physics to the objects.
     * @param {number} dt - The delta time.
     * @param {Array<object>} objects - The list of game objects.
     */
  }, {
    key: "apply",
    value: function apply(dt, objects) {
      var _this = this;
      // apply blocks and speeds
      var blockersProps = [];
      objects.forEach(function (obj) {
        if (obj.canBlock) {
          blockersProps.push(_this.getObjectHitProps(obj, 0));
        }
      });
      var nbBlockCheck = 0;
      objects.forEach(function (obj) {
        if (!(obj.canMove || obj.checkBlocksAnyway)) return;
        var remD = 1,
          nbCollisions = 0;
        if (obj.affectedByGravity) _this.applyGravity(dt, obj);
        var objOrigX = obj.x,
          objOrigY = obj.y,
          objOrigSpdX = obj.speedX,
          objOrigSpdY = obj.speedY;
        var objOrigDx = objOrigSpdX * dt,
          objOrigDy = objOrigSpdY * dt;
        if ((obj.canGetBlocked || obj.checkBlocksAnyway) && (objOrigSpdX != 0 || objOrigSpdY != 0)) {
          var objOrigD = hypot(objOrigDx, objOrigDy) * dt;
          while (remD > 0) {
            colRes.time = Infinity;
            var objProps = _this.getObjectHitProps(obj, dt * remD);
            var objSpdX = obj.speedX,
              objSpdY = obj.speedY;
            var objMinX = objProps.minX,
              objMinY = objProps.minY,
              objMaxX = objProps.maxX,
              objMaxY = objProps.maxY,
              objSMinX = objProps.sMinX,
              objSMinY = objProps.sMinY,
              objSMaxX = objProps.sMaxX,
              objSMaxY = objProps.sMaxY;
            for (var _i2 = 0, _blockersProps = blockersProps; _i2 < _blockersProps.length; _i2++) {
              var blockerProps = _blockersProps[_i2];
              nbBlockCheck += 1;
              if (obj == blockerProps.obj) continue;
              // quick filteringgs
              if (objSMinX > blockerProps.sMaxX || objSMaxX < blockerProps.sMinX || objSMinY > blockerProps.sMaxY || objSMaxY < blockerProps.sMinY) continue;
              // detect collision
              detectCollisionTime(objProps, blockerProps, blockerColRes);
              if (blockerColRes.time == Infinity) continue;
              if (blockerColRes.time < colRes.time) assign(colRes, blockerColRes);
              if (colRes.time == 0) break;
            }
            if (colRes.time == Infinity) break;
            // collision detected...
            nbCollisions += 1;
            var objDx = objProps.dx,
              objDy = objProps.dy;
            var colTime = colRes.time,
              colDist = colRes.dist,
              colDistFixSign = colRes.distFixSign,
              colNormalX = colRes.normalX,
              colNormalY = colRes.normalY;
            // move
            if (obj.canMove) {
              if (colTime > 0) {
                // move
                var dx = objDx * colTime,
                  dy = objDy * colTime;
                if (dx > 0) dx -= min(dx, FLOAT_PRECISION_CORRECTION);else if (dx < 0) dx -= max(dx, -FLOAT_PRECISION_CORRECTION);
                if (dy > 0) dy -= min(dy, FLOAT_PRECISION_CORRECTION);else if (dy < 0) dy -= max(dy, -FLOAT_PRECISION_CORRECTION);
                obj.x += dx;
                obj.y += dy;
                // compute remaining speed
                projection(objSpdX, objSpdY, colNormalY, -colNormalX, projRes);
                var projVal = hypot(projRes.x, projRes.y);
                if (projVal == 0) {
                  obj.speedX = obj.speedY = 0;
                } else {
                  var staticFriction = min(obj.physicsStaticFriction, colRes.obj.physicsStaticFriction);
                  var dynamicFriction = min(obj.physicsDynamicFriction, colRes.obj.physicsDynamicFriction);
                  var friction = (dynamicFriction * projVal + staticFriction) * remD * dt;
                  var glideFactor = max(0, 1 - friction / projVal);
                  obj.speedX = projRes.x * glideFactor;
                  obj.speedY = projRes.y * glideFactor;
                }
                var bounciness = max(obj.physicsBounciness, colRes.obj.physicsBounciness);
                if (bounciness > 0) {
                  var rmSpdX = objSpdX - projRes.x,
                    rmSpdY = objSpdY - projRes.y;
                  obj.speedX -= rmSpdX * bounciness;
                  obj.speedY -= rmSpdY * bounciness;
                }
                // stop collisions detection condition
                var objD = hypot(objDx, objDy),
                  colD = objD * colTime;
                remD -= colD / objOrigD;
                if (hypot(obj.speedX, obj.speedY) * remD < 1) remD = 0;
              } else {
                // static collision : fix position
                obj.x += colNormalX * colDistFixSign * (colDist - FLOAT_PRECISION_CORRECTION);
                obj.y += colNormalY * colDistFixSign * (colDist - FLOAT_PRECISION_CORRECTION);
              }
              if (nbCollisions == 5) remD = 0;
            } else {
              remD = 0;
            }
            // callbacks
            var colDetails = getCollisionDetails(colRes);
            obj.onGetBlocked(colRes.obj, colDetails);
            colRes.obj.onBlock(obj, colDetails);
          }
        }
        // last move
        if (remD > 0 && obj.canMove) {
          obj.x += obj.speedX * dt * remD;
          obj.y += obj.speedY * dt * remD;
        }
      });

      // check hits

      var hitGroups = ["physics", "health", "collect"];
      var canHitObjs = [],
        canBeHitObjs = [];
      objects.forEach(function (obj) {
        if (!obj.canHitGroup) return;
        var canHitGroupBites = 0,
          canBeHitGroupBites = 0;
        for (var idx in hitGroups) {
          var hitGroup = hitGroups[idx];
          if (obj.canHitGroup(hitGroup)) canHitGroupBites |= 1 << idx;
          if (obj.canBeHitAsGroup(hitGroup)) canBeHitGroupBites += 1 << idx;
        }
        if (canHitGroupBites) {
          obj._canHitGroupBites = canHitGroupBites;
          canHitObjs.push(obj);
        }
        if (canBeHitGroupBites) {
          obj._canBeHitGroupBites = canBeHitGroupBites;
          canBeHitObjs.push(obj);
        }
      });
      for (var _i3 = 0, _canHitObjs = canHitObjs; _i3 < _canHitObjs.length; _i3++) {
        var obj1 = _canHitObjs[_i3];
        var obj1Props = this.getObjectHitProps(obj1, 0);
        var _iterator = _createForOfIteratorHelper(canBeHitObjs),
          _step;
        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var obj2 = _step.value;
            if (obj1 === obj2) continue;
            if (obj1._canHitHash | obj2._canBeHitHash == 0) continue;
            if (!obj1.canHitObject(obj2)) continue;
            var obj2Props = this.getObjectHitProps(obj2, 0);
            detectCollisionTime(obj1Props, obj2Props, blockerColRes);
            if (blockerColRes.time == 0) {
              obj1.hit(obj2, getCollisionDetails(blockerColRes));
            }
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }
    }

    /**
     * @description Apply gravity to an object.
     * @param {number} dt - The delta time.
     * @param {object} obj - The game object.
     */
  }, {
    key: "applyGravity",
    value: function applyGravity(dt, obj) {
      var gravityAcc = this.gravityAcc,
        gravityMaxSpeed = this.gravityMaxSpeed;
      if (obj.speedY >= gravityMaxSpeed) return;
      obj.speedY = min(obj.speedY + gravityAcc * dt, gravityMaxSpeed);
    }
  }]);
}();
/**
 * @description Detect the collision time between two objects.
 * @param {object} hitProps1 - The hit properties of the first object.
 * @param {object} hitProps2 - The hit properties of the second object.
 * @param {object} res - The result object.
 */
export { PhysicsEngine as default };
function detectCollisionTime(hitProps1, hitProps2, res) {
  res.obj = null;
  res.time = 0;
  res.dist = -Infinity;
  res.distFixSign = 0;
  res.normalX = null;
  res.normalY = null;
  if (_checkUniDir(hitProps1, hitProps2) || _checkUniDir(hitProps2, hitProps1)) {
    res.time = Infinity;
    return;
  }
  _detectCollisionTime(hitProps1, hitProps2, 0, res);
  if (res.time == Infinity) return;
  _detectCollisionTime(hitProps1, hitProps2, 1, res);
  _checkUniDir2(hitProps1, hitProps2, res);
}

/**
 * @description Check the unidirectional collision.
 * @param {object} hitProps1 - The hit properties of the first object.
 * @param {object} hitProps2 - The hit properties of the second object.
 * @returns {boolean} True if there is a unidirectional collision, false otherwise.
 */
function _checkUniDir(hitProps1, hitProps2) {
  if (hitProps1.uniDirX === null) return false;
  var dx1 = hitProps1.dx,
    dy1 = hitProps1.dy;
  var dx2 = hitProps2.dx,
    dy2 = hitProps2.dy;
  var dx = dx2 - dx1,
    dy = dy2 - dy1;
  var dp = dotProduct(dx, dy, hitProps1.uniDirX, hitProps1.uniDirY);
  return dp >= 0;
}

/**
 * @description Check the unidirectional collision.
 * @param {object} hitProps1 - The hit properties of the first object.
 * @param {object} hitProps2 - The hit properties of the second object.
 * @param {object} res - The result object.
 */
function _checkUniDir2(hitProps1, hitProps2, res) {
  if (hitProps1.uniDirX === null && hitProps2.uniDirX === null) return;
  if (res.dist < -1) res.time = Infinity;
}
var resProj1 = {},
  resProj2 = {},
  resOverlapTime = {};
/**
 * @description Detect the collision time between two objects.
 * @param {object} hitProps1 - The hit properties of the first object.
 * @param {object} hitProps2 - The hit properties of the second object.
 * @param {number} num - The number of the object.
 * @param {object} res - The result object.
 */
function _detectCollisionTime(hitProps1, hitProps2, num, res) {
  var pprops1 = num == 0 ? hitProps1 : hitProps2;
  var pprops2 = num == 1 ? hitProps1 : hitProps2;
  var poly1 = pprops1.polygon,
    dx1 = pprops1.dx,
    dy1 = pprops1.dy,
    normals = pprops1.normals;
  var poly2 = pprops2.polygon,
    dx2 = pprops2.dx,
    dy2 = pprops2.dy;
  var dx = dx1 - dx2,
    dy = dy1 - dy2;
  for (var i = 0; i < normals.length; i += 2) {
    var ax = normals[i],
      ay = normals[i + 1];
    projectPolygonOnAxis(poly1, ax, ay, resProj1); // TODO: cache me
    projectPolygonOnAxis(poly2, ax, ay, resProj2);
    var relSpdProj = dx * ax + dy * ay;
    getOverlapTime(resProj1, resProj2, relSpdProj, resOverlapTime);
    var colTime = resOverlapTime.time,
      colDist = resOverlapTime.dist,
      colDistFixSign = resOverlapTime.distFixSign;
    if (colTime < res.time) continue;
    if (colTime == 0 && colDist < res.dist) return;
    res.obj = hitProps2.obj;
    res.time = colTime;
    res.dist = colDist;
    res.distFixSign = colDistFixSign * (num == 0 ? 1 : -1);
    res.normalX = ax;
    res.normalY = ay;
    if (colTime == Infinity) break;
  }
}

/**
 * @description Get the overlap time between two projections.
 * @param {object} proj1 - The projection of the first object.
 * @param {object} proj2 - The projection of the second object.
 * @param {number} relSpdProj - The relative speed projection.
 * @param {object} res - The result object.
 */
function getOverlapTime(proj1, proj2, relSpdProj, res) {
  var dist12 = proj1.min - proj2.max,
    dist21 = proj2.min - proj1.max;
  var colDist = max(dist12, dist21);
  res.dist = colDist;
  res.distFixSign = dist12 < dist21 ? 1 : -1;
  if (colDist <= 0) {
    // static collision detected
    res.time = 0;
    return;
  }
  if (relSpdProj === 0) {
    // static without collision
    res.time = Infinity;
    return;
  }
  var t1 = dist21 / relSpdProj;
  var t2 = -dist12 / relSpdProj;
  var tEnter = min(t1, t2),
    tExit = max(t1, t2);
  if (tExit < 0 || tEnter > 1) res.time = Infinity;else res.time = tEnter;
}

/**
 * @description Get the collision details.
 * @param {object} colRes - The collision result.
 * @returns {{
 *   angle: number
 * }} The collision details.
 */
function getCollisionDetails(colRes) {
  var normalX = colRes.normalX,
    normalY = colRes.normalY,
    distFixSign = colRes.distFixSign;
  var colAngle = atan2(-normalY * distFixSign, -normalX * distFixSign);
  return {
    angle: colAngle * 180 / PI
  };
}

/**
 * @description Project a polygon on an axis.
 * @param {Array<number>} polygon - The polygon to project.
 * @param {number} ax - The x component of the axis.
 * @param {number} ay - The y component of the axis.
 * @param {{
 *   min: number,
 *   max: number
 * }} res - The result object.
 */
function projectPolygonOnAxis(polygon, ax, ay, res) {
  var polyLen = polygon.length;
  var pmin = Infinity,
    pmax = -Infinity;
  for (var i = 0; i < polyLen; i += 2) {
    var x = polygon[i],
      y = polygon[i + 1];
    var proj = x * ax + y * ay;
    pmin = min(pmin, proj);
    pmax = max(pmax, proj);
  }
  res.min = pmin;
  res.max = pmax;
}

/**
 * @description Calculate the dot product of two vectors.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
function dotProduct(x1, y1, x2, y2) {
  return x1 * x2 + y1 * y2;
}

/**
 * @description Project a vector on another vector.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {{
 *   x: number,
 *   y: number
 * }} res - The result object.
 */
function projection(x1, y1, x2, y2, res) {
  var d22 = Math.pow(x2, 2) + Math.pow(y2, 2);
  var dp = dotProduct(x1, y1, x2, y2);
  res.x = dp * x2 / d22;
  res.y = dp * y2 / d22;
}
