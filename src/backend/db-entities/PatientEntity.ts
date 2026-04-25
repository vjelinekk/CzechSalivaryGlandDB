export interface PatientEntity {
    id?: number
    tumor_type: 'malignant' | 'benign'
    name: string
    surname: string
    internal_patient_id: string
    personal_identification_number: string
    age_at_diagnosis: number
    gender: 'male' | 'female'
    region: string
    other_malignancy_in_personal_history: string
    specification_of_site_of_other_carcinoma: string
    other_major_salivary_gland_disease_in_personal_history: string
    disease_specification: string
    smokes: number // boolean
    cigarettes_per_day: number
    smoking_duration: number
    pack_years: number
    alcohol_abuse: number // boolean
    tumor_location: 'submandibular' | 'sublingual' | 'parotid'
    diagnosis_date: string
    side_of_lesion: string
    diagnosis_methods: string
    // fnab related fields kept on patient for simplicity per design
    fnab: number // boolean
    fnab_result: string
    core_biopsie?: string
    otevrena_biopsie?: string
    date_of_treatment_initiation: string
    therapy_type: string
    extent_of_surgical_treatment: string
    date_of_first_post_treatment_follow_up: string
    persistence: number // boolean
    date_of_persistence: string
    recidive: number // boolean
    date_of_recidive: string
    is_alive: number // boolean
    death_date: string
    last_follow_up: string
    next_follow_up: string
    notes: string
}
