import { DefaultScene, WaitingScene } from './game.mjs'
import CatchAllStarsScene from './scenes/catch_all_stars.mjs'
import TagScene from './scenes/tag.mjs'

export default {
    scenes: {
        [DefaultScene.KEY]: DefaultScene,
        [WaitingScene.KEY]: WaitingScene,
        [CatchAllStarsScene.KEY]: CatchAllStarsScene,
        [TagScene.KEY]: TagScene,
    }
}