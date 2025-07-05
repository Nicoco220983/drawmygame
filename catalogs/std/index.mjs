const HERE = (new URL('.', import.meta.url)).href

let loader = null
export async function loadCatalog(catalog) {
    loader ||= catalog.addModuleCatalogs([
        HERE + "actors.mjs",
        HERE + "scenes.mjs",
    ])
    await loader
}