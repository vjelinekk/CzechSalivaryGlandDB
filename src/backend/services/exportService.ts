import { dialog } from 'electron'
import { Workbook } from 'exceljs'
import { PatientType } from '../../frontend/types'
import { formTypeToBasicStringMap } from '../../frontend/constants'
import {
    getAllPatientStagings,
    getAllTnmEditions,
    getTnmValuesByIds,
} from '../repositories/tnmRepository'
import { PatientStagingEntity } from '../db-entities/PatientStagingEntity'
import { TnmValueDefinitionEntity } from '../db-entities/TnmValueDefinitionEntity'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const translations: Record<string, Record<string, string>> = {
    cs: {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        ...require('../../../public/locales/translation-cs.json'),
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        ...require('../../../public/locales/form-translation-cs.json'),
    },
    en: {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        ...require('../../../public/locales/translation-en.json'),
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        ...require('../../../public/locales/form-translation-en.json'),
    },
    sk: {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        ...require('../../../public/locales/translation-sk.json'),
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        ...require('../../../public/locales/form-translation-sk.json'),
    },
}

function translateValueForExport(
    value: string,
    translationMap: Record<string, string>
): string {
    if (!value) return value
    if (value.includes(',')) {
        return value
            .split(',')
            .map((v) => translationMap[v.trim()] ?? v.trim())
            .join(', ')
    }
    return translationMap[value] ?? value
}

// Patient fields that belong to TNM edition groups and must be excluded from base columns
const STAGING_FIELDS_TO_EXCLUDE = new Set([
    'id_edition',
    't_klasifikace_klinicka_id',
    'n_klasifikace_klinicka_id',
    'm_klasifikace_klinicka_id',
    'tnm_klasifikace_klinicka_id',
    't_klasifikace_patologicka_id',
    'n_klasifikace_patologicka_id',
    'm_klasifikace_patologicka_id',
    'tnm_klasifikace_patologicka_id',
    't_klasifikace_klinicka',
    'n_klasifikace_klinicka',
    'm_klasifikace_klinicka',
    'tnm_klasifikace_klinicka',
    't_klasifikace_patologicka',
    'n_klasifikace_patologicka',
    'm_klasifikace_patologicka',
    'tnm_klasifikace_patologicka',
    'other_stagings_json',
])

// Column names for one TNM edition group (no suffix for the first group, _2/_3/... for extra)
export const STAGING_GROUP_KEYS = [
    'id_edition',
    'edition',
    't_klasifikace_klinicka_id',
    'n_klasifikace_klinicka_id',
    'm_klasifikace_klinicka_id',
    'tnm_klasifikace_klinicka_id',
    't_klasifikace_patologicka_id',
    'n_klasifikace_patologicka_id',
    'm_klasifikace_patologicka_id',
    'tnm_klasifikace_patologicka_id',
    't_klasifikace_klinicka',
    'n_klasifikace_klinicka',
    'm_klasifikace_klinicka',
    'tnm_klasifikace_klinicka',
    't_klasifikace_patologicka',
    'n_klasifikace_patologicka',
    'm_klasifikace_patologicka',
    'tnm_klasifikace_patologicka',
]

function buildStagingGroupValues(
    staging: PatientStagingEntity | null,
    editionName: string,
    tnmValues: Map<number, TnmValueDefinitionEntity>
): (number | string | null)[] {
    if (!staging) return Array(STAGING_GROUP_KEYS.length).fill(null)
    const code = (id: number | null): string | null =>
        id != null ? tnmValues.get(id)?.code ?? null : null
    return [
        staging.id_edition,
        editionName,
        staging.clinical_t_id,
        staging.clinical_n_id,
        staging.clinical_m_id,
        staging.clinical_grade_id,
        staging.pathological_t_id,
        staging.pathological_n_id,
        staging.pathological_m_id,
        staging.pathological_grade_id,
        code(staging.clinical_t_id),
        code(staging.clinical_n_id),
        code(staging.clinical_m_id),
        code(staging.clinical_grade_id),
        code(staging.pathological_t_id),
        code(staging.pathological_n_id),
        code(staging.pathological_m_id),
        code(staging.pathological_grade_id),
    ]
}

