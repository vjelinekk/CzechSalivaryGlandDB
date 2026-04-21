import { app } from 'electron'
import * as path from 'path'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import { MLInputData, MLOutputData } from '../types/ml'

export type ProgressCallback = (progress: number, stage: string) => void

let currentChild: ChildProcess | null = null
let wasCancelled = false

// --- Sidecar state ---
let sidecarProcess: ChildProcess | null = null
let sidecarStdoutBuffer = ''
let sidecarStderrBuffer = ''
let pendingSidecarRequest: {
    resolve: (value: MLOutputData) => void
    reject: (reason: Error) => void
    onProgress?: ProgressCallback
} | null = null

/**
 * Kills the currently running ML engine process, if any.
 */
export const cancelPythonML = (): void => {
    if (currentChild) {
        wasCancelled = true
        currentChild.kill()
        currentChild = null
    }
}

/**
 * Get the directory where ML models are stored.
 * Creates the directory if it doesn't exist.
 */
export const getModelsDirectory = (): string => {
    const modelsDir = path.join(app.getPath('userData'), '.csgdb', 'models')
    if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true })
    }
    return modelsDir
}

/**
 * Resolves the path to the directory containing bundled pre-trained models.
 * These are shipped with the app as extraResources.
 */
export const getBundledModelsDirectory = (): string => {
    if (app.isPackaged) {
        const base = app.getAppPath().replace(`${path.sep}app.asar`, '')
        return path.join(base, 'pretrained-models')
    }
    return path.join(app.getAppPath(), 'pretrained-models')
}

/**
 * Resolves the path to the Python ML engine.
 * In development, it points to the compiled binary in python-ml-engine/dist.
 * In production, it points to the bundled executable in extraResources.
 */
export const getPythonBinaryPath = (): string => {
    const binaryName =
        process.platform === 'win32' ? 'ml_engine.exe' : 'ml_engine'

    if (app.isPackaged) {
        // In production, the binary is expected to be in the resources/ml_engine folder
        const base = app.getAppPath().replace(`${path.sep}app.asar`, '')
        return path.join(base, 'ml_engine', binaryName)
    } else {
        // In development, we use the compiled binary from the dist folder
        return path.join(
            app.getAppPath(),
            'python-ml-engine',
            'dist',
            binaryName
        )
    }
}

/**
 * Spawns the ML engine as a persistent sidecar process for fast predict/info calls.
 * The sidecar stays alive between requests, eliminating PyInstaller startup overhead.
 */
export const spawnSidecar = (): void => {
    const binaryPath = getPythonBinaryPath()
    if (!fs.existsSync(binaryPath)) {
        console.warn(
            `ML sidecar: binary not found at ${binaryPath}, skipping spawn.`
        )
        return
    }

    const child = spawn(binaryPath, ['--sidecar'])
    sidecarProcess = child
    sidecarStdoutBuffer = ''
    sidecarStderrBuffer = ''

    child.stdin.on('error', (err) => {
        const code = (err as NodeJS.ErrnoException).code
        if (code !== 'EPIPE' && code !== 'ERR_STREAM_DESTROYED') {
            console.error('ML sidecar stdin error:', err)
        }
    })

    child.stdout.on('data', (data: Buffer) => {
        sidecarStdoutBuffer += data.toString()
        const lines = sidecarStdoutBuffer.split('\n')
        sidecarStdoutBuffer = lines.pop() ?? ''
        for (const line of lines) {
            if (!line.trim()) continue
            const req = pendingSidecarRequest
            pendingSidecarRequest = null
            if (!req) continue
            try {
                const output = JSON.parse(line) as MLOutputData
                if (output.success) {
                    req.resolve(output)
                } else {
                    req.reject(
                        new Error(output.error || 'Unknown ML sidecar error')
                    )
                }
            } catch (e) {
                req.reject(
                    new Error(
                        `Failed to parse sidecar response: ${line.substring(0, 100)}`
                    )
                )
            }
        }
    })

    child.stderr.on('data', (data: Buffer) => {
        sidecarStderrBuffer += data.toString()
        const lines = sidecarStderrBuffer.split('\n')
        sidecarStderrBuffer = lines.pop() ?? ''
        for (const line of lines) {
            if (!line.trim()) continue
            try {
                const parsed = JSON.parse(line)
                if (
                    parsed.progress !== undefined &&
                    pendingSidecarRequest?.onProgress
                ) {
                    pendingSidecarRequest.onProgress(
                        parsed.progress as number,
                        (parsed.stage as string) ?? ''
                    )
                } else {
                    console.log('[ML sidecar]', line)
                }
            } catch {
                console.log('[ML sidecar]', line)
            }
        }
    })

    child.on('close', (code) => {
        console.log(`ML sidecar exited with code ${code}`)
        sidecarProcess = null
        if (pendingSidecarRequest) {
            pendingSidecarRequest.reject(
                new Error('ML sidecar process exited unexpectedly')
            )
            pendingSidecarRequest = null
        }
    })

    child.on('error', (err) => {
        console.error('ML sidecar spawn error:', err)
        sidecarProcess = null
        if (pendingSidecarRequest) {
            pendingSidecarRequest.reject(
                new Error(`ML sidecar error: ${err.message}`)
            )
            pendingSidecarRequest = null
        }
    })

    console.log('ML sidecar spawned')
}

