import { readdir } from "fs/promises"
import { dataFolder } from "../constant"
import { join } from 'path'
import { loadStorageObject } from "../iterators/load-iterator"
import { getWorkerRef } from './load-worker-handle'


const parentPort = getWorkerRef()

parentPort?.on("message", async e => {
    try {
        if (e.type === "preload") {
            const authDirs = await readdir(dataFolder)

            for (const auth of authDirs) {
                const authDir = join(dataFolder, auth)
                const roots = await readdir(authDir)

                for (const urlEncodedRoot of roots) {
                    const startPath = join(authDir, urlEncodedRoot)
                    const data = await loadStorageObject(startPath);

                    parentPort?.postMessage({
                        type: "data",
                        auth,
                        urlEncodedRoot: urlEncodedRoot,
                        data: data.data
                    })
                }
            }
            parentPort.postMessage({ type: "terminate" })

        } else if (e.type === "loadtree") {
            await loadCache(e)
        } else {
            console.error("no match for event " + JSON.stringify(e))
        }
    } catch (e) {
        console.error(e)
    }
})

async function loadCache(evt: { type: "loadtree" } & { auth: string; urlEncodedRoot: string }) {
    try {
        const startPath = join(dataFolder, evt.auth, evt.urlEncodedRoot)
        const data = await loadStorageObject(startPath)
        parentPort?.postMessage({
            type: "data",
            auth: evt.auth,
            urlEncodedRoot: evt.urlEncodedRoot,
            data: data.data
        })
    } catch (e) {
        debugger;
        console.error(e)
    }
}
