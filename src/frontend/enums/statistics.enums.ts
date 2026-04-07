export enum DescriptiveStatisticsType {
    ALL = 'all',
    MALIGNANT = 'malignant',
    BENIGN = 'benign',
}

export enum InferenceChiSquareCategories {
    histologicalTypes = 'histologicalTypes',
    tClassification = 'tClassification',
    nClassification = 'nClassification',
    mClassification = 'mClassification',
    persistence = 'persistence',
    recurrence = 'recurrence',
    state = 'state',
}

export enum InferenceChiSquareHistologicalTypes {
    ACINIC_CELL_CARCINOMA = 'acinic-cell-carcinoma',
    SECRETORY_CARCINOMA = 'secretory-carcinoma',
    MUCOEPIDERMOID_CARCINOMA = 'mucoepidermoid-carcinoma',
    ADENOID_CYSTIC_CARCINOMA = 'adenoid-cystic-carcinoma',
    POLYMORPHIC_ADENOCARCINOMA = 'polymorphous-adenocarcinoma',
    EPITHELIAL_MYOEPITHELIAL_CARCINOMA = 'epithelial-myoepithelial-carcinoma',
    HYALINIZING_CARCINOMA_OF_CLEAR_CELLS = 'hyalinizing-clear-cell-carcinoma',
    BASAL_CELL_ADENOCARCINOMA = 'basal-cell-adenocarcinoma',
    SEBACEOUS_ADENOCARCINOMA = 'sebaceous-adenocarcinoma',
    INTRADUCTAL_CARCINOMA = 'intraductal-carcinoma',
    SALIVARY_CARCINOMA_NOS = 'salivary-carcinoma-nos',
    SALIVARY_DUCT_CARCINOMA = 'salivary-duct-carcinoma',
    MYOEPITHELIAL_CARCINOMA = 'myoepithelial-carcinoma',
    CARCINOMA_FROM_PLEOMORPHIC_ADENOMA = 'carcinoma-ex-pleomorphic-adenoma',
    CARCINOSARCOMA = 'carcinosarcoma',
    POORLY_DIFERENTIATED_CARCINOMA = 'poorly-differentiated-carcinoma',
    LYMPHOEPITHELIAL_CARCINOMA = 'lymphoepithelial-carcinoma',
    SQUAMOUS_CELL_CARCINOMA = 'squamous-cell-carcinoma',
    MICROSECRETORY_ADENOCARCINOMA = 'microsecretory-adenocarcinoma',
    SCLEROSING_MICROCYSTIC_ADENOCARCINOMA = 'sclerosing-microcystic-adenocarcinoma',
    MUCINOUS_ADENOCARCINOMA = 'mucinous-adenocarcinoma',
    SIALOBLASTOMA = 'asialoblastoma',
    MALT_LYMPHOMA = 'malt-lymphoma',
}

export enum InferenceChiSquarePersistence {
    Ano = 'yes',
    Ne = 'no',
}

export enum InferenceChiSquareRecurrence {
    Ano = 'yes',
    Ne = 'no',
}

export enum InferenceChiSquareState {
    Žije = 'alive',
    Zemřel = 'deceased',
}

export enum NonParametricTestType {
    ONE_TAILED_LEFT = 'one_tailed_left',
    ONE_TAILED_RIGHT = 'one_tailed_right',
    TWO_TAILED = 'two_tailed',
}

export enum NonParametricTestValue {
    AGE = 'vek_pri_diagnoze',
    PACK_YEAR = 'pocet_balickoroku',
    TUMOR_SIZE = 'velikost_nadoru_histopatologie',
}
