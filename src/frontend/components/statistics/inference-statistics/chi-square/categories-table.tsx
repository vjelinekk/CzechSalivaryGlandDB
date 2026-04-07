import { Checkbox, TableCell, TableRow } from '@mui/material'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { InferenceChiSquareCategories } from '../../../../enums/statistics.enums'

interface CategoriesTableProps {
    categories: string[]
    numberOfCategories: number
    onCheckboxChange: (itemKey: string, categoryIndex: number) => void
    selectedCategories?: Record<
        number,
        Record<InferenceChiSquareCategories, string[]>
    >
    activeTab?: InferenceChiSquareCategories
}

const CategoriesTable: React.FC<CategoriesTableProps> = ({
    categories,
    numberOfCategories,
    onCheckboxChange,
    selectedCategories = {},
    activeTab = InferenceChiSquareCategories.histologicalTypes,
}) => {
    const { t } = useTranslation()

    const getDisplayLabel = (itemKey: string): string => {
        const translated = t(itemKey)
        return translated !== itemKey ? translated : itemKey
    }

    // Funkce pro kontrolu, zda je položka vybrána v dané kategorii
    const isItemSelected = (
        itemKey: string,
        categoryIndex: number
    ): boolean => {
        return (
            selectedCategories[categoryIndex]?.[activeTab]?.includes(itemKey) ||
            false
        )
    }

    return (
        <>
            {categories.map((itemKey, itemIndex) => (
                <TableRow
                    key={`row-${itemIndex}`}
                    sx={{
                        '&:nth-of-type(odd)': {
                            backgroundColor: 'rgba(0, 0, 0, 0.03)',
                        },
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.07)' },
                    }}
                >
                    <TableCell component="th" scope="row" sx={{ py: 1 }}>
                        {getDisplayLabel(itemKey)}
                    </TableCell>
                    {[...Array(numberOfCategories)].map((_, categoryIndex) => (
                        <TableCell
                            key={`cell-${itemIndex}-${categoryIndex}`}
                            align="center"
                            sx={{ py: 1 }}
                        >
                            <Checkbox
                                size="small"
                                checked={isItemSelected(itemKey, categoryIndex)}
                                onChange={() =>
                                    onCheckboxChange(itemKey, categoryIndex)
                                }
                            />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    )
}

export default CategoriesTable
