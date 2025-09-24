const { abs, floor, ceil, min, max, pow, sqrt, hypot, atan2, PI, random } = Math
const { assign } = Object
import * as utils from './utils.mjs'
const { checkHit } = utils

const FLOAT_PRECISION_CORRECTION = .00001
const DEFAULT_GRAVITY_ACC = 1000
const DEFAULT_GRAVITY_MAX_SPEED = 1000


const colRes = {}, wallColRes = {}, projRes = {}, fixRes = {}, detectColRes = {}, colWalls = new Set()

export default class PhysicsEngine {
    constructor(scn) {
        this.scene = scn
        this.gravityAcc = scn?.physicsManager.gravityAcc ?? DEFAULT_GRAVITY_ACC
        this.gravityMaxSpeed = scn?.physicsManager.gravityMaxSpeed ?? DEFAULT_GRAVITY_MAX_SPEED
        this.syncMap()
    }
    syncMap() {
        this.scene.walls.forEach(wall => this.initWall(wall))
    }
    initWall(wall) {
        const data = wall._physicsData ||= { obj: wall }
        const polygon = data.polygon ||= []
        const { x1, x2, y1, y2 } = wall
        polygon.length = 0
        polygon.push(
            x1, y1,
            x2, y2,
        )
        data.dx = data.dy = 0
        if(wall.key == "platform") {
            const dx = x2-x1, dy = y2-y1, dd = hypot(dx, dy)
            data.uniDirX = dy/dd
            data.uniDirY = -dx/dd
        }
        this.initPhysicsData(data)
    }
    initObject(dt, obj) {
        const data = obj._physicsData ||= { obj }
        const polygon = data.polygon ||= []
        polygon.length = 0
        const { x, y, width, height, speedX, speedY } = obj
        const hWidth = width/2, hHeight = height/2
        const xMin = x - hWidth, yMin = data.yMin = y - hHeight, xMax = data.xMax = x + hWidth, yMax = data.yMax = y + hHeight
        polygon.push(
            xMin, yMin,
            xMax, yMin,
            xMax, yMax,
            xMin, yMax,
        )
        data.dx = speedX * dt
        data.dy = speedY * dt
        this.initPhysicsData(data)
    }
    initPhysicsData(physicsData) {
        const { polygon, dx, dy } = physicsData
        // min/max
        const minDx = (dx<0 ? dx : 0), minDy = (dy<0 ? dy : 0)
        const maxDx = (dx>0 ? dx : 0), maxDy = (dy>0 ? dy : 0)
        let minX, minY, maxX, maxY, sMinX, sMinY, sMaxX, sMaxY
        for(let i=0; i<polygon.length; i+=2) {
            const x = polygon[i], y = polygon[i+1]
            if(i == 0) {
                minX = maxX = x
                minY = maxY = y
                sMinX = x + minDx
                sMinY = y + minDy
                sMaxX = x + maxDx
                sMaxY = y + maxDy
            } else {
                minX = min(minX, x)
                minY = min(minY, y)
                maxX = max(maxX, x)
                maxY = max(maxY, y)
                sMinX = min(sMinX, x + minDx)
                sMinY = min(sMinY, y + minDy)
                sMaxX = max(sMaxX, x + maxDx)
                sMaxY = max(sMaxY, y + maxDy)
            }
        }
        assign(physicsData, { minX, minY, maxX, maxY, sMinX, sMinY, sMaxX, sMaxY })
        // normals
        const normals = physicsData.normals ||= []
        normals.length = 0
        for(let i=0; i<polygon.length/2; i+=2) {  // /2 because of symetry
            const edgeX = polygon[i+2] - polygon[i]
            const edgeY = polygon[i+3] - polygon[i+1]
            //if(edgeX == 0 || edgeY == 0) continue  // case already managed by min/max
            const size = max(1, hypot(edgeX, edgeY))
            normals.push(edgeY/size, -edgeX/size)
        }
        if(dx != 0 && dy != 0) normals.push(dy, -dx)
    }
    apply(dt, objects) {
        // apply blocks and speeds
        const blockers = []
        this.scene.walls.forEach(w => blockers.push(w))
        objects.forEach(obj => {
            if(obj.canBlock) {
                this.initObject(0, obj)
                blockers.push(obj)
            }
        })
        objects.forEach(obj => {
            if(!(obj.canMove || obj.checkBlocksAnyway)) return
            let remD = 1, nbCollisions = 0
            if(obj.affectedByGravity) this.applyGravity(dt, obj)
            const { x: objOrigX, y: objOrigY, speedX: objOrigSpdX, speedY: objOrigSpdY } = obj
            const objOrigDx = objOrigSpdX * dt, objOrigDy = objOrigSpdY * dt
            if((obj.canGetBlocked || obj.checkBlocksAnyway) && (objOrigSpdX != 0 || objOrigSpdY != 0)) {
                const objOrigD = dist(objOrigDx, objOrigDy) * dt
                colWalls.clear()
                while(remD > 0) {
                    colRes.time = Infinity
                    this.initObject(dt*remD, obj)
                    let { speedX: objSpdX, speedY: objSpdY } = obj
                    const objData = obj._physicsData
                    const {
                        minX: objMinX, minY: objMinY, maxX: objMaxX, maxY: objMaxY,
                        sMinX: objSMinX, sMinY: objSMinY, sMaxX: objSMaxX, sMaxY: objSMaxY,
                    } = objData
                    for(let wall of blockers) {
                        if(obj == wall) continue
                        const wallData = wall._physicsData
                        // quick filteringgs
                        if(objSMinX > wallData.sMaxX || objSMaxX < wallData.sMinX || objSMinY > wallData.sMaxY || objSMaxY < wallData.sMinY) continue
                        // detect collision
                        detectCollisionTime(objData, wallData, wallColRes)
                        if(wallColRes.time == Infinity) continue
                        if(wallColRes.time < colRes.time) assign(colRes, wallColRes)
                        if(colRes.time == 0) break
                    }
                    if(colRes.time == Infinity) break
                    // collision detected...
                    nbCollisions += 1
                    const  { dx: objDx, dy: objDy } = objData
                    const { time: colTime, dist: colDist, distFixSign: colDistFixSign, normalX: colNormalX, normalY: colNormalY } = colRes
                    // move
                    if(obj.canMove) {
                        if(colTime > 0) {
                            // move
                            let dx = objDx * colTime, dy = objDy * colTime
                            if(dx > 0) dx -= min(dx, FLOAT_PRECISION_CORRECTION)
                            else if(dx < 0) dx -= max(dx, -FLOAT_PRECISION_CORRECTION)
                            if(dy > 0) dy -= min(dy, FLOAT_PRECISION_CORRECTION)
                            else if(dy < 0) dy -= max(dy, -FLOAT_PRECISION_CORRECTION)
                            obj.x += dx
                            obj.y += dy
                            // compute remaining speed
                            projection(objSpdX, objSpdY, colNormalY, -colNormalX, projRes)
                            obj.speedX = projRes.x; obj.speedY = projRes.y
                            // stop collisions detection condition
                            const objD = hypot(objDx, objDy), colD = objD * colTime
                            remD -= colD / objOrigD
                            if(hypot(obj.speedX, obj.speedY) * remD < 1) remD = 0
                            // callbacks
                            obj.onGetBlocked(colRes.obj)
                            colRes.obj.onBlock(obj)
                        } else {
                            obj.x += colNormalX * colDistFixSign * (colDist - FLOAT_PRECISION_CORRECTION)
                            obj.y += colNormalY * colDistFixSign * (colDist - FLOAT_PRECISION_CORRECTION)
                        }
                        if(nbCollisions==5) remD = 0
                    } else {
                        remD = 0
                    }
                    obj.onGetBlocked(null, colRes)
                }
            }
            // last move
            if(remD > 0 && obj.canMove) {
                obj.x += obj.speedX * dt * remD
                obj.y += obj.speedY * dt * remD
            }
            // determine speed resistance
            if(nbCollisions == 0) {
                obj.speedResX = obj.speedResY = 0
            } else {
                obj.speedResX = ((obj.x - objOrigX) - objOrigDx) / dt
                obj.speedResY = ((obj.y - objOrigY) - objOrigDy) / dt
            }
        })

        // check hits

        const hitGroups = ["physics", "health", "collect"]
        const canHitObjs = [], canBeHitObjs = []
        objects.forEach(obj => {
            if(!obj.canHitGroup) return
            let canHitGroupBites = 0, canBeHitGroupBites = 0
            for(let idx in hitGroups) {
                const hitGroup = hitGroups[idx]
                if(obj.canHitGroup(hitGroup)) canHitGroupBites |= (1 << idx)
                if(obj.canBeHitAsGroup(hitGroup)) canBeHitGroupBites += (1 << idx)
            }
            if(canHitGroupBites) {
                obj._canHitGroupBites = canHitGroupBites
                canHitObjs.push(obj)
            }
            if(canBeHitGroupBites) {
                obj._canBeHitGroupBites = canBeHitGroupBites
                canBeHitObjs.push(obj)
            }
        })

        for(let obj1 of canHitObjs) {
            for(let obj2 of canBeHitObjs) {
                if(obj1 === obj2) continue
                if(obj1._canHitHash | obj2._canBeHitHash == 0) continue
                if(!obj1.canHitObject(obj2)) continue
                if(checkHit(obj1, obj2)) {  // TODO: do not use checkHit
                    obj1.hit(obj2)
                }
            }
        }
    }

