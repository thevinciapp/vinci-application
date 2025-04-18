# Core

The `core` directory contains foundational modules and cross-cutting concerns for the application. These modules provide essential functionality that is used throughout the codebase, such as authentication, inter-process communication (IPC), window management, and shared utilities.

- `auth/`: Authentication logic and helpers.
- `ipc/`: IPC handlers and communication logic (renderer-safe).
- `utils/`: Core utility functions.
- `window/`: Window management logic.

This folder is intended for modules that are central to the application's architecture and are not specific to any single feature or domain.