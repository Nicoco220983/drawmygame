// import { DefaultScene, WaitingScene } from './game.mjs'
// import CatchAllStarsScene from './scenes/catch_all_stars.mjs'
// import TagScene from './scenes/tag.mjs'
import { Library } from './game.mjs'

const LIB = new Library()
LIB.addModuleLibraries(["./game.mjs"])
LIB.addModuleLibraries(["./scenes/catch_all_stars.mjs"])
LIB.addModuleLibraries(["./scenes/tag.mjs"])
export default LIB

// export default {
//     scenes: {
//         [DefaultScene.KEY]: DefaultScene,
//         [WaitingScene.KEY]: WaitingScene,
//         [CatchAllStarsScene.KEY]: CatchAllStarsScene,
//         [TagScene.KEY]: TagScene,
//     }
// }