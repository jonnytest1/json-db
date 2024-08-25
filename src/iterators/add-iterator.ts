import { readFile } from 'fs/promises';
import { join } from 'path';
import { Context, StorageObj } from '../data-context';
import { abortCurrentCacheBuild, get, set } from '../mem-cache';
import { storeObject, type StorageOptions } from './store-iterator';

export async function addObject(obj: StorageObj, path: string, hint?: string, opts: StorageOptions = {}) {
    const arrayContextFile = join(path, "context.json")
    let context: Context;
    try {
        context = get(arrayContextFile)
    } catch (e) {
        context = {
            type: "array",
            length: 0
        }
    }
    if (context.type !== "array") {
        throw new Error("invalid context type")
    }
    abortCurrentCacheBuild()
    await storeObject(obj, join(path, `${context.length}`), undefined, hint, {
        pathHashed: opts.pathHashed ? join(path, `${context.length}`) : undefined,
    })
    context.length += 1;


    set(arrayContextFile, context)


}