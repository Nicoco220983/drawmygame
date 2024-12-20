const { abs, floor, ceil, min, max, pow, sqrt, atan2, PI, random } = Math
const { assign } = Object

const FLOAT_PRECISION_CORRECTION = .00001

const NO_COLLISION_WITH_SPEED = 0
const NO_COLLISION_WITHOUT_SPEED = 1
const COLLISION_WITHOUT_SPEED = 2


const colRes = {}, projRes = {}, fixRes = {}

export default class PhysicsEngine {
    constructor(game) {
        this.game = game
        this.syncMap()
    }
    syncMap() {
        this.game.map.walls.forEach(wall => this.initWall(wall))
    }
    initWall(wall) {
        const data = wall.physicData ||= {}
        const polygon = data.polygon ||= []
        const { x1, x2, y1, y2 } = wall
        polygon.length = 0
        polygon.push(
            x1, y1,
            x2, y2,
        )
        data.dx = data.dy = 0
        this.initPhysicData(data)
    }
    initEntity(dt, ent) {
        const data = ent.physicData ||= {}
        const polygon = data.polygon ||= []
        polygon.length = 0
        const { x, y, width, height, speedX, speedY } = ent
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
        this.initPhysicData(data)
    }
    initPhysicData(physicData) {
        const { polygon, dx, dy } = physicData
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
        assign(physicData, { minX, minY, maxX, maxY, sMinX, sMinY, sMaxX, sMaxY })
        // normals
        const normals = physicData.normals ||= []
        for(let i=0; i<polygon.length/2; i+=2) {  // /2 because of symetry
            const edgeX = polygon[i+2] - polygon[i]
            const edgeY = polygon[i+3] - polygon[i+1]
            if(edgeX == 0 || edgeY == 0) continue  // case already managed by min/max
            normals.push(edgeY, -edgeX)
        }
        if(dx != 0 && dy != 0) normals.push(dy, -dx)
    }
    apply(dt, entities) {
        const { walls } = this.game.map
        const gravity = this.game.physicGravity
        entities.forEach(ent => {
            if(!ent.undergoPhysic) return
            let remD = 1, nbCollisions = 0, nbFixes = 0
            if(ent.undergoGravity) ent.speedY += gravity * dt
            const { x: entOrigX, y: entOrigY, speedX: entOrigSpdX, speedY: entOrigSpdY } = ent
            const entOrigDx = entOrigSpdX * dt, entOrigDy = entOrigSpdY * dt
            if(ent.undergoWalls && (entOrigSpdX != 0 || entOrigSpdY != 0)) {
                const entOrigD = dist(entOrigDx, entOrigDy) * dt
                while(remD > 0) {
                    colRes.d2 = null
                    this.initEntity(dt*remD, ent)
                    const entData = ent.physicData
                    const {
                        minX: entMinX, minY: entMinY, maxX: entMaxX, maxY: entMaxY,
                        sMinX: entSMinX, sMinY: entSMinY, sMaxX: entSMaxX, sMaxY: entSMaxY,
                    } = entData
                    let fixed = false
                    for(let wall of walls) {
                        let col = COLLISION_WITHOUT_SPEED
                        const wallData = wall.physicData
                        // quick filtering
                        if(entSMinX > wallData.sMaxX || entSMaxX < wallData.sMinX || entSMinY > wallData.sMaxY || entSMaxY < wallData.sMinY) return
                        if(entMinX > wallData.maxX || entMaxX < wallData.minX || entMinY > wallData.maxY || entMaxY < wallData.minY) col = NO_COLLISION_WITHOUT_SPEED
                        // less quick but more exact filtering
                        col = min(col, detectCollision(col, entData, wallData))
                        if(col == NO_COLLISION_WITH_SPEED) continue
                        // if(col == COLLISION_WITHOUT_SPEED && fixCollision(entData, wallData, fixRes)) {
                        //     fixed = true; nbFixes += 1; break
                        // }
                        // determine closest collision point
                        determineClosestCollisionPoint(col, entData, wallData, colRes)
                    }
                    if(nbFixes==3) remD = 0
                    if(fixed) continue
                    if(colRes.d2 !== null) {
                        nbCollisions += 1
                        const { speedX: entSpdX, speedY: entSpdY } = ent
                        const  { dx: entDx, dy: entDy } = entData
                        const { d2: colD2, edgeX: colEdgeX, edgeY: colEdgeY } = colRes
                        const entD = dist(entDx, entDy), colD = sqrt(colD2), df = colD / entD
                        // move
                        ent.x += entDx * df
                        ent.y += entDy * df
                        // move away entity a bit from wall to avoid float precision error
                        ent.x -= (entDx / entD) * FLOAT_PRECISION_CORRECTION
                        ent.y -= (entDy / entD) * FLOAT_PRECISION_CORRECTION
                        // compute remaining speed
                        projection(entSpdX, entSpdY, colEdgeX, colEdgeY, projRes)
                        ent.speedX = projRes.x; ent.speedY = projRes.y
                        // stop collisions detection condition
                        remD -= colD / entOrigD
                        if(dist(ent.speedX, ent.speedY) * remD < 1) remD = 0
                        if(nbCollisions==3) remD = 0
                    } else break
                }
            }
            if(remD > 0) {
                ent.x += ent.speedX * dt * remD
                ent.y += ent.speedY * dt * remD
            }
            // determine speed resistance
            if(nbCollisions == 0) {
                ent.speedResX = ent.speedResY = 0
            } else {
                ent.speedResX = ((ent.x - entOrigX) - entOrigDx) / dt
                ent.speedResY = ((ent.y - entOrigY) - entOrigDy) / dt
            }
        })
    }
}

