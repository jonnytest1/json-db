import { createHash } from 'crypto';

export function hashToPath(pathPart: string) {
    const md5 = createHash("md5")
    const hashed = md5.update(pathPart).digest("hex")

    if (pathPart.length < hashed.length) {
        return encodeURIComponent(pathPart)
    }

    return encodeURIComponent(hashed);
}