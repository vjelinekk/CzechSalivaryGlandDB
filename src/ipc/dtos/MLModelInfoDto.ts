export interface MLModelMetadataDto {
    c_index: number
    bootstrap_c_index: number
    bootstrap_c_index_std: number
    n_samples: number
    n_events: number
    training_date: string
    algorithm: string
    model_type: string
    feature_names: string[]
}

export interface MLModelInfoDto {
    id: number
    model_metadata: MLModelMetadataDto
    model_path: string
    model_type: string
    is_active: boolean
    is_bundled: boolean
}
