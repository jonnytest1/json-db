
// TODO

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, relative, sep } from 'path';
import { dataFolder } from './constant';
import { Context } from './data-context';
import { AbortedError, loadStorageObject } from './iterators/load-iterator';
import type { CacheIterator } from './iterators/cache-iterator';
import { createWorker, type TypedWorker } from './worker/load-worker-handle';
import { isMainThread, } from "worker_threads"

function storagePath(path: string) {
    const stPath = relative(dataFolder, path)
    return stPath.split(sep);
}

const iteratorSymbol = Symbol.for("iterator");


export interface CacheObject {
    [key: string]: CacheObject
    [iteratorSymbol]?: CacheIterator;
}

export const requestCache: Record<string, CacheObject> = {}


const pendingLoad: Record<string, {
    worker: Set<TypedWorker>,
    start: number
}> = {}

let loadWorker: TypedWorker

if (isMainThread) {
    loadWorker = createWorker("preload")
    loadWorker.postMessage({
        type: "preload"
    })

    loadWorker.on("message", e => {
        if (e.type == "data") {
            const cacheKey = getCacheKey(e.auth, decodeURIComponent(e.urlEncodedRoot));
            requestCache[cacheKey] = e.data as CacheObject
        } else if (e.type === "terminate") {
            console.log("initial load finished")
            loadWorker.terminate()
        }
    })
}

export function getCacheKey(auth: string, urlDecodedRoot: string) {
    return `${auth}${urlDecodedRoot}`
}

export function clearMemCache(auth: string, urlDecodedRoot: string) {
    //delete requestCache[cacheKey]

    console.log("rebuilding " + urlDecodedRoot)


    buildCache(auth, urlDecodedRoot);



    // await buildCache(auth, root);

}


let currentCacheBuild: AbortController | undefined;

export function abortCurrentCacheBuild() {
    if (currentCacheBuild) {
        currentCacheBuild.abort("prio request")
    }
}


async function buildCache(auth: string, urlDecodedRoot: string) {
    try {
        const cacheKey = getCacheKey(auth, urlDecodedRoot)
        let cleanedPr = Promise.resolve(-1)

        if (!pendingLoad[cacheKey]) {
            pendingLoad[cacheKey] = {
                worker: new Set(),
                start: Date.now()
            }
        }

        const workerSet = pendingLoad[cacheKey].worker;
        for (const worker of workerSet) {
            console.log("terminating workers " + cacheKey)
            await worker.terminate().catch(e => {
                debugger
            })
            workerSet.delete(worker)

        }
        const loadWorker = createWorker(`load`)
        workerSet.add(loadWorker)
        pendingLoad[cacheKey].start = Date.now()
        loadWorker.on("exit", () => {
            workerSet.delete(loadWorker)
        })

        loadWorker.on("message", e => {
            if (e.type == "data") {
                requestCache[cacheKey] = e.data as CacheObject
                console.log("got laod data for " + urlDecodedRoot)



                loadWorker.terminate().then(() => {
                    workerSet.delete(loadWorker)
                })
            } else {
                debugger;
            }
        })

        loadWorker.postMessage({
            type: "loadtree",
            auth,
            urlEncodedRoot: encodeURIComponent(urlDecodedRoot)
        })
    } catch (e) {
        debugger;
    }
}

/**
 * 
 * @param keyArray cacheKEy + lowercase keys
 * @returns 
 */
export function getCacheValue(keyArray: Array<string>) {
    let obj = requestCache

    let key = keyArray.shift()
    while (key) {
        obj = obj[key] as CacheObject
        key = keyArray.shift()
    }
    return obj
}


export function reset(path: string) {

}

export function set(path: string, context: Context) {
    writeFileSync(path.toLowerCase(), JSON.stringify(context))
}

export function get(path: string) {

    return JSON.parse(readFileSync(path.toLowerCase(), { encoding: "utf-8" })) as Context
}


export function listDirectories(path: string) {

    let names: Array<string>


    names = readdirSync(path, {
        withFileTypes: true,
    })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name?.toLowerCase())

    return names
}