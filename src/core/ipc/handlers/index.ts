import { registerAuthHandlers } from './auth-handlers';
import { registerMessageHandlers } from './message-handlers';
import { registerSpaceHandlers } from './space-handlers';
import { registerAppStateHandlers } from './app-state-handlers';
import { registerCommandCenterHandlers } from './command-center-handlers';
import { registerConversationHandlers } from './conversation-handlers';
import { registerUserHandlers } from './user-handlers';
import { registerNotificationHandlers } from './notification-handlers';
import { registerChatHandlers } from './chat-handlers';
import { Message, Space, Conversation, Notification } from '@/types';

export interface IpcResponse {
  success: boolean;
  status?: string;
  data?: any;
  error?: string;
}

export interface StateUpdate {
  type: string;
  payload: any;
}

export interface AuthResponse extends IpcResponse {
  data?: any;
}

export interface MessageResponse extends IpcResponse {
  data?: Message | Message[] | { deleted: boolean };
}

export interface SpaceResponse extends IpcResponse {
  data?: Space | Space[] | { deleted: boolean } | { updated: boolean };
}

export interface ConversationResponse extends IpcResponse {
  data?: Conversation | Conversation[] | { deleted: boolean } | { updated: boolean };
}

export interface NotificationResponse extends IpcResponse {
  data?: Notification | Notification[] | { deleted: boolean } | { updated: boolean };
}

export interface ChatResponse extends IpcResponse {
  chatId?: string;
  chunk?: any;
  error?: string;
}

export type AppStateResponse = IpcResponse;
export type CommandCenterResponse = IpcResponse;
export type UserResponse = IpcResponse;

export function registerAllHandlers() {
  registerAuthHandlers();
  registerMessageHandlers();
  registerSpaceHandlers();
  registerAppStateHandlers();
  registerCommandCenterHandlers();
  registerConversationHandlers();
  registerUserHandlers();
  registerNotificationHandlers();
  registerChatHandlers();
}