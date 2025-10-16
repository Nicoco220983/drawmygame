const { round, PI } = Math
const { assign } = Object
import * as utils from './utils.mjs'
const { urlAbsPath, checkHit, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, addNewDomEl, importJs } = utils


export class GraphicsProps {

    static {
        assign(this.prototype, {
            color: null,
            img: null,
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            dirX: 1,
            dirY: 1,
            angle: 0,
            visibility: 1,
            colorize: null,
        })
    }

    constructor(kwargs) {
        assign(this, kwargs)
    }

    draw(drawer) {
        drawer.draw(this)
    }
}


export class GraphicsEngine {
    constructor(scn) {
        this.scene = scn
    }

    draw(...propss) {
        const scn = this.scene, can = scn.canvas
        const ctx = can.getContext("2d")
        for(let props of propss) {
            if(props.color) {
                ctx.save()
                ctx.fillStyle = props.color
                ctx.globalAlpha = props.visibility
                ctx.fillRect(~~(props.x - props.width/2), ~~(props.y - props.height/2), props.width, props.height)
                ctx.restore()
            }
            if(props.img) {
                const img = this.transformImg(props.img, props.width, props.height, props.dirX, props.dirY, props.angle, props.visibility, props.colorize)
                if(img && img.width>0 && img.height>0) {
                    ctx.drawImage(img, ~~(props.x - img.width/2), ~~(props.y - img.height/2))
                }
            }
        }
    }

    transformImg(baseImg, width, height, dirX, dirY, angle, visibility, colorize) {
        width = round(width)
        height = round(height)
        angle = round(angle)
        const key = `${width}:${height}:${dirX}:${dirY}:${angle}:${visibility}:${colorize}`
        const transImgs = baseImg._transImgs ||= {}
        let resImg = transImgs[key]
        if(resImg) return resImg
        if(baseImg.unloaded || baseImg.width==0 || baseImg.height==0) return null // TODO: deprecate it
        const { width: baseWidth, height: baseHeight } = baseImg
        resImg = transImgs[key] = newCanvas(width, height)
        const ctx = resImg.getContext("2d")
        ctx.save()
        ctx.scale(width/baseWidth * dirX, height/baseHeight * dirY)
        ctx.translate(baseWidth/2 * dirX, baseHeight/2 * dirY)
        ctx.rotate(angle * PI / 180)
        ctx.globalAlpha = visibility
        ctx.drawImage(baseImg, -baseWidth/2, -baseHeight/2)
        ctx.restore()
        if(colorize) colorizeCanvas(resImg, colorize)
        return resImg
    }
}