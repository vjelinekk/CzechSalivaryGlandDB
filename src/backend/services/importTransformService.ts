import { PatientType } from '../../frontend/types'
import csTranslation from '../../../public/locales/translation-cs.json'
import enTranslation from '../../../public/locales/translation-en.json'
import skTranslation from '../../../public/locales/translation-sk.json'
import csFormTranslation from '../../../public/locales/form-translation-cs.json'
import enFormTranslation from '../../../public/locales/form-translation-en.json'
import skFormTranslation from '../../../public/locales/form-translation-sk.json'

// Build a reverse map: translated string → translation key
// Covers all 6 locale files (app + form translations × cs/en/sk)
function buildReverseMap(): Record<string, string> {
    const allLocales = [
        csTranslation,
        enTranslation,
        skTranslation,
        csFormTranslation,
        enFormTranslation,
        skFormTranslation,
    ]
    const map: Record<string, string> = {}
    for (const locale of allLocales) {
        for (const [key, value] of Object.entries(locale)) {
            // First-write wins: method-prefixed keys (e.g. method-ct) appear before
            // their short aliases (ct) in the JSON files, so first match is correct.
            if (typeof value === 'string' && map[value] === undefined) {
                map[value] = key
            }
        }
    }
    return map
}

const REVERSE_TRANSLATION_MAP = buildReverseMap()

// Old translation keys that were previously stored directly in the DB
// (not translated strings — these need explicit remapping to the current key)
const OLD_KEY_TO_NEW_KEY: Record<string, string> = {
    chirurgical: 'surgical',
    'non-surgical': 'nonSurgicalMonitoring',
    Ano: 'yes',
    Ne: 'no',
    Žije: 'alive',
    Zemřel: 'deceased',
}

// Fields that should NOT be run through the reverse translation map
// (free-text inputs, names, dates, numeric values, IDs)
const NON_CHECKBOX_FIELDS = new Set([
    'id',
    'id_pacient',
    'jmeno',
    'prijmeni',
    'rodne_cislo',
    'datum_zahajeni_lecby',
    'datum_prvni_kontroly_po_lecbe',
    'datum_prokazani_perzistence',
    'datum_prokazani_recidivy',
    'datum_umrti',
    'rok_diagnozy',
    'posledni_kontrola',
    'planovana_kontrola',
    'vek_pri_diagnoze',
    'pocet_cigaret_denne',
    'jak_dlouho_kouri',
    'pocet_balickoroku',
    'velikost_nadoru_histopatologie',
    'pocet_lymfatickych_uzlin_s_metastazou_histopatologie',
    'specifikace_mista_vyskytu_jineho_karcinomu',
    'specifikace_onemocneni',
    'jine_pooperacni_komplikace',
    'velikost_nadoru_neurcena_histopatologie',
    'misto_vyskytu_vzdalene_metastazy_histopatologie',
    'histologicalTypeSpecification',
    'core_vysledek_jine',
    'otevrena_vysledek_jine',
    'other_stagings_json',
])

function mapSingleValue(value: string): string {
    if (OLD_KEY_TO_NEW_KEY[value] !== undefined)
        return OLD_KEY_TO_NEW_KEY[value]
    return REVERSE_TRANSLATION_MAP[value] ?? value
}

function mapCommaValue(value: string): string {
    if (!value.includes(',')) {
        return mapSingleValue(value)
    }
    return value
        .split(',')
        .map((v) => mapSingleValue(v.trim()))
        .join(',')
}

/**
 * Maps translated checkbox field values back to translation keys.
 * Applied to all imported patients (both legacy and new exports).
 */
export function mapCheckboxFields(patient: PatientType): void {
    for (const [field, value] of Object.entries(patient)) {
        if (NON_CHECKBOX_FIELDS.has(field)) continue
        if (typeof value !== 'string') continue
        if (!value) continue
        patient[field] = mapCommaValue(value)
    }
}

