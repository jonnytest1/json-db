
import { Request, Response } from "express"
import { rm } from 'fs/promises';
import { join } from 'path';
import { isAuthorized } from '../auth';
import { dataFolder } from '../constant';
import { clearMemCache, getCacheKey, requestCache, type CacheObject } from '../mem-cache';
import { hashToPath } from '../util/hash';

export async function deleteEndpoint(req: Request, res: Response) {
    try {
        const requestUrl = new URL(req.url, "http://localhost")
        const auth = req.headers.authorization
        const urlDecodedRoot = requestUrl.searchParams.get("rootstorage")
        if (!auth || !urlDecodedRoot) {
            res.status(400).send("invalid params");
            return;
        }
        if (!isAuthorized(auth)) {
            res.status(401).send("invalid auth");
            return
        }
        let startPath = join(dataFolder, encodeURIComponent(auth), encodeURIComponent(urlDecodedRoot))
        const subPAthStr = requestUrl.searchParams.get("subpath")
        if (subPAthStr) {
            const subPAthParts = JSON.parse(subPAthStr) as Array<string>

            if (req.headers.pathhashed) {
                startPath = join(startPath, ...subPAthParts.map(part => {
                    return hashToPath(part);
                }))
            } else {
                startPath = join(startPath, ...subPAthParts.map(part => encodeURIComponent(part)))
            }

            const cacheKey = getCacheKey(auth, urlDecodedRoot)
            if (requestCache[cacheKey]) {
                const subCopy = [...subPAthParts]
                let obj = requestCache[cacheKey]
                const last = subCopy.pop()

                if (last) {
                    for (let path of subCopy) {
                        if (!obj[path]) {
                            debugger;

                        }
                        obj = obj[path] as CacheObject
                    }
                    if (last in obj) {
                        delete obj[last]
                    }
                }
            }


        } else {
            res.status(400).send("invalid param");
            return
        }
        clearMemCache(auth, urlDecodedRoot)
        console.log(`removing for ${startPath}`)



        await rm(startPath, {
            recursive: true
        })


        res.status(200).send()
    } catch (e: any) {
        if ("code" in e && e.code === "ENOENT") {
            res.status(404).send()
            return
        }
        res.status(500).send()
        debugger
        return
    }
}