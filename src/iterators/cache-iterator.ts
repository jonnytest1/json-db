type PathObject = {
    path: string
    obj: unknown
}

export class CacheIterator {

    private listeners: Array<(update: PathObject) => void> = []

    dispatchUpdate(params: PathObject) {
        for (const listener of this.listeners) {
            listener(params)
        }
    }




}