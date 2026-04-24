import { FormType } from '../constants'
import { fromIntBool, fromIsAlive, toIntBool, toNum, toStr } from './utils'
import { PatientEntity } from '../db-entities/PatientEntity'
import { MalignantPatientEntity } from '../db-entities/MalignantPatientEntity'
import { BenignPatientEntity } from '../db-entities/BenignPatientEntity'
import { MalignantParotidSpecificEntity } from '../db-entities/MalignantParotidSpecificEntity'
import { MalignantSubmandibularSpecificEntity } from '../db-entities/MalignantSubmandibularSpecificEntity'
import { AttachmentEntity } from '../db-entities/AttachmentEntity'
import { BiopsyResultEntity } from '../db-entities/BiopsyResultEntity'
import { PatientStagingEntity } from '../db-entities/PatientStagingEntity'
import { ParotidMalignantPatientDto } from '../../ipc/dtos/ParotidMalignantPatientDto'
import { SubmandibularMalignantPatientDto } from '../../ipc/dtos/SubmandibularMalignantPatientDto'
import { SubmandibularBenignPatientDto } from '../../ipc/dtos/SubmandibularBenignPatientDto'
import { ParotidBenignPatientDto } from '../../ipc/dtos/ParotidBenignPatientDto'
import { PatientDto } from '../../ipc/dtos/PatientDto'
import { HistologyTypeMapper } from './HistologyTypeMapper'
import { HistologySubtypeMapper } from './HistologySubtypeMapper'
import { HistopathologyEntity } from '../db-entities/HistopathologyEntity'
import { TnmValueDefinitionEntity } from '../db-entities/TnmValueDefinitionEntity'

export class PatientMapper {
    static toPersistence(
        patient: PatientDto,
        editionId = 1
    ): {
        base: PatientEntity
        malignant?: MalignantPatientEntity
        benign?: BenignPatientEntity
        malignantParotid?: MalignantParotidSpecificEntity
        malignantSubmandibular?: MalignantSubmandibularSpecificEntity
        coreBiopsyResult?: BiopsyResultEntity
        openBiopsyResult?: BiopsyResultEntity
        histopathologyResult?: HistopathologyEntity
        patientStaging?: PatientStagingEntity
        attachments: AttachmentEntity[]
    } {
        const formType = patient.form_type as FormType
        const { tumorType, tumorLocation } =
            this.determineTypeAndLocation(formType)

        const base = this.mapBaseEntity(patient, tumorType, tumorLocation)
        const malignant = this.mapMalignantEntity(patient, tumorType)
        const benign = this.mapBenignEntity(patient, tumorType)
        const malignantParotid = this.mapMalignantParotidEntity(
            patient,
            tumorType,
            tumorLocation
        )
        const malignantSubmandibular = this.mapMalignantSubmandibularEntity(
            patient,
            tumorType,
            tumorLocation
        )
        const coreBiopsyResult = this.mapBiopsyResultEntity(patient, 'core')
        const openBiopsyResult = this.mapBiopsyResultEntity(patient, 'open')
        const histopathologyResult = this.mapHistopathologyEntity(patient)
        const patientStaging = this.mapPatientStagingEntity(
            patient,
            tumorType,
            editionId
        )
        const attachments = this.mapAttachments(patient)

        return {
            base,
            malignant,
            benign,
            malignantParotid,
            malignantSubmandibular,
            coreBiopsyResult,
            openBiopsyResult,
            histopathologyResult,
            patientStaging,
            attachments,
        }
    }

    private static determineTypeAndLocation(formType: FormType): {
        tumorType: 'malignant' | 'benign'
        tumorLocation: 'submandibular' | 'sublingual' | 'parotid'
    } {
        let tumorType: 'malignant' | 'benign' = 'malignant'
        let tumorLocation: 'submandibular' | 'sublingual' | 'parotid' =
            'parotid'

        switch (formType) {
            case FormType.submandibularMalignant:
                tumorType = 'malignant'
                tumorLocation = 'submandibular'
                break
            case FormType.sublingualMalignant:
                tumorType = 'malignant'
                tumorLocation = 'sublingual'
                break
            case FormType.parotidMalignant:
                tumorType = 'malignant'
                tumorLocation = 'parotid'
                break
            case FormType.submandibularBenign:
                tumorType = 'benign'
                tumorLocation = 'submandibular'
                break
            case FormType.parotidBenign:
                tumorType = 'benign'
                tumorLocation = 'parotid'
                break
        }
        return { tumorType, tumorLocation }
    }

