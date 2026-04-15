import { app, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { initSchema } from '../dbManager'

const getDbPath = (): string => {
    let base = app.getAppPath()
    if (app.isPackaged) {
        base = base.replace(`${path.sep}app.asar`, '')
    }
    return path.resolve(base, 'db.sqlite')
}

export const createBackup = async (): Promise<void> => {
    const result = await dialog.showSaveDialog({
        title: 'Záloha',
        defaultPath: 'csgdb_backup.sqlite',
        filters: [{ name: 'SQlite', extensions: ['sqlite'] }],
    })

    if (result.canceled) {
        return
    }

    fs.copyFileSync(getDbPath(), result.filePath)
}

export const restoreBackup = async (): Promise<void> => {
    const result = await dialog.showOpenDialog({
        title: 'Obnova',
        properties: ['openFile'],
        filters: [{ name: 'SQlite', extensions: ['sqlite'] }],
    })

    if (result.canceled) {
        return
    }

    fs.copyFileSync(result.filePaths[0], getDbPath())

    initSchema()
}