function detectCollision(col, physicData1, physicData2) {
    const { normals: normals1 } = physicData1
    const { normals: normals2 } = physicData2
    for(let i=0; i<normals1.length; i+=2) {
        col = min(col, detectCollisionOnAxis(physicData1, physicData2, normals1[i], normals1[i+1]))
        if(col == NO_COLLISION_WITH_SPEED) return NO_COLLISION_WITH_SPEED
    }
    for(let i=0; i<normals2.length; i+=2) {
        col = min(col, detectCollisionOnAxis(physicData1, physicData2, normals2[i], normals2[i+1]))
        if(col == NO_COLLISION_WITH_SPEED) return NO_COLLISION_WITH_SPEED
    }
    return col
}

const resProj1 = {}, resProj2 = {}
function detectCollisionOnAxis(physicData1, physicData2, ax, ay) {
    projectOnAxis(physicData1, ax, ay, resProj1)
    projectOnAxis(physicData2, ax, ay, resProj2)
    if(resProj1.sMax < resProj2.sMin || resProj2.sMax < resProj1.sMin) return NO_COLLISION_WITH_SPEED
    if(resProj1.max < resProj2.min || resProj2.max < resProj1.min) return NO_COLLISION_WITHOUT_SPEED
    return COLLISION_WITHOUT_SPEED
}

function projectOnAxis(physicData, ax, ay, res) {
    const { dx, dy, polygon } = physicData
    const hasSpeed = dx!=0 || dy!=0
    for(let i=0; i<polygon.length; i+=2) {
        const x = polygon[i], y = polygon[i+1]
        const p = x * ax + y * ay
        if(i==0) {
            res.min = res.sMin = p
            res.max = res.sMax = p
        } else {
            res.min = min(p, res.min)
            res.max = max(p, res.max)
            if(hasSpeed) {
                const p2 = (x + dx) * ax + (y + dy) * ay
                res.sMin = min(p2, res.sMin)
                res.sMax = max(p2, res.sMax)
            } else {
                res.sMin = res.min
                res.sMax = res.max
            }
        }
    }
}

const centerRes1 = {}, centerRes2 = {}, interRes1 = {}, interRes2 = {}
function fixCollision(physicData1, physicData2, res) {
    const _getCenter = function(physicData, centerRes) {
        centerRes.x = 0; centerRes.y = 0
        const poly = physicData.polygon
        for(let i=0; i<poly.length; i+=2) {
            centerRes.x += poly[i]
            centerRes.y += poly[i+1]
        }
        centerRes.x /= poly.length / 2
        centerRes.y /= poly.length / 2
    }
    _getCenter(physicData1, centerRes1)
    _getCenter(physicData2, centerRes2)
    const _getIntersection = function(physicData, interRes) {
        interRes.x = null; interRes.y = null
        const poly = physicData.polygon, polyLen = poly.length
        const polyLen2 = (polyLen > 4) ? polyLen : (polyLen -2)  // optim for segments
        for(let i=0; i<polyLen2; i+=2) {
            if(intersection(poly[i], poly[i+1], poly[(i+2)%polyLen], poly[(i+3)%polyLen], centerRes1.x, centerRes1.y, centerRes2.x, centerRes2.y, interRes))
                break
        }
    }
    _getIntersection(physicData1, interRes1)
    const _interRes1 = (interRes1.x !== null) ? interRes1 : centerRes1
    _getIntersection(physicData2, interRes2)
    const _interRes2 = (interRes2.x !== null) ? interRes2 : centerRes2
    res.x = _interRes2.x - _interRes1.x
    res.y = _interRes2.y - _interRes1.y
}

const interRes = {}
function determineClosestCollisionPoint(col, physicData1, physicData2, res) {
    const _determineClosestCollisionPoint = (data1, data2, dir) => {
        const { polygon: poly1, dx: dx1, dy: dy1 } = data1
        const { polygon: poly2, dx: dx2, dy: dy2 } = data2
        // loop on data1 extremities
        for(let i1=0; i1<poly1.length; i1+=2) {
            const x1 = poly1[i1], y1 = poly1[i1+1]
            // loop on data2 edges
            const polyLen2 = poly2.length, polyLen2ToLoop = polyLen2 <=4 ? 1 : polyLen2
            for(let i2=0; i2<polyLen2ToLoop; i2+=2) {
                const x21 = poly2[i2], y21 = poly2[i2+1], x22 = poly2[(i2+2)%polyLen2], y22 = poly2[(i2+3)%polyLen2]
                const dx = dx1 - dx2, dy = dy1 - dy2
                if(intersection(x1, y1, x1+dx, y1+dy, x21, y21, x22, y22, interRes)) {
                    const interDx = (interRes.x - x1) * dir, interDy = (interRes.y - y1) * dir
                    const d2 = dist2(interDx, interDy)
                    if(res.d2 === null || res.d2 > d2) {
                        res.d2 = d2
                        res.edgeX = x21 - x22
                        res.edgeY = y21 - y22
                    }
                }
            }
        }
    }
    _determineClosestCollisionPoint(physicData1, physicData2, 1)
    _determineClosestCollisionPoint(physicData2, physicData1, -1)
}

function intersection(x1, y1, x2, y2, x3, y3, x4, y4, res) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if (denom === 0) return false  // parallel case
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        res.x = x1 + t * (x2 - x1)
        res.y = y1 + t * (y2 - y1)
        return true
    }
    return false
}

function projection(x1, y1, x2, y2, res) {
    const d22 = dist2(x2, y2)
    const dotProduct = x1 * x2 + y1 * y2
    res.x = dotProduct * x2 / d22
    res.y = dotProduct * y2 / d22
}

function dist(x, y) {
    return sqrt(x ** 2 + y ** 2)
}

function dist2(x, y) {
    return x ** 2 + y ** 2
}