import { FocusFirstHeroScene } from '../game.mjs'

export default class CatchAllStarsScene extends FocusFirstHeroScene {
    static KEY = "catch_all_stars"

    update() {
        super.update()
        if(this.step == "GAME" && this.nbStars === 0) this.step = "VICTORY"
    }
}