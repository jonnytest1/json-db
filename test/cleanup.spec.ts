import { readFileSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'

describe("dataset", () => {


    async function iterateFix(path) {
        const entries = readdirSync(path, { withFileTypes: true })

        for (const entry of entries) {
            const subPAth = join(path, entry.name)
            if (entry.isFile()) {

                try {
                    const file = readFileSync(subPAth, { encoding: "utf8" })
                    try {
                        const data = JSON.parse(file)
                    } catch (e) {
                        if (entries.length > 1) {
                            debugger
                        }
                        console.log("removing " + path)
                        rmSync(path, { recursive: true });
                    }
                } catch (e) {
                    console.error(e)
                }
            } else if (entry.isDirectory()) {
                await iterateFix(subPAth)
            }

        }
    }

    it("remove failed json writes", async () => {
        // try restore instead 
        //await iterateFix("M:\\json-db\\data\\6dz6DZdu4amC1soPXke1bI7qHZMoHf3IVt8daZFMku4n2MrmI06Cw2qtucXJEzuw")
    })
})