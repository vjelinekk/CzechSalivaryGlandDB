import crypto from 'crypto'
import dotenv from 'dotenv'
dotenv.config()

const algorithm = 'aes-256-cbc'
let encryptionKey: string

export const setEncryptionKey = (key: string) => {
    encryptionKey = key
}

export const generateEncryptionKey = (): string => {
    return crypto.randomBytes(32).toString('hex')
}

export const encrypt = (text: string): { encrypted: string; iv: Buffer } => {
    if (encryptionKey === '') {
        return { encrypted: text, iv: Buffer.from('') }
    }

    try {
        const iv = crypto.randomBytes(16)
        const cipher = crypto.createCipheriv(
            algorithm,
            Uint8Array.from(Buffer.from(encryptionKey, 'hex')),
            Uint8Array.from(iv)
        )
        let encrypted = cipher.update(text)
        encrypted = Buffer.concat([
            Uint8Array.from(encrypted),
            Uint8Array.from(cipher.final()),
        ])
        return { encrypted: encrypted.toString('hex'), iv }
    } catch (error) {
        console.log(error)
    }
}

export const decrypt = (text: string, iv: Buffer): string => {
    if (encryptionKey === '') {
        return text
    }

    try {
        const encryptedText = Buffer.from(text, 'hex')
        const decipher = crypto.createDecipheriv(
            algorithm,
            Uint8Array.from(Buffer.from(encryptionKey, 'hex')),
            Uint8Array.from(iv)
        )
        let decrypted: Buffer = decipher.update(Uint8Array.from(encryptedText))
        decrypted = Buffer.concat([
            Uint8Array.from(decrypted),
            Uint8Array.from(decipher.final()),
        ])
        return decrypted.toString()
    } catch (error) {
        console.log(error)
    }
}