    private static mapBaseEntity(
        patient: PatientDto,
        tumorType: 'malignant' | 'benign',
        tumorLocation: 'submandibular' | 'sublingual' | 'parotid'
    ): PatientEntity {
        return {
            id: patient.id,
            tumor_type: tumorType,
            tumor_location: tumorLocation,
            name: toStr(patient.jmeno),
            surname: toStr(patient.prijmeni),
            internal_patient_id: toStr(patient.id_pacient),
            personal_identification_number: toStr(patient.rodne_cislo),
            age_at_diagnosis: toNum(patient.vek_pri_diagnoze),
            gender: patient.pohlavi as 'male' | 'female',
            region: toStr(patient.kraj),
            other_malignancy_in_personal_history: toStr(
                patient.jine_nadorove_onemocneni_v_oa
            ),
            specification_of_site_of_other_carcinoma: toStr(
                patient.specifikace_mista_vyskytu_jineho_karcinomu
            ),
            other_major_salivary_gland_disease_in_personal_history: toStr(
                patient.jine_onemocneni_velkych_slinnych_zlaz_v_oa
            ),
            disease_specification: toStr(patient.specifikace_onemocneni),
            smokes: toIntBool(patient.koureni),
            cigarettes_per_day: toNum(patient.pocet_cigaret_denne),
            smoking_duration: toNum(patient.jak_dlouho_kouri),
            pack_years: toNum(patient.pocet_balickoroku),
            alcohol_abuse: toIntBool(patient.abusus_alkoholu),
            diagnosis_date: toStr(patient.rok_diagnozy),
            side_of_lesion: toStr(patient.strana_nalezu),
            diagnosis_methods: toStr(patient.diagnosticke_metody),
            fnab: toIntBool(patient.fnab),
            fnab_result: toStr(patient.vysledek_fnab),
            date_of_treatment_initiation: toStr(patient.datum_zahajeni_lecby),
            therapy_type: toStr(patient.typ_terapie),
            extent_of_surgical_treatment: toStr(
                patient.rozsah_chirurgicke_lecby
            ),
            date_of_first_post_treatment_follow_up: toStr(
                patient.datum_prvni_kontroly_po_lecbe
            ),
            persistence: toIntBool(patient.perzistence),
            date_of_persistence: toStr(patient.datum_prokazani_perzistence),
            recidive: toIntBool(patient.recidiva),
            date_of_recidive: toStr(patient.datum_prokazani_recidivy),
            is_alive:
                patient.stav === null || patient.stav === undefined
                    ? null
                    : patient.stav === 'alive'
                      ? 1
                      : 0,
            death_date: toStr(patient.datum_umrti),
            last_follow_up: toStr(patient.posledni_kontrola),
            next_follow_up: toStr(patient.planovana_kontrola),
            notes: toStr(patient.poznamky),
        }
    }

    private static mapMalignantEntity(
        patient: PatientDto,
        tumorType: string
    ): MalignantPatientEntity | undefined {
        if (tumorType !== 'malignant') return undefined

        const p = patient as ParotidMalignantPatientDto
        return {
            id_patient: patient.id,
            block_neck_dissection: toIntBool(p.blokova_krcni_disekce),
            side_of_neck_dissection: toStr(p.strana_blokove_krcni_disekce),
            type_of_nd: toStr(p.typ_nd),
            extent_of_nd: toStr(p.rozsah_nd),
            adjuvant_therapy: toStr(p.adjuvantni_terapie),
            type_of_non_surgical_therapy: toStr(p.typ_nechirurgicke_terapie),
        }
    }

