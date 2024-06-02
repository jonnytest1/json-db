import { join } from 'path';

export const projectRoot = join(__dirname, "..")
export let dataFolder = join(projectRoot, "data")
export const historyFolder = join(projectRoot, "history")

export function testSetDataFolder() {

    dataFolder = join(projectRoot, "test/data")
}