export enum ipcAPISaveChannels {
    savePatient = 'savePatient',
    saveStudy = 'saveStudy',
    savePatientStaging = 'savePatientStaging',
}

export enum ipcAPIInsertChannels {
    insertPatientToStudy = 'insertPatientToStudy',
}

export enum ipcAPIUpdateChannels {
    updatePatientsStudies = 'updatePatientsStudies',
}

export enum ipcAPIDeleteChannels {
    deletePatient = 'deletePatient',
    deleteStudy = 'deleteStudy',
    deletePatientFromStudy = 'deletePatientFromStudy',
}

export enum ipcAPIGetChannels {
    getAllPatients = 'getAllPatients',
    getPatientsByType = 'getPatientsByType',
    getPatientsInStudy = 'getPatientsInStudy',
    getStudies = 'getStudies',
    getStudiesByFormType = 'getStudiesByFormType',
    getStudiesByPatientId = 'getStudiesByPatientId',
    getFilteredPatients = 'getFilteredPatients',
    getKaplanMeierData = 'getKaplanMeierData',
    searchPatientsByNameSurnameRC = 'searchPatientsByNameSurnameRC',
    getPlannedPatientsBetweenDates = 'getPlannedPatientsBetweenDates',
    getChiSquareData = 'getChiSquareData',
    getTTestData = 'getTTestData',
    getTnmDistribution = 'getTnmDistribution',
    getActiveTnmEdition = 'getActiveTnmEdition',
    getAllTnmEditions = 'getAllTnmEditions',
    getTnmEditionById = 'getTnmEditionById',
    getTnmValues = 'getTnmValues',
    calculateTnmStage = 'calculateTnmStage',
    getPatientStaging = 'getPatientStaging',
    getAllPatientStagings = 'getAllPatientStagings',
}

export enum ipcExportChannels {
    export = 'export',
    exportAnonymized = 'exportAnonymized',
}

export enum ipcImportChannels {
    import = 'import',
}

export enum ipcFSChannels {
    save = 'save',
    getFileIcon = 'getFileIcon',
    open = 'open',
    getFileName = 'getFileName',
    loadJson = 'loadJson',
    getPublicProductionReadyPath = 'getPublicProductionReadyPath',
}

export enum ipcEncryptionChannels {
    setEncryptionKey = 'setEncryptionKey',
    isPasswordSet = 'isPasswordSet',
    isEncryptionEnabled = 'isEncryptionEnabled',
    insertPasswordRow = 'insertPasswordRow',
    insertPassword = 'insertPassword',
    insertUsingEncryption = 'insertUsingEncryption',
    validatePassword = 'validatePassword',
    generateEncryptionKey = 'generateEncryptionKey',
}

export enum ipcBackUpChannels {
    backUp = 'backUp',
    loadBackUp = 'loadBackUp',
}

export enum ipcMLChannels {
    trainModel = 'trainModel',
    calculateRiskScore = 'calculateRiskScore',
    getModelInfo = 'getModelInfo',
    setActiveModel = 'setActiveModel',
    deleteModel = 'deleteModel',
    getSavedPrediction = 'getSavedPrediction',
    mlProgress = 'mlProgress',
    mlCancel = 'mlCancel',
    mlRetrainingRecommended = 'mlRetrainingRecommended',
}
