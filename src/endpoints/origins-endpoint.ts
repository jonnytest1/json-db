
import { Request, Response } from "express"
import { readdir, rm } from 'fs/promises';
import { join } from 'path';
import { isAuthorized } from '../auth';
import { dataFolder } from '../constant';

export async function origins(req: Request, res: Response) {
    try {
        const requestUrl = new URL(req.url, "http://localhost")
        const auth = req.headers.authorization
        if (!auth) {
            res.status(400).send("invalid params");
            return;
        }
        if (!isAuthorized(auth)) {
            res.status(401).send("invalid auth");
            return
        }

        let startPath = join(dataFolder, encodeURIComponent(auth))

        const entries = await readdir(startPath)
        res.send(entries.map(decodeURIComponent))
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