// Maps Czech histology type strings (from old Excel exports) to translation keys
const czechHistologyTypeToKey: Record<string, string> = {
    'acinocelulární karcinom': 'acinic-cell-carcinoma',
    'sekretorický karcinom': 'secretory-carcinoma',
    'mukoepidermoidní karcinom': 'mucoepidermoid-carcinoma',
    'adenoidně cystický karcinom': 'adenoid-cystic-carcinoma',
    'polymorfní adenokarcinom': 'polymorphous-adenocarcinoma',
    'epiteliální myoepiteliální karcinom': 'epithelial-myoepithelial-carcinoma',
    'hyalinizující karcinom ze světlých buněk':
        'hyalinizing-clear-cell-carcinoma',
    'bazocelulární adenokarcinom': 'basal-cell-adenocarcinoma',
    'sebaceózní adenokarcinom': 'sebaceous-adenocarcinoma',
    'intraduktální karcinom': 'intraductal-carcinoma',
    'salivární karcinom NOS': 'salivary-carcinoma-nos',
    'salivární duktální karcinom': 'salivary-duct-carcinoma',
    'myoepiteliální karcinom': 'myoepithelial-carcinoma',
    'karcinom z pleomorfního adenomu': 'carcinoma-ex-pleomorphic-adenoma',
    'karcinom z pleomorfniho adenomu': 'carcinoma-ex-pleomorphic-adenoma',
    karcinosarkom: 'carcinosarcoma',
    'špatně diferencovaný karcinom: neuroendokrinní a nonneuroendokrinní':
        'poorly-differentiated-carcinoma',
    'lymfoepiteliální karcinom': 'lymphoepithelial-carcinoma',
    'skvamocelulární karcinom': 'squamous-cell-carcinoma',
    'mikrosekretorický adenokarcinom': 'microsecretory-adenocarcinoma',
    'sklerózující mikrocystický adenokarcinom':
        'sclerosing-microcystic-adenocarcinoma',
    'mucinózní adenokarcinom': 'mucinous-adenocarcinoma',
    sialoblastom: 'asialoblastoma',
    'MALT-lymfom': 'malt-lymphoma',
    jiné: 'other',
    other: 'other',
}

// Maps Czech subtype strings to translation keys, keyed by the Czech subtype field name
const czechSubtypeToKey: Record<string, Record<string, string>> = {
    mukoepidermoidni_karcinom: {
        'low grade': 'low-grade',
        'intermediate grade': 'intermediate-grade',
        'high grade': 'high-grade',
        'subtyp nebyl určen': 'subtype-not-specified',
    },
    adenoidne_cysticky_karcinom: {
        's převahou tubulární/kribriformní složky':
            'tubular-cribriform-dominant',
        '>30% solidní složky': 'more-than-30-solid-component',
        'high grade': 'subtype-not-specified',
        'subtyp nebyl určen': 'subtype-not-specified',
    },
    polymorfni_adenokarcinom: {
        klasický: 'classic',
        kribriformní: 'cribriform',
        'subtyp nebyl určen': 'subtype-not-specified',
    },
    intraduktalni_karcinom: {
        'podobný vmezeřenému vývodu': 'intercalated-duct-like',
        apokrinní: 'apocrine',
        onkocytární: 'oncocytic',
        smíšený: 'mixed',
        'subtyp nebyl určen': 'subtype-not-specified',
    },
    salivarni_karcinom_nos: {
        'onkocytární adenokarcinom': 'oncocytic-adenocarcinoma',
        'adenokarcinom intestinálního typu': 'intestinal-type-adenocarcinoma',
        'subtyp nebyl určen': 'subtype-not-specified',
    },
    karcinom_z_pleomorfniho_adenomu: {
        intrakapsulární: 'intracapsular',
        'minimálně invazivní': 'minimally-invasive',
        invazivní: 'invasive',
        'subtyp nebyl určen': 'subtype-not-specified',
    },
    spatne_diferencovany_karcinom: {
        'nediferencovaný karcinom': 'undifferentiated-carcinoma',
        'velkobuněčný neuroendokrinní karcinom':
            'large-cell-neuroendocrine-carcinoma',
        'malobuněčný neuroendokrinní karcinom':
            'small-cell-neuroendocrine-carcinoma',
        'subtyp nebyl určen': 'subtype-not-specified',
    },
}

