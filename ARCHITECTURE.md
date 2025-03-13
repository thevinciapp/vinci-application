# Vinci Application Architecture

This document outlines the architectural plan for restructuring the Vinci application to improve scalability, maintainability, and extensibility.

## Core Principles

- **Feature-Driven Architecture**: Organize code around business domains rather than technical concerns
- **Separation of Concerns**: Keep components, logic, and styling cleanly separated
- **Consistent Patterns**: Use consistent naming, folder structures, and design patterns
- **Scalability**: Design for growth with modular, decoupled systems
- **Developer Experience**: Prioritize clear organization, discoverability, and maintainability

## Folder Structure Overview

```
src/
├── features/           # Feature-based modules (domain-driven)
├── components/         # Shared, reusable components 
├── hooks/              # Custom React hooks
├── libs/               # Core libraries and utilities
├── services/           # External API interactions
├── stores/             # State management
├── types/              # TypeScript type definitions
├── utils/              # Helper functions
└── electron/           # Electron-specific code
```

## Feature Modules

Each feature is self-contained with its own components, logic, and types:

```
features/auth/
├── components/         # Feature-specific components
├── hooks/              # Feature-specific hooks
├── stores/             # Feature-specific state
├── types/              # Feature-specific types
├── utils/              # Feature-specific utilities
├── api.ts              # API interactions for this feature
└── index.ts            # Public exports
```

### Primary Features

1. **Auth**
   - User authentication and profile management
   - Sign-in, sign-up, password reset, account management

2. **Chat**
   - Chat interface and interaction
   - Message rendering, user input, streaming status

3. **Conversations**
   - Conversation management
   - Creation, editing, deleting, and organizing conversations

4. **Spaces**
   - Space management (collections of conversations)
   - Creation, editing, deleting, and organization

5. **Command Center**
   - Central command interface
   - Quick actions, command registry, command processing

6. **Settings**
   - Application settings and preferences
   - User settings, application configuration

## Shared Components

Reusable components accessible across the application:

```
components/
├── ui/                 # Basic UI components (buttons, inputs, etc.)
├── layout/             # Layout components
├── forms/              # Form-related components
└── feedback/           # Toasts, alerts, etc.
```

## Services Layer

Interfaces for external systems and APIs:

```
services/
├── api/                # Base API service (fetch abstraction)
├── auth/               # Authentication service
├── storage/            # Secure storage service
└── analytics/          # Analytics service
```

## Type System

Comprehensive TypeScript type definitions:

```
types/
├── api/                # API-related types
├── models/             # Data models
├── ui/                 # UI-related types
├── electron/           # Electron-related types
└── index.ts            # Common types
```

## Electron Integration

Electron-specific code separated into a dedicated structure:

```
electron/
├── main/               # Main process code
├── preload/            # Preload scripts
├── ipc/                # IPC communication layer
├── services/           # Electron services
└── types/              # Electron-specific types
```

## State Management

Centralized state management with predictable patterns:

```
stores/
├── auth/               # Authentication state
├── chat/               # Chat state
├── spaces/             # Spaces state
├── settings/           # Application settings state
└── index.ts            # Store initialization and exports
```

## Hooks

Custom React hooks for reusable logic:

```
hooks/
├── use-auth.ts         # Authentication hooks
├── use-api.ts          # API interaction hooks
├── use-local-storage.ts # Local storage hooks
└── index.ts            # Hook exports
```

## Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Files**: kebab-case (e.g., `auth-service.ts`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useAuth`)
- **Types**: PascalCase with Type or interface suffix (e.g., `UserProfileType`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_TIMEOUT`)

## Import Structure Guidelines

- Path aliases for cleaner imports (e.g., `@features/auth` instead of `../../../features/auth`)
- Barrel exports via index.ts files to simplify imports
- Explicit import groups and ordering:
  1. React and core libraries
  2. External dependencies
  3. Internal modules
  4. Types
  5. Styles

## Testing Framework

```
__tests__/
├── unit/               # Unit tests
├── integration/        # Integration tests
└── e2e/                # End-to-end tests
```

## Documentation

```
docs/
├── architecture/       # Architecture diagrams and decisions
├── api/                # API documentation
├── features/           # Feature documentation
└── README.md           # Root documentation
```

## Implementation Strategy

1. **Phase 1: Core Infrastructure**
   - Establish folder structure
   - Create path aliases
   - Set up barrel exports

2. **Phase 2: Feature Migration**
   - Migrate auth feature
   - Migrate chat feature
   - Migrate conversations feature
   - Migrate spaces feature
   - Migrate command center feature
   - Migrate settings feature

3. **Phase 3: Integration & Testing**
   - Update imports across the codebase
   - Test functionality
   - Fix integration issues

4. **Phase 4: Refinement & Documentation**
   - Standardize components
   - Improve type coverage
   - Complete documentation

## Benefits of This Architecture

- **Scalability**: Easily add new features without modifying existing code
- **Maintainability**: Clear organization makes code easier to understand and modify
- **Collaboration**: Teams can work on different features independently
- **Reusability**: Components and logic are organized for maximum reuse
- **Testability**: Clean separation of concerns makes testing simpler
- **Onboarding**: Clear structure makes it easier for new developers to understand the system

## Best Practices

- Keep feature modules focused on a single responsibility
- Minimize dependencies between features
- Use interfaces to define contracts between modules
- Document architectural decisions and patterns
- Follow consistent patterns throughout the codebase
- Prioritize type safety and comprehensive type definitions
