

interface ArrayContext {
    type: "array",
    length: number
    timed?: number,
    hint?: string
}

interface ObjectContext {
    type: "object"
    timed?: number,
    hint?: string
}
interface JsonContext {
    type: "json",
    data: string
    timed?: number,
    hint?: string
}

export interface CorruptedContext {
    corrupted?: true
}


export type Context = ArrayContext | ObjectContext | JsonContext
export type StorageObj = string | number | boolean | null | {
    [key: string]: StorageObj
} | Array<StorageObj>



export function getObjectType(obj: StorageObj): Context["type"] {
    if (obj instanceof Array) {
        return "array"
    } else if (obj !== null && typeof obj == "object") {
        return "object"
    }
    return "json"
}


export function fromContext(context: Context) {
    if (context.type == "array") {
        const data: Array<unknown> = []
        data.length = context.length
        return data
    } else if (context.type === "object") {
        return {}
    } else {
        return JSON.parse(context.data)
    }
}