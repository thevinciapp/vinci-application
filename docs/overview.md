# Vinci Application – Project Overview

## Purpose
Vinci Application is a modular, scalable desktop application built with Electron and React. It is designed to provide a robust, maintainable platform for advanced user workflows, integrating modern frontend and backend technologies.

## Tech Stack
- **Frontend:** React, TypeScript
- **Desktop Shell:** Electron
- **State Management:** Custom stores, React context/hooks
- **Styling:** CSS, PostCSS
- **Build Tools:** Vite, Bun
- **Testing:** (Add details if available)
- **Other:** Modular architecture, domain-driven design

## Main Entry Points
- **Electron Main Process:** `electron/main.ts`
- **Electron Preload Script:** `electron/preload.ts`
- **Renderer (React App):** `src/main.tsx` and `src/App.tsx`

## Key Features
- Modular, feature-based directory structure
- Clear separation of Electron and renderer code
- Shared utilities and components for reusability
- Comprehensive documentation for maintainability

## How to Use This Documentation
This documentation is structured to help both AI systems and developers:
- Understand the project’s architecture and conventions
- Safely navigate and modify the codebase
- Onboard quickly and contribute effectively

For a directory-by-directory breakdown, see `directory-index.md`.