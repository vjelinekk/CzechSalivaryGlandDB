import { TableNames, FormType } from '../constants'
import db from '../dbManager'
import {
    encryptPatientData,
    decryptPatientData,
} from '../utils/patientEncryption'
import { PatientMapper } from '../mappers/PatientMapper'
import { getActiveEdition, getTnmValuesByIds } from './tnmRepository'
import { TnmValueDefinitionEntity } from '../db-entities/TnmValueDefinitionEntity'
import { PatientDto } from '../../ipc/dtos/PatientDto'
import { PatientEntity } from '../db-entities/PatientEntity'
import { MalignantPatientEntity } from '../db-entities/MalignantPatientEntity'
import { BenignPatientEntity } from '../db-entities/BenignPatientEntity'
import { MalignantParotidSpecificEntity } from '../db-entities/MalignantParotidSpecificEntity'
import { MalignantSubmandibularSpecificEntity } from '../db-entities/MalignantSubmandibularSpecificEntity'
import { BiopsyResultEntity } from '../db-entities/BiopsyResultEntity'
import { HistopathologyEntity } from '../db-entities/HistopathologyEntity'
import { PatientStagingEntity } from '../db-entities/PatientStagingEntity'
import { AttachmentEntity } from '../db-entities/AttachmentEntity'
import { TumorTypeEnum } from '../../ipc/dtos/enums/TumorTypeEnum'
import { FilteredColumnsDto } from '../../ipc/dtos/FilteredColumnsDto'
import { KaplanMeierPatientDataDto } from '../../ipc/dtos/KaplanMeierPatientDataDto'
import { KaplanMeierDataDto } from '../../ipc/dtos/KaplanMeierDataDto'
import { KaplanMeierTypeEnum } from '../../ipc/dtos/enums/KaplanMeierTypeEnum'
import { PlannedPatientsMapDto } from '../../ipc/dtos/PlannedPatientsMapDto'
import { ITTestGroupsDto } from '../../ipc/dtos/ITTestGroupsDto'
import { NonParametricTestDataDto } from '../../ipc/dtos/NonParametricTestDataDto'
import { InferenceChiSquareCategories } from '../enums'
import { HistologyTypeMapper } from '../mappers/HistologyTypeMapper'
import {
    runQuery,
    runQueryAll,
    runInsert,
    runUpdate,
    runDelete,
} from './dbHelpers'

// =============================================
// CRUD Operations
// =============================================

export const insertPatient = async (
    data: PatientDto
): Promise<number | null> => {
    try {
        const activeEdition = await getActiveEdition()
        const editionId = (data.id_edition as number) ?? activeEdition?.id ?? 1
        const encryptedData = encryptPatientData(data)
        const mapped = PatientMapper.toPersistence(encryptedData, editionId)

        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION')

                // 1. Insert base patient
                runInsert(TableNames.patient, { ...mapped.base })
                    .then((patientId) => {
                        // Phase A: insert malignant/benign first — subsequent tables
                        // (malignant_parotid_specific, malignant_submandibular_specific)
                        // have FK constraints that reference these rows.
                        const phase1: Promise<unknown>[] = []

                        // 2. Insert malignant-specific
                        if (mapped.malignant) {
                            phase1.push(
                                runInsert(TableNames.malignantPatient, {
                                    ...mapped.malignant,
                                    id_patient: patientId,
                                })
                            )
                        }

                        // 3. Insert benign-specific
                        if (mapped.benign) {
                            phase1.push(
                                runInsert(TableNames.benignPatient, {
                                    ...mapped.benign,
                                    id_patient: patientId,
                                })
                            )
                        }

                        return Promise.all(phase1).then(() => patientId)
                    })
                    .then((patientId) => {
                        // Phase B: insert everything that depends on malignant/benign rows
                        const phase2: Promise<unknown>[] = []

                        // 4. Insert location-specific (parotid/submandibular)
                        if (mapped.malignantParotid) {
                            phase2.push(
                                runInsert(TableNames.malignantParotidSpecific, {
                                    ...mapped.malignantParotid,
                                    id_malignant_patient: patientId,
                                })
                            )
                        }
                        if (mapped.malignantSubmandibular) {
                            phase2.push(
                                runInsert(
                                    TableNames.malignantSubmandibularSpecific,
                                    {
                                        ...mapped.malignantSubmandibular,
                                        id_malignant_patient: patientId,
                                    }
                                )
                            )
                        }

                        // 5. Insert biopsy results
                        if (mapped.coreBiopsyResult) {
                            phase2.push(
                                runInsert(TableNames.biopsyResult, {
                                    ...mapped.coreBiopsyResult,
                                    id_patient: patientId,
                                })
                            )
                        }
                        if (mapped.openBiopsyResult) {
                            phase2.push(
                                runInsert(TableNames.biopsyResult, {
                                    ...mapped.openBiopsyResult,
                                    id_patient: patientId,
                                })
                            )
                        }

                        // 6. Insert histopathology
                        if (mapped.histopathologyResult) {
                            phase2.push(
                                runInsert(TableNames.histopathology, {
                                    ...mapped.histopathologyResult,
                                    id_patient: patientId,
                                })
                            )
                        }

                        // 7. Insert staging for current edition
                        if (mapped.patientStaging) {
                            phase2.push(
                                runInsert(TableNames.patientStaging, {
                                    ...mapped.patientStaging,
                                    id_patient: patientId,
                                })
                            )
                        }

                        // 7b. Insert stagings for other editions (stored as JSON)
                        const otherStagingsJson = data.other_stagings_json as
                            | string
                            | undefined
                        if (otherStagingsJson) {
                            try {
                                const otherStagings: PatientStagingEntity[] =
                                    JSON.parse(otherStagingsJson)
                                for (const staging of otherStagings) {
                                    phase2.push(
                                        runInsert(TableNames.patientStaging, {
                                            ...staging,
                                            id_patient: patientId,
                                        })
                                    )
                                }
                            } catch {
                                console.error(
                                    'Failed to parse other_stagings_json'
                                )
                            }
                        }

                        // 8. Insert attachments
                        for (const attachment of mapped.attachments) {
                            phase2.push(
                                runInsert(TableNames.attachment, {
                                    ...attachment,
                                    id_patient: patientId,
                                })
                            )
                        }

                        return Promise.all(phase2).then(() => patientId)
                    })
                    .then((patientId) => {
                        db.run('COMMIT', (err) => {
                            if (err) {
                                db.run('ROLLBACK')
                                reject(err)
                            } else {
                                resolve(patientId)
                            }
                        })
                    })
                    .catch((err) => {
                        db.run('ROLLBACK')
                        reject(err)
                    })
            })
        })
    } catch (err) {
        console.error('Error inserting patient:', err)
        return null
    }
}