    private static mapBenignEntity(
        patient: PatientDto,
        tumorType: string
    ): BenignPatientEntity | undefined {
        if (tumorType !== 'benign') return undefined

        const p = patient as SubmandibularBenignPatientDto
        return {
            id_patient: patient.id,
            preoperative_house_brackmann_grade_of_facial_nerve_function: toStr(
                p.funkce_n_vii_dle_h_b_predoperacne
            ),
            postoperative_house_brackmann_grade_of_facial_nerve_function: toStr(
                p.funkce_n_vii_dle_h_b_pooperacne
            ),
            postoperative_complications: toStr(p.pooperacni_komplikace),
            other_postoperative_complications: toStr(
                p.jine_pooperacni_komplikace
            ),
            further_follow_up_recommended: toStr(p.doporuceno_dalsi_sledovani),
        }
    }

    private static mapMalignantParotidEntity(
        patient: PatientDto,
        tumorType: string,
        tumorLocation: string
    ): MalignantParotidSpecificEntity | undefined {
        if (tumorType !== 'malignant' || tumorLocation !== 'parotid')
            return undefined

        const p = patient as ParotidMalignantPatientDto
        return {
            id_malignant_patient: patient.id,
            preoperative_house_brackmann_grade_of_facial_nerve_function: toStr(
                p.funkce_n_vii_dle_h_b_predoperacne
            ),
            postoperative_house_brackmann_grade_of_facial_nerve_function: toStr(
                p.funkce_n_vii_dle_h_b_pooperacne
            ),
            postoperative_complications: toStr(p.pooperacni_komplikace),
            other_postoperative_complications: toStr(
                p.jine_pooperacni_komplikace
            ),
        }
    }

    private static mapMalignantSubmandibularEntity(
        patient: PatientDto,
        tumorType: string,
        tumorLocation: string
    ): MalignantSubmandibularSpecificEntity | undefined {
        if (tumorType !== 'malignant' || tumorLocation !== 'submandibular')
            return undefined

        const p = patient as SubmandibularMalignantPatientDto
        return {
            id_malignant_patient: patient.id,
            preoperative_house_brackmann_grade_of_facial_nerve_function: toStr(
                p.funkce_n_vii_dle_h_b_predoperacne
            ),
            postoperative_house_brackmann_grade_of_facial_nerve_function: toStr(
                p.funkce_n_vii_dle_h_b_pooperacne
            ),
        }
    }

    private static mapAttachments(patient: PatientDto): AttachmentEntity[] {
        const attachmentsStr = patient.attachments as string
        if (!attachmentsStr) {
            return []
        }

        return attachmentsStr.split(',').map((filePath) => ({
            id_patient: patient.id,
            file_path: filePath,
        }))
    }

    private static getHistologyTypeAndSubtype(
        patient: PatientDto,
        histologyKey: string
    ): {
        histologyTypeId: number | undefined
        histologySubtypeId: number | undefined
    } {
        const histologyTypeId = HistologyTypeMapper.mapKeyToId(histologyKey)
        if (!histologyTypeId) {
            return { histologyTypeId: undefined, histologySubtypeId: undefined }
        }

        const histologySubtypeField =
            HistologySubtypeMapper.mapHistologyTypeToSubtypeKey(histologyTypeId)
        const histologySubtypeValue = patient[histologySubtypeField] as string
        const histologySubtypeId =
            HistologySubtypeMapper.mapSubtypeKeyToHistologyType(
                histologyTypeId,
                histologySubtypeValue
            )

        return { histologyTypeId, histologySubtypeId }
    }

    private static mapBiopsyResultEntity(
        patient: PatientDto,
        type: 'core' | 'open'
    ): BiopsyResultEntity | undefined {
        const biopsyResultField =
            type === 'core' ? 'core_vysledek' : 'otevrena_vysledek'
        const biopsyResult = patient[biopsyResultField] as string | undefined
        if (!biopsyResult) {
            return undefined
        }

        const { histologyTypeId, histologySubtypeId } =
            this.getHistologyTypeAndSubtype(patient, biopsyResult)
        if (!histologyTypeId) {
            return undefined
        }

        return {
            id_patient: patient.id,
            id_histology_type: histologyTypeId,
            id_histology_subtype: histologySubtypeId,
            biopsy_type: type,
        }
    }

