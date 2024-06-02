import { types } from '@babel/core'
import { join } from 'path'
import { loadStorageObject } from '../src/iterators/load-iterator'
import { storeObject } from '../src/iterators/store-iterator'
import { addObject } from '../src/iterators/add-iterator'
import { getTestFolder } from './test-util'
import { rm } from 'fs/promises'

describe("partial edit", () => {



    it("can write partially", async () => {
        const startDate = new Date()
        const obj = {
            "abc": [
                {
                    timestamp: +startDate,
                    "value": "test123"
                }, {
                    timestamp: +startDate,
                    "value": "test123"
                }
            ],
            testOboj: {
                str: "str2",
                num: 123,
                bool: true
            }
        }
        const testPath = getTestFolder()
        await storeObject(obj, testPath)


        const path = ["abc", "0", "value"]
        await storeObject("abc", join(testPath, ...path))


        const loaded = await loadStorageObject(testPath,) as typeof obj
        expect(loaded.abc[0].value).toBe("abc")
    })


    it("can add partially", async () => {
        const startDate = new Date()
        const obj = {
            "abc": [
                {
                    timestamp: +startDate,
                    "value": "defg"
                }, {
                    timestamp: +startDate,
                    "value": "abc"
                }
            ],
            testOboj: {
                str: "str",
                num: 123,
                bool: true
            }
        }
        const testPath = getTestFolder()
        await rm(testPath, { force: true, recursive: true })
        await storeObject(obj, testPath)

        await new Promise(r => setTimeout(r, 200))
        const path = ["abc"]
        await addObject({
            timestamp: +new Date(+startDate + (1000 * 60 * 60 * 2)),
            "value": "test123"
        }, join(testPath, ...path))


        await new Promise(r => setTimeout(r, 200))
        const loaded = await loadStorageObject(testPath) as typeof obj
        expect(loaded.abc.length).toBe(3)
        expect(loaded.abc[2].value).toBe("test123")
    })
})