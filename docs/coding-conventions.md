# Coding Conventions & Architectural Decisions

This document outlines the coding standards, architectural patterns, and best practices for the Vinci Application. Adhering to these conventions ensures consistency, maintainability, and ease of collaboration for both AI systems and developers.

---

## 1. Language & Style

- **Language:** TypeScript (strict mode enabled)
- **Framework:** React (functional components, hooks)
- **File Naming:** kebab-case for files, PascalCase for components/classes, camelCase for variables/functions
- **Folder Naming:** Plural for collections (e.g., `features/`, `stores/`, `configs/`)
- **Imports:** Use absolute imports from `src/` root when possible

---

## 2. Architectural Patterns

- **Modular Structure:** Organize code by feature/domain
- **Separation of Concerns:** Keep UI, business logic, and data access separate
- **Reusable Components:** Place atomic components in `components/`, composite UI in `widgets/`
- **Shared Code:** Utilities, types, and constants go in `shared/`

---

## 3. Folder & File Organization

- **Entry Points:** `electron/main.ts`, `electron/preload.ts`, `src/main.tsx`, `src/App.tsx`
- **Feature Modules:** Group related logic in `features/`
- **State Management:** Use `stores/` for state, actions, and contexts
- **Services:** Place business logic and data access in `services/`
- **Schemas:** Define data validation and types in `schemas/`

---

## 4. Documentation & Comments

- **README.md:** Each major folder should have a README.md describing its purpose
- **Inline Comments:** Use JSDoc/TSDoc for complex logic or public APIs
- **Architecture Docs:** Update `docs/` when making significant structural changes

---

## 5. Linting & Formatting

- **Linting:** ESLint with project-specific config (`eslint.config.mjs`)
- **Formatting:** Prettier or project-defined style rules
- **CI:** Ensure lint and format checks pass before merging

---

For more details, see the directory index and folder-level README.md files.