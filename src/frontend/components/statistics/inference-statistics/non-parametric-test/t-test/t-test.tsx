import React, { useEffect, useState } from 'react'
import { NonParametricTestData } from '../../../../../types/statistics.types'
import {
    InferenceChiSquareCategories,
    NonParametricTestType,
    NonParametricTestValue,
} from '../../../../../enums/statistics.enums'
import CategoriesSelector from '../../chi-square/categories-selector'
import NonParametricTestTailSelector from '../non-parametric-test-tail-selector'
import NonParametricTestValueSelector from '../non-parametric-test-value-selector'
import { Box, Paper, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material'
import NonParametricTestCalculator from '../non-parametric-test-calculator'
import { calculateTTest } from '../../../../../utils/statistics/calculateTTest'
import { TnmEdition } from '../../../../../types'

const TTest: React.FC = () => {
    const [editions, setEditions] = useState<TnmEdition[]>([])
    const [selectedTnmEditionId, setSelectedTnmEditionId] = useState<
        number | null
    >(null)
    const [selectedCategories, setSelectedCategories] = useState<
        Record<number, Record<InferenceChiSquareCategories, string[]>>
    >({})

    const [tTestData, setTTestData] = useState<NonParametricTestData>({
        group1: [],
        group2: [],
    })
    const [selectedTestType, setSelectedTestType] =
        useState<NonParametricTestType>(NonParametricTestType.TWO_TAILED)
    const [selectedValue, setSelectedValue] = useState<NonParametricTestValue>(
        NonParametricTestValue.AGE
    )

    useEffect(() => {
        window.api.getAllTnmEditions().then((eds: TnmEdition[]) => {
            setEditions(eds)
            const active = eds.find((e) => e.is_active)?.id ?? eds[0]?.id ?? null
            setSelectedTnmEditionId(active)
        })
    }, [])

    useEffect(() => {
        const fetchTTestData = async () => {
            const response = await window.api.getTTestData(
                {
                    first: {
                        histologicalTypes:
                            selectedCategories[0]?.histologicalTypes || [],
                        tClassification:
                            selectedCategories[0]?.tClassification || [],
                        nClassification:
                            selectedCategories[0]?.nClassification || [],
                        mClassification:
                            selectedCategories[0]?.mClassification || [],
                        persistence: selectedCategories[0]?.persistence || [],
                        recurrence: selectedCategories[0]?.recurrence || [],
                        state: selectedCategories[0]?.state || [],
                    },
                    second: {
                        histologicalTypes:
                            selectedCategories[1]?.histologicalTypes || [],
                        tClassification:
                            selectedCategories[1]?.tClassification || [],
                        nClassification:
                            selectedCategories[1]?.nClassification || [],
                        mClassification:
                            selectedCategories[1]?.mClassification || [],
                        persistence: selectedCategories[1]?.persistence || [],
                        recurrence: selectedCategories[1]?.recurrence || [],
                        state: selectedCategories[1]?.state || [],
                    },
                },
                selectedTnmEditionId ?? undefined
            )

            if (response) {
                setTTestData(response)
            } else {
                console.error('Failed to fetch T-Test data')
            }
        }

        if (Object.keys(selectedCategories).length === 2) {
            fetchTTestData()
        }
    }, [selectedCategories, selectedTnmEditionId])

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
                T-Test
            </Typography>

            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Verze TNM klasifikace
                </Typography>
                <ToggleButtonGroup
                    value={selectedTnmEditionId}
                    exclusive
                    onChange={(_, val) => {
                        if (val !== null) setSelectedTnmEditionId(val)
                    }}
                >
                    {editions.map((ed) => (
                        <ToggleButton key={ed.id} value={ed.id}>
                            {ed.name}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Paper>

            <CategoriesSelector
                title="Vyberte skupiny pro T-Test"
                numberOfCategories={2}
                setSelectedCategories={setSelectedCategories}
                categoryPrefix="Skupina"
                tnmEditionId={selectedTnmEditionId ?? undefined}
            />

            <NonParametricTestTailSelector
                selectedTestType={selectedTestType}
                setSelectedTestType={setSelectedTestType}
                title="Typ T-Testu"
            />

            <NonParametricTestValueSelector
                selectedValue={selectedValue}
                setSelectedValue={setSelectedValue}
                title="Hodnota pro analýzu"
            />

            <NonParametricTestCalculator
                selectedTestType={selectedTestType}
                selectedValue={selectedValue}
                nonParametricTestData={tTestData}
                title="Výpočet T-Testu"
                calculateFunction={calculateTTest}
                testName="T-Test"
            />
        </Box>
    )
}

export default TTest
