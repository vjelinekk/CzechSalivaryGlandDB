# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Czech Salivary Gland Database (CSGDB) is an Electron-based desktop application for managing and analyzing patient data for salivary gland tumors. The application is developed at the University of West Bohemia in Pilsen and supports encrypted data storage, statistical analysis, and Kaplan-Meier survival curve visualization.

## Key Technologies

-   **Electron 29** with TypeScript
-   **React 18** with Material-UI (MUI)
-   **SQLite3** for local database
-   **Electron Forge** for building and packaging
-   **Webpack** for bundling
-   **Jest** with React Testing Library for testing

## Development Commands

### Build and Run

```bash
npm install              # Install dependencies
npm start               # Start development server with DevTools
npm run package         # Package the app (without making installers)
npm run make            # Build installers (output in out/make/)
npm run publish         # Publish to GitHub (requires GITHUB_TOKEN)
```

### Code Quality

```bash
npm run prettier        # Check code formatting
npm run prettier:fix    # Auto-fix formatting issues
npm run eslint          # Lint TypeScript files
npm run eslint:fix      # Auto-fix linting issues
```

### Testing

```bash
npm test                # Run all tests
npm run coverage        # Generate coverage report for frontend components
```

## Architecture

### Directory Structure

```
src/
├── main.ts              # Electron main process entry point
├── preload.ts           # Context bridge for renderer-main communication
├── renderer.ts          # Renderer process entry point
├── root.tsx             # React root component
├── backend/             # Main process logic
│   ├── dbManager.ts     # SQLite database initialization
│   ├── patientRepository.ts    # Patient CRUD operations
│   ├── studyRepository.ts      # Study management
│   ├── encryption.ts         # Data encryption/decryption
│   ├── passwordRepository.ts    # Password authentication
│   ├── backup.ts             # Database backup/restore
│   └── constants.ts          # Database schema definitions
├── frontend/            # Renderer process (React UI)
│   ├── components/      # React components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── types.ts        # Frontend TypeScript types
│   └── i18n.ts         # Internationalization (Czech)
└── ipc/                # IPC communication layer
    ├── ipcChannels.ts       # Channel name enums
    ├── ipcAPIHandles.ts     # API handlers
    ├── ipcEncryptionHandles.ts
    ├── ipcExportHandles.ts
    └── ipcImportHandles.ts
```

### Core Architecture Patterns

#### 1. Electron IPC Communication

The app uses a structured IPC pattern with channel enums and handlers:

-   **Channels defined in**: `src/ipc/ipcChannels.ts` (e.g., `ipcAPIGetChannels`, `ipcAPISaveChannels`)
-   **Exposed to renderer via**: `src/preload.ts` using `contextBridge.exposeInMainWorld()`
-   **Handlers in**: `src/ipc/ipcAPIHandles.ts` and related files
-   **Frontend calls via**: `window.api.*`, `window.export.*`, `window.encryption.*`, etc.

When adding new IPC functionality:

1. Define channel enum in `ipcChannels.ts`
2. Add handler in appropriate `ipc*Handles.ts` file
3. Expose in `preload.ts`
4. Call from frontend components

#### 2. Database Schema

The application manages **5 patient tables** (3 malignant, 2 benign) for different salivary glands:

-   `form_podcelistni` (Submandibular malignant)
-   `form_podjazykove` (Sublingual malignant)
-   `form_priusni` (Parotid malignant)
-   `form_submandibular_benign`
-   `form_parotid_benign`

Plus supporting tables:

-   `studie` (Studies)
-   `je_ve_studii` (Patient-Study junction table)
-   `password` (Authentication and encryption config)

Schema definitions are in `src/backend/constants.ts` with corresponding TypeScript types in `src/backend/types.ts`.

#### 3. Encryption System

The app supports optional encryption for sensitive patient data (name, surname, birth number):

-   Encryption is opt-in during first launch
-   Uses AES-256-CBC encryption (`src/backend/encryption.ts`)
-   Encrypted fields stored as `encrypted_data:iv_hex`
-   Encryption key must be stored externally by user
-   Functions: `encryptPatientData()` and `decryptPatientData()` in `patientRepository.ts`

#### 4. Form Types

Three gland types are handled via `FormType` enum (`src/frontend/constants.ts`):

