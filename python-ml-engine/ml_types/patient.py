from typing import TypedDict, NotRequired

class Patient(TypedDict):
    """
    Structure of the patient data required for feature extraction
    """
    # Features
    age_at_diagnosis: NotRequired[int]
    clinical_t_code: NotRequired[str | None]       # e.g. 'T1', 'T2', 'T3', 'T4a', 'T4b', 'TX'
    pathological_t_code: NotRequired[str | None]
    clinical_grade_code: NotRequired[str | None]   # e.g. 'Stage I', 'Stage IVA'
    pathological_grade_code: NotRequired[str | None]
    lymphatic_invasion: NotRequired[str | None]   # 'yes' / 'no' / None
    perineural_invasion: NotRequired[str | None]
    positive_node_count: NotRequired[int | None]
    extranodal_extension: NotRequired[str | None]

    # Targets / Time calculation fields
    is_alive: NotRequired[bool]
    diagnosis_year: NotRequired[str]
    death_date: NotRequired[str | None]
    last_follow_up: NotRequired[str | None]
    recidive: NotRequired[bool]
    date_of_first_post_treatment_follow_up: NotRequired[str | None]
    date_of_recidive: NotRequired[str | None]
