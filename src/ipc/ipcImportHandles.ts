import { dialog, ipcMain } from 'electron'
import { ipcImportChannels } from './ipcChannels'
import { importPatientsFromFile } from '../backend/services/importService'

ipcMain.handle(ipcImportChannels.import, async () => {
    const result = await dialog.showOpenDialog({
        title: 'Import Patients',
        properties: ['openFile'],
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    })

    if (result.canceled) {
        return
    }

    await importPatientsFromFile(result.filePaths[0])
})
