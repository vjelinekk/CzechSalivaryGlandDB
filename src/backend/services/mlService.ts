import * as path from 'path'
import * as fs from 'fs'
import { getAllPatients } from '../repositories/patientRepository'
import * as mlRepository from '../repositories/mlRepository'
import { PatientDto } from '../../ipc/dtos/PatientDto'
import {
    executePythonML,
    getBundledModelsDirectory,
    getModelsDirectory,
    ProgressCallback,
} from '../utils/mlManager'
import {
    MLTrainInputData,
    MLPredictInputData,
    MLInfoInputData,
    MLTrainResult,
    MLSurvivalPredictionResult,
    MLRecurrencePredictionResult,
    MLModelInfoResult,
    MLModelType,
    MLAlgorithm,
    MLPatient,
} from '../types/ml'
import { MLTrainingResultDto } from '../../ipc/dtos/MLTrainingResultDto'
import { MLPredictionResultDto } from '../../ipc/dtos/MLPredictionResultDto'
import { MLModelInfoDto } from '../../ipc/dtos/MLModelInfoDto'
import { FormType } from '../constants'
import { toNum } from '../mappers/utils'

const malignantFormTypes = [
    FormType.submandibularMalignant,
    FormType.sublingualMalignant,
    FormType.parotidMalignant,
]

/**
 * CRITICAL: Maps and sanitizes patient data for the ML engine.
 */
const sanitizePatientForML = (patient: PatientDto): MLPatient => {
    return {
        age_at_diagnosis: toNum(patient.vek_pri_diagnoze) ?? undefined,
        clinical_t_code: patient.t_klasifikace_klinicka as string | null,
        pathological_t_code: patient.t_klasifikace_patologicka as string | null,
        clinical_grade_code: patient.tnm_klasifikace_klinicka as string | null,
        pathological_grade_code: patient.tnm_klasifikace_patologicka as
            | string
            | null,
        lymphatic_invasion: patient.lymfovaskularni_invaze_histopatologie as
            | string
            | null,
        perineural_invasion: patient.perineuralni_invaze_histopatologie as
            | string
            | null,
        positive_node_count: toNum(
            patient.pocet_lymfatickych_uzlin_s_metastazou_histopatologie
        ),
        extranodal_extension: patient.extranodalni_sireni_histopatologie as
            | string
            | null,
        is_alive: patient.stav === 'alive',
        diagnosis_date: patient.rok_diagnozy ?? undefined,
        death_date: patient.datum_umrti,
        last_follow_up: patient.posledni_kontrola,
        recidive: patient.recidiva === 'yes',
        date_of_first_post_treatment_follow_up:
            patient.datum_prvni_kontroly_po_lecbe,
        date_of_recidive: patient.datum_prokazani_recidivy,
    }
}

/**
 * Trains a new ML model and saves its metadata to the database.
 */
export const trainMLModel = async (
    modelType: MLModelType,
    algorithm: MLAlgorithm,
    onProgress?: ProgressCallback
): Promise<MLTrainingResultDto> => {
    const allPatients = await getAllPatients()
    const malignantPatients = allPatients.filter(
        (p) =>
            p.form_type !== undefined &&
            malignantFormTypes.includes(p.form_type as FormType)
    )

    if (malignantPatients.length < 50) {
        throw new Error(
            `Insufficient data for training. At least 50 malignant patients are required, but found only ${malignantPatients.length}.`
        )
    }

    const sanitizedPatients = malignantPatients.map(sanitizePatientForML)

    // TEMPORARY: Save sanitized patients to models-validation/data for inspection
    // const validationDataPath = path.join(
    //     __dirname,
    //     '../../models-validation/data/sanitized-patients.json'
    // )
    // fs.writeFileSync(validationDataPath, JSON.stringify(sanitizedPatients, null, 2))

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const modelName = `${modelType}_${algorithm}_${timestamp}.joblib`
    const modelPath = path.join(getModelsDirectory(), modelName)

    const input: MLTrainInputData = {
        mode: 'train',
        model_type: modelType,
        algorithm: algorithm,
        model_path: modelPath,
        data: { patients: sanitizedPatients },
    }

    const output = await executePythonML(input, onProgress)
    const result = output.result as MLTrainResult

    // Save to database
    const modelId = await mlRepository.saveMLModel({
        model_path: modelPath,
        model_type: modelType,
        algorithm: algorithm,
        c_index: result.c_index,
        bootstrap_c_index: result.bootstrap_c_index,
        bootstrap_c_index_std: result.bootstrap_c_index_std,
        n_samples: result.n_samples,
        n_events: result.n_events,
        training_date: result.training_date,
        feature_names: JSON.stringify(result.feature_names),
    })

    // If it's the first model of this type/algorithm, activate it automatically
    const existingActive = await mlRepository.getActiveMLModel(
        modelType,
        algorithm
    )
    if (!existingActive) {
        await mlRepository.setActiveMLModel(modelId)
    }

    return result
}

