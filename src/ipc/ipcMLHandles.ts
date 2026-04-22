import { ipcMain } from 'electron'
import {
    trainMLModel,
    calculateRiskScore,
    getModelInfo,
    setActiveModel,
    deleteModel,
    getSavedPrediction,
} from '../backend/services/mlService'
import { cancelPythonML } from '../backend/utils/mlManager'
import { ipcMLChannels } from './ipcChannels'
import { MLModelType, MLAlgorithm } from '../backend/types/ml'
import { PatientDto } from './dtos/PatientDto'

ipcMain.handle(
    ipcMLChannels.trainModel,
    async (event, args: [MLModelType, MLAlgorithm]) => {
        const [modelType, algorithm] = args
        const onProgress = (progress: number, stage: string) => {
            if (!event.sender.isDestroyed()) {
                event.sender.send(ipcMLChannels.mlProgress, { progress, stage })
            }
        }
        return await trainMLModel(modelType, algorithm, onProgress)
    }
)

ipcMain.handle(
    ipcMLChannels.calculateRiskScore,
    async (event, args: [PatientDto, MLModelType, MLAlgorithm?, boolean?]) => {
        const [patient, modelType, algorithm, recalculate] = args
        const onProgress = (progress: number, stage: string) => {
            if (!event.sender.isDestroyed()) {
                event.sender.send(ipcMLChannels.mlProgress, { progress, stage })
            }
        }
        return await calculateRiskScore(
            patient,
            modelType,
            algorithm,
            recalculate,
            onProgress
        )
    }
)

ipcMain.handle(
    ipcMLChannels.getSavedPrediction,
    async (event, args: [number, MLModelType, MLAlgorithm]) => {
        const [patientId, modelType, algorithm] = args
        return await getSavedPrediction(patientId, modelType, algorithm)
    }
)

ipcMain.handle(
    ipcMLChannels.getModelInfo,
    async (event, modelType?: string) => {
        return await getModelInfo(modelType)
    }
)

ipcMain.handle(ipcMLChannels.setActiveModel, async (event, id: number) => {
    return await setActiveModel(id)
})

ipcMain.handle(ipcMLChannels.deleteModel, async (event, id: number) => {
    return await deleteModel(id)
})

ipcMain.handle(ipcMLChannels.mlCancel, () => {
    cancelPythonML()
})
