import { join } from 'path';
import { isMainThread, parentPort, Worker } from "worker_threads"



interface MainToWorkerEvents {
    preload: {}

    loadtree: {
        auth: string,
        urlEncodedRoot: string
    }
}
type MainToWorkerValues = {
    [K in keyof MainToWorkerEvents]: { type: K } & MainToWorkerEvents[K]
}[keyof MainToWorkerEvents]

interface WorkerToMainEvents {
    data: {
        urlEncodedRoot: string,
        auth: string,
        data: unknown
    }

    terminate: {}
}
type WorkerToMainValues = {
    [K in keyof WorkerToMainEvents]: { type: K } & WorkerToMainEvents[K]
}[keyof WorkerToMainEvents]

export type TypedWorker = {
    on: (type: "message" | "exit", callback: (e: WorkerToMainValues) => void) => void;
    postMessage: <K extends keyof MainToWorkerEvents>(data: {
        type: K;
    } & MainToWorkerEvents[K]) => void;
    terminate: Worker["terminate"];
};
export function createWorker(name: string) {
    if (!isMainThread) {
        debugger;
        throw new Error("dont create new workers in sub thread")
    }
    const worker = new Worker(join(__dirname, "./load-worker.ts"), {
        name: name
    } as any);
    return worker as TypedWorker
}

export function getWorkerRef() {
    return parentPort as {
        on: (type: "message", callback: (e: MainToWorkerValues) => void) => void
        postMessage: <K extends keyof WorkerToMainEvents>(data: { type: K } & WorkerToMainEvents[K]) => void
    }
}