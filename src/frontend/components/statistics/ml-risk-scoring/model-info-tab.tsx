import React, { useEffect, useState } from 'react'
import {
    Box,
    Chip,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Radio,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { MLModelInfoDto } from '../../../../ipc/dtos/MLModelInfoDto'
import { appTranslationKeys } from '../../../translations'

const ModelInfoTab: React.FC = () => {
    const { t } = useTranslation()
    const [loading, setLoading] = useState<boolean>(true)
    const [models, setModels] = useState<MLModelInfoDto[]>([])
    const [error, setError] = useState<string | null>(null)

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [modelToDelete, setModelToDelete] = useState<number | null>(null)

    const fetchModels = async () => {
        try {
            setLoading(true)
            const modelInfo = await window.ml.getModelInfo()
            setModels(modelInfo)
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message)
                return
            }

            setError('Failed to fetch model information.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchModels()
    }, [])

    const handleSetActive = async (id: number) => {
        try {
            await window.ml.setActiveModel(id)
            await fetchModels() // Refresh list to show new active status
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message)
                return
            }

            setError('Failed to set active model.')
        }
    }

    const handleDeleteClick = (id: number) => {
        setModelToDelete(id)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (modelToDelete === null) return
        try {
            await window.ml.deleteModel(modelToDelete)
            setDeleteDialogOpen(false)
            setModelToDelete(null)
            await fetchModels()
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message)
                return
            }

            setError('Failed to delete model.')
        }
    }

    if (loading && models.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Box>
            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                                {t(appTranslationKeys.mlActive)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                                {t(appTranslationKeys.mlModelType)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                                {t(appTranslationKeys.mlAlgorithm)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                                {t(appTranslationKeys.mlTrainingDate)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                                {t(appTranslationKeys.mlBootstrapCindexTable)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                                {t(appTranslationKeys.mlCindex)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                                {t(appTranslationKeys.mlSample)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                                {t(appTranslationKeys.mlActions)}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {models.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    align="center"
                                    sx={{ py: 3 }}
                                >
                                    {t(appTranslationKeys.mlNoModelsTrained)}
                                </TableCell>
                            </TableRow>
                        ) : (
                            models.map((model) => (
                                <TableRow
                                    key={model.id}
                                    hover
                                    selected={model.is_active}
                                >
                                    <TableCell padding="checkbox">
                                        <Tooltip
                                            title={t(
                                                appTranslationKeys.mlSetAsActive
                                            )}
                                        >
                                            <Radio
                                                checked={model.is_active}
                                                onChange={() =>
                                                    handleSetActive(model.id)
                                                }
                                                size="small"
                                            />
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}
                                        >
                                            {model.model_type ===
                                            'overall_survival'
                                                ? t(
                                                      appTranslationKeys.mlSurvival
                                                  )
                                                : t(
                                                      appTranslationKeys.mlRecurrence
                                                  )}
                                            {model.is_bundled && (
                                                <Chip
                                                    label={t(
                                                        appTranslationKeys.mlBundledModel
                                                    )}
                                                    size="small"
                                                    color="info"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {model.model_metadata.algorithm ===
                                        'rsf'
                                            ? 'RS Forest'
                                            : 'Cox PH'}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(
                                            model.model_metadata.training_date
                                        ).toLocaleString()}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'medium' }}>
                                        {(
                                            model.model_metadata
                                                .bootstrap_c_index * 100
                                        ).toFixed(1)}
                                        %{' '}
                                        <span style={{ color: 'gray', fontSize: '0.75rem' }}>
                                            ±
                                            {(
                                                model.model_metadata
                                                    .bootstrap_c_index_std *
                                                100
                                            ).toFixed(1)}
                                            %
                                        </span>
                                    </TableCell>
                                    <TableCell color="textSecondary">
                                        {(
                                            model.model_metadata.c_index * 100
                                        ).toFixed(1)}
                                        %
                                    </TableCell>
                                    <TableCell>
                                        {model.model_metadata.n_samples} /{' '}
                                        {model.model_metadata.n_events}
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip
                                            title={t(
                                                appTranslationKeys.mlDeleteModelAndFile
                                            )}
                                        >
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    disabled={model.is_bundled}
                                                    onClick={() =>
                                                        handleDeleteClick(
                                                            model.id
                                                        )
                                                    }
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>
                    {t(appTranslationKeys.mlDeleteModelTitle)}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t(appTranslationKeys.mlDeleteModelWarning)}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        color="primary"
                    >
                        {t(appTranslationKeys.mlDeleteCancel)}
                    </Button>
                    <Button
                        onClick={confirmDelete}
                        color="error"
                        autoFocus
                        variant="contained"
                    >
                        {t(appTranslationKeys.mlDeleteModel)}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

export default ModelInfoTab
