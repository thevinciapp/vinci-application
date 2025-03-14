# IPC Event System Documentation

## Overview
This document outlines the Inter-Process Communication (IPC) event system used in the Vinci application. The system is designed to provide type-safe, maintainable, and centralized event handling between the main and renderer processes.

## Event Constants
Located in `src/core/ipc/constants.ts`, our IPC events are organized into distinct categories:

### Authentication Events
```typescript
export const AuthEvents = {
  GET_SESSION: 'get-session',
  GET_AUTH_TOKEN: 'get-auth-token',
  REFRESH_AUTH_TOKENS: 'refresh-auth-tokens',
  SIGN_UP: 'sign-up',
  SIGN_OUT: 'sign-out',
  RESET_PASSWORD: 'reset-password',
  SET_AUTH_TOKENS: 'set-auth-tokens',
  CLEAR_AUTH_DATA: 'clear-auth-data'
}
```

### Command Center Events
```typescript
export const CommandCenterEvents = {
  OPEN_DIALOG: 'open-dialog',
  DIALOG_OPENED: 'dialog-opened',
  DIALOG_CLOSED: 'dialog-closed',
  TOGGLE: 'toggle-command-center',
  SHOW: 'show-command-center',
  CLOSE: 'close-command-center',
  SET_TYPE: 'set-command-type',
  SYNC_STATE: 'sync-command-center-state',
  REFRESH: 'refresh-command-center',
  CHECK_TYPE: 'check-command-type'
}
```

### Space Events
```typescript
export const SpaceEvents = {
  GET_SPACE_CONVERSATIONS: 'get-space-conversations',
  UPDATE_SPACE: 'update-space',
  UPDATE_SPACE_MODEL: 'update-space-model',
  SET_ACTIVE_SPACE: 'set-active-space'
}
```

### Message Events
```typescript
export const MessageEvents = {
  GET_CONVERSATION_MESSAGES: 'get-conversation-messages',
  SEND_MESSAGE: 'send-message',
  DELETE_MESSAGE: 'delete-message',
  UPDATE_MESSAGE: 'update-message'
}
```

### App State Events
```typescript
export const AppStateEvents = {
  SYNC_STATE: 'sync-app-state',
  GET_STATE: 'get-app-state',
  REFRESH_DATA: 'refresh-app-data',
  STATE_UPDATED: 'state-updated'
}
```

## IPC Utilities
Located in `electron/preload/utils/ipc.ts`, these utilities provide a consistent interface for IPC communication:

```typescript
export const ipcUtils = {
  // Register event listener
  on: (channel: IpcEventType, callback: EventCallback) => {...},
  
  // Remove specific event listener
  off: (channel: IpcEventType, callback: EventCallback) => {...},
  
  // Remove all listeners for a channel
  removeAllListeners: (channel: IpcEventType) => {...},
  
  // Make IPC calls with promise support
  invoke: <T>(channel: IpcEventType, ...args: any[]) => Promise<...>,
  
  // Send one-way IPC messages
  send: (channel: IpcEventType, data: IpcResponse) => {...}
}
```

## State Management
- Using Zustand for state management
- State synchronization between main and renderer processes via IPC events
- Centralized state updates through AppStateEvents

## Type Safety
- All IPC events are typed using TypeScript
- Event types are defined in `src/types/index.ts`
- Type checking for both event names and payload data
- Autocomplete support in IDE

## Best Practices

### 1. Event Naming
- Use consistent naming conventions
- Group related events together
- Use descriptive names that indicate purpose

### 2. Error Handling
- Always include success/error status in responses
- Provide meaningful error messages
- Handle errors appropriately in both processes

### 3. Event Usage
- Use `invoke` for request-response patterns
- Use `send` for one-way notifications
- Clean up listeners when components unmount

### 4. State Updates
- Use AppStateEvents for global state changes
- Keep state updates atomic
- Validate state changes before applying

## Security Considerations
- Validate all IPC inputs
- Use encryption for sensitive data
- Implement proper access controls
- Handle errors securely

## Testing
- Unit test each event handler
- Test error scenarios
- Validate event payloads
- Test state synchronization

## Examples

### Component Usage
```typescript
// Using IPC in a React component
useEffect(() => {
  const handleStateUpdate = (event: any, data: any) => {
    // Handle state update
  };

  // Register listener
  const cleanup = window.electron.on('state-updated', handleStateUpdate);

  // Clean up on unmount
  return cleanup;
}, []);
```

### Making IPC Calls
```typescript
// Invoking IPC methods
const response = await window.electron.invoke('get-app-state');
if (response.success) {
  // Handle success
} else {
  // Handle error
}
```