export const updatePatient = async (
    data: PatientDto
): Promise<number | null> => {
    try {
        const patientId = data.id as number
        const activeEdition = await getActiveEdition()
        const editionId = (data.id_edition as number) ?? activeEdition?.id ?? 1
        const encryptedData = encryptPatientData(data)
        const mapped = PatientMapper.toPersistence(encryptedData, editionId)

        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION')

                const updatePromises: Promise<unknown>[] = []

                // 1. Update base patient
                updatePromises.push(
                    runUpdate(TableNames.patient, patientId, {
                        ...mapped.base,
                    })
                )

                // 2. Upsert malignant-specific (delete + insert pattern for simplicity)
                if (mapped.malignant) {
                    updatePromises.push(
                        runDelete(
                            TableNames.malignantPatient,
                            patientId,
                            'id_patient'
                        ).then(() =>
                            runInsert(TableNames.malignantPatient, {
                                ...mapped.malignant,
                                id_patient: patientId,
                            })
                        )
                    )
                }

                // 3. Upsert benign-specific
                if (mapped.benign) {
                    updatePromises.push(
                        runDelete(
                            TableNames.benignPatient,
                            patientId,
                            'id_patient'
                        ).then(() =>
                            runInsert(TableNames.benignPatient, {
                                ...mapped.benign,
                                id_patient: patientId,
                            })
                        )
                    )
                }

                // 4. Upsert location-specific
                if (mapped.malignantParotid) {
                    updatePromises.push(
                        runDelete(
                            TableNames.malignantParotidSpecific,
                            patientId,
                            'id_malignant_patient'
                        ).then(() =>
                            runInsert(TableNames.malignantParotidSpecific, {
                                ...mapped.malignantParotid,
                                id_malignant_patient: patientId,
                            })
                        )
                    )
                }
                if (mapped.malignantSubmandibular) {
                    updatePromises.push(
                        runDelete(
                            TableNames.malignantSubmandibularSpecific,
                            patientId,
                            'id_malignant_patient'
                        ).then(() =>
                            runInsert(
                                TableNames.malignantSubmandibularSpecific,
                                {
                                    ...mapped.malignantSubmandibular,
                                    id_malignant_patient: patientId,
                                }
                            )
                        )
                    )
                }

                // 5. Replace biopsy results
                updatePromises.push(
                    runQueryAll(
                        `DELETE FROM ${TableNames.biopsyResult} WHERE id_patient = ?`,
                        [patientId]
                    ).then(() => {
                        const biopsyInserts: Promise<unknown>[] = []
                        if (mapped.coreBiopsyResult) {
                            biopsyInserts.push(
                                runInsert(TableNames.biopsyResult, {
                                    ...mapped.coreBiopsyResult,
                                    id_patient: patientId,
                                })
                            )
                        }
                        if (mapped.openBiopsyResult) {
                            biopsyInserts.push(
                                runInsert(TableNames.biopsyResult, {
                                    ...mapped.openBiopsyResult,
                                    id_patient: patientId,
                                })
                            )
                        }
                        return Promise.all(biopsyInserts)
                    })
                )

                // 6. Replace histopathology
                updatePromises.push(
                    runDelete(
                        TableNames.histopathology,
                        patientId,
                        'id_patient'
                    ).then(() => {
                        if (mapped.histopathologyResult) {
                            return runInsert(TableNames.histopathology, {
                                ...mapped.histopathologyResult,
                                id_patient: patientId,
                            })
                        }
                    })
                )

                // 7. Replace staging for current edition only (preserving other editions)
                if (mapped.patientStaging) {
                    updatePromises.push(
                        runQueryAll(
                            `DELETE FROM ${TableNames.patientStaging} WHERE id_patient = ? AND id_edition = ?`,
                            [patientId, mapped.patientStaging.id_edition]
                        ).then(() =>
                            runInsert(TableNames.patientStaging, {
                                ...mapped.patientStaging,
                                id_patient: patientId,
                            })
                        )
                    )
                }

                // 8. Replace attachments
                updatePromises.push(
                    runQueryAll(
                        `DELETE FROM ${TableNames.attachment} WHERE id_patient = ?`,
                        [patientId]
                    ).then(() => {
                        return Promise.all(
                            mapped.attachments.map((attachment) =>
                                runInsert(TableNames.attachment, {
                                    ...attachment,
                                    id_patient: patientId,
                                })
                            )
                        )
                    })
                )

                Promise.all(updatePromises)
                    .then(() => {
                        db.run('COMMIT', (err) => {
                            if (err) {
                                db.run('ROLLBACK')
                                reject(err)
                            } else {
                                resolve(patientId)
                            }
                        })
                    })
                    .catch((err) => {
                        db.run('ROLLBACK')
                        reject(err)
                    })
            })
        })
    } catch (err) {
        console.error('Error updating patient:', err)
        return null
    }
}

