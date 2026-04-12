export type MLMode = 'train' | 'predict' | 'info'
export type MLModelType = 'overall_survival' | 'recurrence'
export type MLAlgorithm = 'rsf' | 'coxph'

export interface MLPatient {
    age_at_diagnosis?: number
    clinical_t_code?: string | null
    pathological_t_code?: string | null
    clinical_grade_code?: string | null
    pathological_grade_code?: string | null
    lymphatic_invasion?: string | null
    perineural_invasion?: string | null
    positive_node_count?: number | null
    extranodal_extension?: string | null
    is_alive?: boolean
    diagnosis_year?: string
    death_date?: string | null
    last_follow_up?: string | null
    recidive?: boolean
    date_of_first_post_treatment_follow_up?: string | null
    date_of_recidive?: string | null
}

export interface MLTrainInputData {
    mode: 'train'
    model_type: MLModelType
    algorithm: MLAlgorithm
    model_path: string
    data: {
        patients: MLPatient[]
    }
}

export interface MLPredictInputData {
    mode: 'predict'
    model_path: string
    data: {
        patient: MLPatient
    }
}

export interface MLInfoInputData {
    mode: 'info'
    model_path: string
}

export type MLInputData =
    | MLTrainInputData
    | MLPredictInputData
    | MLInfoInputData

export interface MLRiskFactor {
    feature: string
    importance: number
}

export interface MLTrainResult {
    c_index: number                 // Apparent C-index (training set, optimistically biased)
    bootstrap_c_index: number       // .632-corrected bootstrap C-index (honest generalisation estimate)
    bootstrap_c_index_std: number   // Std of raw OOB C-indices across bootstrap iterations
    n_samples: number
    n_events: number
    training_date: string
    algorithm: MLAlgorithm
    model_type: MLModelType
    feature_names: string[]
}

export interface MLSurvivalPredictionResult {
    risk_score: number
    top_risk_factors: MLRiskFactor[]
    survival_probability_1year: number
    survival_probability_3year: number
    survival_probability_5year: number
}

export interface MLRecurrencePredictionResult {
    risk_score: number
    top_risk_factors: MLRiskFactor[]
    recurrence_probability_1year: number
    recurrence_probability_3year: number
    recurrence_probability_5year: number
    recurrence_free_probability_1year: number
    recurrence_free_probability_3year: number
    recurrence_free_probability_5year: number
}

export interface MLModelInfoResult {
    model_metadata: MLTrainResult
}

export type MLResult =
    | MLTrainResult
    | MLSurvivalPredictionResult
    | MLRecurrencePredictionResult
    | MLModelInfoResult

export interface MLOutputData {
    success: boolean
    mode: MLMode
    result?: MLResult
    error?: string
}
