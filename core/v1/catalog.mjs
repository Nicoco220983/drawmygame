import { Catalog } from './game.mjs'

const CATALOG = new Catalog()

async function importAndLoadCatalog(path) {
    const mod = await import(path)
    await mod.loadCatalog(CATALOG)
}

let loader = null
export async function loadCatalog() {
    loader ||= Promise.all([
        CATALOG.addModuleCatalogs(["./game.mjs"]),
        importAndLoadCatalog("../../catalogs/std/v1/index.mjs"),
    ])
    await loader
    return CATALOG
}