import React, { useEffect, useState } from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'
import { KaplanMeierType, kmGroupColorMap } from '../constants'
import { KaplanMeierData } from '../types'
import { calculateKaplanMeierCurveData } from '../utils/kaplanMeierCalculations'
import { useTranslation } from 'react-i18next'
import { appTranslationKeys } from '../translations'

interface KaplanMeierChartProps {
    kaplanMeierData: KaplanMeierData
    selectedCurveType: KaplanMeierType
}

const KaplanMeierChart: React.FC<KaplanMeierChartProps> = ({
    kaplanMeierData,
    selectedCurveType,
}) => {
    const { t } = useTranslation()
    const [curveData, setCurveData] = useState(
        calculateKaplanMeierCurveData(kaplanMeierData)
    )

    useEffect(() => {
        setCurveData(calculateKaplanMeierCurveData(kaplanMeierData))
    }, [kaplanMeierData])

    return (
        <ResponsiveContainer width="100%" height="90%">
            <LineChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                <Legend verticalAlign="top" />
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="time"
                    type="number"
                    allowDuplicatedCategory={false}
                    label={{
                        value: t(appTranslationKeys.chartTime),
                        position: 'insideCenter',
                        dy: 20,
                    }}
                />
                <YAxis
                    label={{
                        value:
                            selectedCurveType === KaplanMeierType.survival
                                ? t(appTranslationKeys.chartSurvivalProbability)
                                : t(
                                      appTranslationKeys.chartRecurrenceProbability
                                  ),
                        angle: -90,
                        dx: -25,
                        position: 'insideCenter',
                    }}
                />
                <Tooltip />
                {Object.keys(curveData).map((group) => (
                    <Line
                        key={group}
                        type="stepAfter"
                        data={curveData[group]}
                        dataKey="probability"
                        name={t(group)}
                        stroke={kmGroupColorMap[group]}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    )
}

export default KaplanMeierChart