export const savePatient = async (data: PatientDto): Promise<number | null> => {
    try {
        const existingPatient = data.id
            ? await getPatient(data.id as number)
            : null

        if (existingPatient) {
            return updatePatient(data)
        } else {
            return insertPatient(data)
        }
    } catch (err) {
        console.error('Error saving patient:', err)
        return null
    }
}

export const getPatient = async (id: number): Promise<PatientDto | null> => {
    try {
        // Get base patient
        const patient = await runQuery<PatientEntity>(
            `SELECT *FROM ${TableNames.patient} WHERE id = ?`,
            [id]
        )

        if (!patient) return null

        // Get related entities
        const [
            malignant,
            benign,
            malignantParotid,
            malignantSubmandibular,
            biopsies,
            histopathology,
            staging,
            attachments,
        ] = await Promise.all([
            runQuery<MalignantPatientEntity>(
                `SELECT *FROM ${TableNames.malignantPatient} WHERE id_patient = ?`,
                [id]
            ),
            runQuery<BenignPatientEntity>(
                `SELECT *FROM ${TableNames.benignPatient} WHERE id_patient = ?`,
                [id]
            ),
            runQuery<MalignantParotidSpecificEntity>(
                `SELECT *FROM ${TableNames.malignantParotidSpecific} WHERE id_malignant_patient = ?`,
                [id]
            ),
            runQuery<MalignantSubmandibularSpecificEntity>(
                `SELECT *FROM ${TableNames.malignantSubmandibularSpecific} WHERE id_malignant_patient = ?`,
                [id]
            ),
            runQueryAll<BiopsyResultEntity>(
                `SELECT *FROM ${TableNames.biopsyResult} WHERE id_patient = ?`,
                [id]
            ),
            runQuery<HistopathologyEntity>(
                `SELECT *FROM ${TableNames.histopathology} WHERE id_patient = ?`,
                [id]
            ),
            runQuery<PatientStagingEntity>(
                `SELECT *FROM ${TableNames.patientStaging} WHERE id_patient = ?`,
                [id]
            ),
            runQueryAll<AttachmentEntity>(
                `SELECT *FROM ${TableNames.attachment} WHERE id_patient = ?`,
                [id]
            ),
        ])

        const coreBiopsy = biopsies.find((b) => b.biopsy_type === 'core')
        const openBiopsy = biopsies.find((b) => b.biopsy_type === 'open')

        // Resolve TNM value codes from staging IDs
        let tnmValues: Map<number, TnmValueDefinitionEntity> | undefined
        if (staging) {
            const ids = [
                staging.clinical_t_id,
                staging.clinical_n_id,
                staging.clinical_m_id,
                staging.clinical_grade_id,
                staging.pathological_t_id,
                staging.pathological_n_id,
                staging.pathological_m_id,
                staging.pathological_grade_id,
            ].filter((id): id is number => id != null)
            if (ids.length > 0) {
                tnmValues = await getTnmValuesByIds(ids)
            }
        }

        const dto = PatientMapper.toDto(
            patient,
            malignant,
            benign,
            malignantParotid,
            malignantSubmandibular,
            coreBiopsy,
            openBiopsy,
            histopathology,
            staging,
            attachments,
            tnmValues
        )

        // Decrypt sensitive fields
        const decrypted = decryptPatientData([dto])
        return decrypted[0]
    } catch (err) {
        console.error('Error getting patient:', err)
        return null
    }
}

