/**
 * Re-export everything from types/index.ts to maintain compatibility
 */
export * from './types/index';

/**
 * Additional types specific to IPC events and other shared constructs
 */

import {
  AuthEvents,
  CommandCenterEvents,
  SpaceEvents,
  MessageEvents,
  SearchEvents,
  UserEvents,
  ConversationEvents,
  AppStateEvents,
  NotificationEvents,
  ChatEvents
} from './core/ipc/constants';

// Types for Chat IPC events
export interface ChatStreamStartEvent {
  chatId: string;
}

export interface ChatStreamChunkEvent {
  chatId: string;
  chunk: any;
}

export interface ChatStreamFinishEvent {
  chatId: string;
}

export interface ChatStreamErrorEvent {
  chatId: string;
  error: string;
}

// Chat Event Type
export type ChatEventType = typeof ChatEvents[keyof typeof ChatEvents];

declare global {
  interface Window {
    electron: {
      verifyToken: () => Promise<IpcResponse>;
      getAuthToken: () => Promise<IpcResponse>;
      signIn: (email: string, password: string) => Promise<IpcResponse>;
      signUp: (email: string, password: string) => Promise<IpcResponse>;
      signOut: () => Promise<IpcResponse>;
      resetPassword: (email: string) => Promise<IpcResponse>;
      getAccessToken: () => Promise<IpcResponse<string>>;
      setAccessToken: (token: string) => Promise<IpcResponse<void>>;
      
      // Space APIs
      getSpaces: () => Promise<IpcResponse>;
      getActiveSpace: () => Promise<IpcResponse>;
      setActiveSpace: (spaceId: string) => Promise<IpcResponse>;
      updateSpace: (spaceId: string, data: any) => Promise<IpcResponse>;
      updateSpaceModel: (spaceId: string, model: string) => Promise<IpcResponse>;
      createSpace: (data: any) => Promise<IpcResponse>;
      deleteSpace: (spaceId: string) => Promise<IpcResponse>;
      
      // Message APIs
      getConversationMessages: (conversationId: string) => Promise<IpcResponse>;
      sendMessage: (data: any) => Promise<IpcResponse>;
      deleteMessage: (data: any) => Promise<IpcResponse>;
      updateMessage: (data: any) => Promise<IpcResponse>;
      
      // Chat APIs
      initiateChat: (chatId: string, chatRequest: any) => Promise<IpcResponse>;
      cancelChat: (chatId: string) => Promise<IpcResponse>;
      
      // Conversation APIs
      getConversations: () => Promise<IpcResponse>;
      createConversation: (spaceId: string, title: string) => Promise<IpcResponse>;
      updateConversation: (conversationId: string, data: any) => Promise<IpcResponse>;
      deleteConversation: (conversationId: string) => Promise<IpcResponse>;
      
      // App State APIs
      getAppState: () => Promise<IpcResponse>;
      syncAppState: () => Promise<IpcResponse>;
      refreshAppData: () => Promise<IpcResponse>;
      
      // IPC Utils
      on: (channel: string, callback: Function) => () => void;
      off: (channel: string, callback: Function) => void;
      removeAllListeners: (channel: string) => void;
      invoke: <T = any>(channel: string, ...args: any[]) => Promise<IpcResponse & { data?: T }>;
      send: (channel: string, data: IpcResponse) => void;
      
      // Command Center APIs
      toggleCommandCenter: () => Promise<IpcResponse>;
      showCommandCenter: () => Promise<IpcResponse>;
      closeCommandCenter: () => Promise<IpcResponse>;
      setCommandType: (type: string) => Promise<IpcResponse>;
      checkCommandType: () => Promise<IpcResponse>;
      syncCommandCenterState: () => Promise<IpcResponse>;
      refreshCommandCenter: () => Promise<IpcResponse>;
      openDialog: (type: string) => Promise<IpcResponse>;
      
      // User APIs
      getProfile: () => Promise<IpcResponse>;
      updateProfile: (data: any) => Promise<IpcResponse>;
      updatePassword: (currentPassword: string, newPassword: string) => Promise<IpcResponse>;
      
      // Notification APIs
      getNotifications: () => Promise<IpcResponse>;
      markNotificationAsRead: (notificationId: string) => Promise<IpcResponse>;
      markAllNotificationsAsRead: () => Promise<IpcResponse>;
    };
  }
}