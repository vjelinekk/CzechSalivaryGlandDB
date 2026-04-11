import { Workbook } from 'exceljs'
import { PatientType } from '../../frontend/types'
import { FormType } from '../../frontend/constants'
import { savePatient } from '../repositories/patientRepository'
import {
    transformLegacyPatient,
    mapCheckboxFields,
} from './importTransformService'
import { STAGING_GROUP_KEYS } from './exportService'

type PatientValue = string | number | FormType

/**
 * Detects extra TNM edition groups (columns suffixed _2, _3, ...) written by the
 * exporter, serialises them into other_stagings_json so insertPatient can persist
 * them, and removes the raw suffix columns from the patient object.
 * Also removes the 'edition' column (human-readable name, not a DB field).
 */
function extractAdditionalEditionGroups(patient: PatientType): void {
    const p = patient as Record<string, PatientValue | null | undefined>
    const additionalStagings: Array<{
        id_patient: number
        id_edition: number
        clinical_t_id: number | null
        clinical_n_id: number | null
        clinical_m_id: number | null
        clinical_grade_id: number | null
        pathological_t_id: number | null
        pathological_n_id: number | null
        pathological_m_id: number | null
        pathological_grade_id: number | null
    }> = []

    let i = 2
    while (p[`id_edition_${i}`] != null) {
        const editionId = p[`id_edition_${i}`] as number
        additionalStagings.push({
            id_patient: 0,
            id_edition: editionId,
            clinical_t_id:
                (p[`t_klasifikace_klinicka_id_${i}`] as number) ?? null,
            clinical_n_id:
                (p[`n_klasifikace_klinicka_id_${i}`] as number) ?? null,
            clinical_m_id:
                (p[`m_klasifikace_klinicka_id_${i}`] as number) ?? null,
            clinical_grade_id:
                (p[`tnm_klasifikace_klinicka_id_${i}`] as number) ?? null,
            pathological_t_id:
                (p[`t_klasifikace_patologicka_id_${i}`] as number) ?? null,
            pathological_n_id:
                (p[`n_klasifikace_patologicka_id_${i}`] as number) ?? null,
            pathological_m_id:
                (p[`m_klasifikace_patologicka_id_${i}`] as number) ?? null,
            pathological_grade_id:
                (p[`tnm_klasifikace_patologicka_id_${i}`] as number) ?? null,
        })
        for (const field of STAGING_GROUP_KEYS) {
            delete p[`${field}_${i}`]
        }
        i++
    }

    // Remove the 'edition' column (edition name for the primary staging, not a DB field)
    delete p['edition']

    if (additionalStagings.length > 0) {
        p['other_stagings_json'] = JSON.stringify(additionalStagings)
    }
}

export const importPatientsFromFile = async (
    filePath: string
): Promise<void> => {
    const workbook = new Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheet = workbook.getWorksheet(1)

    const data: PatientType[] = []
    const headerRow = worksheet.getRow(1)
    const headerValues = headerRow.values as (string | null)[]
    const isLegacyFormat = !headerValues.includes('id_edition')

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        if (rowNumber === 1) {
            return
        }

        const patient: PatientType = {}

        row.eachCell((cell, columnIndex) => {
            const label = worksheet.getRow(1).getCell(columnIndex)
                .value as string
            if (label === 'id' || cell.value === null) {
                return
            }
            patient[label] = cell.value as PatientValue
        })

        extractAdditionalEditionGroups(patient)
        mapCheckboxFields(patient)
        if (isLegacyFormat) {
            transformLegacyPatient(patient)
        }

        data.push(patient)
    })

    for (const patient of data) {
        await savePatient(patient)
    }
}
