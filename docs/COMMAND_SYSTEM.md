# Command System Architecture

This document outlines the architecture of the Spatial Command System, a unified modal interface for accessing all functionality within the application.

## Overview

The Command System follows the Raycast pattern, providing a single entry point to all application functionalities. It is designed to be:

- **Extensible**: New commands can be easily added to any part of the application
- **Modular**: Commands are organized into logical categories
- **Accessible**: Available via keyboard shortcuts (⌘K) or UI buttons
- **Scalable**: Built to handle an unlimited number of commands
- **Fast**: Quick access to any feature within the application

## Architecture

The Command System architecture follows SOLID principles:

### Single Responsibility Principle
- Each component has a single responsibility
- `CommandCenter` - Displays the command UI
- `CommandProvider` - Manages command state
- Section-specific providers - Register commands for their domains

### Open/Closed Principle
- The system is open for extension but closed for modification
- New command categories can be added without changing existing code
- New commands can be registered without modifying the core framework

### Liskov Substitution Principle
- Command types follow a consistent interface
- All commands have the same structure regardless of their category

### Interface Segregation Principle
- The API is minimal and focused
- Command registration hooks provide just what's needed
- Command rendering is separated from command behavior

### Dependency Inversion Principle
- High-level modules don't depend on low-level modules
- Commands are registered through abstraction (context)
- Components consume the command API through hooks

## Core Components

### 1. Command UI Components (`components/ui/command.tsx`)
- Reusable UI components built on top of CMDK
- Includes dialog, input, list, and item components
- Styled with Tailwind CSS for a consistent look and feel

### 2. Command Context (`hooks/useCommandCenter.tsx`)
- Central state management for the command system
- Handles command registration and filtering
- Manages dialog open/close state and keyboard shortcuts
- Provides functions to open specific command types directly

### 3. Command Providers (`components/CommandProviders.tsx`)
- Section-specific providers that register commands for their domains
- Organized into logical categories (application, spaces, conversations, etc.)
- Each provider registers its commands on mount and unregisters on unmount

### 4. Command Center (`components/CommandCenter.tsx`)
- Main component that displays the command UI
- Handles rendering of command groups and items
- Manages navigation between command categories

### 5. Command Button (`components/CommandButton.tsx`)
- UI component to trigger the command center
- Can be customized and placed anywhere in the application
- Includes TypedCommandButton for direct access to specific command types

### 6. Command Shortcuts (`components/CommandShortcuts.tsx`)
- Registers global keyboard shortcuts for specific command types
- Makes specific categories directly accessible via keyboard

## Command Structure

Each command follows this structure:

```typescript
interface CommandOption {
  id: string;                   // Unique identifier
  name: string;                 // Display name
  description?: string;         // Optional description
  icon?: ReactNode;             // Optional icon
  shortcut?: string[];          // Optional keyboard shortcut
  type: CommandType;            // Category (application, spaces, etc.)
  keywords?: string[];          // Optional keywords for search
  action: () => void;           // Function to execute when selected
}
```

## Extension Points

To add new commands:

1. Create a new command provider or extend an existing one
2. Define your commands following the `CommandOption` interface
3. Register them using the `useCommandRegistration` hook

For a new command category:

1. Add the new type to the `CommandType` union type
2. Create a new provider for that category
3. Add your commands following the structure above
4. Add a modal-specific shortcut if needed

## Keyboard Shortcuts

The system supports two levels of keyboard shortcuts:

1. **Global Command Center Shortcut**: `⌘K` (or `Ctrl+K` on Windows) opens the main command center.
2. **Type-Specific Shortcuts**:
   - `⌘S` - Open Spaces commands
   - `⌘T` - Open Conversations commands
   - `⌘M` - Open Models commands
   - `⌘A` - Open Actions commands

To add a new type-specific shortcut:

```typescript
// In CommandShortcuts.tsx or any component
useModalHotkey("your-command-type", "meta+letter");
```

## Design Decisions

1. **Context-based State Management**
   - Using React Context for global command state
   - Allows any component to register commands from anywhere in the app

2. **Component Composition**
   - Command UI components are composable
   - Allows for customization and future extension

3. **Keyboard Accessibility**
   - All commands are accessible via keyboard shortcuts
   - The command center itself is triggered via ⌘K (or Ctrl+K)
   - Type-specific shortcuts for direct access to specific categories

4. **Search-based Navigation**
   - Commands are searchable by name, description, and keywords
   - Enables quick access to any functionality

5. **Category-based Organization**
   - Commands are organized into logical categories
   - Provides structure to potentially hundreds of commands

6. **Direct Modal Access**
   - Each command category can be accessed directly
   - Supports both keyboard shortcuts and UI buttons

## Future Improvements

1. **Command History**
   - Track recently used commands
   - Allow quick access to frequently used actions

2. **Dynamic Command Loading**
   - Lazy-load commands based on application state
   - Register commands only when needed

3. **Sub-commands and Nested Navigation**
   - Add support for commands that open sub-menus
   - Enable more complex command hierarchies

4. **Command Permissions**
   - Control command visibility based on user permissions
   - Show/hide commands based on application state

5. **Command Palettes**
   - Create context-specific command palettes
   - Show different sets of commands based on the current view 