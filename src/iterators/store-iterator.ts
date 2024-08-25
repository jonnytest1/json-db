import { mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { Context, getObjectType, StorageObj } from '../data-context'
import { abortCurrentCacheBuild, get, set, type CacheObject } from '../mem-cache'
import { hashToPath } from '../util/hash'


export interface StorageOptions {
    pathHashed?: string | null
    unhashedName?: string

    cache?: CacheObject

}


export async function storeObject(obj: StorageObj, path: string, timestamp?: number, hint?: string, opts: StorageOptions = {}) {
    const filepath = opts?.pathHashed ?? path
    mkdirSync(filepath.toLowerCase(), {
        recursive: true,
    })
    let contextData: Partial<Context> = {}
    const contextJsonPath = join(filepath, "context.json")
    try {
        contextData = get(contextJsonPath)
    } catch (e) {

    }
    contextData = {
        ...contextData,
        type: getObjectType(obj),
        hint,

    }

    if (opts.pathHashed && !opts.unhashedName) {
        debugger;
    }
    if (opts.unhashedName !== undefined) {
        contextData.unhashedPathName = opts.unhashedName
    }

    if (contextData.type === "json") {
        contextData.data = JSON.stringify(obj)
    } else {
        const objectTyped = obj as Record<string | number, StorageObj>
        if ("timestamp" in objectTyped) {
            timestamp = objectTyped.timestamp as number
        }

        const keys = Object.keys(objectTyped);
        Promise.all(keys.map(async key => {
            let subObj = objectTyped[key];
            let pathHashed = null
            if (obj && obj instanceof Array) {
                subObj = obj[+key]
            }
            // not hashing array index because inde will be shorter than hash
            if (opts.pathHashed && contextData.type !== "array") {
                pathHashed = join(filepath, hashToPath(key))
            }

            if ((!key || key == "undefined") && pathHashed) {
                debugger;
            }
            await storeObject(subObj, join(filepath, encodeURIComponent(key)), timestamp, undefined, {
                pathHashed,
                unhashedName: key
            });
        }))

        if (contextData.type == "array" && obj instanceof Array) {
            contextData.length = obj.length
        }
    }

    if (!contextData.unhashedPathName && contextJsonPath.includes("kli_2")) {
        debugger
    }

    set(contextJsonPath, contextData as Context)
}
