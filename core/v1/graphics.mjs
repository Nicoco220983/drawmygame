import * as utils from './utils.mjs'
const { urlAbsPath, checkHit, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, addNewDomEl, importJs } = utils


export class GraphicsProps {
    constructor(kwargs) {
        this.x = kwargs?.x ?? 0
        this.y = kwargs?.y ?? 0
        this.color = kwargs?.color
        this.img = kwargs?.img
        this.width = kwargs?.width ?? 50
        this.height = kwargs?.height ?? 50
        this.dirX = kwargs?.dirX ?? 1
        this.dirY = kwargs?.dirY ?? 1
        this.visibility = kwargs?.visibility ?? 1
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
                ctx.fillStyle = props.color
                ctx.fillRect(0, 0, can.width, can.height)
            }
            if(props.img) {
                const img = this.transformImg(props.img, props.width, props.height, props.dirX, props.dirY, props.visibility)
                if(img && img.width>0 && img.height>0) {
                    ctx.drawImage(img, ~~(props.x - img.width/2), ~~(props.y - img.height/2))
                }
            }
        }
    }

    transformImg(baseImg, width, height, dirX, dirY, visibility) {
        const key = `${width}:${height}:${dirX}:${dirY}:${visibility}`
        const transImgs = baseImg._transImgs ||= {}
        let resImg = transImgs[key]
        if(resImg) return resImg
        if(baseImg.unloaded || baseImg.width==0 || baseImg.height==0) return null // TODO: deprecate it
        const { width: baseWidth, height: baseHeight } = baseImg
        resImg = transImgs[key] = newCanvas(width, height)
        const ctx = resImg.getContext("2d")
        ctx.translate(dirX >= 0 ? 0 : width, dirY >= 0 ? 0 : height)
        ctx.scale(width/baseWidth * dirX, height/baseHeight * dirY)
        ctx.globalAlpha = visibility
        ctx.drawImage(baseImg, 0, 0)
        return resImg
    }
}