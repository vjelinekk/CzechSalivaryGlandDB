import React, { useEffect, useState } from 'react'
import {
    Box,
    Container,
    Typography,
    Paper,
    Grid,
    Divider,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButtonGroup,
    ToggleButton,
} from '@mui/material'
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'
import { FilteredColumns, TumorType } from '../../../types'
import { FormType } from '../../../constants'
import { StatisticsData } from '../../../types/statistics.types'
import { DescriptiveStatisticsType } from '../../../enums/statistics.enums'
import { COLORS } from '../../../constants/statistics.constants'
import { calculateStatistics } from '../../../utils/statistics/descriptiveStatisticsCalculations'
import { filteredColumnsToDto } from '../../../mappers/enumMappers'
import { useTranslation } from 'react-i18next'
import TnmStatistics from './tnm-statistics'
import DescriptiveStatisticsDataTable from './descriptive-statistics-data-table'

const DescriptiveStatistics: React.FC = () => {
    const { t } = useTranslation()
    const [loading, setLoading] = useState<boolean>(true)
    const [statistics, setStatistics] = useState<StatisticsData | null>(null)
    const [patientIds, setPatientIds] = useState<number[]>([])
    const [error, setError] = useState<string | null>(null)
    const [selectedType, setSelectedType] = useState<DescriptiveStatisticsType>(
        DescriptiveStatisticsType.ALL
    )

    const getFilteredColumns = (
        type: DescriptiveStatisticsType
    ): FilteredColumns => {
        let formType: FormType[] = []
        let tumorType: TumorType = null

        if (type === DescriptiveStatisticsType.ALL) {
            formType = [
                FormType.parotidBenign,
                FormType.parotidMalignant,
                FormType.submandibularBenign,
                FormType.submandibularMalignant,
                FormType.sublingualMalignant,
            ]
        } else if (type === DescriptiveStatisticsType.MALIGNANT) {
            tumorType = TumorType.MALIGNANT
        } else {
            tumorType = TumorType.BENIGN
        }

        return {
            form_type: formType,
            typ_nadoru: tumorType,
            typ_terapie: [],
            histopatologie_vysledek: [],
            perzistence: null,
            recidiva: null,
            stav: null,
            pohlavi: null,
        }
    }

    // Fetch data and calculate statistics
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                // Get all patients from based on selected type
                const filteredColumns = getFilteredColumns(selectedType)
                const patients = await window.api.getFilteredPatients(
                    filteredColumnsToDto(filteredColumns)
                )

                if (!patients || patients.length === 0) {
                    setError('Nejsou k dispozici žádní pacienti pro tento typ.')
                    return
                }

                setPatientIds(patients.map((p) => p.id as number))
                const stats = calculateStatistics(patients)
                setStatistics(stats)
                setError(null)
            } catch (err) {
                console.error('Error calculating statistics:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [selectedType])

    // Convert data for charts
    const getGenderChartData = () => [
        { name: 'Muži', value: statistics?.gender.male.count || 0 },
        { name: 'Ženy', value: statistics?.gender.female.count || 0 },
    ]

    const getProcedureChartData = () => {
        if (!statistics) return []
        return Object.entries(statistics.surgicalProcedures)
            .map(([name, data]) => ({ name, value: data.count }))
            .sort((a, b) => b.value - a.value)
    }

    const getTumorTypeChartData = () => {
        if (!statistics) return []
        return Object.entries(statistics.tumorTypes)
            .map(([name, data]) => ({
                name: t(name, { defaultValue: name }),
                value: data.count,
            }))
            .sort((a, b) => b.value - a.value)
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Container maxWidth={false} sx={{ mt: 2, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom align="center">
                    Deskriptivní statistika pacientů
                </Typography>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="h5" gutterBottom>
                        Typ nádoru
                    </Typography>

                    <ToggleButtonGroup
                        value={selectedType}
                        exclusive
                        onChange={(e) =>
                            setSelectedType(
                                (e.target as HTMLButtonElement)
                                    .value as DescriptiveStatisticsType
                            )
                        }
                        aria-label="Typ nádoru"
                        size="small"
                        color="primary"
                    >
                        <ToggleButton
                            value={DescriptiveStatisticsType.ALL}
                            aria-label="Všechny nádory"
                        >
                            Vše
                        </ToggleButton>
                        <ToggleButton
                            value={DescriptiveStatisticsType.MALIGNANT}
                            aria-label="Zhoubné nádory"
                        >
                            Zhoubný
                        </ToggleButton>
                        <ToggleButton
                            value={DescriptiveStatisticsType.BENIGN}
                            aria-label="Nezhoubné nádory"
                        >
                            Nezhoubný
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {error ? (
                    <Box sx={{ p: 3 }}>
                        <Typography color="error" variant="h6">
                            {error}
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {/* Basic Statistics */}
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" gutterBottom>
                                Základní charakteristiky
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Paper
                                        elevation={1}
                                        sx={{ p: 2, bgcolor: '#f5f5f5' }}
                                    >
                                        <Typography variant="subtitle1">
                                            Celkový počet pacientů
                                        </Typography>
                                        <Typography variant="h4">
                                            {statistics?.totalPatients}
                                        </Typography>
                                    </Paper>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Paper
                                        elevation={1}
                                        sx={{ p: 2, bgcolor: '#f5f5f5' }}
                                    >
                                        <Typography variant="subtitle1">
                                            Distribuce pohlaví
                                        </Typography>
                                        <Grid container>
                                            <Grid item xs={6}>
                                                <Typography>
                                                    Muži:{' '}
                                                    {
                                                        statistics?.gender.male
                                                            .count
                                                    }{' '}
                                                    (
                                                    {
                                                        statistics?.gender.male
                                                            .percentage
                                                    }
                                                    )
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography>
                                                    Ženy:{' '}
                                                    {
                                                        statistics?.gender
                                                            .female.count
                                                    }{' '}
                                                    (
                                                    {
                                                        statistics?.gender
                                                            .female.percentage
                                                    }
                                                    )
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Box>

                        {/* Gender Distribution Chart */}
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" gutterBottom>
                                Distribuce pohlaví
                            </Typography>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    height: 300,
                                }}
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={getGenderChartData()}
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
                                            {getGenderChartData().map(
                                                (entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={
                                                            COLORS[
                                                                index %
                                                                    COLORS.length
                                                            ]
                                                        }
                                                    />
                                                )
                                            )}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        </Box>

                        {/* Age Statistics */}
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" gutterBottom>
                                Věkové rozložení
                            </Typography>
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Minimum</TableCell>
                                            <TableCell>Maximum</TableCell>
                                            <TableCell>Průměr</TableCell>
                                            <TableCell>Medián</TableCell>
                                            <TableCell>
                                                Směrodatná odchylka
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>
                                                {statistics?.age.min}
                                            </TableCell>
                                            <TableCell>
                                                {statistics?.age.max}
                                            </TableCell>
                                            <TableCell>
                                                {statistics?.age.mean}
                                            </TableCell>
                                            <TableCell>
                                                {statistics?.age.median}
                                            </TableCell>
                                            <TableCell>
                                                {
                                                    statistics?.age
                                                        .standardDeviation
                                                }
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>

                        <Divider sx={{ my: 4 }} />

                        {/* Surgical Procedures */}
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" gutterBottom>
                                Chirurgické zákroky
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <DescriptiveStatisticsDataTable
                                        data={statistics?.surgicalProcedures}
                                        title="Typy zákroků"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ height: 400 }}>
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <BarChart
                                                data={getProcedureChartData()}
                                                layout="vertical"
                                                margin={{
                                                    top: 5,
                                                    right: 30,
                                                    left: 20,
                                                    bottom: 5,
                                                }}
                                            >
                                                <XAxis type="number" />
                                                <YAxis
                                                    dataKey="name"
                                                    type="category"
                                                    width={150}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <Tooltip />
                                                <Legend />
                                                <Bar
                                                    dataKey="value"
                                                    name="Počet pacientů"
                                                    fill="#8884d8"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>

                        <Divider sx={{ my: 4 }} />

                        {/* Tumor Types */}
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" gutterBottom>
                                Histopatologické typy nádorů
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <DescriptiveStatisticsDataTable
                                        data={statistics?.tumorTypes}
                                        title="Typy nádorů"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ height: 400 }}>
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <BarChart
                                                data={getTumorTypeChartData()}
                                                layout="vertical"
                                                margin={{
                                                    top: 5,
                                                    right: 30,
                                                    left: 20,
                                                    bottom: 5,
                                                }}
                                            >
                                                <XAxis type="number" />
                                                <YAxis
                                                    dataKey="name"
                                                    type="category"
                                                    width={150}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <Tooltip />
                                                <Legend />
                                                <Bar
                                                    dataKey="value"
                                                    name="Počet pacientů"
                                                    fill="#82ca9d"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>

                        <Divider sx={{ my: 4 }} />

                        {/* TNM Classification Clinical */}
                        {(selectedType ===
                            DescriptiveStatisticsType.MALIGNANT ||
                            selectedType === DescriptiveStatisticsType.ALL) && (
                            <TnmStatistics patientIds={patientIds} />
                        )}

                        {/* Recurrence */}
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" gutterBottom>
                                Recidiva
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Paper
                                        elevation={1}
                                        sx={{ p: 2, bgcolor: '#f5f5f5' }}
                                    >
                                        <Typography>
                                            S recidivou:{' '}
                                            {statistics?.recurrence.yes.count} (
                                            {
                                                statistics?.recurrence.yes
                                                    .percentage
                                            }
                                            )
                                        </Typography>
                                        <Typography>
                                            Bez recidivy:{' '}
                                            {statistics?.recurrence.no.count} (
                                            {
                                                statistics?.recurrence.no
                                                    .percentage
                                            }
                                            )
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ height: 300 }}>
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        {
                                                            name: 'S recidivou',
                                                            value:
                                                                statistics
                                                                    ?.recurrence
                                                                    .yes
                                                                    .count || 0,
                                                        },
                                                        {
                                                            name: 'Bez recidivy',
                                                            value:
                                                                statistics
                                                                    ?.recurrence
                                                                    .no.count ||
                                                                0,
                                                        },
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    nameKey="name"
                                                    label={({
                                                        name,
                                                        percent,
                                                    }) =>
                                                        `${name}: ${(percent * 100).toFixed(0)}%`
                                                    }
                                                >
                                                    <Cell fill="#ff7043" />
                                                    <Cell fill="#66bb6a" />
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>

                        <Divider sx={{ my: 4 }} />

                        {/* Complications */}
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" gutterBottom>
                                Pooperační komplikace
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Paper
                                        elevation={1}
                                        sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}
                                    >
                                        <Typography>
                                            S komplikacemi:{' '}
                                            {
                                                statistics?.complications.yes
                                                    .count
                                            }{' '}
                                            (
                                            {
                                                statistics?.complications.yes
                                                    .percentage
                                            }
                                            )
                                        </Typography>
                                        <Typography>
                                            Bez komplikací:{' '}
                                            {statistics?.complications.no.count}{' '}
                                            (
                                            {
                                                statistics?.complications.no
                                                    .percentage
                                            }
                                            )
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ height: 300 }}>
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        {
                                                            name: 'S komplikacemi',
                                                            value:
                                                                statistics
                                                                    ?.complications
                                                                    .yes
                                                                    .count || 0,
                                                        },
                                                        {
                                                            name: 'Bez komplikací',
                                                            value:
                                                                statistics
                                                                    ?.complications
                                                                    .no.count ||
                                                                0,
                                                        },
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    nameKey="name"
                                                    label={({
                                                        name,
                                                        percent,
                                                    }) =>
                                                        `${name}: ${(percent * 100).toFixed(0)}%`
                                                    }
                                                >
                                                    <Cell fill="#e57373" />
                                                    <Cell fill="#81c784" />
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Grid>
                            </Grid>

                            {/* Complication Types */}
                            <Box sx={{ mt: 3 }}>
                                <DescriptiveStatisticsDataTable
                                    data={statistics?.complications.byType}
                                    title="Typy komplikací"
                                    emptyMessage="Žádné detailní informace o komplikacích nejsou k dispozici"
                                />
                            </Box>
                        </Box>
                    </>
                )}
            </Paper>
        </Container>
    )
}

export default DescriptiveStatistics