export const deletePatient = async (data: PatientDto): Promise<boolean> => {
    try {
        const patientId = data.id as number
        // CASCADE will handle related tables
        await runDelete(TableNames.patient, patientId)
        return true
    } catch (err) {
        console.error('Error deleting patient:', err)
        return false
    }
}

const fetchFullPatients = async (ids: number[]): Promise<PatientDto[]> => {
    const promises = ids.map((id) => getPatient(id))
    const results = await Promise.all(promises)
    return results.filter((p): p is PatientDto => p !== null)
}

// =============================================
// Query Operations
// =============================================

export const getAllPatients = async (): Promise<PatientDto[]> => {
    try {
        const patients = await runQueryAll<PatientEntity>(
            `SELECT id FROM ${TableNames.patient}`
        )

        const ids = patients.map((p) => p.id)
        return fetchFullPatients(ids)
    } catch (err) {
        console.error('Error getting all patients:', err)
        return []
    }
}

export const getPatientsInStudy = async (
    idStudy: number
): Promise<PatientDto[]> => {
    const query = `
        SELECT p.*
        FROM ${TableNames.patient} p
        INNER JOIN ${TableNames.isInStudy} iis ON p.id = iis.id_patient
        WHERE iis.id_study = ?
    `

    try {
        const patients = await runQueryAll<PatientDto>(query, [idStudy])

        const ids = patients.map((p) => p.id as number)
        return fetchFullPatients(ids)
    } catch (err) {
        return []
    }
}

export const getPatientsByType = async (
    formType: FormType
): Promise<PatientDto[] | null> => {
    try {
        const { tumorType, tumorLocation } = formTypeToTumorInfo(formType)

        const patients = await runQueryAll<PatientEntity>(
            `SELECT id FROM ${TableNames.patient} WHERE tumor_type = ?AND tumor_location = ?`,
            [tumorType, tumorLocation]
        )

        const ids = patients.map((p) => p.id)
        return fetchFullPatients(ids)
    } catch (err) {
        console.error('Error getting patients by type:', err)
        return null
    }
}

export const getFilteredPatients = async (
    filter: FilteredColumnsDto,
    idStudy?: number
): Promise<PatientDto[] | null> => {
    try {
        let query = `SELECT p.id FROM ${TableNames.patient} p`
        const params: unknown[] = []

        // Join with study if filtering by study
        if (idStudy) {
            query += ` JOIN ${TableNames.isInStudy} s ON p.id = s.id_patient WHERE s.id_study = ?`
            params.push(idStudy)
        } else {
            query += ' WHERE 1=1'
        }

        // Filter by tumor type
        if (filter.typ_nadoru === TumorTypeEnum.MALIGNANT) {
            query += ` AND p.tumor_type = 'malignant'`
        } else if (filter.typ_nadoru === TumorTypeEnum.BENIGN) {
            query += ` AND p.tumor_type = 'benign'`
        }

        // Filter by form type (location)
        if (filter.form_type && filter.form_type.length > 0) {
            const locations = filter.form_type.map((ft) => {
                const info = formTypeToTumorInfo(ft)
                return info.tumorLocation
            })
            query += ` AND p.tumor_location IN (${locations.map(() => '?').join(', ')})`
            params.push(...locations)
        }

        // Filter by therapy type
        if (filter.typ_terapie && filter.typ_terapie.length > 0) {
            query += ` AND p.therapy_type IN (${filter.typ_terapie.map(() => '?').join(', ')})`
            params.push(...filter.typ_terapie)
        }

        // Filter by persistence
        if (filter.perzistence) {
            query += ` AND p.persistence = ?`
            params.push(filter.perzistence === 'yes' ? 1 : 0)
        }

        // Filter by recurrence
        if (filter.recidiva) {
            query += ` AND p.recidive = ?`
            params.push(filter.recidiva === 'yes' ? 1 : 0)
        }

        // Filter by state (alive/dead)
        if (filter.stav) {
            query += ` AND p.is_alive = ?`
            params.push(filter.stav === 'alive' ? 1 : 0)
        }

        // Filter by gender
        if (filter.pohlavi) {
            query += ` AND p.gender = ?`
            params.push(filter.pohlavi)
        }

        // Filter by histopathology result
        if (
            filter.histopatologie_vysledek &&
            filter.histopatologie_vysledek.length > 0
        ) {
            const placeholders = filter.histopatologie_vysledek
                .map(() => '?')
                .join(', ')
            query += ` AND EXISTS (
                SELECT 1 FROM ${TableNames.histopathology} hp
                JOIN ${TableNames.histologyType} ht ON ht.id = hp.id_histology_type
                WHERE hp.id_patient = p.id AND ht.translation_key IN (${placeholders})
            )`
            params.push(...filter.histopatologie_vysledek)
        }

        const patients = await runQueryAll<PatientEntity>(query, params)

        const ids = patients.map((p) => p.id)
        return fetchFullPatients(ids)
    } catch (err) {
        console.error('Error getting filtered patients:', err)
        return null
    }
}

