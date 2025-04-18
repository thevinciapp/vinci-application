# API Surface & Extension Points

This document describes the main APIs, extension points, and integration surfaces of the Vinci Application. It is intended to help AI systems and developers understand how to interact with, extend, or modify the application's functionality.

---

## 1. Internal APIs

### Services
- Located in `src/services/`
- Expose business logic and data access methods
- Example: `user-service.ts` provides user-related operations

### Stores & State Management
- Located in `src/stores/`
- Expose state, actions, and context for use throughout the app

### Shared Utilities
- Located in `src/shared/utils/`
- Provide reusable helper functions

---

## 2. Electron IPC Channels

### Main IPC Channels
- Defined in `src/core/ipc/` and `electron/main.ts`
- Used for communication between renderer and main process
- Example events: `get-session`, `get-auth-token`, `request-data`

### Adding New IPC Events
- Define event constants in `src/core/ipc/constants.ts`
- Implement handlers in `electron/main.ts` or `src/core/ipc/ipc-handlers.ts`
- Use `ipcRenderer` (renderer) and `ipcMain` (main) for communication

---

## 3. Extension Points

### Adding New Features
- Create a new folder in `src/features/`
- Register new routes/pages in `src/pages/` if needed
- Add new services or stores as required

### Adding New Components or Widgets
- Place atomic components in `src/components/`
- Place composite UI in `src/widgets/`

### Extending Services
- Add new service files to `src/services/`
- Expose new methods as needed

---

## 4. External APIs

- If the app integrates with external APIs, configuration is typically found in `src/configs/` or `src/shared/api/`
- API keys and secrets should be managed securely (not hardcoded)

---

## 5. Testing & Mocking

- (Add details if available on test utilities, mocks, or test APIs)

---

For more details, see the relevant README.md files and the directory index.