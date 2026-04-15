import db from '../dbManager'
import { runQuery, runQueryAll, runInsert, runDelete } from './dbHelpers'
import { MLModelEntity } from '../db-entities/MLModelEntity'
import { MLPredictionEntity } from '../db-entities/MLPredictionEntity'

/**
 * Saves a new model's metadata to the database.
 */
export const saveMLModel = async (
    model: Omit<MLModelEntity, 'id' | 'is_active' | 'is_bundled'> & {
        is_bundled?: number
    }
): Promise<number> => {
    return runInsert('ml_model', {
        ...model,
        is_active: 0,
        is_bundled: model.is_bundled ?? 0,
    })
}

/**
 * Returns true if any bundled (pre-trained) model is already registered.
 */
export const hasBundledModels = async (): Promise<boolean> => {
    const result = await runQuery<{ count: number }>(
        `SELECT COUNT(*) as count FROM ml_model WHERE is_bundled = 1`
    )
    return (result?.count ?? 0) > 0
}

/**
 * Retrieves all models from the database.
 */
export const getAllMLModels = async (): Promise<MLModelEntity[]> => {
    return runQueryAll<MLModelEntity>(
        `SELECT * FROM ml_model ORDER BY training_date DESC`
    )
}

/**
 * Retrieves a specific model by ID.
 */
export const getMLModelById = async (
    id: number
): Promise<MLModelEntity | undefined> => {
    return runQuery<MLModelEntity>(`SELECT * FROM ml_model WHERE id = ?`, [id])
}

/**
 * Retrieves the active model for a specific type and algorithm.
 */
export const getActiveMLModel = async (
    modelType: string,
    algorithm: string
): Promise<MLModelEntity | undefined> => {
    return runQuery<MLModelEntity>(
        `SELECT * FROM ml_model WHERE model_type = ? AND algorithm = ? AND is_active = 1`,
        [modelType, algorithm]
    )
}

/**
 * Sets a specific model as active and deactivates all others of the same type and algorithm.
 * Uses a transaction to ensure database-level consistency.
 */
export const setActiveMLModel = async (id: number): Promise<void> => {
    const model = await getMLModelById(id)
    if (!model) throw new Error('Model not found')

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION')

            // 1. Deactivate all models of the same type and algorithm
            db.run(
                `UPDATE ml_model SET is_active = 0 WHERE model_type = ? AND algorithm = ?`,
                [model.model_type, model.algorithm],
                (err) => {
                    if (err) {
                        db.run('ROLLBACK')
                        reject(err)
                        return
                    }

                    // 2. Activate the target model
                    db.run(
                        `UPDATE ml_model SET is_active = 1 WHERE id = ?`,
                        [id],
                        (err) => {
                            if (err) {
                                db.run('ROLLBACK')
                                reject(err)
                                return
                            }

                            db.run('COMMIT', (err) => {
                                if (err) reject(err)
                                else resolve()
                            })
                        }
                    )
                }
            )
        })
    })
}

/**
 * Deletes a model's metadata from the database.
 */
export const deleteMLModel = async (id: number): Promise<void> => {
    return runDelete('ml_model', id)
}

// =============================================
// ML Predictions (Cached Results)
// =============================================

/**
 * Saves or updates a calculation result for a patient.
 */
export const saveMLPrediction = async (
    prediction: Omit<MLPredictionEntity, 'id'>
): Promise<number> => {
    // Delete existing prediction for this patient/type/alg combo to ensure uniqueness
    await new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM ml_prediction WHERE id_patient = ? AND model_type = ? AND algorithm = ?`,
            [
                prediction.id_patient,
                prediction.model_type,
                prediction.algorithm,
            ],
            (err) => {
                if (err) reject(err)
                else resolve(true)
            }
        )
    })

    return runInsert('ml_prediction', prediction)
}

/**
 * Retrieves a saved prediction for a patient.
 */
export const getMLPrediction = async (
    patientId: number,
    modelType: string,
    algorithm: string
): Promise<MLPredictionEntity | undefined> => {
    return runQuery<MLPredictionEntity>(
        `SELECT * FROM ml_prediction WHERE id_patient = ? AND model_type = ? AND algorithm = ?`,
        [patientId, modelType, algorithm]
    )
}