export const searchPatientsByNameSurnameRC = async (
    search: string
): Promise<PatientDto[] | null> => {
    try {
        const query = `
            SELECT id FROM ${TableNames.patient}
            WHERE name || ' ' || surname LIKE ?
            OR personal_identification_number LIKE ?
        `
        const searchPattern = `%${search}%`

        const patients = await runQueryAll<PatientEntity>(query, [
            searchPattern,
            searchPattern,
        ])

        const ids = patients.map((p) => p.id)
        return fetchFullPatients(ids)
    } catch (err) {
        console.error('Error searching patients:', err)
        return null
    }
}

export const getPlannedPatientsBetweenDates = async (
    startDate: Date,
    endDate: Date
): Promise<PlannedPatientsMapDto> => {
    try {
        const startDateFormatted = startDate.toISOString().split('T')[0]
        const endDateFormatted = endDate.toISOString().split('T')[0]

        const query = `
            SELECT id FROM ${TableNames.patient}
            WHERE next_follow_up BETWEEN ? AND ?
        `

        const patients = await runQueryAll<PatientEntity>(query, [
            startDateFormatted,
            endDateFormatted,
        ])

        const ids = patients.map((p) => p.id)
        const fullPatients = await fetchFullPatients(ids)

        // Group by date
        const plannedPatientsMap: PlannedPatientsMapDto = {}
        fullPatients.forEach((patient) => {
            const date = patient.planovana_kontrola as string
            if (!plannedPatientsMap[date]) {
                plannedPatientsMap[date] = []
            }
            plannedPatientsMap[date].push(patient)
        })

        return plannedPatientsMap
    } catch (err) {
        console.error('Error getting planned patients:', err)
        return {}
    }
}

// =============================================
// Statistics Operations
// =============================================

export const getKaplanMeierData = async (
    kaplanMeierType: KaplanMeierTypeEnum,
    filter: FilteredColumnsDto
): Promise<KaplanMeierDataDto | null> => {
    try {
        const kaplanMeierData: KaplanMeierDataDto = {}

        // Need to join with histopathology to get histopatologie_vysledek
        for (const histopatologieVysledek of filter.histopatologie_vysledek) {
            let query = ''
            if (kaplanMeierType === KaplanMeierTypeEnum.survival) {
                query = `
                    SELECT p.diagnosis_date as rok_diagnozy,
                           p.death_date as datum_umrti,
                           p.last_follow_up as posledni_kontrola
                    FROM ${TableNames.patient} p
                    JOIN ${TableNames.histopathology} h ON p.id = h.id_patient
                    JOIN ${TableNames.histologyType} ht ON h.id_histology_type = ht.id
                    WHERE ht.id = ? AND p.tumor_type = 'malignant'
                `
            } else {
                query = `
                    SELECT p.diagnosis_date as rok_diagnozy,
                           p.date_of_recidive as datum_prokazani_recidivy,
                           p.last_follow_up as posledni_kontrola
                    FROM ${TableNames.patient} p
                    JOIN ${TableNames.histopathology} h ON p.id = h.id_patient
                    JOIN ${TableNames.histologyType} ht ON h.id_histology_type = ht.id
                    WHERE ht.id = ? AND p.tumor_type = 'malignant'
                `
            }

            const histologyTypeId = HistologyTypeMapper.mapKeyToId(
                histopatologieVysledek
            )
            const rows = await runQueryAll<{
                rok_diagnozy: string
                datum_umrti?: string
                datum_prokazani_recidivy?: string
                posledni_kontrola?: string
            }>(query, [histologyTypeId])

            kaplanMeierData[histopatologieVysledek] = rows
                .filter((row) => row.rok_diagnozy !== null)
                .map((row) => {
                    const patientData: KaplanMeierPatientDataDto = {
                        start_date: new Date(row.rok_diagnozy),
                        event_date: getEventDate(row, kaplanMeierType),
                        last_follow_up_date: getLastFollowUpDate(row),
                    }
                    return patientData
                })
        }

        return kaplanMeierData
    } catch (err) {
        console.error('Error getting Kaplan-Meier data:', err)
        return null
    }
}

