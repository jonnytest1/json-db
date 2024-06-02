
import { Request, Response } from "express"
import { rm } from 'fs/promises';
import { join } from 'path';
import { isAuthorized } from '../auth';
import { dataFolder } from '../constant';
import { requestCache } from '../mem-cache';

export async function deleteEndpoint(req: Request, res: Response) {
    try {
        const requestUrl = new URL(req.url, "http://localhost")
        const auth = req.headers.authorization
        const root = requestUrl.searchParams.get("rootstorage")
        if (!auth || !root) {
            res.status(400).send("invalid params");
            return;
        }
        if (!isAuthorized(auth)) {
            res.status(401).send("invalid auth");
            return
        }
        let startPath = join(dataFolder, encodeURIComponent(auth), encodeURIComponent(root))
        const subPAthStr = requestUrl.searchParams.get("subpath")
        if (subPAthStr) {
            const subPAthParts = JSON.parse(subPAthStr) as Array<string>
            startPath = join(startPath, ...subPAthParts.map(part => encodeURIComponent(part)))
        } else {
            res.status(400).send("invalid param");
            return
        }
        delete requestCache[`${auth}${root}`]
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