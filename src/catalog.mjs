import { Catalog } from './game.mjs'

const CATALOG = new Catalog()

let loader = null
export async function loadCatalog() {
    loader ||= Promise.all([
        CATALOG.addModuleCatalogs(["./game.mjs"]),
        CATALOG.addModuleCatalogs(["./scenes/catch_all_stars.mjs"]),
        CATALOG.addModuleCatalogs(["./scenes/tag.mjs"]),
    ])
    await loader
    return CATALOG
}