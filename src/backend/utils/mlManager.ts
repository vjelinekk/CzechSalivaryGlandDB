import { app } from 'electron'
import * as path from 'path'
import { spawn } from 'child_process'
import * as fs from 'fs'
import { MLInputData, MLOutputData } from '../types/ml'

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
 * Executes the Python ML engine with the provided input data.
 * Communication is done via stdin (JSON) and stdout (JSON).
 */
export const executePythonML = async (
    inputData: MLInputData
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
        const child = spawn(binaryPath, [])

        let stdout = ''
        let stderr = ''

        child.stdout.on('data', (data) => {
            stdout += data.toString()
        })

        child.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        child.on('close', (code) => {
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