```typescript
export enum FormType {
    parotid = 0, // Příušní (parotid)
    submandibular = 1, // Podčelistní (submandibular)
    sublingual = 2, // Podjazykové (sublingual)
    special = 3, // Special studies (all glands)
}
```

Each form type maps to specific malignant/benign tables.

#### 5. Study Management

Studies group patients for analysis:

-   Studies belong to a specific gland type or "special" (all types)
-   Many-to-many relationship via `je_ve_studii` junction table
-   Managed in `src/backend/studyRepository.ts`
-   UI components: `add-study.tsx`, `study-list.tsx`

#### 6. Statistical Analysis

The app includes statistical tools for medical research:

-   **Kaplan-Meier survival/recurrence curves**: `src/frontend/utils/kaplanMeierCalculations.ts`
-   **Chi-square and Fisher's exact test**: `src/frontend/utils/statistics/`
-   **T-test and U-test**: Non-parametric tests for group comparison
-   **Descriptive statistics**: Mean, median, standard deviation
-   Components in: `src/frontend/components/statistics/`

## Database Management

### Database Location

-   Development: `CSGDB/db.sqlite`
-   Production: Packaged as extra resource (see `forge.config.ts`)
-   Path resolution in `src/backend/dbManager.ts` handles both packaged and development modes

### CRUD Operations

Basic operations abstracted in `src/backend/basicOperations.ts`:

-   `insertRow()`, `updateRow()`, `deleteRow()`, `getRow()`, `getAllRows()`

Patient-specific operations in `src/backend/patientRepository.ts`:

-   `savePatient()`, `getAllPatients()`, `getFilteredPatients()`, etc.

## Building and Releasing

### Build Process

The application uses Electron Forge with Webpack plugin:

-   Main config: `webpack.main.config.ts`
-   Renderer config: `webpack.renderer.config.ts`
-   Forge config: `forge.config.ts`

Output locations:

-   Development build: `.webpack/`
-   Packaged app: `out/csgdb-{platform}-{arch}/`
-   Installers: `out/make/`

### Release Pipeline

Releases are automated via GitHub Actions (`release_tag.yml`):

1. Push a version tag: `git tag v2.0.2 && git push origin v2.0.2`
2. Pipeline checks for `release_notes/v2.0.2.md`
3. Creates GitHub release with notes
4. Builds and publishes installers via `npm run publish`

**Important**: Always create release notes file before pushing tag.

## Important Development Notes

### TypeScript Configuration

-   Target: ES6
-   JSX: react-jsx
-   Module: commonjs
-   Strict: noImplicitAny enabled

### Code Style

-   Prettier for formatting (`.prettierrc` not in repo, uses defaults)
-   ESLint with TypeScript and import plugins
-   Config: `.eslintrc.json`

### Testing

-   Jest config: `jest.config.ts`
-   Test environment: jsdom
-   Setup: `setupTests.ts`
-   Current focus: Frontend component testing
-   Coverage collected from `src/frontend/components/**/*.{ts,tsx}`

### Security Considerations

-   Never commit the encryption key
-   Patient data (jmeno, prijmeni, rodne_cislo) can be encrypted
-   Password stored hashed in database
-   Database file contains sensitive medical data

### Internationalization

The app is primarily in Czech:

-   Translations in `src/frontend/translations.ts`
-   i18next configuration in `src/frontend/i18n.ts`
-   All UI text should use translation keys

## Common Development Tasks

### Adding a New Patient Field

1. Update schema in `src/backend/constants.ts` (e.g., `parotidMalignantColumns`)
2. Update type definition in `src/backend/types.ts`
3. Add to frontend type in `src/frontend/types.ts`
4. Update form component in `src/frontend/components/forms/`
5. If sensitive, add encryption/decryption logic to `patientRepository.ts`

### Adding a New IPC Endpoint

1. Define channel enum in `src/ipc/ipcChannels.ts`
2. Create handler in `src/ipc/ipcAPIHandles.ts` (or create new handler file)
3. Register handler in `src/ipc/ipcHandles.ts`
4. Expose to renderer in `src/preload.ts`
5. Call from frontend component

### Debugging

-   Development mode automatically opens DevTools (see `main.ts:35-37`)
-   Check `process.env.NODE_ENV === 'development'`
-   Database file can be inspected with SQLite browser tools

## Node.js Version

The application requires the Node.js version pinned in `.nvmrc` (mirrored in `package.json` engines).
