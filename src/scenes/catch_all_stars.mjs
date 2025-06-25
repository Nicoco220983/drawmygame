import { ModuleLibrary, FocusFirstHeroScene } from '../game.mjs'

export const LIB = new ModuleLibrary()

export class CatchAllStarsScene extends FocusFirstHeroScene {
    static KEY = "catch_all_stars"

    update() {
        super.update()
        if(this.step == "GAME" && this.nbStars === 0) this.step = "VICTORY"
    }
}
LIB.addScene(CatchAllStarsScene, {})