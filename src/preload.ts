import { contextBridge, ipcRenderer } from 'electron'
import { FormType } from './backend/constants'
import { KaplanMeierType } from './frontend/constants'
import { InferenceChiSquareCategories } from './frontend/enums/statistics.enums'
import { FilteredColumns, PatientType, Study } from './frontend/types'
import { ITTestGroups } from './frontend/types/statistics.types'
import {
    ipcAPIDeleteChannels,
    ipcAPIGetChannels,
    ipcAPIInsertChannels,
    ipcAPISaveChannels,
    ipcAPIUpdateChannels,
    ipcBackUpChannels,
    ipcEncryptionChannels,
    ipcExportChannels,
    ipcFSChannels,
    ipcImportChannels,
    ipcMLChannels,
} from './ipc/ipcChannels'

contextBridge.exposeInMainWorld('api', {
    save: (channel: ipcAPISaveChannels, data: JSON) => {
        return ipcRenderer.invoke(channel, [data])
    },
    insert: (channel: ipcAPIInsertChannels, data: JSON) => {
        return ipcRenderer.invoke(channel, data)
    },
    updatePatientsStudies: (
        patientId: number,
        patientType: FormType,
        studies: Study[]
    ) => {
        return ipcRenderer.invoke(ipcAPIUpdateChannels.updatePatientsStudies, [
            patientId,
            patientType,
            studies,
        ])
    },
    delete: (channel: ipcAPIDeleteChannels, data: JSON) => {
        return ipcRenderer.invoke(channel, data)
    },
    deletePatientFromStudy: (
        studyId: number,
        patientId: number,
        formType: FormType
    ) => {
        return ipcRenderer.invoke(ipcAPIDeleteChannels.deletePatientFromStudy, [
            studyId,
            patientId,
            formType,
        ])
    },
    get: (channel: ipcAPIGetChannels, data?: JSON) => {
        return ipcRenderer.invoke(channel, data)
    },
    getStudiesByFormType: (formType: number) => {
        return ipcRenderer.invoke(
            ipcAPIGetChannels.getStudiesByFormType,
            formType
        )
    },
    searchPatientsByNameSurnameRC: (search: string) => {
        return ipcRenderer.invoke(
            ipcAPIGetChannels.searchPatientsByNameSurnameRC,
            search
        )
    },
    getStudiesByPatientId: (patientId: number, patientType: FormType) => {
        return ipcRenderer.invoke(ipcAPIGetChannels.getStudiesByPatientId, [
            patientId,
            patientType,
        ])
    },
    getFilteredPatients: (filter: FilteredColumns, studyId?: number) => {
        return ipcRenderer.invoke(ipcAPIGetChannels.getFilteredPatients, [
            filter,
            studyId,
        ])
    },
    getKaplanMeierData: (
        kaplanMeierType: KaplanMeierType,
        filter: FilteredColumns
    ) => {
        return ipcRenderer.invoke(ipcAPIGetChannels.getKaplanMeierData, [
            kaplanMeierType,
            filter,
        ])
    },
    getPlannedPatientsBetweenDates: (startDate: Date, endDate: Date) => {
        return ipcRenderer.invoke(
            ipcAPIGetChannels.getPlannedPatientsBetweenDates,
            [startDate, endDate]
        )
    },
    getChiSquareData: (
        rows: number,
        columns: number,
        rowSelectedCateogries: Record<
            number,
            Record<InferenceChiSquareCategories, string[]>
        >,
        columnSelectedCategories: Record<
            number,
            Record<InferenceChiSquareCategories, string[]>
        >,
        tnmEditionId?: number
    ) => {
        return ipcRenderer.invoke(ipcAPIGetChannels.getChiSquareData, [
            rows,
            columns,
            rowSelectedCateogries,
            columnSelectedCategories,
            tnmEditionId,
        ])
    },
    getTTestData: (selectedGroups: ITTestGroups, tnmEditionId?: number) => {
        return ipcRenderer.invoke(ipcAPIGetChannels.getTTestData, [
            selectedGroups,
            tnmEditionId,
        ])
    },
    getTnmDistribution: (patientIds: number[], editionId: number) => {
        return ipcRenderer.invoke(ipcAPIGetChannels.getTnmDistribution, [
            patientIds,
            editionId,
        ])
    },
    getActiveTnmEdition: () => {
        return ipcRenderer.invoke(ipcAPIGetChannels.getActiveTnmEdition)
    },
    getAllTnmEditions: () => {
        return ipcRenderer.invoke(ipcAPIGetChannels.getAllTnmEditions)
    },
    getTnmEditionById: (editionId: number) => {
        return ipcRenderer.invoke(
            ipcAPIGetChannels.getTnmEditionById,
            editionId
        )
    },
    getTnmValues: (editionId: number, category?: 'T' | 'N' | 'M' | 'G') => {
        return ipcRenderer.invoke(ipcAPIGetChannels.getTnmValues, [
            editionId,
            category,
        ])
    },
    calculateTnmStage: (
        editionId: number,
        tValueId: number | null,
        nValueId: number | null,
        mValueId: number | null
    ) => {
        return ipcRenderer.invoke(ipcAPIGetChannels.calculateTnmStage, [
            editionId,
            tValueId,
            nValueId,
            mValueId,
        ])
    },
    getPatientStaging: (patientId: number) => {
        return ipcRenderer.invoke(
            ipcAPIGetChannels.getPatientStaging,
            patientId
        )
    },
    getAllPatientStagings: (patientId: number) => {
        return ipcRenderer.invoke(
            ipcAPIGetChannels.getAllPatientStagings,
            patientId
        )
    },
})

