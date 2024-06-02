import { readdir } from 'fs/promises';
import { join } from 'path';
import { Context, fromContext, type CorruptedContext } from '../data-context';
import { get, listDirectories, set } from '../mem-cache';
import { readdirSync } from 'fs';

export interface LoadOptions {
    subPath?: Array<string>

    timed?: number

    contextOnly?: boolean

    corruptionCheck?: boolean

}

interface StorageObject {
    data: any,
    hint?: string
}

export function loadStorageObject(path: string, options: LoadOptions = {}): StorageObject {
    const contextJsonPath = join(path, "context.json")

    let context: Context
    try {
        context = get(contextJsonPath)
    } catch (e) {

        const fileError = e as {
            code: string,
            path?: string
        }
        if (typeof fileError == "object"
            && !!fileError
            && fileError.code == "ENOENT") {
            const directory = readdirSync(path, { withFileTypes: true })
            if (directory.some(entry => entry.isDirectory() && isNaN(+entry.name))) {
                context = { type: "object" }
                set(contextJsonPath, context);
            } else {
                fileError.path = path
                throw fileError;
            }
        } else {
            if (options.corruptionCheck) {
                return {
                    data: "ERROR",
                    hint: `__CORRUPTED:(${(e as Error).message})`
                }
            } else {
                fileError.path = path
                throw fileError;
            }
        }



    }
    const obj = fromContext(context)
    if (context.type === "array" || context.type == "object" && options.contextOnly !== true) {
        const loadKeys = options.subPath?.shift()
        let entries = listDirectories(path)
        if (loadKeys) {
            if (entries.includes(loadKeys)) {
                entries = [loadKeys]
            } else {
                entries = []
            }
        }
        if (options.timed && context.type === "array") {
            for (let i = obj.length - 1; i >= 0; i--) {
                const subStorageOBject = loadStorageObject(join(path, `${i}`), options);
                const subObj = subStorageOBject.data
                if (i < obj.length - 1 && (subObj && "timestamp" in subObj && subObj.timestamp < options.timed)) {
                    break;
                }
                obj[i] = subObj
                if (subStorageOBject.hint) {
                    obj.__hintData ??= {}
                    obj.__hintData[i] = subStorageOBject.hint
                }

            }
        } else {
            entries.forEach((entry) => {
                const storeObject = loadStorageObject(join(path, entry), options);
                const keyName = decodeURIComponent(entry);
                obj[keyName] = storeObject.data
                if (storeObject.hint) {
                    obj.__hintData ??= {}
                    obj.__hintData[keyName] = storeObject.hint
                }
            })
        }
    }

    return {
        data: obj,
        hint: context.hint
    }

}