    applyGravity(dt, obj) {
        const { gravityAcc, gravityMaxSpeed } = this
        if(obj.speedY >= gravityMaxSpeed) return
        obj.speedY = min(obj.speedY + gravityAcc * dt, gravityMaxSpeed)
    }
}

// Fonction principale pour détecter le moment de collision
function detectCollisionTime(physicsData1, physicsData2, res) {
    res.obj = null
    res.time = 0
    res.dist = -Infinity
    res.distFixSign = 0
    res.normalX = null
    res.normalY = null
    if(_checkUniDir(physicsData1, physicsData2)
    || _checkUniDir(physicsData2, physicsData1)) {
        res.time = Infinity
        return
    }
    _detectCollisionTime(physicsData1, physicsData2, 0, res)
    if(res.time == Infinity) return
    _detectCollisionTime(physicsData1, physicsData2, 1, res)
    _checkUniDir2(physicsData1, physicsData2, res)
}

function _checkUniDir(physicsData1, physicsData2) {
    if(physicsData1.uniDirX === undefined) return false
    const { dx: dx1, dy: dy1 } = physicsData1
    const { dx: dx2, dy: dy2 } = physicsData2
    const dx = dx2-dx1, dy = dy2-dy1
    const dp = dotProduct(dx, dy, physicsData1.uniDirX, physicsData1.uniDirY)
    return dp >= 0
}

