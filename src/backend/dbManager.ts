import sqlite3 from 'sqlite3'
import path from 'path'
import { app } from 'electron'

const getDBPath = (filename: string): string => {
    let base = app.getAppPath()
    if (app.isPackaged) {
        base = base.replace(`${path.sep}app.asar`, '')
    }
    return path.resolve(base, `${filename}.sqlite`)
}

const db = new sqlite3.Database(getDBPath('db'))

const schemaQueries = [
    // 1. Independent Lookups & Config
    `CREATE TABLE IF NOT EXISTS password (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        password TEXT,
        using_encryption INTEGER -- boolean
    )`,
    `CREATE TABLE IF NOT EXISTS study (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        study_name TEXT NOT NULL,
        study_type INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS tnm_edition (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        active_from TEXT,
        is_active INTEGER -- boolean
    )`,
    `CREATE TABLE IF NOT EXISTS histology_type (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tumor_type TEXT NOT NULL,
        translation_key TEXT NOT NULL,
        UNIQUE(tumor_type, translation_key)
    )`,

    // 2. Dependent Lookups
    `CREATE TABLE IF NOT EXISTS tnm_value_definition (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        edition_id INTEGER NOT NULL,
        category TEXT, -- 'T', 'N', 'M', 'G'
        code TEXT,
        description TEXT,
        sort_order INTEGER,
        FOREIGN KEY (edition_id) REFERENCES tnm_edition(id)
    )`,
    `CREATE TABLE IF NOT EXISTS tnm_stage_rule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_edition INTEGER NOT NULL,
        t_value_id INTEGER,          -- NULL means "any T value"
        n_value_id INTEGER,          -- NULL means "any N value"
        m_value_id INTEGER,          -- NULL means "any M value"
        stage_value_id INTEGER NOT NULL,  -- The resulting stage (G category)
        priority INTEGER DEFAULT 0,  -- Higher priority rules evaluated first
        FOREIGN KEY (id_edition) REFERENCES tnm_edition(id) ON DELETE CASCADE,
        FOREIGN KEY (t_value_id) REFERENCES tnm_value_definition(id),
        FOREIGN KEY (n_value_id) REFERENCES tnm_value_definition(id),
        FOREIGN KEY (m_value_id) REFERENCES tnm_value_definition(id),
        FOREIGN KEY (stage_value_id) REFERENCES tnm_value_definition(id)
    )`,
    `CREATE TABLE IF NOT EXISTS histology_subtype (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_histology_type INTEGER NOT NULL,
        translation_key TEXT NOT NULL,
        FOREIGN KEY (id_histology_type) REFERENCES histology_type(id),
        UNIQUE(id_histology_type, translation_key)
    )`,

    // 3. Base Patient Table
    `CREATE TABLE IF NOT EXISTS patient (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tumor_type TEXT NOT NULL, -- 'malignant', 'benign'
        name TEXT,
        surname TEXT,
        internal_patient_id TEXT,
        personal_identification_number TEXT,
        age_at_diagnosis INTEGER,
        gender TEXT, -- 'male', 'female'
        region TEXT,
        other_malignancy_in_personal_history TEXT,
        specification_of_site_of_other_carcinoma TEXT,
        other_major_salivary_gland_disease_in_personal_history TEXT,
        disease_specification TEXT,
        smokes INTEGER, -- boolean
        cigarettes_per_day INTEGER,
        smoking_duration REAL,
        pack_years REAL,
        alcohol_abuse INTEGER, -- boolean
        tumor_location TEXT, -- 'submandibular', 'sublingual', 'parotid'
        diagnosis_date TEXT, -- date
        side_of_lesion TEXT,
        diagnosis_methods TEXT,
        fnab INTEGER, -- boolean
        fnab_result TEXT,
        core_biopsie TEXT, -- 'yes' or 'no'
        otevrena_biopsie TEXT, -- 'yes' or 'no'
        date_of_treatment_initiation TEXT, -- date
        therapy_type TEXT,
        extent_of_surgical_treatment TEXT,
        date_of_first_post_treatment_follow_up TEXT, -- date
        persistence INTEGER, -- boolean
        date_of_persistence TEXT, -- date
        recidive INTEGER, -- boolean
        date_of_recidive TEXT, -- date
        is_alive INTEGER, -- boolean
        death_date TEXT, -- date
        last_follow_up TEXT, -- date
        next_follow_up TEXT, -- date
        notes TEXT
    )`,

    // 4. Patient Relationships & Inheritance
    `CREATE TABLE IF NOT EXISTS is_in_study (
        id_study INTEGER NOT NULL,
        id_patient INTEGER NOT NULL,
        PRIMARY KEY (id_study, id_patient),
        FOREIGN KEY (id_study) REFERENCES study(id) ON DELETE CASCADE,
        FOREIGN KEY (id_patient) REFERENCES patient(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS attachment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_patient INTEGER NOT NULL,
        file_path TEXT,
        FOREIGN KEY (id_patient) REFERENCES patient(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS patient_staging (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_patient INTEGER NOT NULL,
        id_edition INTEGER NOT NULL,
        clinical_t_id INTEGER,
        clinical_n_id INTEGER,
        clinical_m_id INTEGER,
        clinical_grade_id INTEGER,
        pathological_t_id INTEGER,
        pathological_n_id INTEGER,
        pathological_m_id INTEGER,
        pathological_grade_id INTEGER,
        FOREIGN KEY (id_patient) REFERENCES patient(id) ON DELETE CASCADE,
        FOREIGN KEY (id_edition) REFERENCES tnm_edition(id),
        FOREIGN KEY (clinical_t_id) REFERENCES tnm_value_definition(id),
        FOREIGN KEY (clinical_n_id) REFERENCES tnm_value_definition(id),
        FOREIGN KEY (clinical_m_id) REFERENCES tnm_value_definition(id),
        FOREIGN KEY (clinical_grade_id) REFERENCES tnm_value_definition(id),
        FOREIGN KEY (pathological_t_id) REFERENCES tnm_value_definition(id),
        FOREIGN KEY (pathological_n_id) REFERENCES tnm_value_definition(id),
        FOREIGN KEY (pathological_m_id) REFERENCES tnm_value_definition(id),
        FOREIGN KEY (pathological_grade_id) REFERENCES tnm_value_definition(id)
    )`,

    // 5. Histology & Biopsy Results
    `CREATE TABLE IF NOT EXISTS biopsy_result (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_patient INTEGER NOT NULL,
        id_histology_type INTEGER NOT NULL,
        id_histology_subtype INTEGER,
        biopsy_type TEXT, -- 'core', 'open'
        note TEXT,
        FOREIGN KEY (id_patient) REFERENCES patient(id) ON DELETE CASCADE,
        FOREIGN KEY (id_histology_type) REFERENCES histology_type(id),
        FOREIGN KEY (id_histology_subtype) REFERENCES histology_subtype(id)
    )`,
    // Unique Constraint for Biopsy
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_biopsy_unique_type 
     ON biopsy_result (id_patient, biopsy_type)`,

    `CREATE TABLE IF NOT EXISTS histopathology (
        id_patient INTEGER PRIMARY KEY, -- 1:1 Relationship
        id_histology_type INTEGER NOT NULL,
        id_histology_subtype INTEGER,
        tumor_size INTEGER,
        tumor_size_not_determined_reason TEXT,
        resection_margin TEXT, -- 'R0', 'R1'
        lymphovascular_invasion INTEGER, -- boolean
        perineural_invasion INTEGER, -- boolean
        number_of_metastatic_lymph_nodes INTEGER,
        extranodal_extension INTEGER, -- boolean
        ene_result TEXT, -- 'ENEma', 'ENEmi'
        proven_distant_metastasis INTEGER, -- boolean
        site_of_distant_metastasis TEXT,
        note TEXT,
        FOREIGN KEY (id_patient) REFERENCES patient(id) ON DELETE CASCADE,
        FOREIGN KEY (id_histology_type) REFERENCES histology_type(id),
        FOREIGN KEY (id_histology_subtype) REFERENCES histology_subtype(id)
    )`,

    // 6. Inheritance Sub-Tables
    `CREATE TABLE IF NOT EXISTS malignant_patient (
        id_patient INTEGER PRIMARY KEY,
        block_neck_dissection INTEGER, -- boolean
        side_of_neck_dissection TEXT,
        type_of_nd TEXT,
        extent_of_nd TEXT,
        adjuvant_therapy TEXT,
        type_of_non_surgical_therapy TEXT,
        FOREIGN KEY (id_patient) REFERENCES patient(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS benign_patient (
        id_patient INTEGER PRIMARY KEY,
        preoperative_house_brackmann_grade_of_facial_nerve_function TEXT,
        postoperative_house_brackmann_grade_of_facial_nerve_function TEXT,
        postoperative_complications TEXT,
        other_postoperative_complications TEXT,
        further_follow_up_recommended TEXT,
        FOREIGN KEY (id_patient) REFERENCES patient(id) ON DELETE CASCADE
    )`,

    // 7. Specific Leaf Tables
    `CREATE TABLE IF NOT EXISTS malignant_parotid_specific (
        id_malignant_patient INTEGER PRIMARY KEY,
        preoperative_house_brackmann_grade_of_facial_nerve_function TEXT,
        postoperative_house_brackmann_grade_of_facial_nerve_function TEXT, 
        postoperative_complications TEXT,
        other_postoperative_complications TEXT,
        FOREIGN KEY (id_malignant_patient) REFERENCES malignant_patient(id_patient) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS malignant_submandibular_specific (
        id_malignant_patient INTEGER PRIMARY KEY,
        preoperative_house_brackmann_grade_of_facial_nerve_function TEXT,
        postoperative_house_brackmann_grade_of_facial_nerve_function TEXT,
        FOREIGN KEY (id_malignant_patient) REFERENCES malignant_patient(id_patient) ON DELETE CASCADE
    )`,

    // 8. ML Models
    `CREATE TABLE IF NOT EXISTS ml_model (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_path TEXT NOT NULL,
        model_type TEXT NOT NULL, -- 'overall_survival', 'recurrence'
        algorithm TEXT NOT NULL,  -- 'rsf', 'coxph'
        c_index REAL,
        bootstrap_c_index REAL,
        bootstrap_c_index_std REAL,
        n_samples INTEGER,
        n_events INTEGER,
        training_date TEXT,
        feature_names TEXT,       -- JSON string array
        is_active INTEGER DEFAULT 0,
        is_bundled INTEGER DEFAULT 0
    )`,
    // Ensure only one model per type+algorithm is active at a time
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_active_ml_model 
     ON ml_model (model_type, algorithm) WHERE is_active = 1`,

    // 9. ML Predictions (Cached results for patients)
    `CREATE TABLE IF NOT EXISTS ml_prediction (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_patient INTEGER NOT NULL,
        id_model INTEGER NOT NULL,
        model_type TEXT NOT NULL,
        algorithm TEXT NOT NULL,
        risk_score REAL NOT NULL,
        result_json TEXT NOT NULL, -- Full JSON blob of MLPredictionResultDto
        calculation_date TEXT NOT NULL,
        FOREIGN KEY (id_patient) REFERENCES patient(id) ON DELETE CASCADE,
        FOREIGN KEY (id_model) REFERENCES ml_model(id) ON DELETE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_prediction 
     ON ml_prediction (id_patient, model_type, algorithm)`,
]

const seedTnmData = () => {
    const tnmQueries = [
        // =============================================
        // TNM8 (AJCC 8th Edition) - INACTIVE
        // =============================================
        `INSERT OR IGNORE INTO tnm_edition (id, name, active_from, is_active) VALUES
        (1, 'TNM8', '2018-01-01', 0)`,

        // T Values (edition_id=1)
        `INSERT OR IGNORE INTO tnm_value_definition (id, edition_id, category, code, description, sort_order) VALUES
        (1, 1, 'T', 'TX', 'Primary tumor cannot be assessed', 1),
        (2, 1, 'T', 'T1', 'Tumor ≤2 cm', 2),
        (3, 1, 'T', 'T2', 'Tumor >2 cm but ≤4 cm', 3),
        (4, 1, 'T', 'T3', 'Tumor >4 cm or extraparenchymal extension', 4),
        (5, 1, 'T', 'T4a', 'Tumor invades skin, mandible, ear canal, or facial nerve', 5),
        (6, 1, 'T', 'T4b', 'Tumor invades skull base, pterygoid plates, or encases carotid artery', 6)`,

        // N Values (edition_id=1)
        `INSERT OR IGNORE INTO tnm_value_definition (id, edition_id, category, code, description, sort_order) VALUES
        (7, 1, 'N', 'N0', 'No regional lymph node metastasis', 1),
        (8, 1, 'N', 'N1', 'Single ipsilateral node ≤3 cm, ENE negative', 2),
        (9, 1, 'N', 'N2a', 'Single ipsilateral node >3 cm but ≤6 cm, ENE negative', 3),
        (10, 1, 'N', 'N2b', 'Multiple ipsilateral nodes ≤6 cm, ENE negative', 4),
        (11, 1, 'N', 'N2c', 'Bilateral or contralateral nodes ≤6 cm, ENE negative', 5),
        (12, 1, 'N', 'N3a', 'Metastasis in lymph node >6 cm, ENE negative', 6),
        (13, 1, 'N', 'N3b', 'Metastasis in any node with clinically overt ENE positive', 7)`,

        // M Values (edition_id=1)
        `INSERT OR IGNORE INTO tnm_value_definition (id, edition_id, category, code, description, sort_order) VALUES
        (14, 1, 'M', 'M0', 'No distant metastasis', 1),
        (15, 1, 'M', 'M1', 'Distant metastasis', 2)`,

        // G (Stage) Values (edition_id=1)
        `INSERT OR IGNORE INTO tnm_value_definition (id, edition_id, category, code, description, sort_order) VALUES
        (16, 1, 'G', 'Stage I', 'T1 N0 M0', 1),
        (17, 1, 'G', 'Stage II', 'T2 N0 M0', 2),
        (18, 1, 'G', 'Stage III', 'T3 N0 M0 or T1-3 N1 M0', 3),
        (19, 1, 'G', 'Stage IVA', 'T4a N0-2 M0 or T1-4a N2 M0', 4),
        (20, 1, 'G', 'Stage IVB', 'T4b any N M0 or any T N3 M0', 5),
        (21, 1, 'G', 'Stage IVC', 'Any T any N M1', 6)`,

        // TNM8 Stage Rules
        `INSERT OR IGNORE INTO tnm_stage_rule (id, id_edition, t_value_id, n_value_id, m_value_id, stage_value_id, priority) VALUES
        (1, 1, NULL, NULL, 15, 21, 100), 
        (2, 1, 6, NULL, 14, 20, 90),     
        (3, 1, NULL, 12, 14, 20, 85),    
        (4, 1, NULL, 13, 14, 20, 85),    
        (5, 1, 5, 7, 14, 19, 50),        
        (6, 1, 5, 8, 14, 19, 50),        
        (7, 1, 5, 9, 14, 19, 50),        
        (8, 1, 5, 10, 14, 19, 50),       
        (9, 1, 5, 11, 14, 19, 50),       
        (10, 1, 2, 9, 14, 19, 45),       
        (11, 1, 2, 10, 14, 19, 45),      
        (12, 1, 2, 11, 14, 19, 45),      
        (13, 1, 3, 9, 14, 19, 45),       
        (14, 1, 3, 10, 14, 19, 45),      
        (15, 1, 3, 11, 14, 19, 45),      
        (16, 1, 4, 9, 14, 19, 45),       
        (17, 1, 4, 10, 14, 19, 45),      
        (18, 1, 4, 11, 14, 19, 45),      
        (19, 1, 2, 8, 14, 18, 40),       
        (20, 1, 3, 8, 14, 18, 40),       
        (21, 1, 4, 8, 14, 18, 40),       
        (22, 1, 4, 7, 14, 18, 30),       
        (23, 1, 3, 7, 14, 17, 20),       
        (24, 1, 2, 7, 14, 16, 10)`,

        // =============================================
        // TNM9 (AJCC 9th Edition) - ACTIVE
        // =============================================
        `INSERT OR IGNORE INTO tnm_edition (id, name, active_from, is_active) VALUES
        (2, 'TNM9', '2025-01-01', 1)`,

        // T Values (edition_id=2)
        `INSERT OR IGNORE INTO tnm_value_definition (id, edition_id, category, code, description, sort_order) VALUES
        (101, 2, 'T', 'T1', 'Tumor size T1', 1),
        (102, 2, 'T', 'T2', 'Tumor size T2', 2),
        (103, 2, 'T', 'T3', 'Tumor size T3', 3),
        (104, 2, 'T', 'T4', 'Tumor size T4', 4)`,

        // N Values (edition_id=2)
        `INSERT OR IGNORE INTO tnm_value_definition (id, edition_id, category, code, description, sort_order) VALUES
        (105, 2, 'N', 'N0', 'No regional lymph node metastasis', 1),
        (106, 2, 'N', 'N1', 'Metastasis in regional lymph nodes N1', 2),
        (107, 2, 'N', 'N2', 'Metastasis in regional lymph nodes N2', 3)`,

        // M Values (edition_id=2)
        `INSERT OR IGNORE INTO tnm_value_definition (id, edition_id, category, code, description, sort_order) VALUES
        (108, 2, 'M', 'M0', 'No distant metastasis', 1),
        (109, 2, 'M', 'M1', 'Distant metastasis', 2)`,

        // G (Stage) Values (edition_id=2)
        `INSERT OR IGNORE INTO tnm_value_definition (id, edition_id, category, code, description, sort_order) VALUES
        (110, 2, 'G', 'Stage I', 'Stage I', 1),
        (111, 2, 'G', 'Stage II', 'Stage II', 2),
        (112, 2, 'G', 'Stage IIIA', 'Stage IIIA', 3),
        (113, 2, 'G', 'Stage IIIB', 'Stage IIIB', 4),
        (114, 2, 'G', 'Stage IV', 'Stage IV', 5)`,

        // TNM9 Stage Rules
        `INSERT OR IGNORE INTO tnm_stage_rule (id, id_edition, t_value_id, n_value_id, m_value_id, stage_value_id, priority) VALUES
        (100, 2, NULL, NULL, 109, 114, 100), -- Any T, Any N, M1 -> Stage IV
        (101, 2, 101, 105, 108, 110, 10),  
        (102, 2, 102, 105, 108, 111, 10),  
        (103, 2, 103, 105, 108, 112, 10),  
        (104, 2, 104, 105, 108, 112, 10),  
        (105, 2, 101, 106, 108, 112, 10),  
        (106, 2, 102, 106, 108, 112, 10),  
        (107, 2, 101, 107, 108, 113, 10),  
        (108, 2, 102, 107, 108, 113, 10),  
        (109, 2, 103, 106, 108, 113, 10),  
        (110, 2, 103, 107, 108, 113, 10),  
        (111, 2, 104, 106, 108, 113, 10),  
        (112, 2, 104, 107, 108, 113, 10)`,
    ]

    tnmQueries.forEach((query) => {
        db.run(query, (err) => {
            if (err) {
                console.error('Error seeding TNM data:', err)
                console.error('Query:', query)
            }
        })
    })
}

const seedLookups = () => {
    const queries = [
        // --- Malignant Histology Types ---
        `INSERT OR IGNORE INTO histology_type (id, tumor_type, translation_key) VALUES
        (1, 'malignant', 'acinic-cell-carcinoma'),
        (2, 'malignant', 'secretory-carcinoma'),
        (3, 'malignant', 'mucoepidermoid-carcinoma'),
        (4, 'malignant', 'adenoid-cystic-carcinoma'),
        (5, 'malignant', 'polymorphous-adenocarcinoma'),
        (6, 'malignant', 'epithelial-myoepithelial-carcinoma'),
        (7, 'malignant', 'hyalinizing-clear-cell-carcinoma'),
        (8, 'malignant', 'basal-cell-adenocarcinoma'),
        (9, 'malignant', 'sebaceous-adenocarcinoma'),
        (10, 'malignant', 'intraductal-carcinoma'),
        (11, 'malignant', 'salivary-carcinoma-nos'),
        (12, 'malignant', 'salivary-duct-carcinoma'),
        (13, 'malignant', 'myoepithelial-carcinoma'),
        (14, 'malignant', 'carcinoma-ex-pleomorphic-adenoma'),
        (15, 'malignant', 'carcinosarcoma'),
        (16, 'malignant', 'poorly-differentiated-carcinoma'),
        (17, 'malignant', 'lymphoepithelial-carcinoma'),
        (18, 'malignant', 'squamous-cell-carcinoma'),
        (19, 'malignant', 'microsecretory-adenocarcinoma'),
        (20, 'malignant', 'sclerosing-microcystic-adenocarcinoma'),
        (21, 'malignant', 'mucinous-adenocarcinoma'),
        (22, 'malignant', 'asialoblastoma'),
        (23, 'malignant', 'malt-lymphoma'),
        (24, 'malignant', 'other')`,

        // --- Benign Histology Types ---
        `INSERT OR IGNORE INTO histology_type (id, tumor_type, translation_key) VALUES
        (25, 'benign', 'pleomorphic-adenoma'),
        (26, 'benign', 'warthin-tumor'),
        (27, 'benign', 'basal-cell-adenoma'),
        (28, 'benign', 'myoepithelioma'),
        (29, 'benign', 'oncocytoma'),
        (30, 'benign', 'canalicular-adenoma'),
        (31, 'benign', 'sebaceous-adenoma'),
        (32, 'benign', 'ductal-papilloma'),
        (33, 'benign', 'sebaceous-lymphadenoma'),
        (34, 'benign', 'keratocystoma'),
        (35, 'benign', 'other')`,

        // --- Histology Subtypes ---
        // mucoepidermoid-carcinoma (id=3)
        `INSERT OR IGNORE INTO histology_subtype (id, id_histology_type, translation_key) VALUES
        (1, 3, 'low-grade'),
        (2, 3, 'intermediate-grade'),
        (3, 3, 'high-grade'),
        (4, 3, 'subtype-not-specified')`,

        // adenoid-cystic-carcinoma (id=4)
        `INSERT OR IGNORE INTO histology_subtype (id, id_histology_type, translation_key) VALUES
        (5, 4, 'tubular-cribriform-dominant'),
        (6, 4, 'more-than-30-solid-component'),
        (7, 4, 'subtype-not-specified')`,

        // polymorphous-adenocarcinoma (id=5)
        `INSERT OR IGNORE INTO histology_subtype (id, id_histology_type, translation_key) VALUES
        (8, 5, 'classic'),
        (9, 5, 'cribriform'),
        (10, 5, 'subtype-not-specified')`,

        // intraductal-carcinoma (id=10)
        `INSERT OR IGNORE INTO histology_subtype (id, id_histology_type, translation_key) VALUES
        (11, 10, 'intercalated-duct-like'),
        (12, 10, 'apocrine'),
        (13, 10, 'oncocytic'),
        (14, 10, 'mixed'),
        (15, 10, 'subtype-not-specified')`,

        // salivary-carcinoma-nos (id=11)
        `INSERT OR IGNORE INTO histology_subtype (id, id_histology_type, translation_key) VALUES
        (16, 11, 'oncocytic-adenocarcinoma'),
        (17, 11, 'intestinal-type-adenocarcinoma'),
        (18, 11, 'subtype-not-specified')`,

        // carcinoma-ex-pleomorphic-adenoma (id=14)
        `INSERT OR IGNORE INTO histology_subtype (id, id_histology_type, translation_key) VALUES
        (19, 14, 'intracapsular'),
        (20, 14, 'minimally-invasive'),
        (21, 14, 'invasive'),
        (22, 14, 'subtype-not-specified')`,

        // poorly-differentiated-carcinoma (id=16)
        `INSERT OR IGNORE INTO histology_subtype (id, id_histology_type, translation_key) VALUES
        (23, 16, 'undifferentiated-carcinoma'),
        (24, 16, 'large-cell-neuroendocrine-carcinoma'),
        (25, 16, 'small-cell-neuroendocrine-carcinoma'),
        (26, 16, 'subtype-not-specified')`,
    ]

    queries.forEach((query) => {
        db.run(query, (err) => {
            if (err) {
                console.error('Error seeding lookup table:', err)
                console.error('Query:', query)
            }
        })
    })
}

export const initSchema = () => {
    db.serialize(() => {
        // Enforce Foreign Keys
        db.run('PRAGMA foreign_keys = ON')

        schemaQueries.forEach((query) => {
            db.run(query, (err) => {
                if (err) {
                    console.error('Error creating new schema table:', err)
                    console.error('Query:', query)
                }
            })
        })

        seedLookups()
        seedTnmData()

        // --- Mock Data Generation for ML Testing ---
        const GENERATE_MOCK_DATA = false // Set to true to generate mock patients
        if (GENERATE_MOCK_DATA) {
            // Clean up potentially broken mock patients (those with NULL names created by mock generator)
            db.run(
                'DELETE FROM patient WHERE name IS NULL AND internal_patient_id IS NULL'
            )

            db.get(
                'SELECT COUNT(*) as count FROM patient',
                (err, row: unknown) => {
                    if (!err && (row as { count: number }).count < 50) {
                        console.log(
                            'Generating mock patients for ML testing...'
                        )
                        generateMockPatients(100)
                    }
                }
            )
        }
    })
}

const generateMockPatients = (count: number) => {
    const locations = ['parotid', 'submandibular', 'sublingual']
    const genders = ['male', 'female']
    const therapyTypes = [
        'chirurgická',
        'radioterapie',
        'chemoradioterapie',
        'sledování',
    ]

    db.serialize(() => {
        db.run('BEGIN TRANSACTION')

        for (let i = 0; i < count; i++) {
            const age = Math.floor(Math.random() * 55) + 30 // 30-85
            const gender = genders[Math.floor(Math.random() * genders.length)]
            const location =
                locations[Math.floor(Math.random() * locations.length)]
            const diagnosisYear = 2015 + Math.floor(Math.random() * 8) // 2015-2022
            const therapy =
                therapyTypes[Math.floor(Math.random() * therapyTypes.length)]

            // Features that affect risk
            const histologyId = Math.floor(Math.random() * 24) + 1 // 1-24 malignant
            const tStageId = Math.floor(Math.random() * 5) + 2 // T1-T4b (IDs 2-6)
            const nStageId = Math.floor(Math.random() * 7) + 7 // N0-N3b (IDs 7-13)
            const mStageId = Math.random() > 0.1 ? 14 : 15 // M0 or M1 (IDs 14-15)

            // Calculate risk (0.0 to 1.0) - Increased baseline to ensure enough events
            let risk = 0.3
            if (age > 60) risk += 0.2
            if (tStageId > 4) risk += 0.2
            if (nStageId > 8) risk += 0.2
            if (mStageId === 15) risk += 0.3

            const died = Math.random() < risk
            const recurred = Math.random() < risk + 0.15

            const isAlive = died ? 0 : 1
            const hasRecurrence = recurred ? 1 : 0

            const diagDate = new Date(`${diagnosisYear}-01-01`)
            const diagDateStr = diagDate.toISOString().split('T')[0]
            const lastFollowUpDate = new Date(diagDate)
            lastFollowUpDate.setFullYear(
                lastFollowUpDate.getFullYear() +
                    Math.floor(Math.random() * 5) +
                    1
            )

            let deathDate = null
            if (died) {
                const dDate = new Date(diagDate)
                dDate.setFullYear(
                    dDate.getFullYear() + Math.floor(Math.random() * 4)
                )
                deathDate = dDate.toISOString().split('T')[0]
            }

            let recurrenceDate = null
            if (recurred) {
                const rDate = new Date(diagDate)
                rDate.setFullYear(
                    rDate.getFullYear() + Math.floor(Math.random() * 3)
                )
                recurrenceDate = rDate.toISOString().split('T')[0]
            }

            // 1. Insert Patient
            db.run(
                `INSERT INTO patient (
                tumor_type, name, surname, personal_identification_number,
                age_at_diagnosis, gender, 
                tumor_location, diagnosis_date, therapy_type, is_alive,
                death_date, last_follow_up, recidive, date_of_recidive, 
                date_of_first_post_treatment_follow_up
            ) VALUES (?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    'malignant',
                    age,
                    gender,
                    location,
                    diagDateStr,
                    therapy,
                    isAlive,
                    deathDate,
                    lastFollowUpDate.toISOString().split('T')[0],
                    hasRecurrence,
                    recurrenceDate,
                    diagDateStr,
                ],
                function (this: unknown) {
                    const patientId = (this as { lastID: number }).lastID

                    // 2. Insert Malignant Patient
                    db.run(
                        'INSERT INTO malignant_patient (id_patient, adjuvant_therapy) VALUES (?, ?)',
                        [patientId, Math.random() > 0.5 ? 'Ano' : 'Ne']
                    )

                    // 3. Insert Histopathology
                    db.run(
                        `INSERT INTO histopathology (
                    id_patient, id_histology_type, tumor_size, resection_margin
                ) VALUES (?, ?, ?, ?)`,
                        [
                            patientId,
                            histologyId,
                            Math.floor(Math.random() * 50) + 10,
                            Math.random() > 0.8 ? 'R1' : 'R0',
                        ]
                    )

                    // 4. Insert Staging
                    db.run(
                        `INSERT INTO patient_staging (
                    id_patient, id_edition, clinical_t_id, clinical_n_id, clinical_m_id,
                    pathological_t_id, pathological_n_id, pathological_m_id
                ) VALUES (?, 1, ?, ?, ?, ?, ?, ?)`,
                        [
                            patientId,
                            tStageId,
                            nStageId,
                            mStageId,
                            tStageId,
                            nStageId,
                            mStageId,
                        ]
                    )
                }
            )
        }

        db.run('COMMIT')
        console.log('Successfully generated 100 mock patients.')
    })
}

initSchema()

export default db
