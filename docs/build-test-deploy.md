# Build, Test & Deploy Instructions

This document provides step-by-step instructions for building, testing, and deploying the Vinci Application. It is intended to help AI systems and developers automate and validate the project lifecycle.

---

## 1. Build

### Development Build
- Install dependencies:  
  ```sh
  bun install
  ```
- Start the development server:  
  ```sh
  bun run dev
  ```
- For Electron:  
  ```sh
  bun run electron:dev
  ```

### Production Build
- Build the renderer and Electron main process:  
  ```sh
  bun run build
  ```

---

## 2. Test

- Run all tests:  
  ```sh
  bun run test
  ```
- (Add details for unit, integration, or E2E tests if available)

---

## 3. Lint & Format

- Lint the codebase:  
  ```sh
  bun run lint
  ```
- Format the codebase:  
  ```sh
  bun run format
  ```

---

## 4. Deploy

- (Add deployment instructions if applicable, e.g., packaging Electron app, CI/CD steps)

---

## 5. Environment Variables

- Environment variables are managed via `.env` files or project configuration.
- Do not commit secrets or sensitive data to version control.

---

For more details, see the project README.md and architecture docs.