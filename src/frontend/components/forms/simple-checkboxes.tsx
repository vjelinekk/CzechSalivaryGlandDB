import React, { useEffect } from 'react'
import SimpleCheckboxItem from './simple-checkbox-item'
import { useSingleSelection } from '../../hooks/use-single-selection'
import { PatientType } from '../../types'
import getDataFromPatientInterface from '../../utils/getDataFromPatientInterface'
import { CommonFormComponentProps } from '../../props'
import { useTranslation } from 'react-i18next'

interface SimpleCheckboxesProps extends CommonFormComponentProps {
    title?: string
    data: PatientType | null
    enableSingleSelect: boolean
    options: string[]
    translate?: boolean
}

const SimpleCheckboxes: React.FC<SimpleCheckboxesProps> = ({
    title,
    dbLabel,
    data,
    setFormData,
    enableSingleSelect,
    options,
    disabled,
    translate = false,
}) => {
    const { t } = useTranslation()

    const { selectedOptions, setSelectedOptions, handleCheckboxChange } =
        useSingleSelection({
            enableSingleSelect,
            defaultSelected: getDataFromPatientInterface(data, dbLabel)
                ? (getDataFromPatientInterface(data, dbLabel) as string)
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                : [''],
            dbLabel,
            setFormData,
        })

    useEffect(() => {
        const storedData = getDataFromPatientInterface(data, dbLabel)

        if (enableSingleSelect) {
            if (storedData) {
                setSelectedOptions([storedData as string])
            } else {
                setSelectedOptions([])
            }
        } else {
            if (storedData) {
                setSelectedOptions(
                    (storedData as string)
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                )
            } else {
                setSelectedOptions([])
            }
        }
    }, [data])

    const getOptionLabel = (option: string) => {
        if (translate) {
            return t(option)
        }

        return option
    }

    return (
        <>
            {title && <h3>{title}</h3>}
            <div data-testid="simple-checkboxes" className="checkboxDiv">
                {options.map((option) => (
                    <SimpleCheckboxItem
                        key={option}
                        label={getOptionLabel(option)}
                        dbLabel={dbLabel}
                        selected={selectedOptions.includes(option)}
                        onSelect={() => handleCheckboxChange(option)}
                        disabled={disabled}
                    />
                ))}
            </div>
        </>
    )
}

export default SimpleCheckboxes
