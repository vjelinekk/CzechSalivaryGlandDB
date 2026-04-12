export interface MLTrainingResultDto {
    c_index: number
    bootstrap_c_index: number
    bootstrap_c_index_std: number
    n_samples: number
    n_events: number
    training_date: string
    algorithm: string
    feature_names: string[]
}
