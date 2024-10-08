
import { dirname, join } from 'path';
import { Context, fromContext } from '../data-context';
import { get, listDirectories, set } from '../mem-cache';
import { mkdirSync, readdirSync } from 'fs';


export class AbortedError extends Error {

}

export interface LoadOptions {
    subPath?: Array<string>

    timed?: number

    contextOnly?: boolean

    corruptionCheck?: boolean

    depth?: number

    aborter?: AbortController

}

interface StorageObject {
    data: any,
    hint?: string

    unhashedPathName?: string

}

export async function loadStorageObject(path: string, options: LoadOptions = {}): Promise<StorageObject> {
    const contextJsonPath = join(path, "context.json")
    if (options.aborter?.signal?.aborted) {
        throw new AbortedError("aborted from signal: " + options.aborter?.signal.reason)
    }
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
                mkdirSync(path, { recursive: true })
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

    const shouldLoadChildren = options.depth === undefined || options.depth >= 1

    if (context.type === "array" || context.type == "object" && options.contextOnly !== true && shouldLoadChildren) {
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
                const subStorageOBject = await loadStorageObject(join(path, `${i}`), {
                    ...options,
                    depth: options.depth !== undefined ? options.depth - 1 : undefined
                });
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
            await Promise.all(entries.map(async entry => {
                const storeObject = await loadStorageObject(join(path, entry), {
                    ...options,
                    depth: options.depth !== undefined ? options.depth - 1 : undefined
                });
                const keyName = storeObject.unhashedPathName ?? decodeURIComponent(entry);
                obj[keyName] = storeObject.data
                if (storeObject.hint) {
                    obj.__hintData ??= {}
                    obj.__hintData[keyName] = storeObject.hint
                }
            }))
        }
    }

    return {
        data: obj,
        unhashedPathName: context.unhashedPathName,
        hint: context.hint
    }

}