/**
 * Kills the sidecar process. Called on app quit.
 */
export const killSidecar = (): void => {
    if (sidecarProcess) {
        sidecarProcess.kill()
        sidecarProcess = null
    }
}

/**
 * Sends a predict/info request to the persistent sidecar process.
 * Spawns the sidecar on first call if not already running.
 */
export const executePythonMLSidecar = async (
    inputData: MLInputData,
    onProgress?: ProgressCallback
): Promise<MLOutputData> => {
    if (!sidecarProcess) {
        spawnSidecar()
    }

    const process = sidecarProcess
    if (!process || !process.stdin) {
        throw new Error(
            'ML sidecar is not available. Ensure the ML engine binary is installed.'
        )
    }

    return new Promise<MLOutputData>((resolve, reject) => {
        pendingSidecarRequest = { resolve, reject, onProgress }
        process.stdin.write(JSON.stringify(inputData) + '\n')
    })
}

/**
 * Executes the Python ML engine with the provided input data.
 * Communication is done via stdin (JSON) and stdout (JSON).
 * Progress updates are emitted via stderr as JSON lines: {"progress": number, "stage": string}
 */
export const executePythonML = async (
    inputData: MLInputData,
    onProgress?: ProgressCallback
): Promise<MLOutputData> => {
    return new Promise((resolve, reject) => {
        const binaryPath = getPythonBinaryPath()

        if (!fs.existsSync(binaryPath)) {
            reject(
                new Error(
                    `ML Engine binary not found at: ${binaryPath}. Please run the build script in python-ml-engine first.`
                )
            )
            return
        }

        // We always spawn the binary directly
        wasCancelled = false
        const child = spawn(binaryPath, [])
        currentChild = child

        // Suppress EPIPE errors on stdin — they happen when the process is killed
        // before it has finished reading its input.
        child.stdin.on('error', (err) => {
            const code = (err as NodeJS.ErrnoException).code
            if (code !== 'EPIPE' && code !== 'ERR_STREAM_DESTROYED') {
                console.error('ML engine stdin error:', err)
            }
        })

        let stdout = ''
        let stderr = ''
        let stderrBuffer = ''

        child.stdout.on('data', (data) => {
            stdout += data.toString()
        })

        child.stderr.on('data', (data) => {
            stderrBuffer += data.toString()
            const lines = stderrBuffer.split('\n')
            stderrBuffer = lines.pop() ?? ''
            for (const line of lines) {
                if (!line.trim()) continue
                try {
                    const parsed = JSON.parse(line)
                    if (parsed.progress !== undefined && onProgress) {
                        onProgress(
                            parsed.progress as number,
                            (parsed.stage as string) ?? ''
                        )
                    } else {
                        stderr += line + '\n'
                    }
                } catch {
                    stderr += line + '\n'
                }
            }
        })

        child.on('close', (code) => {
            currentChild = null

            if (stderrBuffer.trim()) {
                stderr += stderrBuffer + '\n'
            }

            if (wasCancelled || (code === null && !stdout)) {
                wasCancelled = false
                const err = new Error('ML operation was cancelled') as Error & {
                    cancelled: true
                }
                err.cancelled = true
                reject(err)
                return
            }

            if (code !== 0 && !stdout) {
                reject(
                    new Error(
                        `ML Engine process exited with code ${code}. Stderr: ${stderr}`
                    )
                )
                return
            }

            try {
                const output = JSON.parse(stdout) as MLOutputData
                if (output.success) {
                    resolve(output)
                } else {
                    reject(new Error(output.error || 'Unknown ML engine error'))
                }
            } catch (e) {
                reject(
                    new Error(
                        `Failed to parse ML engine output: ${stdout.substring(0, 100)}... Error: ${e.message}`
                    )
                )
            }
        })

        child.on('error', (err) => {
            reject(new Error(`Failed to start ML engine: ${err.message}`))
        })

        // Write input to stdin as JSON
        child.stdin.write(JSON.stringify(inputData))
        child.stdin.end()
    })
}
