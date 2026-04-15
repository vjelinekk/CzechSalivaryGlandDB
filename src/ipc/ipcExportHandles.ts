import { ipcMain } from 'electron'
import { ipcExportChannels } from './ipcChannels'
import { PatientType } from '../frontend/types'
import { exportPatients } from '../backend/services/exportService'

ipcMain.handle(
    ipcExportChannels.export,
    async (event, patients: PatientType[], language: string) => {
        await exportPatients(patients, false, language)
    }
)

ipcMain.handle(
    ipcExportChannels.exportAnonymized,
    async (event, patients: PatientType[], language: string) => {
        await exportPatients(patients, true, language)
    }
)
