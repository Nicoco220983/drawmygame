import { ModuleLibrary, FocusFirstHeroScene } from '../game.mjs'

export const LIB = new ModuleLibrary()

@LIB.registerScene("catch_all_stars")
export class CatchAllStarsScene extends FocusFirstHeroScene {

    update() {
        super.update()
        if(this.step == "GAME" && this.nbStars === 0) this.step = "VICTORY"
    }
}