    private static mapHistopathologyEntity(
        patient: PatientDto
    ): HistopathologyEntity {
        const histopathologyResult = patient.histopatologie_vysledek
        if (!histopathologyResult) {
            return undefined
        }

        const { histologyTypeId, histologySubtypeId } =
            this.getHistologyTypeAndSubtype(patient, histopathologyResult)
        if (!histologyTypeId) {
            return undefined
        }

        return {
            id_patient: patient.id,
            id_histology_type: histologyTypeId,
            id_histology_subtype: histologySubtypeId,
            ene_result: patient.extranodalni_sireni_vysledek_histopatologie as
                | 'ENEma (>2 mm)'
                | 'ENEmi (≤2 mm)',
            extranodal_extension: toIntBool(
                patient.extranodalni_sireni_histopatologie
            ),
            lymphovascular_invasion: toIntBool(
                patient.lymfovaskularni_invaze_histopatologie
            ),
            note: '',
            number_of_metastatic_lymph_nodes: toNum(
                patient.pocet_lymfatickych_uzlin_s_metastazou_histopatologie
            ),
            perineural_invasion: toIntBool(
                patient.perineuralni_invaze_histopatologie
            ),
            proven_distant_metastasis: toIntBool(
                patient.prokazane_vzdalene_metastazy_histopatologie
            ),
            resection_margin: patient.okraj_resekce_histopatologie as
                | 'R0'
                | 'R1',
            site_of_distant_metastasis: toStr(
                patient.misto_vyskytu_vzdalene_metastazy_histopatologie
            ),
            tumor_size: toNum(patient.velikost_nadoru_histopatologie),
            tumor_size_not_determined_reason: toStr(
                patient.velikost_nadoru_neurcena_histopatologie
            ),
        }
    }

    private static mapPatientStagingEntity(
        patient: PatientDto,
        tumorType: string,
        editionId: number
    ): PatientStagingEntity | undefined {
        // TNM staging is only applicable for malignant tumors
        if (tumorType !== 'malignant') return undefined

        const p = patient as ParotidMalignantPatientDto

        // Get clinical staging IDs directly from patient data
        const clinicalTId = toNum(p.t_klasifikace_klinicka_id)
        const clinicalNId = toNum(p.n_klasifikace_klinicka_id)
        const clinicalMId = toNum(p.m_klasifikace_klinicka_id)
        const clinicalGradeId = toNum(p.tnm_klasifikace_klinicka_id)

        // Get pathological staging IDs directly from patient data
        const pathologicalTId = toNum(p.t_klasifikace_patologicka_id)
        const pathologicalNId = toNum(p.n_klasifikace_patologicka_id)
        const pathologicalMId = toNum(p.m_klasifikace_patologicka_id)
        const pathologicalGradeId = toNum(p.tnm_klasifikace_patologicka_id)

        // Check if any staging data exists
        const hasClinicalStaging = clinicalTId || clinicalNId || clinicalMId
        const hasPathologicalStaging =
            pathologicalTId || pathologicalNId || pathologicalMId

        if (!hasClinicalStaging && !hasPathologicalStaging) {
            return undefined
        }

        return {
            id_patient: patient.id,
            id_edition: editionId,
            clinical_t_id: clinicalTId,
            clinical_n_id: clinicalNId,
            clinical_m_id: clinicalMId,
            clinical_grade_id: clinicalGradeId,
            pathological_t_id: pathologicalTId,
            pathological_n_id: pathologicalNId,
            pathological_m_id: pathologicalMId,
            pathological_grade_id: pathologicalGradeId,
        }
    }

    // =============================================
    // Entity → DTO Mapping (toDto)
    // =============================================

