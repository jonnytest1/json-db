export function parseArgsToEnv() {
    const args = [...process.argv]
    args.shift() // node
    args.shift() // index.ts

    for (const arg of args) {
        if (arg.startsWith("--") && arg.includes("=")) {
            const parts = arg.split("=")

            const key = parts.shift()?.replace(/^--/, "")
            if (key) {
                process.env[key] = parts.join("=")
            }
        }
    }

}