const getEventDate = (
    row: {
        datum_umrti?: string
        datum_prokazani_recidivy?: string
    },
    kaplanMeierType: KaplanMeierTypeEnum
): Date | null => {
    if (kaplanMeierType === KaplanMeierTypeEnum.survival) {
        if (row.datum_umrti && row.datum_umrti !== '') {
            return new Date(row.datum_umrti)
        }
        return null
    } else {
        if (
            row.datum_prokazani_recidivy &&
            row.datum_prokazani_recidivy !== ''
        ) {
            return new Date(row.datum_prokazani_recidivy)
        }
        return null
    }
}

const getLastFollowUpDate = (row: {
    posledni_kontrola?: string
    rok_diagnozy?: string
}): Date | null => {
    if (row.posledni_kontrola && row.posledni_kontrola !== '') {
        return new Date(row.posledni_kontrola)
    }
    if (row.rok_diagnozy && row.rok_diagnozy !== '') {
        return new Date(row.rok_diagnozy)
    }
    return null
}

export const getTnmDistribution = async (
    patientIds: number[],
    editionId: number
): Promise<{
    clinical: {
        t: Record<string, number>
        n: Record<string, number>
        m: Record<string, number>
        stage: Record<string, number>
    }
    pathological: {
        t: Record<string, number>
        n: Record<string, number>
        m: Record<string, number>
        stage: Record<string, number>
    }
}> => {
    const empty = { t: {}, n: {}, m: {}, stage: {} }
    if (patientIds.length === 0) {
        return { clinical: empty, pathological: { ...empty } }
    }

    const placeholders = patientIds.map(() => '?').join(', ')
    const query = `
        SELECT
            tvd_ct.code  AS clinical_t,
            tvd_cn.code  AS clinical_n,
            tvd_cm.code  AS clinical_m,
            tvd_cg.code  AS clinical_stage,
            tvd_pt.code  AS pathological_t,
            tvd_pn.code  AS pathological_n,
            tvd_pm.code  AS pathological_m,
            tvd_pg.code  AS pathological_stage
        FROM ${TableNames.patientStaging} ps
        LEFT JOIN ${TableNames.tnmValueDefinition} tvd_ct ON tvd_ct.id = ps.clinical_t_id
        LEFT JOIN ${TableNames.tnmValueDefinition} tvd_cn ON tvd_cn.id = ps.clinical_n_id
        LEFT JOIN ${TableNames.tnmValueDefinition} tvd_cm ON tvd_cm.id = ps.clinical_m_id
        LEFT JOIN ${TableNames.tnmValueDefinition} tvd_cg ON tvd_cg.id = ps.clinical_grade_id
        LEFT JOIN ${TableNames.tnmValueDefinition} tvd_pt ON tvd_pt.id = ps.pathological_t_id
        LEFT JOIN ${TableNames.tnmValueDefinition} tvd_pn ON tvd_pn.id = ps.pathological_n_id
        LEFT JOIN ${TableNames.tnmValueDefinition} tvd_pm ON tvd_pm.id = ps.pathological_m_id
        LEFT JOIN ${TableNames.tnmValueDefinition} tvd_pg ON tvd_pg.id = ps.pathological_grade_id
        WHERE ps.id_patient IN (${placeholders}) AND ps.id_edition = ?
    `

    type Row = {
        clinical_t: string | null
        clinical_n: string | null
        clinical_m: string | null
        clinical_stage: string | null
        pathological_t: string | null
        pathological_n: string | null
        pathological_m: string | null
        pathological_stage: string | null
    }

    const rows = await runQueryAll<Row>(query, [...patientIds, editionId])

    const inc = (obj: Record<string, number>, key: string | null) => {
        if (key) obj[key] = (obj[key] || 0) + 1
    }

    const ct: Record<string, number> = {}
    const cn: Record<string, number> = {}
    const cm: Record<string, number> = {}
    const cstage: Record<string, number> = {}
    const pt: Record<string, number> = {}
    const pn: Record<string, number> = {}
    const pm: Record<string, number> = {}
    const pstage: Record<string, number> = {}

    for (const row of rows) {
        inc(ct, row.clinical_t)
        inc(cn, row.clinical_n)
        inc(cm, row.clinical_m)
        inc(cstage, row.clinical_stage)
        inc(pt, row.pathological_t)
        inc(pn, row.pathological_n)
        inc(pm, row.pathological_m)
        inc(pstage, row.pathological_stage)
    }

    return {
        clinical: { t: ct, n: cn, m: cm, stage: cstage },
        pathological: { t: pt, n: pn, m: pm, stage: pstage },
    }
}

