import {
    Box,
    Divider,
    Grid,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material'
import React, { useEffect, useState } from 'react'
import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts'
import { TnmEdition } from '../../../types'
import { CountPercentage } from '../../../types/statistics.types'
import { COLORS } from '../../../constants/statistics.constants'
import DescriptiveStatisticsDataTable from './descriptive-statistics-data-table'

interface TnmStatisticsProps {
    patientIds: number[]
}

type TnmSection = {
    t: Record<string, CountPercentage>
    n: Record<string, CountPercentage>
    m: Record<string, CountPercentage>
    stage: Record<string, CountPercentage>
}

const toCountPercentage = (
    counts: Record<string, number>,
    total: number
): Record<string, CountPercentage> => {
    const result: Record<string, CountPercentage> = {}
    for (const [key, count] of Object.entries(counts)) {
        result[key] = {
            count,
            percentage: `${((count / total) * 100).toFixed(1)}%`,
        }
    }
    return result
}

const TnmStatistics: React.FC<TnmStatisticsProps> = ({ patientIds }) => {
    const [editions, setEditions] = useState<TnmEdition[]>([])
    const [selectedEditionId, setSelectedEditionId] = useState<number | null>(
        null
    )
    const [clinical, setClinical] = useState<TnmSection | null>(null)
    const [pathological, setPathological] = useState<TnmSection | null>(null)

    useEffect(() => {
        window.api.getAllTnmEditions().then((eds: TnmEdition[]) => {
            setEditions(eds)
            const active =
                eds.find((e) => e.is_active)?.id ?? eds[0]?.id ?? null
            setSelectedEditionId(active)
        })
    }, [])

    useEffect(() => {
        if (selectedEditionId === null || patientIds.length === 0) {
            setClinical(null)
            setPathological(null)
            return
        }

        window.api
            .getTnmDistribution(patientIds, selectedEditionId)
            .then((dist) => {
                const total = patientIds.length
                setClinical({
                    t: toCountPercentage(dist.clinical.t, total),
                    n: toCountPercentage(dist.clinical.n, total),
                    m: toCountPercentage(dist.clinical.m, total),
                    stage: toCountPercentage(dist.clinical.stage, total),
                })
                setPathological({
                    t: toCountPercentage(dist.pathological.t, total),
                    n: toCountPercentage(dist.pathological.n, total),
                    m: toCountPercentage(dist.pathological.m, total),
                    stage: toCountPercentage(dist.pathological.stage, total),
                })
            })
    }, [patientIds, selectedEditionId])

    return (
        <>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Verze TNM klasifikace
                </Typography>
                <ToggleButtonGroup
                    value={selectedEditionId}
                    exclusive
                    onChange={(_, val) => {
                        if (val !== null) setSelectedEditionId(val)
                    }}
                    size="small"
                >
                    {editions.map((ed) => (
                        <ToggleButton key={ed.id} value={ed.id}>
                            {ed.name}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                    TNM Klasifikace Klinická
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6} lg={3}>
                        <DescriptiveStatisticsDataTable
                            data={clinical?.t}
                            title="T Klasifikace"
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                        <DescriptiveStatisticsDataTable
                            data={clinical?.n}
                            title="N Klasifikace"
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                        <DescriptiveStatisticsDataTable
                            data={clinical?.m}
                            title="M Klasifikace"
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                        <DescriptiveStatisticsDataTable
                            data={clinical?.stage}
                            title="Stadium"
                        />
                    </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Distribuce stadií
                    </Typography>
                    <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={Object.entries(
                                        clinical?.stage || {}
                                    ).map(([name, data]) => ({
                                        name: `Stadium ${name}`,
                                        value: data.count,
                                    }))}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, percent }) =>
                                        `${name}: ${(percent * 100).toFixed(0)}%`
                                    }
                                >
                                    {Object.entries(clinical?.stage || {}).map(
                                        (_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    COLORS[
                                                        index % COLORS.length
                                                    ]
                                                }
                                            />
                                        )
                                    )}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => [
                                        `${value} pacientů`,
                                        'Počet',
                                    ]}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                    TNM Klasifikace Patologická
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6} lg={3}>
                        <DescriptiveStatisticsDataTable
                            data={pathological?.t}
                            title="T Klasifikace"
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                        <DescriptiveStatisticsDataTable
                            data={pathological?.n}
                            title="N Klasifikace"
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                        <DescriptiveStatisticsDataTable
                            data={pathological?.m}
                            title="M Klasifikace"
                        />
                    </Grid>
                    <Grid item xs={12} md={6} lg={3}>
                        <DescriptiveStatisticsDataTable
                            data={pathological?.stage}
                            title="Stadium"
                        />
                    </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Distribuce stadií
                    </Typography>
                    <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={Object.entries(
                                        pathological?.stage || {}
                                    ).map(([name, data]) => ({
                                        name: `Stadium ${name}`,
                                        value: data.count,
                                    }))}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, percent }) =>
                                        `${name}: ${(percent * 100).toFixed(0)}%`
                                    }
                                >
                                    {Object.entries(
                                        pathological?.stage || {}
                                    ).map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => [
                                        `${value} pacientů`,
                                        'Počet',
                                    ]}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                </Box>
            </Box>

            <Divider sx={{ my: 4 }} />
        </>
    )
}

export default TnmStatistics