export const exportPatients = async (
    patients: PatientType[],
    anonymized: boolean,
    language: string
): Promise<void> => {
    const result = await dialog.showSaveDialog({
        title: 'Export Patients',
        defaultPath: 'patients.xlsx',
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    })

    if (result.canceled) {
        return
    }

    const translationMap = translations[language] ?? translations['cs']

    // Load edition id→name map once for all groups
    const allEditions = await getAllTnmEditions()
    const editionNameMap = new Map(allEditions.map((e) => [e.id, e.name]))

    const groupedPatients: { [key: number]: PatientType[] } = patients.reduce(
        (group, patient) => {
            const key = patient.form_type
            if (!group[key]) {
                group[key] = []
            }
            group[key].push(patient)
            return group
        },
        {} as { [key: number]: PatientType[] }
    )

    for (const [formType, groupPatients] of Object.entries(groupedPatients)) {
        // Load all stagings per patient in parallel; sort each list by id_edition for determinism
        const patientStagingsMap = new Map<number, PatientStagingEntity[]>()
        await Promise.all(
            groupPatients.map(async (patient) => {
                const patientId = patient.id as number | undefined
                if (!patientId) return
                const stagings = await getAllPatientStagings(patientId)
                patientStagingsMap.set(
                    patientId,
                    stagings.slice().sort((a, b) => a.id_edition - b.id_edition)
                )
            })
        )

        // Max number of edition groups needed across all patients in this group
        const maxEditions = groupPatients.reduce((max, patient) => {
            const patientId = patient.id as number | undefined
            const count = patientId
                ? patientStagingsMap.get(patientId)?.length ?? 0
                : 0
            return Math.max(max, count)
        }, 0)

        // Batch-resolve TNM value codes for all staging IDs
        const allIds = new Set<number>()
        patientStagingsMap.forEach((stagings) => {
            for (const s of stagings) {
                for (const id of [
                    s.clinical_t_id,
                    s.clinical_n_id,
                    s.clinical_m_id,
                    s.clinical_grade_id,
                    s.pathological_t_id,
                    s.pathological_n_id,
                    s.pathological_m_id,
                    s.pathological_grade_id,
                ]) {
                    if (id != null) allIds.add(id)
                }
            }
        })
        const tnmValues =
            allIds.size > 0
                ? await getTnmValuesByIds([...allIds])
                : new Map<number, TnmValueDefinitionEntity>()

        // Build column headers: base patient fields + one group of staging columns per edition
        const baseHeaders = Object.keys(groupPatients[0]).filter(
            (k) => !STAGING_FIELDS_TO_EXCLUDE.has(k)
        )
        const stagingHeaders: string[] = []
        for (let i = 1; i <= maxEditions; i++) {
            const suffix = i === 1 ? '' : `_${i}`
            for (const key of STAGING_GROUP_KEYS) {
                stagingHeaders.push(`${key}${suffix}`)
            }
        }

        const workbook = new Workbook()
        const worksheet = workbook.addWorksheet('Pacienti')
        worksheet.addRow([...baseHeaders, ...stagingHeaders])

        groupPatients.forEach((patient) => {
            patient.jmeno = anonymized ? 'anonymizováno' : patient.jmeno
            patient.prijmeni = anonymized ? 'anonymizováno' : patient.prijmeni
            patient.rodne_cislo = anonymized
                ? 'anonymizováno'
                : patient.rodne_cislo

            const baseValues = baseHeaders.map((key) => {
                const value = patient[key]
                if (typeof value === 'string') {
                    return translateValueForExport(value, translationMap)
                }
                return value ?? null
            })

            const patientId = patient.id as number | undefined
            const stagings = patientId
                ? patientStagingsMap.get(patientId) ?? []
                : []
            const stagingValues: (number | string | null)[] = []
            for (let i = 0; i < maxEditions; i++) {
                const staging = stagings[i] ?? null
                const editionName = staging
                    ? editionNameMap.get(staging.id_edition) ?? ''
                    : ''
                stagingValues.push(
                    ...buildStagingGroupValues(staging, editionName, tnmValues)
                )
            }

            worksheet.addRow([...baseValues, ...stagingValues])
        })

        await workbook.xlsx.writeFile(
            `${result.filePath.replace('.xlsx', '')}_${formTypeToBasicStringMap[Number(formType)]}.xlsx`
        )
    }
}
