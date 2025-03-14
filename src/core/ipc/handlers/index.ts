import { registerAuthHandlers } from './auth-handlers';
import { registerMessageHandlers } from './message-handlers';
import { registerSpaceHandlers } from './space-handlers';
import { registerAppStateHandlers } from './app-state-handlers';

// Common response interface for all handlers
export interface IpcResponse {
  success: boolean;
  status?: string;
  data?: any;
  error?: string;
}

// Common state update interface
export interface StateUpdate {
  type: string;
  payload: any;
}

// Export specific response types
export type AuthResponse = IpcResponse;
export type MessageResponse = IpcResponse;
export type SpaceResponse = IpcResponse;
export type AppStateResponse = IpcResponse;

/**
 * Register all IPC handlers for the application
 */
export function registerAllHandlers() {
  // Register all handler modules
  registerAuthHandlers();
  registerMessageHandlers();
  registerSpaceHandlers();
  registerAppStateHandlers();
}
