import { join } from 'path'
import { storeObject } from "../src/iterators/store-iterator"
import { loadStorageObject } from "../src/iterators/load-iterator"
import { getTestFolder } from './test-util'
describe("it test", () => {

    it("recreates", async () => {
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
                str: "str",
                num: 123,
                bool: true,
                ["key with spaces"]: "somestr"
            }
        }
        const testPath = getTestFolder()
        await storeObject(obj, testPath)

        const loadedObj = await loadStorageObject(testPath)

        expect(loadedObj).toStrictEqual(obj)
    })
    it("loads only a subpath", async () => {
        const startDate = new Date()
        const testObj = {
            test: [
                {
                    timestamp: +startDate,
                    value: "test123"
                }, {
                    timestamp: +startDate,
                    value: "test123"
                }
            ],
            objectTest: {
                str: "123",
                num: 123,
                bool: true,
                null: null
            }
        }

        const testPath = getTestFolder()
        await storeObject(testObj, testPath)

        const loadedObj = await loadStorageObject(testPath, { subPath: ["test"] })

        expect(loadedObj).toStrictEqual({
            test: [
                {
                    timestamp: +startDate,
                    value: "test123"
                }, {
                    timestamp: +startDate,
                    value: "test123"
                }
            ],
        })
        const data2 = await loadStorageObject(testPath, { subPath: ["objectTest"] })

        expect(data2).toStrictEqual({
            objectTest: {
                str: "123",
                num: 123,
                bool: true,
                null: null
            }
        })
    })


    it("loads timed mode correctly", async () => {
        const startDate = new Date()
        const oneHour = 1000 * 60 * 60;
        const testObj = {
            testkey: {
                test: [
                    {
                        timestamp: +startDate,
                        value: startDate.toISOString()
                    }, {
                        timestamp: +new Date(+startDate + (oneHour)),
                        value: new Date(+startDate + (oneHour)).toISOString()
                    }, {
                        timestamp: +new Date(+startDate + (oneHour * 2)),
                        value: new Date(+startDate + (oneHour * 2)).toISOString()
                    }
                ],
                test2: [
                    {
                        timestamp: +new Date(+startDate + (oneHour * 2)),
                        value: "test123"
                    }
                ],
                //should still get last one
                test3: [
                    {
                        timestamp: +startDate,
                        value: "test123"
                    }
                ]
            }
        }
        const testPath = getTestFolder()
        await storeObject(testObj, testPath)


        const data = await loadStorageObject(testPath, {
            timed: +new Date(+startDate + (oneHour * 0.5)),
        })

        expect(data.testkey.test.length).toBe(3)
        expect(data.testkey.test[0]).toBeUndefined()
        expect(data.testkey.test[1]).toStrictEqual(testObj.testkey.test[1])
        expect(data.testkey.test[2]).toStrictEqual(testObj.testkey.test[2])
        expect(data.testkey.test2[0]).toStrictEqual(testObj.testkey.test2[0])
        expect(data.testkey.test3[0]).toStrictEqual(testObj.testkey.test3[0])
    })
})