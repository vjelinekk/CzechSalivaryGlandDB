import { ipcMain } from 'electron'
import {
    deletePatientWithStudies,
    getAllPatients,
    searchPatientsByNameSurnameRC,
    getPatientsByType,
    savePatient,
    getFilteredPatients,
    getKaplanMeierData,
    getPlannedPatientsBetweenDates,
    getChiSquareContingencyTable,
    getTTestData,
    getTnmDistribution,
} from '../backend/services/patientService'
import {
    deletePatientFromStudy,
    deleteStudy,
    getStudies,
    getStudiesByFormType,
    getStudiesByPatientId,
    insertPatientToStudy,
    saveStudy,
    updatePatientsStudies,
} from '../backend/repositories/studyRepository'
import {
    getActiveEdition,
    getAllTnmEditions,
    getTnmValuesByEdition,
    calculateStage,
    getPatientStaging,
    getAllPatientStagings,
    savePatientStaging,
    getTnmEditionById,
} from '../backend/repositories/tnmRepository'
import {
    ipcAPIDeleteChannels,
    ipcAPIGetChannels,
    ipcAPIInsertChannels,
    ipcAPISaveChannels,
    ipcAPIUpdateChannels,
} from './ipcChannels'
import { getPatientsInStudy } from '../backend/repositories/patientRepository'

ipcMain.handle(ipcAPISaveChannels.savePatient, async (event, args) => {
    const [data] = args
    return await savePatient(data)
})

ipcMain.handle(ipcAPISaveChannels.saveStudy, async (event, args) => {
    const [data] = args
    return await saveStudy(data)
})

ipcMain.handle(
    ipcAPIInsertChannels.insertPatientToStudy,
    async (event, data) => {
        return await insertPatientToStudy(data)
    }
)

ipcMain.handle(
    ipcAPIUpdateChannels.updatePatientsStudies,
    async (event, args) => {
        const [patientId, studies] = args
        return await updatePatientsStudies(patientId, studies)
    }
)

ipcMain.handle(ipcAPIGetChannels.getAllPatients, async () => {
    return await getAllPatients()
})

ipcMain.handle(
    ipcAPIGetChannels.searchPatientsByNameSurnameRC,
    async (event, search) => {
        try {
            return await searchPatientsByNameSurnameRC(search)
        } catch (err) {
            return null
        }
    }
)

ipcMain.handle(ipcAPIGetChannels.getPatientsByType, async (event, formType) => {
    return await getPatientsByType(formType)
})

ipcMain.handle(ipcAPIGetChannels.getPatientsInStudy, async (event, id) => {
    return await getPatientsInStudy(id)
})

ipcMain.handle(ipcAPIGetChannels.getStudies, async () => {
    return await getStudies()
})

ipcMain.handle(
    ipcAPIGetChannels.getStudiesByFormType,
    async (event, formType) => {
        return await getStudiesByFormType(formType)
    }
)

ipcMain.handle(ipcAPIGetChannels.getStudiesByPatientId, async (event, args) => {
    const [id] = args
    return await getStudiesByPatientId(id)
})

ipcMain.handle(ipcAPIDeleteChannels.deletePatient, async (event, data) => {
    return await deletePatientWithStudies(data)
})

ipcMain.handle(ipcAPIDeleteChannels.deleteStudy, async (event, data) => {
    return await deleteStudy(data)
})

ipcMain.handle(
    ipcAPIDeleteChannels.deletePatientFromStudy,
    async (event, args) => {
        const [studyId, patientId] = args
        return await deletePatientFromStudy(studyId, patientId)
    }
)

ipcMain.handle(ipcAPIGetChannels.getFilteredPatients, async (event, args) => {
    const [filter, studyId] = args
    return await getFilteredPatients(filter, studyId)
})

ipcMain.handle(ipcAPIGetChannels.getKaplanMeierData, async (event, args) => {
    const [kaplanMeierType, filter] = args
    return await getKaplanMeierData(kaplanMeierType, filter)
})

ipcMain.handle(
    ipcAPIGetChannels.getPlannedPatientsBetweenDates,
    async (event, args) => {
        const [startDate, endDate] = args
        return await getPlannedPatientsBetweenDates(startDate, endDate)
    }
)

ipcMain.handle(ipcAPIGetChannels.getChiSquareData, async (event, args) => {
    const [
        rows,
        columns,
        rowSelectedCateogries,
        columnSelectedCategories,
        tnmEditionId,
    ] = args
    return await getChiSquareContingencyTable(
        rows,
        columns,
        rowSelectedCateogries,
        columnSelectedCategories,
        tnmEditionId
    )
})

ipcMain.handle(ipcAPIGetChannels.getTTestData, async (event, args) => {
    const [selectedGroups, tnmEditionId] = args
    return await getTTestData(selectedGroups, tnmEditionId)
})

ipcMain.handle(ipcAPIGetChannels.getTnmDistribution, async (event, args) => {
    const [patientIds, editionId] = args
    return await getTnmDistribution(patientIds, editionId)
})

// TNM Classification Handlers
ipcMain.handle(ipcAPIGetChannels.getActiveTnmEdition, async () => {
    return await getActiveEdition()
})

ipcMain.handle(ipcAPIGetChannels.getAllTnmEditions, async () => {
    return await getAllTnmEditions()
})

ipcMain.handle(
    ipcAPIGetChannels.getTnmEditionById,
    async (event, editionId) => {
        return await getTnmEditionById(editionId)
    }
)

ipcMain.handle(ipcAPIGetChannels.getTnmValues, async (event, args) => {
    const [editionId, category] = args
    return await getTnmValuesByEdition(editionId, category)
})

ipcMain.handle(ipcAPIGetChannels.calculateTnmStage, async (event, args) => {
    const [editionId, tValueId, nValueId, mValueId] = args
    return await calculateStage(editionId, tValueId, nValueId, mValueId)
})

ipcMain.handle(
    ipcAPIGetChannels.getPatientStaging,
    async (event, patientId) => {
        return await getPatientStaging(patientId)
    }
)

ipcMain.handle(
    ipcAPIGetChannels.getAllPatientStagings,
    async (event, patientId) => {
        return await getAllPatientStagings(patientId)
    }
)

ipcMain.handle(ipcAPISaveChannels.savePatientStaging, async (event, args) => {
    const [staging] = args
    return await savePatientStaging(staging)
})
