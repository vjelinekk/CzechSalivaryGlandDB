import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditSavedState } from '../../types'
import { formTranslationKeys } from '../../translations'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

interface EditResultProps {
    editSaved: EditSavedState
    setEditSaved: React.Dispatch<React.SetStateAction<EditSavedState>>
}

const EditResult: React.FC<EditResultProps> = ({ editSaved, setEditSaved }) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (editSaved && editSaved.saved !== null) {
            setOpen(true)
        }
    }, [editSaved?.saved, editSaved?.done])

    const handleClose = () => {
        setOpen(false)
        setEditSaved((prevEditSaved) => ({
            ...prevEditSaved,
            saved: null,
        }))
    }

    if (!editSaved || editSaved.saved === null) {
        return null
    }

    return (
        <Snackbar
            open={open}
            autoHideDuration={2000}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert
                onClose={handleClose}
                severity={editSaved.saved ? 'success' : 'error'}
                variant="filled"
                sx={{ width: '100%', alignItems: 'center' }}
            >
                {editSaved.saved
                    ? t(formTranslationKeys.changeSaved)
                    : t(formTranslationKeys.changeSaveError)}
            </Alert>
        </Snackbar>
    )
}

export default EditResult
