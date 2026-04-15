import { ipcMain } from 'electron'
import { ipcBackUpChannels } from './ipcChannels'
import { createBackup, restoreBackup } from '../backend/services/backupService'

ipcMain.handle(ipcBackUpChannels.backUp, async () => {
    await createBackup()
})

ipcMain.handle(ipcBackUpChannels.loadBackUp, async () => {
    await restoreBackup()
})
