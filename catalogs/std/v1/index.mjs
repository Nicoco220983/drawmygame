const HERE = (new URL('.', import.meta.url)).href

let loader = null
export async function loadCatalog(catalog) {
    loader ||= catalog.addModuleCatalogs([
        HERE + "2Dside/scenes.mjs",
        HERE + "2Dside/objects.mjs",
        HERE + "2Dside/triggers.mjs",
        HERE + "2Dside/blocks.mjs",
    ])
    await loader
}