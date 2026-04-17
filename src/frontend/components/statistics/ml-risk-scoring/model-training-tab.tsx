import React, { useEffect, useState } from 'react'
import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid,
    IconButton,
    LinearProgress,
    Paper,
    Radio,
    RadioGroup,
    Tooltip,
    Typography,
    Alert,
} from '@mui/material'
import StopIcon from '@mui/icons-material/Stop'
import { useTranslation } from 'react-i18next'
import { MLTrainingResultDto } from '../../../../ipc/dtos/MLTrainingResultDto'
import { appTranslationKeys } from '../../../translations'
import { useMLOperation } from '../../ml-operation-context'

interface ModelTrainingTabProps {
    onTrainingSuccess?: () => void
}

const ModelTrainingTab: React.FC<ModelTrainingTabProps> = ({
    onTrainingSuccess,
}) => {
    const { t } = useTranslation()
    const mlContext = useMLOperation()
    const [modelType, setModelType] = useState<
        'overall_survival' | 'recurrence'
    >('overall_survival')
    const [algorithm, setAlgorithm] = useState<'rsf' | 'coxph'>('rsf')
    const [loading, setLoading] = useState<boolean>(
        () => mlContext.isRunning && mlContext.operationType === 'train'
    )
    const [result, setResult] = useState<MLTrainingResultDto | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Register this component as showing inline progress (suppresses the floating widget)
    useEffect(() => {
        return mlContext.registerInlineDisplay()
    }, [mlContext.registerInlineDisplay])

    const handleTrain = async () => {
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const trainingResult = await mlContext.startTraining(
                modelType,
                algorithm
            )
            setResult(trainingResult)
            if (onTrainingSuccess) {
                onTrainingSuccess()
            }
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                (err as { cancelled?: boolean }).cancelled
            ) {
                return
            }
            if (err instanceof Error) {
                setError(err.message)
                return
            }

            setError('An error occurred during training.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box sx={{ p: 2 }}>
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {t(appTranslationKeys.mlModelTrainingConfig)}
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">
                                {t(appTranslationKeys.mlTargetVariable)}
                            </FormLabel>
                            <RadioGroup
                                aria-label="model-type"
                                name="model-type"
                                value={modelType}
                                onChange={(e) =>
                                    setModelType(
                                        e.target.value as
                                            | 'overall_survival'
                                            | 'recurrence'
                                    )
                                }
                            >
                                <FormControlLabel
                                    value="overall_survival"
                                    control={<Radio />}
                                    label={t(
                                        appTranslationKeys.mlOverallSurvival
                                    )}
                                />
                                <FormControlLabel
                                    value="recurrence"
                                    control={<Radio />}
                                    label={t(appTranslationKeys.mlRecurrence)}
                                />
                            </RadioGroup>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">
                                {t(appTranslationKeys.mlAlgorithm)}
                            </FormLabel>
                            <RadioGroup
                                aria-label="algorithm"
                                name="algorithm"
                                value={algorithm}
                                onChange={(e) =>
                                    setAlgorithm(
                                        e.target.value as 'rsf' | 'coxph'
                                    )
                                }
                            >
                                <FormControlLabel
                                    value="rsf"
                                    control={<Radio />}
                                    label={t(
                                        appTranslationKeys.mlRandomSurvivalForest
                                    )}
                                />
                                <FormControlLabel
                                    value="coxph"
                                    control={<Radio />}
                                    label={t(
                                        appTranslationKeys.mlCoxProportionalHazards
                                    )}
                                />
                            </RadioGroup>
                        </FormControl>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleTrain}
                            disabled={loading || mlContext.isRunning}
                            startIcon={
                                loading &&
                                mlContext.progress === null && (
                                    <CircularProgress
                                        size={20}
                                        color="inherit"
                                    />
                                )
                            }
                        >
                            {loading
                                ? t(appTranslationKeys.mlTrainingInProgress)
                                : t(appTranslationKeys.mlTrainModel)}
                        </Button>
                    </Box>

                    {loading && (
                        <Box sx={{ mt: 2 }}>
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
                                >
                                    {mlContext.stage
                                        ? t(
                                              `ml-stage-${mlContext.stage.replace(/_/g, '-')}`,
                                              { defaultValue: mlContext.stage }
                                          )
                                        : t(
                                              appTranslationKeys.mlStageGettingReady
                                          )}
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
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
                                            onClick={mlContext.cancelOperation}
                                            sx={{ p: 0.25 }}
                                        >
                                            <StopIcon
                                                sx={{ fontSize: '1rem' }}
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
                            />
                        </Box>
                    )}
                </Box>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {result && result.bootstrap_n_valid < 160 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    {t(appTranslationKeys.mlBootstrapLowIterations, {
                        n: result.bootstrap_n_valid,
                        total: 200,
                    })}
                </Alert>
            )}

            {result && (
                <Paper elevation={1} sx={{ p: 3, bgcolor: '#f1f8e9' }}>
                    <Typography variant="h6" gutterBottom color="primary">
                        {t(appTranslationKeys.mlTrainingResults)}
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                            <Typography
                                variant="subtitle2"
                                color="textSecondary"
                            >
                                {t(appTranslationKeys.mlBootstrapCindex)}
                            </Typography>
                            <Typography variant="h5">
                                {(result.bootstrap_c_index * 100).toFixed(1)}%
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {t(appTranslationKeys.mlBootstrapCindexStd)}: ±
                                {(result.bootstrap_c_index_std * 100).toFixed(
                                    1
                                )}
                                %
                            </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Typography
                                variant="subtitle2"
                                color="textSecondary"
                            >
                                {t(appTranslationKeys.mlCindexAccuracy)}
                            </Typography>
                            <Typography variant="h5" color="textSecondary">
                                {(result.c_index * 100).toFixed(1)}%
                            </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Typography
                                variant="subtitle2"
                                color="textSecondary"
                            >
                                {t(appTranslationKeys.mlNumberOfPatients)}
                            </Typography>
                            <Typography variant="h5">
                                {result.n_samples}
                            </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Typography
                                variant="subtitle2"
                                color="textSecondary"
                            >
                                {t(appTranslationKeys.mlNumberOfEvents)}
                            </Typography>
                            <Typography variant="h5">
                                {result.n_events}
                            </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Typography
                                variant="subtitle2"
                                color="textSecondary"
                            >
                                {t(appTranslationKeys.mlTrainingDate)}
                            </Typography>
                            <Typography variant="body1">
                                {new Date(
                                    result.training_date
                                ).toLocaleString()}
                            </Typography>
                        </Grid>
                    </Grid>
                </Paper>
            )}
        </Box>
    )
}

export default ModelTrainingTab