    static toDto(
        base: PatientEntity,
        malignant?: MalignantPatientEntity,
        benign?: BenignPatientEntity,
        malignantParotid?: MalignantParotidSpecificEntity,
        malignantSubmandibular?: MalignantSubmandibularSpecificEntity,
        coreBiopsy?: BiopsyResultEntity,
        openBiopsy?: BiopsyResultEntity,
        histopathology?: HistopathologyEntity,
        staging?: PatientStagingEntity,
        attachments?: AttachmentEntity[],
        tnmValues?: Map<number, TnmValueDefinitionEntity>
    ): PatientDto {
        const formType = this.determineFormType(
            base.tumor_type,
            base.tumor_location
        )

        // Map base patient fields
        const dto: PatientDto = {
            id: base.id,
            form_type: formType,
            jmeno: base.name,
            prijmeni: base.surname,
            id_pacient: base.internal_patient_id,
            rodne_cislo: base.personal_identification_number,
            vek_pri_diagnoze: base.age_at_diagnosis,
            pohlavi: base.gender,
            kraj: base.region,
            jine_nadorove_onemocneni_v_oa:
                base.other_malignancy_in_personal_history,
            specifikace_mista_vyskytu_jineho_karcinomu:
                base.specification_of_site_of_other_carcinoma,
            jine_onemocneni_velkych_slinnych_zlaz_v_oa:
                base.other_major_salivary_gland_disease_in_personal_history,
            specifikace_onemocneni: base.disease_specification,
            koureni: fromIntBool(base.smokes),
            pocet_cigaret_denne: base.cigarettes_per_day,
            jak_dlouho_kouri: base.smoking_duration,
            pocet_balickoroku: base.pack_years,
            abusus_alkoholu: fromIntBool(base.alcohol_abuse),
            rok_diagnozy: base.diagnosis_date,
            strana_nalezu: base.side_of_lesion,
            diagnosticke_metody: base.diagnosis_methods,
            fnab: fromIntBool(base.fnab),
            vysledek_fnab: base.fnab_result,
            datum_zahajeni_lecby: base.date_of_treatment_initiation,
            typ_terapie:
                base.therapy_type === 'chirurgical'
                    ? 'surgical'
                    : base.therapy_type,
            rozsah_chirurgicke_lecby: base.extent_of_surgical_treatment,
            datum_prvni_kontroly_po_lecbe:
                base.date_of_first_post_treatment_follow_up,
            perzistence: fromIntBool(base.persistence),
            datum_prokazani_perzistence: base.date_of_persistence,
            recidiva: fromIntBool(base.recidive),
            datum_prokazani_recidivy: base.date_of_recidive,
            stav: fromIsAlive(base.is_alive),
            datum_umrti: base.death_date,
            posledni_kontrola: base.last_follow_up,
            planovana_kontrola: base.next_follow_up,
            poznamky: base.notes,
            attachments: this.mapAttachmentsToDto(attachments),
        }

        // Add malignant-specific fields
        if (malignant) {
            this.mapMalignantToDto(dto, malignant)
        }

        // Add benign-specific fields
        if (benign) {
            this.mapBenignToDto(dto, benign)
        }

        // Add parotid malignant-specific fields
        if (malignantParotid) {
            this.mapMalignantParotidToDto(dto, malignantParotid)
        }

        // Add submandibular malignant-specific fields
        if (malignantSubmandibular) {
            this.mapMalignantSubmandibularToDto(dto, malignantSubmandibular)
        }

        // Add biopsy results
        if (coreBiopsy) {
            this.mapBiopsyToDto(dto, coreBiopsy, 'core')
        }
        if (openBiopsy) {
            this.mapBiopsyToDto(dto, openBiopsy, 'open')
        }

        // Add histopathology
        if (histopathology) {
            this.mapHistopathologyToDto(dto, histopathology)
        }

        // Add staging
        if (staging) {
            this.mapStagingToDto(dto, staging, tnmValues)
        }

        return dto
    }

    private static determineFormType(
        tumorType: 'malignant' | 'benign',
        tumorLocation: 'submandibular' | 'sublingual' | 'parotid'
    ): FormType {
        if (tumorType === 'malignant') {
            switch (tumorLocation) {
                case 'submandibular':
                    return FormType.submandibularMalignant
                case 'sublingual':
                    return FormType.sublingualMalignant
                case 'parotid':
                    return FormType.parotidMalignant
            }
        } else {
            switch (tumorLocation) {
                case 'submandibular':
                    return FormType.submandibularBenign
                case 'parotid':
                    return FormType.parotidBenign
                default:
                    return FormType.submandibularBenign
            }
        }
    }

