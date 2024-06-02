
import { join } from 'path'
import { dataFolder, testSetDataFolder } from '../src/constant'

testSetDataFolder()

export function getTestFolder() {
    return join(dataFolder, encodeURIComponent(expect.getState().testPath as string + expect.getState().currentTestName))
}