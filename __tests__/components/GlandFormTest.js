import React from 'react'
import { render, screen } from '@testing-library/react'
import ParotidMalignantGlandForm from '../../src/frontend/components/forms/parotid/malignant/parotid-malignant-gland-form.tsx'
import SublingualMalignantGlandForm from '../../src/frontend/components/forms/sublingual/malignant/sublingual-malignant-gland-form.tsx'
import SubmandibularMalignantGlandForm from '../../src/frontend/components/forms/submandibular/malignant/submandibular-malignant-gland-form.tsx'
import { MLOperationProvider } from '../../src/frontend/components/ml-operation-context.tsx'
import { expect } from '@jest/globals'

// Mock useTnmData to avoid window.api calls
jest.mock('../../src/frontend/hooks/use-tnm-data', () => ({
    __esModule: true,
    default: () => ({
        tOptions: [],
        nOptions: [],
        mOptions: [],
        gOptions: [],
        isLoading: false,
        calculateStage: jest.fn(),
    }),
}))

// Mock TNMClassification to isolate it from the form test
jest.mock('../../src/frontend/components/forms/tnm-classification', () => {
    return function DummyTNMClassification() {
        return (
            <div>
                <h1>TNM Classification</h1>
                <div data-testid="tnm-classification-mock">
                    TNM Classification
                </div>
            </div>
        )
    }
})

describe('ParotidGlandForm', () => {
    const data = {} // Mocked data
    const defaultFormState = '' // Mocked defaultFormState
    const editSaved = false // Mocked editSaved
    const setEditSaved = jest.fn() // Mocked setEditSaved function
    const setActiveComponent = jest.fn() // Mocked setActiveComponent function
    const setActivePatient = jest.fn() // Mocked setActivePatient function
    const idStudie = '' // Mocked idStudie
    const defaultSelectedStudies = [] // Mocked defaultSelectedStudies

    test('renders parotid form', () => {
        window.api = {
            getStudiesByFormType: jest.fn().mockResolvedValue([]),
        }

        render(
            <MLOperationProvider>
                <ParotidMalignantGlandForm
                    data={data}
                    defaultFormState={defaultFormState}
                    editSaved={editSaved}
                    setEditSaved={setEditSaved}
                    setActiveComponent={setActiveComponent}
                    setActivePatient={setActivePatient}
                    idStudie={idStudie}
                    defaultSelectedStudies={defaultSelectedStudies}
                />
            </MLOperationProvider>
        )

        const headings = screen.getAllByRole('heading', { level: 1 })
        expect(headings).toHaveLength(9) // Only one level 1 heading expected
    })

    test('renders sublingual form', () => {
        window.api = {
            getStudiesByFormType: jest.fn().mockResolvedValue([]),
        }

        render(
            <MLOperationProvider>
                <SublingualMalignantGlandForm
                    data={data}
                    defaultFormState={defaultFormState}
                    editSaved={editSaved}
                    setEditSaved={setEditSaved}
                    setActiveComponent={setActiveComponent}
                    setActivePatient={setActivePatient}
                    idStudie={idStudie}
                    defaultSelectedStudies={defaultSelectedStudies}
                />
            </MLOperationProvider>
        )

        const headings = screen.getAllByRole('heading', { level: 1 })
        expect(headings).toHaveLength(9) // Only one level 1 heading expected
    })

    test('renders submandibular form', () => {
        window.api = {
            getStudiesByFormType: jest.fn().mockResolvedValue([]),
        }

        render(
            <MLOperationProvider>
                <SubmandibularMalignantGlandForm
                    data={data}
                    defaultFormState={defaultFormState}
                    editSaved={editSaved}
                    setEditSaved={setEditSaved}
                    setActiveComponent={setActiveComponent}
                    setActivePatient={setActivePatient}
                    idStudie={idStudie}
                    defaultSelectedStudies={defaultSelectedStudies}
                />
            </MLOperationProvider>
        )

        const headings = screen.getAllByRole('heading', { level: 1 })
        expect(headings).toHaveLength(9) // Only one level 1 heading expected
    })
})
