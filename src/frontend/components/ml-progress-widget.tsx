import React from 'react'
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    IconButton,
    LinearProgress,
    Slide,
    Snackbar,
    Tooltip,
    Typography,
} from '@mui/material'
import StopIcon from '@mui/icons-material/Stop'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import { useMLOperation } from './ml-operation-context'
import { appTranslationKeys } from '../translations'

interface MLProgressWidgetProps {
    onNavigateToTrainingResults?: () => void
    onNavigateToPatient?: (patient: import('../types').PatientType) => void
}

const MLProgressWidget: React.FC<MLProgressWidgetProps> = ({
    onNavigateToTrainingResults,
    onNavigateToPatient,
}) => {
    const { t } = useTranslation()
    const {
        isRunning,
        operationType,
        progress,
        stage,
        inlineCount,
        completionState,
        clearCompletion,
        cancelOperation,
    } = useMLOperation()

    const showWidget = isRunning && inlineCount === 0

    const operationLabel =
        operationType === 'train'
            ? t(appTranslationKeys.mlTrainingRunning)
            : t(appTranslationKeys.mlPredictionRunning)

    const snackbarSeverity = completionState
        ? completionState.cancelled
            ? 'info'
            : completionState.success
              ? 'success'
              : 'error'
        : 'success'

    const completionMessage = completionState
        ? (() => {
              const base = completionState.cancelled
                  ? t(completionState.titleKey)
                  : completionState.success
                    ? t(completionState.titleKey)
                    : `${t(completionState.titleKey)}${completionState.detail ? `: ${completionState.detail}` : ''}`
              return completionState.elapsed
                  ? `${base} (${completionState.elapsed})`
                  : base
          })()
        : ''

    return (
        <>
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1300,
                    width: 280,
                    pointerEvents: showWidget ? 'auto' : 'none',
                }}
            >
                <Slide
                    direction="up"
                    in={showWidget}
                    mountOnEnter
                    unmountOnExit
                >
                    <Card elevation={6}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: 1,
                                }}
                            >
                                <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: 600 }}
                                >
                                    {operationLabel}
                                </Typography>
                                <Tooltip
                                    title={t(
                                        appTranslationKeys.mlCancelOperation
                                    )}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={cancelOperation}
                                        sx={{ p: 0.5 }}
                                    >
                                        <StopIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    mb: 0.5,
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    {stage
                                        ? t(
                                              `ml-stage-${stage.replace(/_/g, '-')}`,
                                              { defaultValue: stage }
                                          )
                                        : t(
                                              appTranslationKeys.mlStageGettingReady
                                          )}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    {progress !== null ? `${progress}%` : ''}
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant={
                                    progress !== null
                                        ? 'determinate'
                                        : 'indeterminate'
                                }
                                value={progress ?? 0}
                                sx={{ borderRadius: 2 }}
                            />
                        </CardContent>
                    </Card>
                </Slide>
            </Box>

            <Snackbar
                open={completionState !== null}
                autoHideDuration={5000}
                onClose={clearCompletion}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbarSeverity}
                    variant="filled"
                    sx={{ width: '100%' }}
                    action={(() => {
                        const showTrainingLink =
                            completionState?.success &&
                            completionState.titleKey ===
                                'ml-training-complete' &&
                            onNavigateToTrainingResults
                        const showPatientLink =
                            completionState?.success &&
                            completionState.titleKey ===
                                'ml-prediction-complete' &&
                            completionState.patient &&
                            onNavigateToPatient

                        if (showTrainingLink || showPatientLink) {
                            return (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                    }}
                                >
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={() => {
                                            clearCompletion()
                                            if (showTrainingLink) {
                                                onNavigateToTrainingResults?.()
                                            } else if (
                                                showPatientLink &&
                                                completionState?.patient
                                            ) {
                                                onNavigateToPatient?.(
                                                    completionState.patient
                                                )
                                            }
                                        }}
                                        sx={{ whiteSpace: 'nowrap' }}
                                    >
                                        {showTrainingLink
                                            ? t(
                                                  appTranslationKeys.mlViewResults
                                              )
                                            : t(
                                                  appTranslationKeys.mlViewPatient
                                              )}
                                    </Button>
                                    <IconButton
                                        size="small"
                                        color="inherit"
                                        onClick={clearCompletion}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            )
                        }
                        return (
                            <IconButton
                                size="small"
                                color="inherit"
                                onClick={clearCompletion}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        )
                    })()}
                >
                    {completionMessage}
                </Alert>
            </Snackbar>
        </>
    )
}

export default MLProgressWidget
