const { round, PI } = Math
const { assign } = Object
import * as utils from './utils.mjs'
const { urlAbsPath, checkHit, sumTo, newCanvas, addCanvas, cloneCanvas, colorizeCanvas, newDomEl, addNewDomEl, importJs } = utils


/**
 * The graphical properties of an object.
 * It contains all the information needed to draw an object.
 * @param {object} kwargs The properties to assign.
 */
export class GraphicsProps {

    static {
        assign(this.prototype, {
            /** @type {string} */
            color: null,
            /** @type {HTMLImageElement} */
            img: null,
            /** @type {number} */
            x: 0,
            /** @type {number} */
            y: 0,
            /** @type {number} */
            width: 50,
            /** @type {number} */
            height: 50,
            /** @type {number} */
            dirX: 1,
            /** @type {number} */
            dirY: 1,
            /** @type {number} */
            angle: 0,
            /** @type {number} */
            order: 0,
            /** @type {number} */
            visibility: 1,
            /** @type {string} */
            colorize: null,
        })
    }

    constructor(kwargs) {
        assign(this, kwargs)
    }

    /**
     * Draws the object.
     * @param {GraphicsEngine} drawer The graphics engine to use.
     */
    draw(drawer) {
        drawer.draw(this)
    }
}


/**
 * The graphics engine of the game.
 * It is responsible for drawing objects on the screen.
 * @param {Scene} scn The scene to draw.
 */
export class GraphicsEngine {
    constructor(scn) {
        this.scene = scn
    }

    /**
     * Draws the objects.
     * @param  {...GraphicsProps} propss The properties of the objects to draw.
     */
    draw(...propss) {
        propss.sort((p1, p2) => p1.order - p2.order)
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

    /**
     * Transforms an image.
     * It can resize, flip, rotate, and colorize an image.
     * @param {HTMLImageElement} baseImg The image to transform.
     * @param {number} width The new width of the image.
     * @param {number} height The new height of the image.
     * @param {number} dirX The direction of the x-axis.
     * @param {number} dirY The direction of the y-axis.
     * @param {number} angle The angle of rotation.
     * @param {number} visibility The visibility of the image.
     * @param {string} colorize The color to use for colorization.
     * @returns {HTMLCanvasElement} The transformed image.
     */
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