import {
    Paper,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    CircularProgress,
} from '@mui/material'
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import {
    InferenceChiSquareCategories,
    InferenceChiSquareHistologicalTypes,
    InferenceChiSquarePersistence,
    InferenceChiSquareRecurrence,
    InferenceChiSquareState,
} from '../../../../enums/statistics.enums'
import useTnmData from '../../../../hooks/use-tnm-data'
import {
    CATEGORY_TITLES,
    TAB_TITLES,
} from '../../../../constants/statistics.constants'
import CategoriesTable from './categories-table'

interface CategoriesSelectorProps {
    title: string
    numberOfCategories: number
    setSelectedCategories: Dispatch<
        SetStateAction<
            Record<number, Record<InferenceChiSquareCategories, string[]>>
        >
    >
    categoryPrefix?: string
    tnmEditionId?: number
}

const CategoriesSelector: React.FC<CategoriesSelectorProps> = ({
    title,
    numberOfCategories,
    setSelectedCategories,
    categoryPrefix = 'Kategorie',
    tnmEditionId,
}) => {
    const { tOptions, nOptions, mOptions, isLoading: tnmLoading } = useTnmData(tnmEditionId)

    // State for the active category tab
    const [activeTab, setActiveTab] = useState<InferenceChiSquareCategories>(
        InferenceChiSquareCategories.histologicalTypes
    )

    // State for internal selected categories
    const [internalSelectedCategories, setInternalSelectedCategories] =
        useState<
            Record<number, Record<InferenceChiSquareCategories, string[]>>
        >({})

    // Reset all selections when edition changes
    useEffect(() => {
        setInternalSelectedCategories({})
        setSelectedCategories({})
    }, [tnmEditionId])

    // Create array of category keys for tabs
    const categoryKeys = Object.values(InferenceChiSquareCategories)

    // Handle tab change
    const handleTabChange = (
        _event: React.SyntheticEvent,
        newValue: InferenceChiSquareCategories
    ) => {
        setActiveTab(newValue)
    }

    const handleCheckboxChange = (
        categoryName: string,
        categoryIndex: number
    ) => {
        setInternalSelectedCategories((prevSelectedCategories) => {
            const updatedCategories = { ...prevSelectedCategories }

            // Ensure the category index exists
            if (!updatedCategories[categoryIndex]) {
                updatedCategories[categoryIndex] = Object.fromEntries(
                    Object.values(InferenceChiSquareCategories).map((key) => [
                        key,
                        [],
                    ])
                ) as Record<InferenceChiSquareCategories, string[]>
            }

            // Ensure the active tab category exists
            if (!updatedCategories[categoryIndex][activeTab]) {
                updatedCategories[categoryIndex][activeTab] = []
            }

            // Check if the category is already selected
            const isSelected =
                updatedCategories[categoryIndex][activeTab].includes(
                    categoryName
                )

            if (isSelected) {
                // If selected, remove it
                updatedCategories[categoryIndex][activeTab] = updatedCategories[
                    categoryIndex
                ][activeTab].filter((item) => item !== categoryName)
                // If all categories in updatedCategories[categoryIndex] are empty, remove the categoryIndex
                if (
                    Object.values(updatedCategories[categoryIndex]).every(
                        (categories) => categories.length === 0
                    )
                ) {
                    delete updatedCategories[categoryIndex]
                }
            } else {
                // If not selected, add it
                updatedCategories[categoryIndex][activeTab].push(categoryName)
            }

            setSelectedCategories(updatedCategories)

            return updatedCategories
        })
    }

    const getSelectedCategoriesForCurrentTab = () => {
        return internalSelectedCategories
    }

    const isTnmTab =
        activeTab === InferenceChiSquareCategories.tClassification ||
        activeTab === InferenceChiSquareCategories.nClassification ||
        activeTab === InferenceChiSquareCategories.mClassification

    const renderCategoriesTable = (activeTab: InferenceChiSquareCategories) => {
        if (isTnmTab && tnmLoading) {
            return (
                <TableRow>
                    <TableCell colSpan={numberOfCategories + 1} align="center">
                        <CircularProgress size={24} />
                    </TableCell>
                </TableRow>
            )
        }

        switch (activeTab) {
            case InferenceChiSquareCategories.histologicalTypes:
                return (
                    <CategoriesTable
                        categories={Object.values(
                            InferenceChiSquareHistologicalTypes
                        )}
                        numberOfCategories={numberOfCategories}
                        selectedCategories={getSelectedCategoriesForCurrentTab()}
                        activeTab={activeTab}
                        onCheckboxChange={handleCheckboxChange}
                    />
                )
            case InferenceChiSquareCategories.tClassification:
                return (
                    <CategoriesTable
                        categories={tOptions.map((v) => v.code)}
                        numberOfCategories={numberOfCategories}
                        selectedCategories={getSelectedCategoriesForCurrentTab()}
                        activeTab={activeTab}
                        onCheckboxChange={handleCheckboxChange}
                    />
                )
            case InferenceChiSquareCategories.nClassification:
                return (
                    <CategoriesTable
                        categories={nOptions.map((v) => v.code)}
                        numberOfCategories={numberOfCategories}
                        selectedCategories={getSelectedCategoriesForCurrentTab()}
                        activeTab={activeTab}
                        onCheckboxChange={handleCheckboxChange}
                    />
                )
            case InferenceChiSquareCategories.mClassification:
                return (
                    <CategoriesTable
                        categories={mOptions.map((v) => v.code)}
                        numberOfCategories={numberOfCategories}
                        selectedCategories={getSelectedCategoriesForCurrentTab()}
                        activeTab={activeTab}
                        onCheckboxChange={handleCheckboxChange}
                    />
                )
            case InferenceChiSquareCategories.persistence:
                return (
                    <CategoriesTable
                        categories={Object.values(
                            InferenceChiSquarePersistence
                        )}
                        numberOfCategories={numberOfCategories}
                        selectedCategories={getSelectedCategoriesForCurrentTab()}
                        activeTab={activeTab}
                        onCheckboxChange={handleCheckboxChange}
                    />
                )
            case InferenceChiSquareCategories.recurrence:
                return (
                    <CategoriesTable
                        categories={Object.values(InferenceChiSquareRecurrence)}
                        numberOfCategories={numberOfCategories}
                        selectedCategories={getSelectedCategoriesForCurrentTab()}
                        activeTab={activeTab}
                        onCheckboxChange={handleCheckboxChange}
                    />
                )
            case InferenceChiSquareCategories.state:
                return (
                    <CategoriesTable
                        categories={Object.values(InferenceChiSquareState)}
                        numberOfCategories={numberOfCategories}
                        selectedCategories={getSelectedCategoriesForCurrentTab()}
                        activeTab={activeTab}
                        onCheckboxChange={handleCheckboxChange}
                    />
                )
            default:
                return null
        }
    }

    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                {title}
            </Typography>

            <Box sx={{ mt: 2 }}>
                {/* Tabs for different categories */}
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ mb: 2 }}
                >
                    {categoryKeys.map((key) => (
                        <Tab label={TAB_TITLES[key]} value={key} key={key} />
                    ))}
                </Tabs>

                <Typography variant="h6" gutterBottom>
                    {CATEGORY_TITLES[activeTab]}
                </Typography>

                <TableContainer sx={{ maxHeight: '600px' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    sx={{ width: '50%', fontWeight: 'bold' }}
                                >
                                    {/* Table header based on active tab */}
                                    {activeTab ===
                                    InferenceChiSquareCategories.histologicalTypes
                                        ? 'Histologický typ'
                                        : activeTab ===
                                            InferenceChiSquareCategories.tClassification
                                          ? 'T klasifikace'
                                          : activeTab ===
                                              InferenceChiSquareCategories.nClassification
                                            ? 'N klasifikace'
                                            : activeTab ===
                                                InferenceChiSquareCategories.mClassification
                                              ? 'M klasifikace'
                                              : activeTab ===
                                                  InferenceChiSquareCategories.persistence
                                                ? 'Perzistence'
                                                : activeTab ===
                                                    InferenceChiSquareCategories.recurrence
                                                  ? 'Recidiva'
                                                  : 'Stav'}
                                </TableCell>
                                {[...Array(numberOfCategories)].map(
                                    (_, index) => (
                                        <TableCell
                                            key={`header-${index}`}
                                            align="center"
                                            sx={{
                                                width: `${50 / numberOfCategories}%`,
                                            }}
                                        >
                                            {categoryPrefix + ' ' + (index + 1)}
                                        </TableCell>
                                    )
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {/* Map through the items of the active category */}
                            {renderCategoriesTable(activeTab)}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Paper>
    )
}

export default CategoriesSelector
