# Czech Salivary Gland Database (CSGDB)

## Project Overview

**CSGDB** is a desktop application developed for the University of West Bohemia to manage and analyze data for patients with salivary gland tumors. It facilitates data collection, patient management, study creation, and data export/import.

The application is built using **Electron** and **React**, ensuring cross-platform compatibility (targeted primarily for Windows based on the `make` targets). It uses a local **SQLite** database for data persistence and supports encryption for sensitive patient data.

## Key Technologies

-   **Runtime:** Node.js, Electron (v29.x)
-   **Language:** TypeScript
-   **Frontend:** React (v18.x), Material UI (MUI), Emotion (styling)
-   **Backend (Local):** SQLite (`sqlite3`)
-   **Build System:** Electron Forge, Webpack
-   **Testing:** Jest, React Testing Library
-   **Data Visualization:** Recharts, jStat (statistics)
-   **Internationalization:** i18next

## Directory Structure

-   `src/backend/`: Contains backend logic, database management (`dbManager.ts`), encryption, and specific managers for patients and studies.
-   `src/frontend/`: Contains the React application code.
    -   `components/`: UI components (forms, lists, buttons).
    -   `translations.ts`: Localization resources.
-   `src/ipc/`: Defines Inter-Process Communication (IPC) channels between the main (Node.js) and renderer (React) processes.
-   `src/main.ts`: Main process entry point.
-   `src/renderer.ts`: Renderer process entry point.
-   `src/preload.ts`: Preload script to bridge the main and renderer processes securely.
-   `__tests__/`: Contains unit and integration tests.
-   `public/`: Static assets (fonts, images, locales).

## Building and Running

### Prerequisites

-   Node.js (version pinned in `.nvmrc`)
-   NPM

### Commands

-   **Start Development Server:**
    ```bash
    npm start
    # Runs `electron-forge start`
    ```
-   **Run Tests:**
    ```bash
    npm test
    # Runs `jest`
    ```
-   **Lint Code:**
    ```bash
    npm run eslint
    ```
-   **Format Code:**
    ```bash
    npm run prettier
    ```
-   **Package Application:**
    ```bash
    npm run package
    # Runs `electron-forge package`
    ```
-   **Build Installers (Make):**
    ```bash
    npm run make
    # Runs `electron-forge make`. Generates installers in the `out/` directory.
    ```

## Development Conventions

-   **Type Safety:** The project uses **TypeScript** with `noImplicitAny: true`. Ensure all new code is strictly typed.
-   **Component Style:** React components are functional and use hooks. Material UI is used for the design system.
-   **IPC:** Communication between the frontend and backend is strictly typed via channels defined in `src/ipc/ipcChannels.ts`.
-   **Database:** Database schemas are defined in `src/backend/constants.ts` and types in `src/backend/types.ts`. The database is automatically initialized on startup if it doesn't exist.
-   **Testing:** Write unit tests for new components and logic in the `__tests__` directory.
-   **Formatting:** Follow the Prettier and ESLint configurations (`.prettierrc.json`, `.eslintrc.json`).

## Database & Security

-   The application uses a local SQLite database (`db.sqlite` in the app directory or `app.asar` sibling).
-   **Encryption:** The app supports an encrypted mode where sensitive data is protected. Keys and password management logic reside in `src/backend/encryption.ts` and `src/backend/passwordRepository.ts`.