// The suffixes used for each subtype field group
const subtypeFieldSuffixes = ['_histopatologie', '_core', '_otevrena']

// Maps TNM8 string codes to tnm_value_definition IDs (edition_id=1)
const tnm8TToId: Record<string, number> = {
    TX: 1,
    T1: 2,
    T2: 3,
    T3: 4,
    T4a: 5,
    T4b: 6,
}

const tnm8NToId: Record<string, number> = {
    N0: 7,
    N1: 8,
    N2a: 9,
    N2b: 10,
    N2c: 11,
    N3a: 12,
    N3b: 13,
}

const tnm8MToId: Record<string, number> = {
    M0: 14,
    M1: 15,
}

const tnm8StageToId: Record<string, number> = {
    'Stage I': 16,
    'Stage II': 17,
    'Stage III': 18,
    'Stage IVA': 19,
    'Stage IVB': 20,
    'Stage IVC': 21,
}

function mapHistologyField(patient: PatientType, fieldName: string): void {
    console.log('Patient before mapping:', patient)
    console.log('Mapping histology field:', fieldName)
    const value = patient[fieldName] as string | undefined
    console.log('Original value:', value)
    if (!value) return
    const key = czechHistologyTypeToKey[value]
    console.log('Mapped key:', key)
    if (key) {
        patient[fieldName] = key
    }
}

function mapSubtypeFields(patient: PatientType): void {
    for (const [baseKey, mapping] of Object.entries(czechSubtypeToKey)) {
        for (const suffix of subtypeFieldSuffixes) {
            const fieldName = `${baseKey}${suffix}`
            const value = patient[fieldName] as string | undefined
            if (!value) continue
            const key = mapping[value]
            if (key) {
                patient[fieldName] = key
            }
        }
    }
}

function mapTnmFields(patient: PatientType): void {
    const p = patient as Record<string, unknown>

    const clinicalT = p['t_klasifikace_klinicka'] as string | undefined
    const clinicalN = p['n_klasifikace_klinicka'] as string | undefined
    const clinicalM = p['m_klasifikace_klinicka'] as string | undefined
    const clinicalStage = p['tnm_klasifikace_klinicka'] as string | undefined

    const pathologicalT = p['t_klasifikace_patologicka'] as string | undefined
    const pathologicalN = p['n_klasifikace_patologicka'] as string | undefined
    const pathologicalM = p['m_klasifikace_patologicka'] as string | undefined
    const pathologicalStage = p['tnm_klasifikace_patologicka'] as
        | string
        | undefined

    if (clinicalT) p['t_klasifikace_klinicka_id'] = tnm8TToId[clinicalT]
    if (clinicalN) p['n_klasifikace_klinicka_id'] = tnm8NToId[clinicalN]
    if (clinicalM) p['m_klasifikace_klinicka_id'] = tnm8MToId[clinicalM]
    if (clinicalStage)
        p['tnm_klasifikace_klinicka_id'] = tnm8StageToId[clinicalStage]

    if (pathologicalT)
        p['t_klasifikace_patologicka_id'] = tnm8TToId[pathologicalT]
    if (pathologicalN)
        p['n_klasifikace_patologicka_id'] = tnm8NToId[pathologicalN]
    if (pathologicalM)
        p['m_klasifikace_patologicka_id'] = tnm8MToId[pathologicalM]
    if (pathologicalStage)
        p['tnm_klasifikace_patologicka_id'] = tnm8StageToId[pathologicalStage]

    p['id_edition'] = 1
}

/**
 * Transforms a patient object read from a legacy Excel export (without id_edition)
 * into the format expected by the current PatientMapper/PatientRepository pipeline:
 * - Maps Czech histology type strings to English translation keys
 * - Maps Czech subtype strings to English translation keys
 * - Maps TNM string codes to TNM8 numeric IDs and sets id_edition=1
 */
export function transformLegacyPatient(patient: PatientType): PatientType {
    mapHistologyField(patient, 'histopatologie_vysledek')
    mapHistologyField(patient, 'core_vysledek')
    mapHistologyField(patient, 'otevrena_vysledek')
    mapSubtypeFields(patient)
    mapTnmFields(patient)
    return patient
}
