import * as express from "express"
import { mkdirSync, writeFileSync } from 'fs';
import { request } from 'http';
import { dirname, join } from 'path';
import { isAuthorized } from './auth';
import { dataFolder, historyFolder } from './constant';
import { deleteEndpoint } from './endpoints/delete-endpoint';
import { origins } from './endpoints/origins-endpoint';
import { addObject } from './iterators/add-iterator';
import { LoadOptions, loadStorageObject } from './iterators/load-iterator';
import { storeObject } from './iterators/store-iterator';
import { requestCache } from './mem-cache';
import { parseArgsToEnv } from './args';
import { readFile, readdir } from 'fs/promises';

parseArgsToEnv();
const port = +(process.env.SERVER_PORT ?? 23422)

const app = express()
app.use(express.json({
    limit: "1000mb",
    strict: false,
}))
app.use(express.text({
    limit: "1000mb"
}))
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Private-Network', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept,authorization');
    next();
});

app.delete("/json", deleteEndpoint)
app.get("/json/origins", origins)

app.post("/json/add", async (req, res) => {
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
        const data = req.body;
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

        let hint = ""
        if (req.headers.hint) {
            hint = `\n\t\x1b[32m${req.headers.hint}`
        }
        console.log(`${new Date().toLocaleString()}: adding for ${startPath} ${hint}`)
        await addObject(data, startPath, req.headers.hint ? `${req.headers.hint}` : undefined)

        res.status(200).send()
    } catch (e) {
        res.status(500).send()
        debugger
        return
    }
})


app.post("/json", async (req, res) => {
    try {
        const requestUrl = new URL(req.url, "http://localhost")
        const auth = req.headers.authorization
        const root = requestUrl.searchParams.get("rootstorage")
        if (!auth || !root) {
            res.send("invalid params");
            return;
        }
        if (!isAuthorized(auth)) {
            res.send("invalid auth");
            return
        }



        const data = req.body;
        let startPath = join(dataFolder, encodeURIComponent(auth), encodeURIComponent(root))
        const subPAthStr = requestUrl.searchParams.get("subpath")
        if (subPAthStr) {
            const subPAthParts = JSON.parse(subPAthStr) as Array<string>
            startPath = join(startPath, ...subPAthParts.map(part => encodeURIComponent(part)))
        }
        delete requestCache[`${auth}${root}`]
        let hint = ""
        if (req.headers.hint) {
            hint = `\n\t\x1b[32m${req.headers.hint}`
        }

        console.log(`${new Date().toLocaleString()} storing for ${startPath} ${hint}`)
        await storeObject(data, startPath, undefined, req.headers.hint ? `${req.headers.hint}` : undefined)



        res.status(200).send()
    } catch (e) {
        res.status(500).send()
        debugger
        return
    }
})

app.get("/history", async (req, res) => {
    const auth = req.headers.authorization
    const requestUrl = new URL(req.url, "http://localhost")
    const root = requestUrl.searchParams.get("rootstorage")
    if (!auth || !root) {
        res.send("invalid params");
        return;
    }
    if (!isAuthorized(auth)) {
        res.send("invalid auth");
        return
    }

    const subPath = requestUrl.searchParams.get("subpath")
    if (!subPath) {
        res.send("missing path");
        return
    }
    const subPathPArts = JSON.parse(subPath) as Array<string>
    const historySubFolder = join(historyFolder, auth)

    const historyEntries = await readdir(historySubFolder, { withFileTypes: true })
    const files = historyEntries.filter(entry => entry.isDirectory())
        .map(async entry => {
            const version = entry.name;
            const rootFolder = join(historySubFolder, entry.name, `${encodeURIComponent(root)}.json`)
            let file: string
            try {
                file = await readFile(rootFolder, { encoding: "utf-8" })
            } catch (e) {
                return null
            }
            let data: any
            try {
                data = JSON.parse(file)
            } catch (e) {
                return null
            }

            for (const i of subPathPArts) {
                let dataKey = i;
                if (!data || typeof data != "object" || !(i in data)) {

                    const key = Object.keys(data)
                        .find(key => key.toLowerCase() === i.toLowerCase())
                    if (!key) {
                        return null
                    } else {
                        dataKey = key
                    }
                }
                data = data[dataKey]
            }


            return {
                version,
                data
            }
        })


    const data = await Promise.all(files)
    res.send(data.filter(d => d))

})

app.post("/revert", async (req, res) => {
    const auth = req.headers.authorization
    const requestUrl = new URL(req.url, "http://localhost")
    const root = requestUrl.searchParams.get("rootstorage")
    const version = requestUrl.searchParams.get("version")
    if (!auth || !root || !version) {
        res.send("invalid params");
        return;
    }
    if (!isAuthorized(auth)) {
        res.send("invalid auth");
        return
    }

    const subPath = requestUrl.searchParams.get("subpath")
    if (!subPath) {
        res.send("missing path");
        return
    }
    const subPathPArts = JSON.parse(subPath) as Array<string>
    const historySubFile = join(historyFolder, auth, version, `${encodeURIComponent(root)}.json`)

    const historyFile = await readFile(historySubFile, { encoding: "utf8" })

    let historyData = JSON.parse(historyFile)

    for (const i of subPathPArts) {
        let dataKey = i;
        if (!historyData || typeof historyData != "object" || !(i in historyData)) {

            const key = Object.keys(historyData)
                .find(key => key.toLowerCase() === i.toLowerCase())
            if (!key) {
                return null
            } else {
                dataKey = key
            }
        }
        historyData = historyData[dataKey]
    }

    if (JSON.stringify(historyData) !== req.body) {
        res.send("invalid data");
        return
    }
    debugger

    let startPath = join(dataFolder, encodeURIComponent(auth), encodeURIComponent(root))

    startPath = join(startPath, ...subPathPArts.map(part => encodeURIComponent(part)))

    const prevData = await loadStorageObject(startPath)
    const todayFolder = new Date().toISOString().split("T")[0]
    const historyFileTarget = join(historyFolder, encodeURIComponent(auth), `${todayFolder}_backup`, encodeURIComponent(root) + ".json")
    mkdirSync(dirname(historyFileTarget), { recursive: true })
    writeFileSync(historyFileTarget, JSON.stringify(prevData.data, undefined, "  "))
    await storeObject(historyData, startPath, undefined, req.headers.hint ? `${req.headers.hint}` : undefined)

})

app.get("/json", async (req, res) => {
    try {
        const requestUrl = new URL(req.url, "http://localhost")
        const auth = req.headers.authorization
        const root = requestUrl.searchParams.get("rootstorage")
        if (!auth || !root) {
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
        const cacheKey = `${auth}${root}`;
        if (!timed && requestCache[cacheKey] && !subPath) {
            res.send(requestCache[cacheKey])
            const startPath = join(dataFolder, encodeURIComponent(auth), encodeURIComponent(root))
            const data = await loadStorageObject(startPath, loadOptions)
            requestCache[cacheKey] = data.data
            return
        }
        const startPath = join(dataFolder, encodeURIComponent(auth), encodeURIComponent(root))
        const data = await loadStorageObject(startPath, loadOptions)
        if (!timed && !subPath) {
            requestCache[cacheKey] = data.data
            const todayFolder = new Date().toISOString().split("T")[0]
            const historyFile = join(historyFolder, encodeURIComponent(auth), todayFolder, encodeURIComponent(root) + ".json")
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
})



app.listen(port, 'localhost', () => {
    console.log("started server")
});