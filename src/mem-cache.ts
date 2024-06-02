
// TODO

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { relative, resolve, sep } from 'path';
import { dataFolder } from './constant';
import { Context } from './data-context';

function storagePath(path: string) {
    const stPath = relative(dataFolder, path)
    return stPath.split(sep);
}

export const requestCache: Record<string, unknown> = {}

export function reset(path: string) {

}


export function set(path: string, context: Context) {
    writeFileSync(path.toLowerCase(), JSON.stringify(context))
}

export function get(path: string) {

    return JSON.parse(readFileSync(path.toLowerCase(), { encoding: "utf-8" })) as Context
}


export function listDirectories(path: string) {

    let names: Array<string>


    names = readdirSync(path, {
        withFileTypes: true,
    })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name?.toLowerCase())

    return names
}