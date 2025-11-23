const { assign } = Object

const BASE_URL = import.meta.resolve("../../..")
const CATALOGS_PATH = "/static/catalogs"

/**
 * 
 * @param {string} url 
 * @returns {string}
 */
function getPathFromUrl(url) {
    return '/' + url.substring(BASE_URL.length)
}

/**
 * 
 * @param {string} url 
 * @returns {string}
 */
function getUrlFromPath(path) {
    return BASE_URL + path.substring(1)
}


/**
 * Represents a catalog of game objects and scenes.
 */
export class Catalog {
    constructor() {
        this.scenes = {}
        this.objects = {}
    }

    /**
     * Preloads modules.
     * @param {string[]} paths The paths to the modules.
     * @returns {Promise<object[]>} The modules.
     */
    async importMods(paths) {
        await Promise.all(paths.map(p => import(getUrlFromPath(p))))
    }

    /**
     * 
     * @param {string} perspective
     * @param {Object.<string,string>} versions
     * @param {string[]} keys
     */
    async loadScenes(perspective, versions, keys) {
        const paths = new Set(keys.map(key => this.getScene(perspective, versions, key).path))
        await Promise.all(Array.from(paths).map(p => import(getUrlFromPath(p))))
        await Promise.all(keys.map(key => this.getScene(perspective, versions, key).cls.load()))
    }

    async loadObjects(perspective, versions, keys) {
        const paths = new Set(keys.map(key => this.getObject(perspective, versions, key).path))
        await Promise.all(Array.from(paths).map(p => import(getUrlFromPath(p))))
        await Promise.all(keys.map(key => this.getObject(perspective, versions, key).cls.load()))
    }

    /**
     * Preloads all modules.
     * @returns {Promise<object[]>} The modules.
     */
    async preloadAll() {
        await this.importMods(Array.from(new Set(
            values(this.scenes).map(c => c.path).concat(values(this.objects).map(c => c.path))
        )))
    }

    /**
     * Returns the full key of an item.
     * @param {string} perspective
     * @param {object} versions
     * @param {string} key
     * @returns {string}
     */
    getFullKey(perspective, versions, key) {
        const keySplit = key.split(':')
        const namespace = keySplit[0], className = keySplit[1]
        const modVersion = versions[namespace]
        return `${perspective}:${namespace}:${modVersion}:${className}`
    }

    /**
     * Returns a scene from the catalog.
     * @param {string} perspective The perspective.
     * @param {object} versions The versions.
     * @param {string} key The key of the scene.
     * @returns {object} The scene.
     */
    getScene(perspective, versions, key) {
        const fullKey = this.getFullKey(perspective, versions, key)
        return this.scenes[fullKey]
    }

    async fetchScenes(perspective, versions, keys) {
        return await this._fetch(this.scenes, "scene", perspective, versions, keys)
    }

    /**
     * Returns an object from the catalog.
     * @param {string} perspective The perspective.
     * @param {object} versions The versions.
     * @param {string} key The key of the object.
     * @returns {object} The object.
     */
    getObject(perspective, versions, key) {
        const fullKey = this.getFullKey(perspective, versions, key)
        return this.objects[fullKey]
    }

    async fetchObjects(perspective, versions, keys) {
        return await this._fetch(this.objects, "object", perspective, versions, keys)
    }

    async _fetch(items, type, perspective, versions, keys) {
        const fullKeys = keys.map(key => this.getFullKey(perspective, versions, key))
        const fullKeysToFetch = []
        for (let key of fullKeys) if (items[key] === undefined) fullKeysToFetch.push(key)
        if (fullKeysToFetch.length > 0) {
            const resp = await fetch(`/catalog/${type}/${fullKeysToFetch.join(',')}`)
            assign(items, await resp.json())
        }
        return fullKeys.map(key => items[key])
    }

    async searchScenes(perspective, versions, catalogFilter, query) {
        return await this.searchItems("scene", perspective, versions, catalogFilter, query)
    }

    async searchObjects(perspective, versions, catalogFilter, query) {
        return await this.searchItems("object", perspective, versions, catalogFilter, query)
    }

    async searchItems(type, perspective, versions, catalogFilter, query) {
        let items
        if (type == "scene") items = this.scenes
        else if (type == "object") items = this.objects
        else throw new Error("Unknown type")
        const resp = await fetch(`/catalog/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type,
                perspective,
                versions,
                catalogFilter,
                q: query,
            }),
        })
        const itemCats = await resp.json()
        for (let itemCat of itemCats) {
            const fullKey = this.getFullKey(perspective, versions, itemCat.key)
            items[fullKey] ||= itemCat
        }
        return itemCats
    }

    filterObject(filterDesc, obj) {
        if (filterDesc.and) {
            for (let f of filterDesc.and) if (!this.filterObject(f, obj)) return false
            return true
        }
        if (filterDesc.or) {
            for (let f of filterDesc.or) if (this.filterObject(f, obj)) return true
            return false
        }
        if (filterDesc.not) {
            return !this.filterObject(filterDesc.not, obj)
        }
        if (filterDesc.category) {
            const objCat = obj.category
            if (!objCat || objCat.indexOf('/' + filterDesc.category + '/') < 0) return false
        }
        return true
    }

    /**
     * Registers an object.
     * @param {Object} kwargs The properties of the object.
     * @returns {function(typeof GameObject):typeof GameObject} The decorator.
     */
    registerObject(kwargs) {
        return target => {
            const path = getPathFromUrl(kwargs.url)
            const namespace = kwargs.namespace ?? path.substring(CATALOGS_PATH.length + 1).split('/')[0]
            const key = `${namespace}:${target.name}`
            const fullKey = `${kwargs.perspective}:${namespace}:${kwargs.version}:${target.name}`
            const objCat = this.objects[fullKey] = {}
            objCat.version = kwargs.version
            objCat.perspective = kwargs.perspective
            objCat.key = key
            objCat.path = path
            objCat.namespace = namespace
            objCat.perspective = kwargs.perspective
            objCat.name = target.name
            objCat.category = target.CATEGORY
            objCat.label = kwargs?.label ?? key
            objCat.icon = kwargs?.icon ?? null
            if (objCat.icon?._src !== undefined) objCat.icon = objCat.icon._src
            objCat.showInBuilder = (kwargs?.showInBuilder == false) ? false : true
            objCat.isHero = target.IS_HERO == true
            objCat.cls = target
            target.KEY = key
            target.STATEFUL = kwargs?.stateful ?? true
            return target
        }
    }

    /**
     * Registers a scene.
     * @param {object} kwargs The properties of the scene.
     * @returns {function(typeof SceneCommon):typeof SceneCommon} The decorator.
     */
    registerScene(kwargs) {
        return target => {
            const path = getPathFromUrl(kwargs.url)
            const namespace = kwargs.namespace ?? path.substring(CATALOGS_PATH.length + 1).split('/')[0]
            const key = `${namespace}:${target.name}`
            const fullKey = `${kwargs.perspective}:${namespace}:${kwargs.version}:${target.name}`
            const scnCat = this.scenes[fullKey] = {}
            scnCat.version = kwargs.version
            scnCat.perspective = kwargs.perspective
            scnCat.key = key
            scnCat.path = path
            scnCat.namespace = namespace
            scnCat.name = target.name
            scnCat.label = kwargs?.label ?? key
            scnCat.showInBuilder = (kwargs?.showInBuilder == false) ? false : true
            scnCat.cls = target
            target.KEY = key
            return target
        }
    }
}


export const CATALOG = new Catalog()