import { mkdirSync, readFileSync } from 'fs'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { Context, getObjectType, StorageObj } from '../data-context'
import { get, set } from '../mem-cache'


export async function storeObject(obj: StorageObj, path: string, timestamp?: number, hint?: string) {
    mkdirSync(path.toLowerCase(), {
        recursive: true,
    })
    let contextData: Partial<Context> = {}
    const contextJsonPath = join(path, "context.json")
    try {
        contextData = get(contextJsonPath)
    } catch (e) {

    }
    contextData = {
        ...contextData,
        type: getObjectType(obj),
        hint
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
            if (obj && obj instanceof Array) {
                subObj = obj[+key]
            }
            await storeObject(subObj, join(path, encodeURIComponent(key)), timestamp);
        }))

        if (contextData.type == "array" && obj instanceof Array) {
            contextData.length = obj.length
        }
    }

    set(contextJsonPath, contextData as Context)
}
