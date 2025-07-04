import { ModuleCatalog, FocusFirstHeroScene } from '../game.mjs'

export const CATALOG = new ModuleCatalog()

@CATALOG.registerScene("catch_all_stars")
export class CatchAllStarsScene extends FocusFirstHeroScene {

    update() {
        super.update()
        if(this.step == "GAME" && this.nbStars === 0) this.step = "VICTORY"
    }
}