export const getChiSquareContingencyTable = async (
    rows: number,
    columns: number,
    rowSelectedCategories: Record<
        number,
        Record<InferenceChiSquareCategories, string[]>
    >,
    columnSelectedCategories: Record<
        number,
        Record<InferenceChiSquareCategories, string[]>
    >,
    tnmEditionId?: number
): Promise<number[][]> => {
    const contingencyTable = Array.from({ length: rows }, () =>
        Array(columns).fill(0)
    )

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < columns; j++) {
            const rowData = rowSelectedCategories[i]
            const columnData = columnSelectedCategories[j]
            if (rowData && columnData) {
                const count = await getChiSquareCount(
                    rowData,
                    columnData,
                    tnmEditionId
                )
                contingencyTable[i][j] = count
            }
        }
    }

    return contingencyTable
}

const getChiSquareCount = async (
    rowData: Record<InferenceChiSquareCategories, string[]>,
    columnData: Record<InferenceChiSquareCategories, string[]>,
    editionId?: number
): Promise<number> => {
    const rowFilters = collectCategoryFilters(rowData, editionId)
    const colFilters = collectCategoryFilters(columnData, editionId)

    // Deduplicate joins across row and column filters
    const allJoins = [...rowFilters.joins]
    for (const join of colFilters.joins) {
        if (!allJoins.includes(join)) {
            allJoins.push(join)
        }
    }

    const joinClause = allJoins.length > 0 ? ' ' + allJoins.join(' ') : ''
    const allConditions = [...rowFilters.conditions, ...colFilters.conditions]
    const whereClause =
        allConditions.length > 0 ? ' AND ' + allConditions.join(' AND ') : ''
    const params = [...rowFilters.params, ...colFilters.params]

    const query = `SELECT COUNT(DISTINCT p.id) as count FROM ${TableNames.patient} p ${joinClause} WHERE p.tumor_type = 'malignant' ${whereClause}`

    const result = await runQuery<{ count: number }>(query, params)
    return result?.count ?? 0
}

interface CategoryQueryFragment {
    joins: string[]
    condition: string
    params: unknown[]
}

const convertValues = (
    category: InferenceChiSquareCategories,
    values: string[]
): unknown[] => {
    switch (category) {
        case InferenceChiSquareCategories.persistence:
        case InferenceChiSquareCategories.recurrence:
            return values.map((v) => (v === 'yes' ? 1 : 0))
        case InferenceChiSquareCategories.state:
            return values.map((v) => (v === 'alive' ? 1 : 0))
        default:
            return values
    }
}

