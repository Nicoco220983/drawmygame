import { Library } from './game.mjs'

const LIB = new Library()

let loader = null
export async function loadLib() {
    loader ||= Promise.all([
        LIB.addModuleLibraries(["./game.mjs"]),
        LIB.addModuleLibraries(["./scenes/catch_all_stars.mjs"]),
        LIB.addModuleLibraries(["./scenes/tag.mjs"]),
    ])
    await loader
    console.log("lib loaded", LIB)
    return LIB
}