    private static mapAttachmentsToDto(
        attachments?: AttachmentEntity[]
    ): string {
        if (!attachments || attachments.length === 0) {
            return ''
        }
        return attachments.map((a) => a.file_path).join(',')
    }

    private static mapMalignantToDto(
        dto: PatientDto,
        malignant: MalignantPatientEntity
    ): void {
        const d = dto as ParotidMalignantPatientDto
        d.blokova_krcni_disekce = fromIntBool(malignant.block_neck_dissection)
        d.strana_blokove_krcni_disekce = malignant.side_of_neck_dissection
        d.typ_nd = malignant.type_of_nd
        d.rozsah_nd = malignant.extent_of_nd
        d.adjuvantni_terapie = malignant.adjuvant_therapy
        d.typ_nechirurgicke_terapie = malignant.type_of_non_surgical_therapy
    }

    private static mapBenignToDto(
        dto: PatientDto,
        benign: BenignPatientEntity
    ): void {
        const d = dto as SubmandibularBenignPatientDto | ParotidBenignPatientDto
        d.funkce_n_vii_dle_h_b_predoperacne =
            benign.preoperative_house_brackmann_grade_of_facial_nerve_function
        d.funkce_n_vii_dle_h_b_pooperacne =
            benign.postoperative_house_brackmann_grade_of_facial_nerve_function
        d.pooperacni_komplikace = benign.postoperative_complications
        d.jine_pooperacni_komplikace = benign.other_postoperative_complications
        d.doporuceno_dalsi_sledovani = benign.further_follow_up_recommended
    }

    private static mapMalignantParotidToDto(
        dto: PatientDto,
        malignantParotid: MalignantParotidSpecificEntity
    ): void {
        const d = dto as ParotidMalignantPatientDto
        d.funkce_n_vii_dle_h_b_predoperacne =
            malignantParotid.preoperative_house_brackmann_grade_of_facial_nerve_function
        d.funkce_n_vii_dle_h_b_pooperacne =
            malignantParotid.postoperative_house_brackmann_grade_of_facial_nerve_function
        d.pooperacni_komplikace = malignantParotid.postoperative_complications
        d.jine_pooperacni_komplikace =
            malignantParotid.other_postoperative_complications
    }

    private static mapMalignantSubmandibularToDto(
        dto: PatientDto,
        malignantSubmandibular: MalignantSubmandibularSpecificEntity
    ): void {
        const d = dto as SubmandibularMalignantPatientDto
        d.funkce_n_vii_dle_h_b_predoperacne =
            malignantSubmandibular.preoperative_house_brackmann_grade_of_facial_nerve_function
        d.funkce_n_vii_dle_h_b_pooperacne =
            malignantSubmandibular.postoperative_house_brackmann_grade_of_facial_nerve_function
    }

    private static mapBiopsyToDto(
        dto: PatientDto,
        biopsy: BiopsyResultEntity,
        type: 'core' | 'open'
    ): void {
        const histologyKey = HistologyTypeMapper.mapIdToKey(
            biopsy.id_histology_type
        )
        const subtypeKey = biopsy.id_histology_subtype
            ? HistologySubtypeMapper.mapIdToSubtypeKey(
                  biopsy.id_histology_subtype
              )
            : null

        if (type === 'core') {
            dto.core_biopsie = 'yes'
            dto.core_vysledek = histologyKey
            if (subtypeKey && histologyKey) {
                const subtypeField =
                    HistologySubtypeMapper.mapHistologyTypeToSubtypeKey(
                        biopsy.id_histology_type
                    )
                if (subtypeField) {
                    const coreSubtypeField = subtypeField.replace(
                        '_histopatologie',
                        '_core'
                    )
                    dto[coreSubtypeField] = subtypeKey
                }
            }
        } else {
            dto.otevrena_biopsie = 'yes'
            dto.otevrena_vysledek = histologyKey
            if (subtypeKey && histologyKey) {
                const subtypeField =
                    HistologySubtypeMapper.mapHistologyTypeToSubtypeKey(
                        biopsy.id_histology_type
                    )
                if (subtypeField) {
                    const openSubtypeField = subtypeField.replace(
                        '_histopatologie',
                        '_otevrena'
                    )
                    dto[openSubtypeField] = subtypeKey
                }
            }
        }
    }

