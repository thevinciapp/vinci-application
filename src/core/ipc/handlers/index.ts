import { registerAuthHandlers } from './auth-handlers';
import { registerMessageHandlers } from './message-handlers';
import { registerSpaceHandlers } from './space-handlers';
import { registerAppStateHandlers } from './app-state-handlers';
import { registerCommandCenterHandlers } from './command-center-handlers';
import { registerConversationHandlers } from './conversation-handlers';
import { registerUserHandlers } from './user-handlers';
import { registerNotificationHandlers } from './notification-handlers';

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
export type CommandCenterResponse = IpcResponse;
export type ConversationResponse = IpcResponse;
export type UserResponse = IpcResponse;
export type NotificationResponse = IpcResponse;

/**
 * Register all IPC handlers for the application
 */
export function registerAllHandlers() {
  // Register all handler modules
  registerAuthHandlers();
  registerMessageHandlers();
  registerSpaceHandlers();
  registerAppStateHandlers();
  registerCommandCenterHandlers();
  registerConversationHandlers();
  registerUserHandlers();
  registerNotificationHandlers();
}
