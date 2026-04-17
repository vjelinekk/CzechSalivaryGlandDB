import React, { useState, useEffect, useCallback } from 'react'
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    Grid,
    LinearProgress,
    Typography,
    Alert,
    Tooltip,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import PsychologyIcon from '@mui/icons-material/Psychology'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import StopIcon from '@mui/icons-material/Stop'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useTranslation } from 'react-i18next'
import { PatientType } from '../types'
import { appTranslationKeys } from '../translations'
import { MLPredictionResultDto } from '../../ipc/dtos/MLPredictionResultDto'
import { MLAlgorithm, MLModelType } from '../types/ml'
import { keyframes } from '@emotion/react'
import { useMLOperation } from './ml-operation-context'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

interface PatientRiskCardProps {
    patient: PatientType
    disabled?: boolean
}

const PatientRiskCard: React.FC<PatientRiskCardProps> = ({
    patient,
    disabled,
}) => {
    const { t } = useTranslation()
    const mlContext = useMLOperation()
    const [loading, setLoading] = useState<boolean>(false)
    const [result, setResult] = useState<MLPredictionResultDto | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [modelType, setModelType] = useState<MLModelType>('overall_survival')
    const [algorithm, setAlgorithm] = useState<MLAlgorithm>('rsf')
    const [expand, setExpand] = useState<boolean>(false)

    // Only show for malignant patients
    const isMalignant =
        patient.form_type && [1, 2, 3].includes(patient.form_type as number)

    // Register as inline display when card is expanded (suppresses the floating widget)
    useEffect(() => {
        if (expand) {
            return mlContext.registerInlineDisplay()
        }
    }, [expand, mlContext.registerInlineDisplay])

    // Load saved prediction when expanding or changing config
    useEffect(() => {
        const loadSaved = async () => {
            if (expand && isMalignant && patient.id) {
                setLoading(true)
                setResult(null)
                setError(null)

                const startTime = Date.now()
                const minDelay = 400

                try {
                    const saved = await window.ml.getSavedPrediction(
                        patient.id,
                        modelType,
                        algorithm
                    )

                    const elapsedTime = Date.now() - startTime
                    if (elapsedTime < minDelay) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, minDelay - elapsedTime)
                        )
                    }

                    setResult(saved)
                } catch (err) {
                    console.error('Failed to load saved prediction:', err)
                } finally {
                    setLoading(false)
                }
            }
        }
        loadSaved()
    }, [expand, modelType, algorithm, patient.id])

    if (!isMalignant) {
        return null
    }

    const handleCalculate = useCallback(async () => {
        if (loading || mlContext.isRunning) return
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const prediction = await mlContext.startPrediction(
                patient,
                modelType,
                algorithm,
                true
            )
            setResult(prediction)
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                (err as { cancelled?: boolean }).cancelled
            ) {
                return
            }
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError(t(appTranslationKeys.mlCalculationFailed))
            }
            setResult(null)
        } finally {
            setLoading(false)
        }
    }, [loading, mlContext, patient, modelType, algorithm, t])

    const handleModelTypeChange = (
        _: unknown,
        nextType: MLModelType | null
    ) => {
        if (nextType && nextType !== modelType && !loading) {
            setModelType(nextType)
        }
    }

    const handleAlgorithmChange = (_: unknown, nextAlg: MLAlgorithm | null) => {
        if (nextAlg && nextAlg !== algorithm && !loading) {
            setAlgorithm(nextAlg)
        }
    }

    const getRiskColor = (score: number) => {
        if (score < 0.3) return 'success.main'
        if (score < 0.7) return 'warning.main'
        return 'error.main'
    }

    const getRiskLabel = (score: number) => {
        if (score < 0.3) return t(appTranslationKeys.mlLowRisk)
        if (score < 0.7) return t(appTranslationKeys.mlMediumRisk)
        return t(appTranslationKeys.mlHighRisk)
    }

    const formatDate = (isoString?: string) => {
        if (!isoString) return ''
        return new Date(isoString).toLocaleDateString()
    }

    return (
        <Card
            id="mlRiskCard"
            sx={{
                display: 'flex',
                flexDirection: 'row-reverse',
                alignItems: expand ? 'flex-start' : 'center',
                padding: 1,
                gap: 1,
                width: expand ? '450px' : 'fit-content',
                minHeight: expand ? '180px' : 'auto',
                boxShadow: 3,
                border: 1,
                borderColor: 'grey.300',
                animation: expand ? `${fadeIn} 0.2s ease` : 'none',
                cursor: loading ? 'wait' : 'default',
                '& .MuiButton-root, & .MuiIconButton-root, & .MuiToggleButton-root':
                    {
                        margin: '0 !important',
                        boxShadow: 'none !important',
                        textTransform: 'none',
                        transition: 'none !important',
                        '&:active': {
                            transform: 'none !important',
                        },
                    },
            }}
        >
            <Button
                onClick={() => !loading && setExpand(!expand)}
                sx={{
                    minWidth: 0,
                    width: '32px !important',
                    height: '32px !important',
                    padding: '0 !important',
                    pointerEvents: loading ? 'none' : 'auto',
                    opacity: loading ? 0.7 : 1,
                }}
                disableRipple
                variant={!expand ? 'contained' : 'text'}
                color="primary"
            >
                {expand ? (
                    <ChevronRightIcon />
                ) : (
                    <PsychologyIcon sx={{ fontSize: '1.2rem' }} />
                )}
            </Button>

            {expand && (
                <Box
                    sx={{
                        width: '100%',
                        mr: 1,
                        pointerEvents: loading ? 'none' : 'auto',
                    }}
                >
                    <Box sx={{ p: 1 }}>
                        <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600, mb: 1 }}
                        >
                            {t(appTranslationKeys.mlRiskAnalysis)}
                        </Typography>

                        <Box sx={{ mb: 1.5 }}>
                            <ToggleButtonGroup
                                value={modelType}
                                exclusive
                                onChange={handleModelTypeChange}
                                size="small"
                                fullWidth
                                color="primary"
                            >
                                <ToggleButton
                                    value="overall_survival"
                                    disableRipple
                                    sx={{ padding: '4px 7px !important' }}
                                >
                                    {t(appTranslationKeys.mlSurvival)}
                                </ToggleButton>
                                <ToggleButton
                                    value="recurrence"
                                    disableRipple
                                    sx={{ padding: '4px 7px !important' }}
                                >
                                    {t(appTranslationKeys.mlRecurrence)}
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        <Box sx={{ mb: 1.5 }}>
                            <ToggleButtonGroup
                                value={algorithm}
                                exclusive
                                onChange={handleAlgorithmChange}
                                size="small"
                                fullWidth
                                color="primary"
                            >
                                <ToggleButton
                                    value="rsf"
                                    disableRipple
                                    sx={{ padding: '4px 7px !important' }}
                                >
                                    Random Survival Forest
                                </ToggleButton>
                                <ToggleButton
                                    value="coxph"
                                    disableRipple
                                    sx={{ padding: '4px 7px !important' }}
                                >
                                    Cox PH
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                minHeight: '40px',
                                alignItems: 'center',
                                width: '100%',
                            }}
                        >
                            {loading ? (
                                <Box sx={{ width: '100%' }}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            mb: 0.5,
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontSize: '0.7rem' }}
                                        >
                                            {mlContext.stage
                                                ? t(
                                                      `ml-stage-${mlContext.stage.replace(/_/g, '-')}`,
                                                      {
                                                          defaultValue:
                                                              mlContext.stage,
                                                      }
                                                  )
                                                : t(
                                                      appTranslationKeys.mlStageGettingReady
                                                  )}
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.25,
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ fontSize: '0.7rem' }}
                                            >
                                                {mlContext.progress !== null
                                                    ? `${mlContext.progress}%`
                                                    : ''}
                                            </Typography>
                                            <Tooltip
                                                title={t(
                                                    appTranslationKeys.mlCancelOperation
                                                )}
                                            >
                                                <IconButton
                                                    size="small"
                                                    onClick={
                                                        mlContext.cancelOperation
                                                    }
                                                    disableRipple
                                                    sx={{
                                                        p: '0 !important',
                                                        width: '18px !important',
                                                        height: '18px !important',
                                                        pointerEvents: 'auto',
                                                    }}
                                                >
                                                    <StopIcon
                                                        sx={{
                                                            fontSize: '0.85rem',
                                                        }}
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                    <LinearProgress
                                        variant={
                                            mlContext.progress !== null
                                                ? 'determinate'
                                                : 'indeterminate'
                                        }
                                        value={mlContext.progress ?? 0}
                                        sx={{ height: 4, borderRadius: 2 }}
                                    />
                                </Box>
                            ) : (
                                !result &&
                                !error && (
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={handleCalculate}
                                        disabled={
                                            disabled || mlContext.isRunning
                                        }
                                        disableRipple
                                        sx={{
                                            px: 3,
                                            padding: '6px 16px !important',
                                        }}
                                    >
                                        {t(appTranslationKeys.mlCalculateRisk)}
                                    </Button>
                                )
                            )}
                        </Box>

                        {error && !loading && (
                            <Alert
                                severity="error"
                                action={
                                    <IconButton
                                        aria-label="close"
                                        color="inherit"
                                        size="small"
                                        onClick={() => setError(null)}
                                        disableRipple
                                        sx={{ padding: '2px !important' }}
                                    >
                                        <CloseIcon fontSize="inherit" />
                                    </IconButton>
                                }
                                sx={{
                                    mb: 1,
                                    fontSize: '0.8rem',
                                    '& .MuiAlert-action': {
                                        padding: 0,
                                        alignItems: 'center',
                                    },
                                }}
                            >
                                {error}
                            </Alert>
                        )}
                    </Box>

                    {result && !loading && (
                        <Box sx={{ animation: `${fadeIn} 0.3s ease` }}>
                            <Divider />
                            <CardContent
                                sx={{ p: 2, '&:last-child': { pb: 2 } }}
                            >
                                <Grid container spacing={2}>
                                    <Grid
                                        item
                                        xs={12}
                                        sm={4}
                                        sx={{ textAlign: 'center' }}
                                    >
                                        <Box
                                            sx={{
                                                position: 'relative',
                                                display: 'inline-flex',
                                            }}
                                        >
                                            <CircularProgress
                                                variant="determinate"
                                                value={result.risk_score * 100}
                                                size={70}
                                                thickness={5}
                                                sx={{
                                                    color: getRiskColor(
                                                        result.risk_score
                                                    ),
                                                }}
                                            />
                                            <Box
                                                sx={{
                                                    top: 0,
                                                    left: 0,
                                                    bottom: 0,
                                                    right: 0,
                                                    position: 'absolute',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    component="div"
                                                    fontWeight="bold"
                                                >
                                                    {Math.round(
                                                        result.risk_score * 100
                                                    )}
                                                    %
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            display="block"
                                            fontWeight="medium"
                                        >
                                            {getRiskLabel(result.risk_score)}
                                        </Typography>
                                    </Grid>

                                    <Grid item xs={12} sm={8}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                                mb: 0.5,
                                                display: 'block',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {modelType === 'overall_survival'
                                                ? t(
                                                      appTranslationKeys.mlSurvivalProbability
                                                  )
                                                : t(
                                                      appTranslationKeys.mlRecurrenceFreeProbability
                                                  )}
                                        </Typography>
                                        {[
                                            {
                                                label: '1 rok',
                                                value:
                                                    modelType ===
                                                    'overall_survival'
                                                        ? result.survival_probability_1year
                                                        : result.recurrence_free_probability_1year,
                                            },
                                            {
                                                label: '3 roky',
                                                value:
                                                    modelType ===
                                                    'overall_survival'
                                                        ? result.survival_probability_3year
                                                        : result.recurrence_free_probability_3year,
                                            },
                                            {
                                                label: '5 let',
                                                value:
                                                    modelType ===
                                                    'overall_survival'
                                                        ? result.survival_probability_5year
                                                        : result.recurrence_free_probability_5year,
                                            },
                                        ].map((item) => (
                                            <Box
                                                key={item.label}
                                                sx={{ mb: 0.5 }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent:
                                                            'space-between',
                                                    }}
                                                >
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontSize: '0.7rem',
                                                        }}
                                                    >
                                                        {item.label}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        fontWeight="bold"
                                                        sx={{
                                                            fontSize: '0.7rem',
                                                        }}
                                                    >
                                                        {Math.round(
                                                            (item.value || 0) *
                                                                100
                                                        )}
                                                        %
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={
                                                        (item.value || 0) * 100
                                                    }
                                                    sx={{
                                                        height: 3,
                                                        borderRadius: 2,
                                                    }}
                                                />
                                            </Box>
                                        ))}
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Divider sx={{ mb: 1 }} />
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                mb: 0.5,
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{
                                                    mr: 0.5,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {t(
                                                    appTranslationKeys.mlTopRiskFactors
                                                )}
                                            </Typography>
                                            <Tooltip
                                                title={t(
                                                    appTranslationKeys.mlFactorsTooltip
                                                )}
                                            >
                                                <IconButton
                                                    size="small"
                                                    sx={{
                                                        padding: '0 !important',
                                                    }}
                                                >
                                                    <InfoIcon
                                                        sx={{
                                                            fontSize: '0.8rem',
                                                        }}
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                        {result.top_risk_factors &&
                                        result.top_risk_factors.length > 0 ? (
                                            <Grid container spacing={1}>
                                                {result.top_risk_factors.map(
                                                    (factor, index) => (
                                                        <Grid
                                                            item
                                                            xs={4}
                                                            key={index}
                                                        >
                                                            <Typography
                                                                variant="caption"
                                                                noWrap
                                                                display="block"
                                                                title={
                                                                    factor.feature
                                                                }
                                                                sx={{
                                                                    fontSize:
                                                                        '0.65rem',
                                                                }}
                                                            >
                                                                {t(
                                                                    factor.feature
                                                                ) ||
                                                                    factor.feature}
                                                            </Typography>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={Math.min(
                                                                    factor.importance *
                                                                        100,
                                                                    100
                                                                )}
                                                                color="secondary"
                                                                sx={{
                                                                    height: 2,
                                                                    mt: 0.1,
                                                                }}
                                                            />
                                                        </Grid>
                                                    )
                                                )}
                                            </Grid>
                                        ) : (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ fontSize: '0.7rem' }}
                                            >
                                                {t(
                                                    appTranslationKeys.mlNoFactorsIdentified
                                                )}
                                            </Typography>
                                        )}
                                    </Grid>
                                </Grid>

                                <Box
                                    sx={{
                                        mt: 1.5,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: '0.65rem',
                                                color: 'text.disabled',
                                            }}
                                        >
                                            {t(appTranslationKeys.mlCalculated)}
                                            :{' '}
                                            {formatDate(
                                                result.calculation_date
                                            )}
                                        </Typography>
                                        {result.is_stale && (
                                            <Tooltip
                                                title={t(
                                                    appTranslationKeys.mlStaleResult
                                                )}
                                            >
                                                <WarningAmberIcon
                                                    sx={{
                                                        fontSize: '0.9rem',
                                                        color: 'warning.main',
                                                    }}
                                                />
                                            </Tooltip>
                                        )}
                                    </Box>
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={handleCalculate}
                                        disabled={mlContext.isRunning}
                                        disableRipple
                                        sx={{
                                            fontSize: '0.65rem',
                                            minWidth: 0,
                                            p: '4px 8px !important',
                                        }}
                                    >
                                        {t(appTranslationKeys.mlRecalculate)}
                                    </Button>
                                </Box>
                            </CardContent>
                        </Box>
                    )}
                </Box>
            )}
        </Card>
    )
}

export default PatientRiskCard