/**
 * Calculates risk score using the ACTIVE model from the database.
 * First checks if a cached prediction exists.
 */
export const calculateRiskScore = async (
    patient: PatientDto,
    modelType: MLModelType,
    algorithm?: MLAlgorithm,
    recalculate = false,
    onProgress?: ProgressCallback
): Promise<MLPredictionResultDto> => {
    if (
        patient.form_type === undefined ||
        !malignantFormTypes.includes(patient.form_type as FormType)
    ) {
        throw new Error(
            'Risk scoring is only available for malignant patients.'
        )
    }

    const targetAlgorithm = algorithm || 'rsf'
    const activeModel = await mlRepository.getActiveMLModel(
        modelType,
        targetAlgorithm
    )

    if (!activeModel) {
        throw new Error(
            `No active model found for ${modelType} using ${targetAlgorithm}. Please activate a model in the Statistics tab.`
        )
    }

    // 1. Check for cached prediction if not explicitly recalculating
    if (!recalculate && patient.id) {
        const cached = await mlRepository.getMLPrediction(
            patient.id,
            modelType,
            targetAlgorithm
        )
        if (cached) {
            const result = JSON.parse(
                cached.result_json
            ) as MLPredictionResultDto
            result.calculation_date = cached.calculation_date
            result.is_stale = cached.id_model !== activeModel.id
            return result
        }
    }

    // 2. Perform new calculation
    if (!fs.existsSync(activeModel.model_path)) {
        throw new Error(
            `Model file not found on disk: ${activeModel.model_path}`
        )
    }

    const input: MLPredictInputData = {
        mode: 'predict',
        model_path: activeModel.model_path,
        data: { patient: sanitizePatientForML(patient) },
    }

    const output = await executePythonML(input, onProgress)
    const result = output.result as
        | MLSurvivalPredictionResult
        | MLRecurrencePredictionResult

    const resultDto: MLPredictionResultDto = {
        ...result,
        calculation_date: new Date().toISOString(),
        is_stale: false,
    }

    // 3. Save to database for future use
    if (patient.id) {
        await mlRepository.saveMLPrediction({
            id_patient: patient.id,
            id_model: activeModel.id,
            model_type: modelType,
            algorithm: targetAlgorithm,
            risk_score: resultDto.risk_score,
            result_json: JSON.stringify(resultDto),
            calculation_date: resultDto.calculation_date,
        })
    }

    return resultDto
}

/**
 * Retrieves all models from the database.
 */
export const getModelInfo = async (
    modelType?: string
): Promise<MLModelInfoDto[]> => {
    const models = await mlRepository.getAllMLModels()

    return models
        .filter((m) => !modelType || m.model_type === modelType)
        .map((m) => ({
            id: m.id,
            model_metadata: {
                c_index: m.c_index,
                bootstrap_c_index: m.bootstrap_c_index,
                bootstrap_c_index_std: m.bootstrap_c_index_std,
                n_samples: m.n_samples,
                n_events: m.n_events,
                training_date: m.training_date,
                algorithm: m.algorithm,
                model_type: m.model_type,
                feature_names: JSON.parse(m.feature_names),
            },
            model_path: m.model_path,
            model_type: m.model_type,
            is_active: m.is_active === 1,
            is_bundled: m.is_bundled === 1,
        }))
}

/**
 * Sets a specific model version as the active one.
 */
export const setActiveModel = async (id: number): Promise<void> => {
    return mlRepository.setActiveMLModel(id)
}

/**
 * Deletes a model from the database and physically from the disk.
 */
export const deleteModel = async (id: number): Promise<void> => {
    const model = await mlRepository.getMLModelById(id)
    if (!model) return

    // 1. Delete physical file if it exists
    if (fs.existsSync(model.model_path)) {
        fs.unlinkSync(model.model_path)
    }

    // 2. Delete from database
    return mlRepository.deleteMLModel(id)
}

