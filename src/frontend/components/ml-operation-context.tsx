import React, {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from 'react'
import { MLTrainingResultDto } from '../../ipc/dtos/MLTrainingResultDto'
import { MLPredictionResultDto } from '../../ipc/dtos/MLPredictionResultDto'
import { MLAlgorithm, MLModelType } from '../types/ml'
import { PatientType } from '../types'

export interface MLCompletionState {
    success: boolean
    cancelled?: boolean
    titleKey: string
    detail?: string
    elapsed?: string
    patient?: PatientType
}

interface MLOperationContextType {
    isRunning: boolean
    operationType: 'train' | 'predict' | null
    progress: number | null
    stage: string
    inlineCount: number
    queueTotal: number
    queuePosition: number
    completionState: MLCompletionState | null
    clearCompletion: () => void
    startTraining: (
        modelType: MLModelType,
        algorithm: MLAlgorithm
    ) => Promise<MLTrainingResultDto>
    startTrainingQueue: (jobs: [MLModelType, MLAlgorithm][]) => Promise<void>
    startPrediction: (
        patient: PatientType,
        modelType: MLModelType,
        algorithm?: MLAlgorithm,
        recalculate?: boolean
    ) => Promise<MLPredictionResultDto>
    cancelOperation: () => void
    registerInlineDisplay: () => () => void
}

const MLOperationContext = createContext<MLOperationContextType | null>(null)

export const useMLOperation = (): MLOperationContextType => {
    const ctx = useContext(MLOperationContext)
    if (!ctx)
        throw new Error(
            'useMLOperation must be used within MLOperationProvider'
        )
    return ctx
}

const formatDuration = (ms: number): string => {
    const totalSeconds = Math.round(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

export const MLOperationProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [isRunning, setIsRunning] = useState(false)
    const [operationType, setOperationType] = useState<
        'train' | 'predict' | null
    >(null)
    const [progress, setProgress] = useState<number | null>(null)
    const [stage, setStage] = useState('')
    const [completionState, setCompletionState] =
        useState<MLCompletionState | null>(null)

    const isRunningRef = useRef(false)
    const isCancellingRef = useRef(false)
    const inlineCountRef = useRef(0)
    const [inlineCount, setInlineCount] = useState(0)
    const [queueTotal, setQueueTotal] = useState(0)
    const [queuePosition, setQueuePosition] = useState(0)

    const registerInlineDisplay = useCallback(() => {
        inlineCountRef.current += 1
        setInlineCount(inlineCountRef.current)
        return () => {
            inlineCountRef.current = Math.max(0, inlineCountRef.current - 1)
            setInlineCount(inlineCountRef.current)
        }
    }, [])

    const clearCompletion = useCallback(() => {
        setCompletionState(null)
    }, [])

    const cancelOperation = useCallback(() => {
        if (!isRunningRef.current) return
        isCancellingRef.current = true
        window.ml.cancel()
    }, [])

    const startTraining = useCallback(
        async (
            modelType: MLModelType,
            algorithm: MLAlgorithm
        ): Promise<MLTrainingResultDto> => {
            if (isRunningRef.current) {
                throw new Error('An ML operation is already in progress.')
            }
            isRunningRef.current = true
            isCancellingRef.current = false
            setIsRunning(true)
            setOperationType('train')
            setProgress(null)
            setStage('')
            setCompletionState(null)

            window.ml.offProgress()
            window.ml.onProgress(({ progress: p, stage: s }) => {
                setProgress(p)
                setStage(s)
            })

            const startTime = Date.now()

            try {
                const result = await window.ml.trainModel(modelType, algorithm)
                setCompletionState({
                    success: true,
                    titleKey: 'ml-training-complete',
                    elapsed: formatDuration(Date.now() - startTime),
                })
                return result
            } catch (err) {
                const elapsed = formatDuration(Date.now() - startTime)
                if (
                    isCancellingRef.current ||
                    (err instanceof Error &&
                        (err as { cancelled?: boolean }).cancelled)
                ) {
                    setCompletionState({
                        success: false,
                        cancelled: true,
                        titleKey: 'ml-training-cancelled',
                        elapsed,
                    })
                    const cancelErr = new Error('cancelled') as Error & {
                        cancelled: true
                    }
                    cancelErr.cancelled = true
                    throw cancelErr
                } else {
                    setCompletionState({
                        success: false,
                        titleKey: 'ml-training-failed',
                        detail: err instanceof Error ? err.message : undefined,
                        elapsed,
                    })
                }
                throw err
            } finally {
                window.ml.offProgress()
                isRunningRef.current = false
                isCancellingRef.current = false
                setIsRunning(false)
                setOperationType(null)
                setProgress(null)
                setStage('')
            }
        },
        []
    )

    const startTrainingQueue = useCallback(
        async (jobs: [MLModelType, MLAlgorithm][]): Promise<void> => {
            setQueueTotal(jobs.length)
            for (let i = 0; i < jobs.length; i++) {
                setQueuePosition(i + 1)
                try {
                    await startTraining(jobs[i][0], jobs[i][1])
                } catch {
                    // continue remaining jobs even if one fails or is cancelled
                }
            }
            setQueueTotal(0)
            setQueuePosition(0)
        },
        [startTraining]
    )

    const startPrediction = useCallback(
        async (
            patient: PatientType,
            modelType: MLModelType,
            algorithm?: MLAlgorithm,
            recalculate?: boolean
        ): Promise<MLPredictionResultDto> => {
            if (isRunningRef.current) {
                throw new Error('An ML operation is already in progress.')
            }
            isRunningRef.current = true
            isCancellingRef.current = false
            setIsRunning(true)
            setOperationType('predict')
            setProgress(null)
            setStage('')
            setCompletionState(null)

            window.ml.offProgress()
            window.ml.onProgress(({ progress: p, stage: s }) => {
                setProgress(p)
                setStage(s)
            })

            const startTime = Date.now()

            try {
                const result = await window.ml.calculateRiskScore(
                    patient,
                    modelType,
                    algorithm,
                    recalculate
                )
                setCompletionState({
                    success: true,
                    titleKey: 'ml-prediction-complete',
                    elapsed: formatDuration(Date.now() - startTime),
                    patient,
                })
                return result
            } catch (err) {
                const elapsed = formatDuration(Date.now() - startTime)
                if (
                    isCancellingRef.current ||
                    (err instanceof Error &&
                        (err as { cancelled?: boolean }).cancelled)
                ) {
                    setCompletionState({
                        success: false,
                        cancelled: true,
                        titleKey: 'ml-prediction-cancelled',
                        elapsed,
                    })
                    const cancelErr = new Error('cancelled') as Error & {
                        cancelled: true
                    }
                    cancelErr.cancelled = true
                    throw cancelErr
                } else {
                    setCompletionState({
                        success: false,
                        titleKey: 'ml-prediction-failed',
                        detail: err instanceof Error ? err.message : undefined,
                        elapsed,
                    })
                }
                throw err
            } finally {
                window.ml.offProgress()
                isRunningRef.current = false
                isCancellingRef.current = false
                setIsRunning(false)
                setOperationType(null)
                setProgress(null)
                setStage('')
            }
        },
        []
    )

    return (
        <MLOperationContext.Provider
            value={{
                isRunning,
                operationType,
                progress,
                stage,
                inlineCount,
                queueTotal,
                queuePosition,
                completionState,
                clearCompletion,
                startTraining,
                startTrainingQueue,
                startPrediction,
                cancelOperation,
                registerInlineDisplay,
            }}
        >
            {children}
        </MLOperationContext.Provider>
    )
}
