# Directory & File Index

This document provides a directory-by-directory and file-by-file breakdown of the Vinci Application project, describing the purpose of each major folder and key files. This index is designed to help AI systems and developers quickly understand the structure and intent of the codebase.

---

## Root Directory (`vinci-application/`)
- `.gitignore` – Git ignore rules
- `bun.lock` – Bun package manager lockfile
- `components.json` – Component registry/config
- `electron.vite.config.ts` – Vite config for Electron
- `eslint.config.mjs` – ESLint configuration
- `index.html` – Main HTML entry for renderer
- `package.json` – Project manifest
- `package-lock.json` – NPM lockfile
- `postcss.config.js` – PostCSS configuration
- `README.md` – Project readme
- `tsconfig.json` – TypeScript configuration

### Key Folders
- `docs/` – Project documentation (architecture, data flow, etc.)
- `electron/` – Electron main process, preload scripts, and config
- `src/` – Main application source code (React, business logic, features)

---

## Electron Directory (`electron/`)
- `main.ts` – Electron main process entry
- `preload.ts` – Preload script for secure IPC
- `tsconfig.json` – TypeScript config for Electron
- `preload/` – Additional preload modules

---

## Source Directory (`src/`)
- `App.tsx` – Main React app component
- `main.tsx` – Renderer entry point

### Main Subdirectories
- `app/` – Application-level logic and setup
- `components/` – Atomic/small reusable UI components
- `configs/` – Configuration files (API, chat modes, etc.)
- `core/` – Foundational modules (auth, ipc, window, etc.)
- `entities/` – Domain entities and models
- `errors/` – Error definitions and handling
- `features/` – Feature modules (grouped by domain/feature)
- `hooks/` – Custom React hooks
- `layouts/` – Layout components and wrappers
- `pages/` – Top-level pages/views
- `registry/` – Registries for dialogs, providers, etc.
- `schemas/` – Data validation and schema definitions
- `services/` – Service classes and business logic
- `shared/` – Shared utilities, types, constants, and UI primitives
- `stores/` – State management (stores, contexts, actions)
- `styles/` – Global and modular styles
- `widgets/` – Composite UI elements (chat panels, dialogs, etc.)

---

## Documentation Directory (`docs/`)
- `component-data-flow.md` – Component-level data flow
- `data-flow-architecture.md` – Overall data flow and architecture
- `electron-preload-modularization.md` – Electron preload structure
- `ipc-event-system.md` – IPC event system documentation
- `state-management.md` – State management patterns
- `overview.md` – High-level project overview
- `directory-index.md` – (this file) Directory and file index
- `api-surface.md` – (to be created) API surface and extension points
- `coding-conventions.md` – (to be created) Coding standards and architectural decisions
- `safe-refactoring.md` – (to be created) Safe refactoring and feature addition guide
- `build-test-deploy.md` – (to be created) Build, test, and deployment instructions
- `faq.md` – (to be created) Frequently asked questions

---

For more details on each folder, see the README.md files within those folders.