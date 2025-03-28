const { abs, floor, ceil, min, max, pow, sqrt, hypot, atan2, PI, random } = Math
const { assign } = Object

const FLOAT_PRECISION_CORRECTION = .00001
const GRAVITY = 1000


const colRes = {}, wallColRes = {}, projRes = {}, fixRes = {}, detectColRes = {}, colWalls = new Set()

export default class PhysicsEngine {
    constructor(game, kwargs) {
        this.game = game
        this.gravity = kwargs && kwargs.gravity || GRAVITY
        this.syncMap()
    }
    syncMap() {
        this.game.map.walls.forEach(wall => this.initWall(wall))
    }
    initWall(wall) {
        const data = wall._physicsData ||= {}
        const polygon = data.polygon ||= []
        const { x1, x2, y1, y2 } = wall
        polygon.length = 0
        polygon.push(
            x1, y1,
            x2, y2,
        )
        data.dx = data.dy = 0
        this.initPhysicsData(data)
    }
    initEntity(dt, ent) {
        const data = ent._physicsData ||= {}
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
    apply(dt, entities) {
        const { walls } = this.game.map
        const { gravity } = this
        entities.forEach(ent => {
            const physicsProps = ent.getPhysicsProps()
            if(!physicsProps) return
            let remD = 1, nbCollisions = 0
            if(physicsProps.affectedByGravity) ent.speedY += gravity * dt
            const { x: entOrigX, y: entOrigY, speedX: entOrigSpdX, speedY: entOrigSpdY } = ent
            const entOrigDx = entOrigSpdX * dt, entOrigDy = entOrigSpdY * dt
            if(physicsProps.blockedByWalls && (entOrigSpdX != 0 || entOrigSpdY != 0)) {
                const entOrigD = dist(entOrigDx, entOrigDy) * dt
                colWalls.clear()
                while(remD > 0) {
                    colRes.time = Infinity
                    this.initEntity(dt*remD, ent)
                    const entData = ent._physicsData
                    const {
                        minX: entMinX, minY: entMinY, maxX: entMaxX, maxY: entMaxY,
                        sMinX: entSMinX, sMinY: entSMinY, sMaxX: entSMaxX, sMaxY: entSMaxY,
                    } = entData
                    for(let wall of walls) {
                        if(colWalls.has(wall)) continue
                        const wallData = wall._physicsData
                        // quick filtering
                        if(entSMinX > wallData.sMaxX || entSMaxX < wallData.sMinX || entSMinY > wallData.sMaxY || entSMaxY < wallData.sMinY) continue
                        //if(entMinX > wallData.maxX || entMaxX < wallData.minX || entMinY > wallData.maxY || entMaxY < wallData.minY) col = NO_COLLISION_WITHOUT_SPEED
                        // detect collision
                        detectCollisionTime(entData, wallData, wallColRes)
                        if(wallColRes.time == Infinity) continue
                        if(wallColRes.time < colRes.time) assign(colRes, wallColRes)
                        if(colRes.time == 0) break
                    }
                    if(colRes.time == Infinity) break
                    colWalls.add(colRes.wall)
                    nbCollisions += 1
                    let { speedX: entSpdX, speedY: entSpdY } = ent
                    const  { dx: entDx, dy: entDy } = entData
                    const { time: colTime, dist: colDist, distFixSign: colDistFixSign, normalX: colNormalX, normalY: colNormalY } = colRes
                    if(colTime > 0) {
                        const entD = hypot(entDx, entDy), colD = entD * colTime
                        // move
                        ent.x += entDx * colTime
                        ent.y += entDy * colTime
                        // move away entity a bit from wall to avoid float precision error
                        ent.x -= (entDx / entD) * FLOAT_PRECISION_CORRECTION
                        ent.y -= (entDy / entD) * FLOAT_PRECISION_CORRECTION
                        // compute remaining speed
                        projection(entSpdX, entSpdY, colNormalY, -colNormalX, projRes)
                        ent.speedX = projRes.x; ent.speedY = projRes.y
                        // stop collisions detection condition
                        remD -= colD / entOrigD
                        if(hypot(ent.speedX, ent.speedY) * remD < 1) remD = 0
                    } else {
                        // static collision detected: fix position
                        ent.x += colNormalX * colDistFixSign * (colDist + FLOAT_PRECISION_CORRECTION)
                        ent.y += colNormalY * colDistFixSign * (colDist + FLOAT_PRECISION_CORRECTION)
                    }
                    if(nbCollisions==5) remD = 0
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

// Fonction principale pour détecter le moment de collision
function detectCollisionTime(physicsData1, physicsData2, res) {
    res.time = 0
    res.dist = Infinity
    res.distFixSign = 0
    res.normalX = null
    res.normalY = null
    _detectCollisionTime(physicsData1, physicsData2, physicsData1.normals, res)
    if(res.time == Infinity) return
    _detectCollisionTime(physicsData2, physicsData1, physicsData2.normals, res)
}

const resProj1 = {}, resProj2 = {}, resOverlapTime = {}
function _detectCollisionTime(physicsData1, physicsData2, normals, res) {
    const { polygon: poly1, dx: dx1, dy: dy1 } = physicsData1
    const { polygon: poly2, dx: dx2, dy: dy2 } = physicsData2
    for(let i=0; i<normals.length; i+=2) {
        const ax = normals[i], ay = normals[i+1]
        projectPolygonOnAxis(poly1, ax, ay, resProj1) // TODO: cache me
        projectPolygonOnAxis(poly2, ax, ay, resProj2)
        getOverlapTime(resProj1, resProj2, dx1-dx2, dy1-dy2, ax, ay, resOverlapTime)
        const { time: colTime, dist: colDist, distFixSign: colDistFixSign } = resOverlapTime
        if(colTime < res.time) continue
        if(colTime == 0 && colDist > res.dist) return
        res.time = colTime
        res.dist = colDist
        res.distFixSign = colDistFixSign
        res.normalX = ax
        res.normalY = ay
        if(colTime == Infinity) break
    }
}

// Fonction pour trouver le temps de chevauchement des projections sur un axe
function getOverlapTime(proj1, proj2, spdX, spdY, ax, ay, res) {

    const dist12 = proj1.max - proj2.min, dist21 = proj2.max - proj1.min
    const colDist = min(dist12, dist21)
    res.dist = colDist
    res.distFixSign = (dist12 < dist21) ? 1 : -1
    if(colDist >= 0) {
        // static collision detected
        res.time = 0
        return
    }

    const relSpdProj = spdX * ax + spdY * ay
    if (relSpdProj === 0) {
        // static without collision
        res.time = Infinity
        return
    }

    const t1 = (proj2.min - proj1.max) / relSpdProj
    const t2 = (proj2.max - proj1.min) / relSpdProj
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
