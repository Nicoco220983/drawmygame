import { FocusFirstHeroScene } from '../game.mjs'

export default class CatchAllStarsScene extends FocusFirstHeroScene {
    update() {
        super.update()
        if(this.step == "GAME" && this.nbStars === 0) this.step = "VICTORY"
    }
}