const HERE = (new URL('.', import.meta.url)).href

let loader = null
export async function loadCatalog(catalog) {
    loader ||= catalog.addModuleCatalogs([
        HERE + "scenes.mjs",
        HERE + "objects.mjs",
        HERE + "blocks.mjs",
    ])
    await loader
}