/**
 * Retrieves a saved prediction for a patient if it exists.
 */
export const getSavedPrediction = async (
    patientId: number,
    modelType: MLModelType,
    algorithm: MLAlgorithm
): Promise<MLPredictionResultDto | null> => {
    const activeModel = await mlRepository.getActiveMLModel(
        modelType,
        algorithm
    )
    const cached = await mlRepository.getMLPrediction(
        patientId,
        modelType,
        algorithm
    )

    if (cached) {
        const result = JSON.parse(cached.result_json) as MLPredictionResultDto
        result.calculation_date = cached.calculation_date
        result.is_stale = activeModel
            ? cached.id_model !== activeModel.id
            : true
        return result
    }

    return null
}

/**
 * Copies bundled pre-trained models from extraResources to the user models directory
 * and registers them in the database. Runs once on startup; skipped if already imported.
 */
export const initBundledModels = async (): Promise<void> => {
    if (await mlRepository.hasBundledModels()) return

    const bundledDir = getBundledModelsDirectory()
    if (!fs.existsSync(bundledDir)) {
        console.log('No pretrained-models directory found, skipping.')
        return
    }

    const files = fs
        .readdirSync(bundledDir)
        .filter((f) => f.endsWith('.joblib'))
    if (files.length === 0) return

    console.log(`Importing ${files.length} bundled models...`)
    const modelsDir = getModelsDirectory()

    for (const file of files) {
        const sourcePath = path.join(bundledDir, file)
        const destPath = path.join(modelsDir, file)

        try {
            if (!fs.existsSync(destPath)) {
                fs.copyFileSync(sourcePath, destPath)
            }

            const input: MLInfoInputData = {
                mode: 'info',
                model_path: destPath,
            }
            const output = await executePythonML(input)
            const info = (output.result as MLModelInfoResult).model_metadata

            const modelId = await mlRepository.saveMLModel({
                model_path: destPath,
                model_type: info.model_type,
                algorithm: info.algorithm,
                c_index: info.c_index,
                bootstrap_c_index: info.bootstrap_c_index ?? 0,
                bootstrap_c_index_std: info.bootstrap_c_index_std ?? 0,
                n_samples: info.n_samples,
                n_events: info.n_events,
                training_date: info.training_date,
                feature_names: JSON.stringify(info.feature_names),
                is_bundled: 1,
            })

            await mlRepository.setActiveMLModel(modelId)
        } catch (e) {
            console.error(`Failed to import bundled model ${file}:`, e)
        }
    }
}

/**
 * Migration helper: Imports existing .joblib files into the database if the table is empty.
 * This runs once on startup.
 */
export const syncModelsToDatabase = async (): Promise<void> => {
    const dbModels = await mlRepository.getAllMLModels()
    const userModels = dbModels.filter((m) => m.is_bundled === 0)
    if (userModels.length > 0) return // Already synced

    const modelsDir = getModelsDirectory()
    if (!fs.existsSync(modelsDir)) return

    const registeredPaths = new Set(dbModels.map((m) => m.model_path))
    const files = fs
        .readdirSync(modelsDir)
        .filter((f) => f.endsWith('.joblib'))
        .filter((f) => !registeredPaths.has(path.join(modelsDir, f)))

    if (files.length === 0) return
    console.log(`Syncing ${files.length} existing models to database...`)

    for (const file of files) {
        const modelPath = path.join(modelsDir, file)
        try {
            const input: MLInfoInputData = {
                mode: 'info',
                model_path: modelPath,
            }
            const output = await executePythonML(input)
            const info = (output.result as MLModelInfoResult).model_metadata

            await mlRepository.saveMLModel({
                model_path: modelPath,
                model_type: info.model_type,
                algorithm: info.algorithm,
                c_index: info.c_index,
                bootstrap_c_index: info.bootstrap_c_index ?? 0,
                bootstrap_c_index_std: info.bootstrap_c_index_std ?? 0,
                n_samples: info.n_samples,
                n_events: info.n_events,
                training_date: info.training_date,
                feature_names: JSON.stringify(info.feature_names),
            })
        } catch (e) {
            console.error(`Failed to sync model ${file}:`, e)
        }
    }
}
