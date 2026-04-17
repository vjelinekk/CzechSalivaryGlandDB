import React, { useState, useEffect } from 'react'
import Menu from './menu'
import PatientsList from './patients-list'
import AddPatient from './add-patient'
import AddPatientBenign from './add-patient-benign'
import AddPatientMalignant from './add-patient-malignant'
import StudiesList from './studies-list'
import AddStudy from './add-study'
import ParotidMalignantGlandForm from './forms/parotid/malignant/parotid-malignant-gland-form'
import SublingualMalignantGlandForm from './forms/sublingual/malignant/sublingual-malignant-gland-form'
import SubmandibularMalignantGlandForm from './forms/submandibular/malignant/submandibular-malignant-gland-form'
import ParotidBenignGlandForm from './forms/parotid/benign/parotid-benign-gland-form'
import SubmandibularBenignGlandForm from './forms/submandibular/benign/submandibular-benign-gland-form'
import StudyCreation from './study-creation'
import { Components, FormStates } from '../constants'
import { useActiveComponent } from '../hooks/use-active-component'
import KaplanMeier from './kaplan-meier'
import ImportProvider from './import-context'
import LoginForm from './login-form'
import SetLanguage from './set-language'
import { initI18n } from '../i18n'

// CSS imports
import '../css/form_style.css'
import '../css/main.css'
import '../css/sidebar.css'
import '../css/pop_up.css'
import '../css/switch.css'
import '../css/table.css'
import PlannedChecks from './planned-checks'
import DescriptiveStatistics from './statistics/descriptive-statistics/descriptive-statistics'
import InferenceStatistics from './statistics/inference-statistics/inference-statistics'
import MlRiskScoring from './statistics/ml-risk-scoring/ml-risk-scoring'
import { MLOperationProvider } from './ml-operation-context'
import MLProgressWidget from './ml-progress-widget'

const app = () => {
    const { activeComponent, setActiveComponent } = useActiveComponent(
        Components.patientsList
    )

    const [activeMenuButton, setActiveMenuButton] = useState<Components>(
        Components.patientsList
    )

    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const init = async () => {
            await initI18n()
            setReady(true)
        }
        init()
    }, [])

    if (!ready) {
        return null
    }

    return isLoggedIn ? (
        <ImportProvider>
            <MLOperationProvider>
                <Menu
                    setActiveComponent={setActiveComponent}
                    activeMenuButton={activeMenuButton}
                    setActiveMenuButton={setActiveMenuButton}
                />
                {activeComponent.component === Components.patientsList && (
                    <PatientsList
                        defaultActivePatient={activeComponent.activePatient}
                    />
                )}
                {activeComponent.component === Components.plannedChecks && (
                    <PlannedChecks
                        setActiveComponent={setActiveComponent}
                        setActiveMenuButton={setActiveMenuButton}
                    />
                )}
                {activeComponent.component === Components.addPatient && (
                    <AddPatient setActiveComponent={setActiveComponent} />
                )}
                {activeComponent.component ===
                    Components.addPatientMalignant && (
                    <AddPatientMalignant
                        setActiveComponent={setActiveComponent}
                    />
                )}
                {activeComponent.component === Components.AddPatientBenign && (
                    <AddPatientBenign setActiveComponent={setActiveComponent} />
                )}
                {activeComponent.component === Components.studiesList && (
                    <StudiesList
                        defaultActiveStudy={activeComponent.activeStudy}
                    />
                )}
                {activeComponent.component === Components.addStudy && (
                    <AddStudy setActiveComponent={setActiveComponent} />
                )}
                {activeComponent.component ===
                    Components.parotidMalignantGlandForm && (
                    <ParotidMalignantGlandForm
                        setActiveComponent={setActiveComponent}
                        defaultFormState={FormStates.add}
                        setActiveMenuButton={setActiveMenuButton}
                    />
                )}
                {activeComponent.component ===
                    Components.sublingualMalignantGlandForm && (
                    <SublingualMalignantGlandForm
                        setActiveComponent={setActiveComponent}
                        defaultFormState={FormStates.add}
                        setActiveMenuButton={setActiveMenuButton}
                    />
                )}
                {activeComponent.component ===
                    Components.submandibularMalignantGlandForm && (
                    <SubmandibularMalignantGlandForm
                        setActiveComponent={setActiveComponent}
                        defaultFormState={FormStates.add}
                        setActiveMenuButton={setActiveMenuButton}
                    />
                )}
                {activeComponent.component ===
                    Components.parotidBenignGlandForm && (
                    <ParotidBenignGlandForm
                        setActiveComponent={setActiveComponent}
                        defaultFormState={FormStates.add}
                        setActiveMenuButton={setActiveMenuButton}
                    />
                )}
                {activeComponent.component ===
                    Components.submandibularBenignGlandForm && (
                    <SubmandibularBenignGlandForm
                        setActiveComponent={setActiveComponent}
                        defaultFormState={FormStates.add}
                        setActiveMenuButton={setActiveMenuButton}
                    />
                )}
                {activeComponent.component === Components.study && (
                    <StudyCreation
                        setActiveComponent={setActiveComponent}
                        studyType={activeComponent?.studyType}
                        setActiveMenuButton={setActiveMenuButton}
                    />
                )}
                {activeComponent.component === Components.kaplanMeier && (
                    <KaplanMeier />
                )}
                {activeComponent.component ===
                    Components.descriptiveStatistics && (
                    <DescriptiveStatistics />
                )}
                {activeComponent.component ===
                    Components.inferenceStatistics && <InferenceStatistics />}
                {activeComponent.component === Components.mlRiskScoring && (
                    <MlRiskScoring />
                )}
                {activeComponent.component === Components.setLanguage && (
                    <SetLanguage />
                )}
                <MLProgressWidget
                    onNavigateToTrainingResults={() => {
                        setActiveComponent({
                            component: Components.mlRiskScoring,
                        })
                        setActiveMenuButton(Components.mlRiskScoring)
                    }}
                    onNavigateToPatient={(patient) => {
                        setActiveComponent({
                            component: Components.patientsList,
                            activePatient: patient,
                        })
                        setActiveMenuButton(Components.patientsList)
                    }}
                />
            </MLOperationProvider>
        </ImportProvider>
    ) : (
        <LoginForm setIsLoggedIn={setIsLoggedIn} />
    )
}

export default app
