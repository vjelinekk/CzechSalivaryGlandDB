export interface MLModelEntity {
    id: number
    model_path: string
    model_type: 'overall_survival' | 'recurrence'
    algorithm: 'rsf' | 'coxph'
    c_index: number
    bootstrap_c_index: number
    bootstrap_c_index_std: number
    n_samples: number
    n_events: number
    training_date: string
    feature_names: string // JSON string array
    is_active: number // 0 or 1
    is_bundled: number // 0 or 1
}