contextBridge.exposeInMainWorld('export', {
    export: (
        channel: ipcExportChannels,
        patients: PatientType[],
        language: string
    ) => {
        return ipcRenderer.invoke(channel, patients, language)
    },
})

contextBridge.exposeInMainWorld('import', {
    import: () => {
        return ipcRenderer.invoke(ipcImportChannels.import)
    },
})

contextBridge.exposeInMainWorld('fs', {
    save: () => {
        return ipcRenderer.invoke(ipcFSChannels.save)
    },
    getFileIcon: (fileName: string) => {
        return ipcRenderer.invoke(ipcFSChannels.getFileIcon, fileName)
    },
    getFileName: (filePath: string) => {
        return ipcRenderer.invoke(ipcFSChannels.getFileName, filePath)
    },
    open: (filePath: string) => {
        ipcRenderer.invoke(ipcFSChannels.open, filePath)
    },
    loadJson: (filePath: string) =>
        ipcRenderer.invoke(ipcFSChannels.loadJson, filePath),
    getPublicProductionReadyPath: (filePath: string) => {
        return ipcRenderer.invoke(
            ipcFSChannels.getPublicProductionReadyPath,
            filePath
        )
    },
})

contextBridge.exposeInMainWorld('encryption', {
    setEncryptionKey: (key: string) => {
        return ipcRenderer.invoke(ipcEncryptionChannels.setEncryptionKey, key)
    },
    isPasswordSet: () => {
        return ipcRenderer.invoke(ipcEncryptionChannels.isPasswordSet)
    },
    isEncryptionEnabled: () => {
        return ipcRenderer.invoke(ipcEncryptionChannels.isEncryptionEnabled)
    },
    insertPasswordRow: (password: string, usingEncryption: boolean) => {
        return ipcRenderer.invoke(ipcEncryptionChannels.insertPasswordRow, [
            password,
            usingEncryption,
        ])
    },
    insertPassword: (password: string) => {
        return ipcRenderer.invoke(
            ipcEncryptionChannels.insertPassword,
            password
        )
    },
    insertUsingEncryption: (enabled: boolean) => {
        return ipcRenderer.invoke(
            ipcEncryptionChannels.insertUsingEncryption,
            enabled
        )
    },
    validatePassword: (password: string) => {
        return ipcRenderer.invoke(
            ipcEncryptionChannels.validatePassword,
            password
        )
    },
    generateEncryptionKey: () => {
        return ipcRenderer.invoke(ipcEncryptionChannels.generateEncryptionKey)
    },
})

contextBridge.exposeInMainWorld('backUp', {
    backUp: () => {
        return ipcRenderer.invoke(ipcBackUpChannels.backUp)
    },
    loadBackUp: () => {
        return ipcRenderer.invoke(ipcBackUpChannels.loadBackUp)
    },
})

contextBridge.exposeInMainWorld('ml', {
    trainModel: (
        modelType: 'overall_survival' | 'recurrence',
        algorithm: 'rsf' | 'coxph'
    ) => ipcRenderer.invoke(ipcMLChannels.trainModel, [modelType, algorithm]),
    calculateRiskScore: (
        patient: PatientType,
        modelType: 'overall_survival' | 'recurrence',
        algorithm?: 'rsf' | 'coxph',
        recalculate?: boolean
    ) =>
        ipcRenderer.invoke(ipcMLChannels.calculateRiskScore, [
            patient,
            modelType,
            algorithm,
            recalculate,
        ]),
    getModelInfo: (modelType?: string) =>
        ipcRenderer.invoke(ipcMLChannels.getModelInfo, modelType),
    setActiveModel: (id: number) =>
        ipcRenderer.invoke(ipcMLChannels.setActiveModel, id),
    deleteModel: (id: number) =>
        ipcRenderer.invoke(ipcMLChannels.deleteModel, id),
    getSavedPrediction: (
        patientId: number,
        modelType: 'overall_survival' | 'recurrence',
        algorithm: 'rsf' | 'coxph'
    ) =>
        ipcRenderer.invoke(ipcMLChannels.getSavedPrediction, [
            patientId,
            modelType,
            algorithm,
        ]),
    onProgress: (
        callback: (data: { progress: number; stage: string }) => void
    ) => {
        ipcRenderer.on(ipcMLChannels.mlProgress, (_, data) => callback(data))
    },
    offProgress: () => {
        ipcRenderer.removeAllListeners(ipcMLChannels.mlProgress)
    },
    cancel: () => {
        ipcRenderer.invoke(ipcMLChannels.mlCancel)
    },
})