function _checkUniDir2(physicsData1, physicsData2, res) {
    if(physicsData1.uniDirX === undefined && physicsData2.uniDirX === undefined) return
    if(res.dist < -1) res.time = Infinity
}

const resProj1 = {}, resProj2 = {}, resOverlapTime = {}
function _detectCollisionTime(physicsData1, physicsData2, num, res) {
    const pdata1 = (num==0) ? physicsData1 : physicsData2
    const pdata2 = (num==1) ? physicsData1 : physicsData2
    const { polygon: poly1, dx: dx1, dy: dy1, normals } = pdata1
    const { polygon: poly2, dx: dx2, dy: dy2} = pdata2
    const dx = dx1-dx2, dy = dy1-dy2
    for(let i=0; i<normals.length; i+=2) {
        const ax = normals[i], ay = normals[i+1]
        projectPolygonOnAxis(poly1, ax, ay, resProj1) // TODO: cache me
        projectPolygonOnAxis(poly2, ax, ay, resProj2)
        let relSpdProj = dx * ax + dy * ay
        getOverlapTime(resProj1, resProj2, relSpdProj, resOverlapTime)
        const { time: colTime, dist: colDist, distFixSign: colDistFixSign } = resOverlapTime
        if(colTime < res.time) continue
        if(colTime == 0 && colDist < res.dist) return
        res.obj = physicsData2.obj
        res.time = colTime
        res.dist = colDist
        res.distFixSign = colDistFixSign
        res.normalX = ax
        res.normalY = ay
        if(colTime == Infinity) break
    }
}

// Fonction pour trouver le temps de chevauchement des projections sur un axe
function getOverlapTime(proj1, proj2, relSpdProj, res) {

    const dist12 = proj1.min - proj2.max, dist21 = proj2.min - proj1.max
    const colDist = max(dist12, dist21)
    res.dist = colDist
    res.distFixSign = (dist12 > dist21) ? 1 : -1
    if(colDist <= 0) {
        // static collision detected
        res.time = 0
        return
    }

    if (relSpdProj === 0) {
        // static without collision
        res.time = Infinity
        return
    }

    const t1 = dist21 / relSpdProj
    const t2 = -dist12 / relSpdProj
    const tEnter = min(t1, t2), tExit = max(t1, t2)
    if(tExit < 0 || tEnter > 1) res.time = Infinity
    else res.time = tEnter
}

// Fonction pour projeter un polygone sur un axe
function projectPolygonOnAxis(polygon, ax, ay, res) {
    const polyLen = polygon.length
    let pmin = Infinity, pmax = -Infinity
    for(let i=0; i<polyLen; i+=2) {
        const x = polygon[i], y = polygon[i+1]
        const proj = x * ax + y * ay
        pmin = min(pmin, proj)
        pmax = max(pmax, proj)
    }
    res.min = pmin
    res.max = pmax
}

function dotProduct(x1, y1, x2, y2) {
    return x1 * x2 + y1 * y2
}

function projection(x1, y1, x2, y2, res) {
    const d22 = dist2(x2, y2)
    const dp = dotProduct(x1, y1, x2, y2)
    res.x = dp * x2 / d22
    res.y = dp * y2 / d22
}

function dist(x, y) {
    return sqrt(x ** 2 + y ** 2)
}

function dist2(x, y) {
    return x ** 2 + y ** 2
}
