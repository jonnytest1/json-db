
import { Request, Response } from "express"
import { isAuthorized } from '../auth';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { dataFolder, historyFolder } from '../constant';
import { loadStorageObject, type LoadOptions } from '../iterators/load-iterator';
import { getCacheKey, getCacheValue, requestCache } from '../mem-cache';


let lastRefresh = -1

export async function loadEndpoint(req: Request, res: Response) {
    try {
        const requestUrl = new URL(req.url, "http://localhost")
        const auth = req.headers.authorization
        const urlDecodedRoot = requestUrl.searchParams.get("rootstorage")
        if (!auth || !urlDecodedRoot) {
            res.send("invalid params");
            return;
        }
        if (!isAuthorized(auth)) {
            res.send("invalid auth");
            return
        }
        const subPath = requestUrl.searchParams.get("subpath")
        const timed = requestUrl.searchParams.get("timed")
        const loadOptions: LoadOptions = {}

        if (requestUrl.searchParams.get("withCorruptionCheck")) {
            loadOptions.corruptionCheck = true
        }

        if (subPath) {
            loadOptions.subPath = JSON.parse(subPath)
        }

        if (timed) {
            loadOptions.timed = JSON.parse(timed)
        }

        const depth = requestUrl.searchParams.get("depth")
        if (depth?.length) {
            const depthNum = +depth
            if (!isNaN(depthNum) && depthNum > 0) {
                loadOptions.depth = depthNum
            }

        }

        const cacheKey = getCacheKey(auth, urlDecodedRoot);
        if (!timed && requestCache[cacheKey] && loadOptions.depth === undefined) {
            const subKeys = loadOptions.subPath ?? []
            let obj = getCacheValue([cacheKey, ...subKeys.map(k => k.toLowerCase())])
            while (loadOptions.subPath?.length) {
                obj = {
                    [loadOptions.subPath.pop()!]: obj
                }
            }
            res.send(obj)
            return
        }
        const startPath = join(dataFolder, encodeURIComponent(auth), encodeURIComponent(urlDecodedRoot))
        const data = await loadStorageObject(startPath, loadOptions)
        if (!timed && !subPath && loadOptions.depth === undefined) {
            requestCache[cacheKey] = data.data
            const todayFolder = new Date().toISOString().split("T")[0]
            const historyFile = join(historyFolder, encodeURIComponent(auth), todayFolder, encodeURIComponent(urlDecodedRoot) + ".json")
            mkdirSync(dirname(historyFile), { recursive: true })
            writeFileSync(historyFile, JSON.stringify(data.data, undefined, "  "))
        }
        res.send(data.data)
    } catch (e) {
        console.error(e)
        res.status(500).send()
        debugger
        return
    }
}