    private static mapHistopathologyToDto(
        dto: PatientDto,
        histopathology: HistopathologyEntity
    ): void {
        dto.histopatologie_vysledek = HistologyTypeMapper.mapIdToKey(
            histopathology.id_histology_type
        )

        // Map subtype to the appropriate field based on histology type
        if (histopathology.id_histology_subtype) {
            const subtypeKey = HistologySubtypeMapper.mapIdToSubtypeKey(
                histopathology.id_histology_subtype
            )
            const subtypeField =
                HistologySubtypeMapper.mapHistologyTypeToSubtypeKey(
                    histopathology.id_histology_type
                )
            if (subtypeField && subtypeKey) {
                dto[subtypeField] = subtypeKey
            }
        }

        // Map other histopathology fields
        dto.velikost_nadoru_histopatologie = histopathology.tumor_size
        dto.velikost_nadoru_neurcena_histopatologie =
            histopathology.tumor_size_not_determined_reason
        dto.okraj_resekce_histopatologie = histopathology.resection_margin
        dto.lymfovaskularni_invaze_histopatologie = fromIntBool(
            histopathology.lymphovascular_invasion
        )
        dto.perineuralni_invaze_histopatologie = fromIntBool(
            histopathology.perineural_invasion
        )
        dto.pocet_lymfatickych_uzlin_s_metastazou_histopatologie =
            histopathology.number_of_metastatic_lymph_nodes?.toString()
        dto.extranodalni_sireni_histopatologie = fromIntBool(
            histopathology.extranodal_extension
        )
        dto.extranodalni_sireni_vysledek_histopatologie =
            histopathology.ene_result
        dto.prokazane_vzdalene_metastazy_histopatologie = fromIntBool(
            histopathology.proven_distant_metastasis
        )
        dto.misto_vyskytu_vzdalene_metastazy_histopatologie =
            histopathology.site_of_distant_metastasis
    }

    private static mapStagingToDto(
        dto: PatientDto,
        staging: PatientStagingEntity,
        tnmValues?: Map<number, TnmValueDefinitionEntity>
    ): void {
        const d = dto as ParotidMalignantPatientDto
        d.id_edition = staging.id_edition
        d.t_klasifikace_klinicka_id = staging.clinical_t_id
        d.n_klasifikace_klinicka_id = staging.clinical_n_id
        d.m_klasifikace_klinicka_id = staging.clinical_m_id
        d.tnm_klasifikace_klinicka_id = staging.clinical_grade_id
        d.t_klasifikace_patologicka_id = staging.pathological_t_id
        d.n_klasifikace_patologicka_id = staging.pathological_n_id
        d.m_klasifikace_patologicka_id = staging.pathological_m_id
        d.tnm_klasifikace_patologicka_id = staging.pathological_grade_id

        if (tnmValues) {
            d.t_klasifikace_klinicka = tnmValues.get(
                staging.clinical_t_id
            )?.code
            d.n_klasifikace_klinicka = tnmValues.get(
                staging.clinical_n_id
            )?.code
            d.m_klasifikace_klinicka = tnmValues.get(
                staging.clinical_m_id
            )?.code
            d.tnm_klasifikace_klinicka = tnmValues.get(
                staging.clinical_grade_id
            )?.code
            d.t_klasifikace_patologicka = tnmValues.get(
                staging.pathological_t_id
            )?.code
            d.n_klasifikace_patologicka = tnmValues.get(
                staging.pathological_n_id
            )?.code
            d.m_klasifikace_patologicka = tnmValues.get(
                staging.pathological_m_id
            )?.code
            d.tnm_klasifikace_patologicka = tnmValues.get(
                staging.pathological_grade_id
            )?.code
        }
    }
}
