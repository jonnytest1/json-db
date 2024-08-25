
import { Request, Response } from "express"
import { join } from 'path';
import { dataFolder } from '../constant';
import { hashToPath } from '../util/hash';
import { abortCurrentCacheBuild, clearMemCache, getCacheKey, requestCache } from '../mem-cache';
import { storeObject } from '../iterators/store-iterator';
import { isAuthorized } from '../auth';


export async function storeEndpoint(req: Request, res: Response) {
    try {
        const requestUrl = new URL(req.url, "http://localhost");
        const auth = req.headers.authorization;
        const urlDecodedRoot = requestUrl.searchParams.get("rootstorage");
        if (!auth || !urlDecodedRoot) {
            res.send("invalid params");
            return;
        }
        if (!isAuthorized(auth)) {
            res.send("invalid auth");
            return;
        }



        const data = req.body;
        let startPath = join(dataFolder, encodeURIComponent(auth), encodeURIComponent(urlDecodedRoot));
        const subPAthStr = requestUrl.searchParams.get("subpath");
        let pathHashed: string | null = null;
        let unhashedKey: string | undefined;
        if (subPAthStr) {
            const subPAthParts = JSON.parse(subPAthStr) as Array<string>;

            if (req.headers.pathhashed) {
                pathHashed = join(startPath, ...subPAthParts.map(part => {

                    return hashToPath(part);
                }));
                unhashedKey = subPAthParts.at(-1);
            }
            startPath = join(startPath, ...subPAthParts.map(part => encodeURIComponent(part)));

            const cacheKey = getCacheKey(auth, urlDecodedRoot)

            if (requestCache[cacheKey]) {

                const keyArrayCp = [...subPAthParts]
                let obj = requestCache[cacheKey]

                const lastKey = keyArrayCp.pop()
                if (lastKey) {
                    for (let key of keyArrayCp) {
                        if (!obj[key]) {
                            debugger;

                        }
                        obj = obj[key]
                    }
                    obj[lastKey] = data
                }


            }


        }
        let hint = "";
        if (req.headers.hint) {
            hint = `\n\t\x1b[32m${req.headers.hint}`;
        }
        console.log(`${new Date().toLocaleString()} storing for ${startPath} ${hint ?? ""}`);

        abortCurrentCacheBuild();
        await storeObject(data, startPath, undefined, req.headers.hint ? `${req.headers.hint}` : undefined, {
            pathHashed: pathHashed,
            unhashedName: unhashedKey
        });
        clearMemCache(auth, urlDecodedRoot);

        res.status(200).send();
    } catch (e) {
        res.status(500).send();
        debugger;
        return;
    }
};