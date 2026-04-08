import { PatientDto } from './dtos/PatientDto'

export {}

import {
    ipcAPIDeleteChannels,
    ipcAPIGetChannels,
    ipcAPISaveChannels,
    ipcExportChannels,
} from './ipcChannels'
import { StudyDto } from './dtos/StudyDto'
import { PatientInStudyDto } from './dtos/PatientInStudyDto'
import { FilteredColumnsDto } from './dtos/FilteredColumnsDto'
import { KaplanMeierTypeEnum } from './dtos/enums/KaplanMeierTypeEnum'
import { PlannedPatientsMapDto } from './dtos/PlannedPatientsMapDto'
import { ITTestGroupsDto } from './dtos/ITTestGroupsDto'
import { NonParametricTestDataDto } from './dtos/NonParametricTestDataDto'
import { KaplanMeierDataDto } from './dtos/KaplanMeierDataDto'
import { InferenceChiSquareCategoriesEnum } from './dtos/enums/InferenceChiSquareCategoriesEnum'
import { FormTypeEnum } from './dtos/enums/FormTypeEnum'
import { PatientStagingDto } from './dtos/PatientStagingDto'
import { TnmEditionDto } from './dtos/TnmEditionDto'
import { TnmValueDefinitionDto } from './dtos/TnmValueDefinitionDto'
import { MLTrainingResultDto } from './dtos/MLTrainingResultDto'
import { MLPredictionResultDto } from './dtos/MLPredictionResultDto'
import { MLModelInfoDto } from './dtos/MLModelInfoDto'

declare global {
    interface Window {
        api: {
            save: (
                channel: ipcAPISaveChannels,
                data: PatientDto | StudyDto | PatientStagingDto
            ) => Promise<number | null>
            updatePatientsStudies: (
                patientId: number,
                patientType: FormTypeEnum,
                studies: StudyDto[]
            ) => Promise<boolean>
            insert: (
                channel: ipcAPIInsertChannels,
                data: PatientInStudyDto
            ) => Promise<boolean>
            delete: (
                chanel: ipcAPIDeleteChannels,
                data: PatientDto | StudyDto
            ) => Promise<boolean>
            deletePatientFromStudy: (
                studyId: number,
                patientId: number,
                patientType: FormTypeEnum
            ) => Promise<boolean>
            get: (
                channel: ipcAPIGetChannels,
                formType?: FormTypeEnum
            ) => Promise<PatientDto[] | StudyDto[]>
            getStudiesByFormType: (
                formType: FormTypeEnum
            ) => Promise<StudyDto[]>
            getStudiesByPatientId: (
                id: number,
                patientType: FormTypeEnum
            ) => Promise<StudyDto[]>
            searchPatientsByNameSurnameRC: (
                search: string
            ) => Promise<PatientDto[]>
            getFilteredPatients: (
                filter: FilteredColumnsDto,
                studyId?: number
            ) => Promise<PatientDto[]>
            getKaplanMeierData: (
                kaplanMeierType: KaplanMeierTypeEnum,
                filter: FilteredColumnsDto
            ) => Promise<KaplanMeierDataDto>
            getPlannedPatientsBetweenDates: (
                startDate: Date,
                endDate: Date
            ) => Promise<PlannedPatientsMapDto>
            getChiSquareData: (
                rows: number,
                columns: number,
                rowSelectedCategories: Record<
                    number,
                    Record<InferenceChiSquareCategoriesEnum, string[]>
                >,
                columnSelectedCategories: Record<
                    number,
                    Record<InferenceChiSquareCategoriesEnum, string[]>
                >,
                tnmEditionId?: number
            ) => Promise<number[][]>
            getTTestData: (
                selectedGroups: ITTestGroupsDto,
                tnmEditionId?: number
            ) => Promise<NonParametricTestDataDto>
            getTnmDistribution: (
                patientIds: number[],
                editionId: number
            ) => Promise<{
                clinical: {
                    t: Record<string, number>
                    n: Record<string, number>
                    m: Record<string, number>
                    stage: Record<string, number>
                }
                pathological: {
                    t: Record<string, number>
                    n: Record<string, number>
                    m: Record<string, number>
                    stage: Record<string, number>
                }
            }>
            getActiveTnmEdition: () => Promise<TnmEditionDto | null>
            getTnmEditionById: (
                editionId: number
            ) => Promise<TnmEditionDto | null>
            getTnmValues: (
                editionId: number,
                category?: 'T' | 'N' | 'M' | 'G'
            ) => Promise<TnmValueDefinitionDto[]>
            calculateTnmStage: (
                editionId: number,
                tValueId: number | null,
                nValueId: number | null,
                mValueId: number | null
            ) => Promise<TnmValueDefinitionDto | null>
            getPatientStaging: (
                patientId: number
            ) => Promise<PatientStagingDto | null>
            getAllTnmEditions: () => Promise<TnmEditionDto[]>
            getAllPatientStagings: (
                patientId: number
            ) => Promise<PatientStagingDto[]>
        }
        export: {
            export: (
                channel: ipcExportChannels,
                patients: PatientDto[],
                language: string
            ) => Promise<void>
        }
        import: {
            import: () => Promise<void>
        }
        fs: {
            save: () => Promise<string | null>
            getFileIcon: (fileName: string) => Promise<string>
            getFileName: (filePath: string) => Promise<string>
            open: (filePath: string) => void
            loadJson: (filePath: string) => Promise<Record<string, string>>
            getPublicProductionReadyPath: (filePath: string) => Promise<string>
        }
        encryption: {
            setEncryptionKey: (key: string) => void
            isPasswordSet: () => Promise<boolean | null>
            isEncryptionEnabled: () => Promise<boolean | null>
            insertPasswordRow: (
                password: string,
                usingEncryption: boolean
            ) => Promise<void>
            insertPassword: (password: string) => Promise<void>
            insertUsingEncryption: (enabled: boolean) => Promise<void>
            validatePassword: (password: string) => Promise<boolean>
            generateEncryptionKey: () => Promise<string>
        }
        backUp: {
            backUp: () => Promise<void>
            loadBackUp: () => Promise<void>
        }
        ml: {
            trainModel: (
                modelType: 'overall_survival' | 'recurrence',
                algorithm: 'rsf' | 'coxph'
            ) => Promise<MLTrainingResultDto>
            calculateRiskScore: (
                patient: PatientDto,
                modelType: 'overall_survival' | 'recurrence',
                algorithm?: 'rsf' | 'coxph',
                recalculate?: boolean
            ) => Promise<MLPredictionResultDto>
            getModelInfo: (modelType?: string) => Promise<MLModelInfoDto[]>
            setActiveModel: (id: number) => Promise<void>
            deleteModel: (id: number) => Promise<void>
            getSavedPrediction: (
                patientId: number,
                modelType: 'overall_survival' | 'recurrence',
                algorithm: 'rsf' | 'coxph'
            ) => Promise<MLPredictionResultDto | null>
        }
    }
}