const buildCategoryFilter = (
    category: InferenceChiSquareCategories,
    values: string[],
    editionId?: number
): CategoryQueryFragment => {
    const converted = convertValues(category, values)
    const placeholders = converted.map(() => '?').join(', ')

    switch (category) {
        case InferenceChiSquareCategories.histologicalTypes:
            return {
                joins: [
                    `JOIN ${TableNames.histopathology} hp ON hp.id_patient = p.id`,
                    `JOIN ${TableNames.histologyType} ht ON ht.id = hp.id_histology_type`,
                ],
                condition: `ht.translation_key IN (${placeholders})`,
                params: converted,
            }
        case InferenceChiSquareCategories.tClassification:
            return {
                joins: [
                    `JOIN ${TableNames.patientStaging} ps ON ps.id_patient = p.id`,
                    `JOIN ${TableNames.tnmValueDefinition} tvd_t ON tvd_t.id = ps.clinical_t_id`,
                ],
                condition: editionId
                    ? `tvd_t.code IN (${placeholders}) AND ps.id_edition = ?`
                    : `tvd_t.code IN (${placeholders})`,
                params: editionId ? [...converted, editionId] : converted,
            }
        case InferenceChiSquareCategories.nClassification:
            return {
                joins: [
                    `JOIN ${TableNames.patientStaging} ps ON ps.id_patient = p.id`,
                    `JOIN ${TableNames.tnmValueDefinition} tvd_n ON tvd_n.id = ps.clinical_n_id`,
                ],
                condition: editionId
                    ? `tvd_n.code IN (${placeholders}) AND ps.id_edition = ?`
                    : `tvd_n.code IN (${placeholders})`,
                params: editionId ? [...converted, editionId] : converted,
            }
        case InferenceChiSquareCategories.mClassification:
            return {
                joins: [
                    `JOIN ${TableNames.patientStaging} ps ON ps.id_patient = p.id`,
                    `JOIN ${TableNames.tnmValueDefinition} tvd_m ON tvd_m.id = ps.clinical_m_id`,
                ],
                condition: editionId
                    ? `tvd_m.code IN (${placeholders}) AND ps.id_edition = ?`
                    : `tvd_m.code IN (${placeholders})`,
                params: editionId ? [...converted, editionId] : converted,
            }
        case InferenceChiSquareCategories.persistence:
            return {
                joins: [],
                condition: `p.persistence IN (${placeholders})`,
                params: converted,
            }
        case InferenceChiSquareCategories.recurrence:
            return {
                joins: [],
                condition: `p.recidive IN (${placeholders})`,
                params: converted,
            }
        case InferenceChiSquareCategories.state:
            return {
                joins: [],
                condition: `p.is_alive IN (${placeholders})`,
                params: converted,
            }
    }
}

const collectCategoryFilters = (
    data: Record<InferenceChiSquareCategories, string[]>,
    editionId?: number
): { joins: string[]; conditions: string[]; params: unknown[] } => {
    const allJoins: string[] = []
    const conditions: string[] = []
    const params: unknown[] = []

    for (const [category, values] of Object.entries(data)) {
        const filteredValues = values.filter((v) => v.length > 0)
        if (filteredValues.length > 0) {
            const fragment = buildCategoryFilter(
                category as InferenceChiSquareCategories,
                filteredValues,
                editionId
            )
            for (const join of fragment.joins) {
                if (!allJoins.includes(join)) {
                    allJoins.push(join)
                }
            }
            conditions.push(fragment.condition)
            params.push(...fragment.params)
        }
    }

    return { joins: allJoins, conditions, params }
}

export const getTTestData = async (
    groups: ITTestGroupsDto,
    tnmEditionId?: number
): Promise<NonParametricTestDataDto> => {
    const group1Data = await getTTestGroupData(groups.first, tnmEditionId)
    const group2Data = await getTTestGroupData(groups.second, tnmEditionId)

    return {
        group1: group1Data,
        group2: group2Data,
    }
}

const getTTestGroupData = async (
    group: {
        histologicalTypes: string[]
        tClassification: string[]
        nClassification: string[]
        mClassification: string[]
        persistence: string[]
        recurrence: string[]
        state: string[]
    },
    editionId?: number
): Promise<PatientDto[]> => {
    const filters = collectCategoryFilters(
        group as Record<InferenceChiSquareCategories, string[]>,
        editionId
    )

    const joinClause =
        filters.joins.length > 0 ? ' ' + filters.joins.join(' ') : ''
    const whereClause =
        filters.conditions.length > 0
            ? ' AND ' + filters.conditions.join(' AND ')
            : ''

    const query = `SELECT DISTINCT p.id FROM ${TableNames.patient} p ${joinClause} WHERE p.tumor_type = 'malignant' ${whereClause}`

    const patients = await runQueryAll<PatientEntity>(query, filters.params)

    const ids = patients.map((p) => p.id)
    return fetchFullPatients(ids)
}

// =============================================
// Helper Functions
// =============================================

export const countMalignantPatients = async (): Promise<number> => {
    const result = await runQuery<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${TableNames.patient} WHERE tumor_type = 'malignant'`
    )
    return result?.count ?? 0
}

const formTypeToTumorInfo = (
    formType: FormType | number
): { tumorType: string; tumorLocation: string } => {
    switch (formType) {
        case FormType.submandibularMalignant:
            return { tumorType: 'malignant', tumorLocation: 'submandibular' }
        case FormType.sublingualMalignant:
            return { tumorType: 'malignant', tumorLocation: 'sublingual' }
        case FormType.parotidMalignant:
            return { tumorType: 'malignant', tumorLocation: 'parotid' }
        case FormType.submandibularBenign:
            return { tumorType: 'benign', tumorLocation: 'submandibular' }
        case FormType.parotidBenign:
            return { tumorType: 'benign', tumorLocation: 'parotid' }
        default:
            return { tumorType: 'malignant', tumorLocation: 'parotid' }
    }
}
