const { abs, floor, ceil, min, max, pow, sqrt, atan2, PI, random } = Math
import * as utils from './utils.mjs'

export default class PhysicsEngine {
    constructor(game) {
        this.game = game
    }
    apply(map, dt, entities) {
        const gravity = this.game.physicsGravity
        const { nbRows, nbCols, boxSize, walls } = map
        const { getHitBox } = utils
        entities.forEach(ent => {
            // gravity
            if(ent.undergoGravity) ent.speedY += gravity * dt
            // speed & collisions
            const { left: entX, top: entY, width: entW, height: entH } = getHitBox(ent)
            const dx = ent.speedX * dt, dy = ent.speedY * dt
            ent.speedResX = 0; ent.speedResY = 0
            if(dx > 0) {
                let blocked = false
                if(ent.undergoWalls) {
                    const bx1 = max(0, min(nbCols-1, ceil((entX + entW/2) / boxSize)))
                    const bx2 = max(0, min(nbCols-1, floor((entX + entW + dx) / boxSize)))
                    for(let bx=bx1; !blocked && bx<=bx2; ++bx) {
                        const ddx = max(0, (bx * boxSize) - (entX + entW))
                        const ddy = dy * ddx / dx
                        const by1 = max(0, min(nbRows-1, floor((entY+ddy+1) / boxSize)))
                        const by2 = max(0, min(nbRows-1, floor((entY+entH+ddy-1) / boxSize)))
                        for(let by=by1; !blocked && by<=by2; ++by) {
                            blocked = (walls[bx][by] == "W")
                        }
                        if(blocked) {
                            ent.x += ddx - 0.01
                            ent.speedX = 0
                            ent.speedResX = ddx - dx
                        }
                    }
                }
                if(!blocked) ent.x += dx
            }
            else if(dx < 0) {
                let blocked = false
                if(ent.undergoWalls) {
                    const bx1 = max(0, min(nbCols-1, floor((entX + entW/2) / boxSize) - 1))
                    const bx2 = max(0, min(nbCols-1, ceil((entX + dx) / boxSize) - 1))
                    for(let bx=bx1; !blocked && bx>=bx2; --bx) {
                        const ddx = min(0, ((bx+1) * boxSize) - entX)
                        const ddy = dy * ddx / dx
                        const by1 = max(0, min(nbRows-1, floor((entY+ddy+1) / boxSize)))
                        const by2 = max(0, min(nbRows-1, floor((entY+entH+ddy-1) / boxSize)))
                        for(let by=by1; !blocked && by<=by2; ++by) {
                            blocked = (walls[bx][by] == "W")
                        }
                        if(blocked) {
                            ent.x += ddx + 0.01
                            ent.speedX = 0
                            ent.speedResX = ddx - dx
                        }
                    }
                }
                if(!blocked) ent.x += dx
            }
            if(dy > 0) {
                let blocked = false
                if(ent.undergoWalls) {
                    const by1 = max(0, min(nbRows-1, ceil((entY + entH/2) / boxSize)))
                    const by2 = max(0, min(nbRows-1, floor((entY + entH + dy) / boxSize)))
                    for(let by=by1; !blocked && by<=by2; ++by) {
                        const ddy = max(0, (by * boxSize) - (entY + entH))
                        const ddx = dx * ddy / dy
                        const bx1 = max(0, min(nbCols-1, floor((entX+ddx+1) / boxSize)))
                        const bx2 = max(0, min(nbCols-1, floor((entX+entW+ddx-1) / boxSize)))
                        for(let bx=bx1; !blocked && bx<=bx2; ++bx) {
                            const wallKey = walls[bx][by]
                            blocked = (wallKey == "W" || wallKey == "P")
                        }
                        if(blocked) {
                            ent.y += ddy - 0.01
                            ent.speedY = 0
                            ent.speedResY = ddy - dy
                        }
                    }
                }
                if(!blocked) ent.y += dy
            }
            else if(dy < 0) {
                let blocked = false
                if(ent.undergoWalls) {
                    const by1 = max(0, min(nbRows-1, floor((entY + entH/2) / boxSize) - 1))
                    const by2 = max(0, min(nbRows-1, ceil((entY + dy) / boxSize) - 1))
                    for(let by=by1; !blocked && by>=by2; --by) {
                        const ddy = min(0, ((by+1) * boxSize) - entY)
                        const ddx = dx * ddy / dy
                        const bx1 = max(0, min(nbCols-1, floor((entX+ddx+1) / boxSize)))
                        const bx2 = max(0, min(nbCols-1, floor((entX+entW+ddx-1) / boxSize)))
                        for(let bx=bx1; !blocked && bx<=bx2; ++bx) {
                            blocked = (walls[bx][by] == "W")
                        }
                        if(blocked) {
                            ent.y += ddy + 0.01
                            ent.speedY = 0
                            ent.speedResY = ddy - dy
                        }
                    }
                }
                if(!blocked) ent.y += dy
            }
        })
    }
}