const { abs, floor, ceil, min, max, pow, sqrt, hypot, atan2, PI, random } = Math
const { assign } = Object
import * as utils from './utils.mjs'
const { checkHit } = utils

const FLOAT_PRECISION_CORRECTION = .00001
const DEFAULT_GRAVITY_ACC = 1000
const DEFAULT_GRAVITY_MAX_SPEED = 1000


const colRes = {}, blockerColRes = {}, projRes = {}

export default class PhysicsEngine {
    constructor(scn) {
        this.scene = scn
        this.gravityAcc = scn?.physicsManager.gravityAcc ?? DEFAULT_GRAVITY_ACC
        this.gravityMaxSpeed = scn?.physicsManager.gravityMaxSpeed ?? DEFAULT_GRAVITY_MAX_SPEED
    }
    getObjectHitProps(obj, dt) {
        const props = obj.getHitProps(dt)
        props.obj = obj
        const { polygon, dx, dy } = props
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
        assign(props, { minX, minY, maxX, maxY, sMinX, sMinY, sMaxX, sMaxY })
        // normals
        const normals = props.normals ||= []
        normals.length = 0
        for(let i=0; i<polygon.length/2; i+=2) {  // /2 because of symetry
            const edgeX = polygon[i+2] - polygon[i]
            const edgeY = polygon[i+3] - polygon[i+1]
            //if(edgeX == 0 || edgeY == 0) continue  // case already managed by min/max
            const size = max(1, hypot(edgeX, edgeY))
            normals.push(edgeY/size, -edgeX/size)
        }
        if(dx != 0 && dy != 0) normals.push(dy, -dx)
        return props
    }
    apply(dt, objects) {
        // apply blocks and speeds
        const blockersProps = []
        objects.forEach(obj => {
            if(obj.canBlock) {
                blockersProps.push(this.getObjectHitProps(obj, 0))
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
                while(remD > 0) {
                    colRes.time = Infinity
                    const objProps = this.getObjectHitProps(obj, dt*remD)
                    let { speedX: objSpdX, speedY: objSpdY } = obj
                    const {
                        minX: objMinX, minY: objMinY, maxX: objMaxX, maxY: objMaxY,
                        sMinX: objSMinX, sMinY: objSMinY, sMaxX: objSMaxX, sMaxY: objSMaxY,
                    } = objProps
                    for(let blockerProps of blockersProps) {
                        if(obj == blockerProps.obj) continue
                        // quick filteringgs
                        if(objSMinX > blockerProps.sMaxX || objSMaxX < blockerProps.sMinX || objSMinY > blockerProps.sMaxY || objSMaxY < blockerProps.sMinY) continue
                        // detect collision
                        detectCollisionTime(objProps, blockerProps, blockerColRes)
                        if(blockerColRes.time == Infinity) continue
                        if(blockerColRes.time < colRes.time) assign(colRes, blockerColRes)
                        if(colRes.time == 0) break
                    }
                    if(colRes.time == Infinity) break
                    // collision detected...
                    nbCollisions += 1
                    const  { dx: objDx, dy: objDy } = objProps
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
                            const projVal = hypot(projRes.x, projRes.y)
                            if (projVal == 0) {
                                obj.speedX = obj.speedY = 0
                            } else {
                                const staticFriction = min(obj.physicsStaticFriction, colRes.obj.physicsStaticFriction)
                                const dynamicFriction = min(obj.physicsDynamicFriction, colRes.obj.physicsDynamicFriction)
                                const friction = (dynamicFriction*projVal + staticFriction) * remD*dt
                                const glideFactor = max(0, 1-friction/projVal)
                                obj.speedX = projRes.x * glideFactor
                                obj.speedY = projRes.y * glideFactor
                            }
                            const bounciness = max(obj.physicsBounciness, colRes.obj.physicsBounciness)
                            if(bounciness > 0) {
                                const rmSpdX = objSpdX - projRes.x,  rmSpdY = objSpdY - projRes.y
                                obj.speedX -= rmSpdX * bounciness
                                obj.speedY -= rmSpdY * bounciness
                            }
                            // stop collisions detection condition
                            const objD = hypot(objDx, objDy), colD = objD * colTime
                            remD -= colD / objOrigD
                            if(hypot(obj.speedX, obj.speedY) * remD < 1) remD = 0
                        } else {
                            // static collision : fix position
                            obj.x += colNormalX * colDistFixSign * (colDist - FLOAT_PRECISION_CORRECTION)
                            obj.y += colNormalY * colDistFixSign * (colDist - FLOAT_PRECISION_CORRECTION)
                        }
                        if(nbCollisions==5) remD = 0
                    } else {
                        remD = 0
                    }
                    // callbacks
                    const colDetails = getCollisionDetails(colRes)
                    obj.onGetBlocked(colRes.obj, colDetails)
                    colRes.obj.onBlock(obj, colDetails)
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
            const obj1Props = this.getObjectHitProps(obj1, 0)
            for(let obj2 of canBeHitObjs) {
                if(obj1 === obj2) continue
                if(obj1._canHitHash | obj2._canBeHitHash == 0) continue
                if(!obj1.canHitObject(obj2)) continue
                const obj2Props = this.getObjectHitProps(obj2, 0)
                detectCollisionTime(obj1Props, obj2Props, blockerColRes)
                if(blockerColRes.time == 0) {
                    obj1.hit(obj2, getCollisionDetails(blockerColRes))
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
function detectCollisionTime(hitProps1, hitProps2, res) {
    res.obj = null
    res.time = 0
    res.dist = -Infinity
    res.distFixSign = 0
    res.normalX = null
    res.normalY = null
    if(_checkUniDir(hitProps1, hitProps2)
    || _checkUniDir(hitProps2, hitProps1)) {
        res.time = Infinity
        return
    }
    _detectCollisionTime(hitProps1, hitProps2, 0, res)
    if(res.time == Infinity) return
    _detectCollisionTime(hitProps1, hitProps2, 1, res)
    _checkUniDir2(hitProps1, hitProps2, res)
}

function _checkUniDir(hitProps1, hitProps2) {
    if(hitProps1.uniDirX === null) return false
    const { dx: dx1, dy: dy1 } = hitProps1
    const { dx: dx2, dy: dy2 } = hitProps2
    const dx = dx2-dx1, dy = dy2-dy1
    const dp = dotProduct(dx, dy, hitProps1.uniDirX, hitProps1.uniDirY)
    return dp >= 0
}

function _checkUniDir2(hitProps1, hitProps2, res) {
    if(hitProps1.uniDirX === null && hitProps2.uniDirX === null) return
    if(res.dist < -1) res.time = Infinity
}

const resProj1 = {}, resProj2 = {}, resOverlapTime = {}
function _detectCollisionTime(hitProps1, hitProps2, num, res) {
    const pprops1 = (num==0) ? hitProps1 : hitProps2
    const pprops2 = (num==1) ? hitProps1 : hitProps2
    const { polygon: poly1, dx: dx1, dy: dy1, normals } = pprops1
    const { polygon: poly2, dx: dx2, dy: dy2} = pprops2
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
        res.obj = hitProps2.obj
        res.time = colTime
        res.dist = colDist
        res.distFixSign = colDistFixSign * (num==0 ? 1 : -1)
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
    res.distFixSign = (dist12 < dist21) ? 1 : -1
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

function getCollisionDetails(colRes) {
    const { normalX, normalY, distFixSign } = colRes
    const colAngle = atan2(-normalY*distFixSign, -normalX*distFixSign)
    return { angle: colAngle*180/PI }
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

function sign(val) {
    if(val == 0) return 0
    else if(val > 0) return 1
    else return -1
}