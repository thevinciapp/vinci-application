// electron.d.ts
/**
 * TypeScript definitions for Electron API
 * This file defines types for the APIs exposed through the preload script
 * and augments the Window interface to include our IPC communication types
 */

import { AuthEvents, AppStateEvents, CommandCenterEvents, SpaceEvents, MessageEvents, NotificationEvents, ConversationEvents } from '@/core/ipc/constants';
import { IpcResponse, IpcStateResponse } from '.';

// Types for API responses
type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Types for auth-related responses
type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

// Types for space-related data
type Space = {
  id: string;
  name: string;
  description?: string;
  model?: string;
  provider?: string;
  conversations?: Conversation[];
};

// Types for conversation-related data
type Conversation = {
  id: string;
  spaceId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

// Types for message-related data
type Message = {
  id: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: string;
};

// Types for command center data
type CommandCenterState = {
  isOpen: boolean;
  activeCommand?: string;
  dialogType?: string;
  dialogData?: any;
};

/**
 * Main ElectronAPI interface that defines all available IPC methods
 */
interface ElectronAPI {
  /**
   * Set authentication tokens for Electron main process
   */
  [AuthEvents.SET_AUTH_TOKENS]?: (accessToken: string, refreshToken: string) => Promise<boolean>;
  
  /**
   * Get current authentication token from Electron main process
   * Will automatically refresh if needed using the refresh token
   */
  [AuthEvents.GET_SESSION]?: () => Promise<string | null>;
  
  /**
   * Force refresh of authentication tokens
   */
  [AuthEvents.REFRESH_TOKEN]?: () => Promise<{ 
    success: boolean; 
    accessToken?: string; 
    expiresAt?: number;
    error?: string;
  }>;
  
  /**
   * Sign out and clear all tokens
   */
  [AuthEvents.SIGN_OUT]?: () => Promise<boolean>;
  
  /**
   * Get access token from main process
   */
  [AuthEvents.GET_ACCESS_TOKEN]?: () => Promise<IpcResponse<string>>;

  /**
   * Set access token in main process
   */
  [AuthEvents.SET_ACCESS_TOKEN]?: (token: string) => Promise<IpcResponse<void>>;

  /**
   * Get the current application state
   */
  [AppStateEvents.GET_STATE]?: () => Promise<{
    success: boolean;
    data?: AppState;
    error?: string;
  }>;

  /**
   * Refresh the application data from the server
   */
  [AppStateEvents.REFRESH_DATA]?: () => Promise<{
    success: boolean;
    data?: AppState;
    error?: string;
  }>;

  /**
   * Get conversations for a specific space
   */
  [SpaceEvents.GET_CONVERSATIONS]?: (spaceId: string) => Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }>;

  /**
   * Get messages for a specific conversation
   */
  [MessageEvents.GET_MESSAGES]?: (conversationId: string) => Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }>;

  /**
   * Update a space with new data
   */
  [SpaceEvents.UPDATE_SPACE]?: (spaceId: string, spaceData: any) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }>;

  /**
   * Update a space's model and provider
   */
  [SpaceEvents.UPDATE_MODEL]?: (spaceId: string, model: string, provider: string) => Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Set the active space
   */
  [SpaceEvents.SET_ACTIVE]?: (spaceId: string) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }>;

  /**
   * Sync application state changes to other windows
   */
  [AppStateEvents.SYNC_STATE]?: (newState: any) => void;

  /**
   * Listen for initialization of app state
   */
  [AppStateEvents.GET_STATE]?: (callback: (event: any, state: any) => void) => () => void;

  /**
   * Listen for app data updates
   */
  [AppStateEvents.STATE_UPDATED]?: (callback: (event: Electron.IpcRendererEvent, update: {
    success: boolean;
    data?: AppState;
    error?: string;
  }) => void) => () => void;
  /**
   * Open a specific command type
   */
  [CommandCenterEvents.OPEN]?: (commandType: string) => void;

  /**
   * Close the command center window
   */
  [CommandCenterEvents.CLOSE]?: () => void;

  /**
   * Refresh command center data
   */
  [CommandCenterEvents.REFRESH]?: () => void;

  /**
   * Register listener for command center toggle events
   */
  [CommandCenterEvents.TOGGLE]?: (callback: () => void) => () => void;

  /**
   * Register listener for refreshing command center
   */
  [CommandCenterEvents.REFRESH]?: (callback: () => void) => () => void;

  /**
   * Register listener for synced command center state across all windows
   */
  [CommandCenterEvents.SYNC_STATE]?: (callback: (event: any, action: string, data?: any) => void) => () => void;

  /**
   * Open a dialog with a specific type and data
   */
  /**
   * Open a dialog with a specific type and data
   */
  [CommandCenterEvents.OPEN_DIALOG]?: (dialogType: string, data: any) => void;

  /**
   * Notify the main process that a dialog has opened
   */
  [CommandCenterEvents.DIALOG_OPENED]?: () => void;

  /**
   * Notify the main process that a dialog has closed
   */
  [CommandCenterEvents.DIALOG_CLOSED]?: () => void;

  /**
   * Register listener for opening dialogs
   */
  [CommandCenterEvents.ON_DIALOG_OPEN]?: (callback: (event: any, dialogType: string, data: any) => void) => () => void;

  /**
   * Check if a command type is active
   */
  [CommandCenterEvents.CHECK_TYPE]?: (commandType: string) => void;

  /**
   * Register listener for checking command type
   */
  [CommandCenterEvents.ON_CHECK_TYPE]?: (callback: (event: any, commandType: string) => void) => () => void;

  /**
   * Window resize listener
   */
  [CommandCenterEvents.ON_RESIZE]?: (callback: (event: any, dimensions: { width: number; height: number }) => void) => () => void;

  /**
   * Remove window resize listener
   */
  [CommandCenterEvents.REMOVE_RESIZE_LISTENER]?: () => void;

  /**
   * Search for files based on a search term
   */
  [CommandCenterEvents.SEARCH_FILES]?: (searchTerm: string) => Promise<Array<{
    path: string;
    name: string;
    type: string;
    size?: number;
    modified?: number | string;
  }>>;

  /**
   * Read file content using IPC
   */
  [CommandCenterEvents.READ_FILE]?: (filePath: string) => Promise<{
    content: string;
    metadata?: any;
  }>;

  /**
   * Test function to check if Electron API is available
   */
  [CommandCenterEvents.PING]?: () => string;

  /**
   * Toggle command center visibility
   */
  [CommandCenterEvents.TOGGLE]?: () => void;

  /**
   * Register listener for setting command type
   */
  [CommandCenterEvents.ON_SET_TYPE]?: (callback: (event: any, commandType: string) => void) => () => void;
}

/**
 * Augment the global Window interface to include electronAPI and IPC events
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    
    /**
     * Application-specific global properties
     */
    __SPATIAL_APP_VERSION__: string;
    __SPATIAL_ENV__: 'development' | 'production' | 'test';
    __SPATIAL_PLATFORM__: 'darwin' | 'win32' | 'linux';
    
    /**
     * Zustand store access for internal use
     * This allows direct access to the store for special cases
     */
    electron: {
      invoke(channel: string, ...args: any[]): Promise<any>;
      on(channel: string, listener: (event: any, ...args: any[]) => void): void;
      off(channel: string, listener: Function): void;
    };
    
    /**
     * Direct access to the renderer store for reset operations
     */
    rendererStore?: {
      getState(): any;
      setState(state: any): void;
      setAppState(state: any): void;
      setSpaces(spaces: any[]): void;
      setActiveSpace(space: any): void;
      setConversations(conversations: any[]): void;
      setMessages(messages: any[]): void;
      setUser(user: any): void;
      setProfile(profile: any): void;
      setLoading(isLoading: boolean): void;
      setError(error: string | null): void;
      fetchAppState(): Promise<boolean>;
      syncWithMainProcess(): Promise<boolean>;
    };
    
    /**
     * IPC Event Handlers
     * These are injected by the preload script
     */
    ipcRenderer: {
      // Standard IPC methods
      invoke<T = any>(channel: string, ...args: any[]): Promise<T>;
      send(channel: string, ...args: any[]): void;
      on(channel: string, listener: (event: any, ...args: any[]) => void): void;
      once(channel: string, listener: (event: any, ...args: any[]) => void): void;
      removeListener(channel: string, listener: Function): void;
      removeAllListeners(channel: string): void;
      
      // Typed event handlers for our IPC events
      on(event: typeof AuthEvents[keyof typeof AuthEvents], listener: (event: any, ...args: any[]) => void): void;
      on(event: typeof AppStateEvents[keyof typeof AppStateEvents], listener: (event: any, state: AppState) => void): void;
      on(event: typeof CommandCenterEvents[keyof typeof CommandCenterEvents], listener: (event: any, ...args: any[]) => void): void;
      on(event: typeof SpaceEvents[keyof typeof SpaceEvents], listener: (event: any, ...args: any[]) => void): void;
      on(event: typeof MessageEvents[keyof typeof MessageEvents], listener: (event: any, ...args: any[]) => void): void;
      on(event: typeof NotificationEvents[keyof typeof NotificationEvents], listener: (event: any, ...args: any[]) => void): void;
      on(event: typeof ConversationEvents[keyof typeof ConversationEvents], listener: (event: any, ...args: any[]) => void): void;
    };
  }
}

// Initialize electronAPI
window.electronAPI = {} as ElectronAPI;

// Export types for use in other files
export type {
  ApiResponse,
  AuthTokenResponse,
  Space,
  Conversation,
  Message,
  CommandCenterState,
  ElectronAPI
};

export interface IpcResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface CommandCenterState {
  isOpen: boolean;
  activeCommand?: CommandType;
  dialogType?: string;
  dialogData?: any;
}

export interface ElectronAPI {
  [CommandCenterEvents.SYNC_STATE]: (callback: (event: any, response: IpcResponse<CommandCenterState>) => void) => () => void;
  toggleCommandCenter: (commandType?: CommandType) => Promise<IpcResponse>;
  openCommandType: (commandType: CommandType) => Promise<IpcResponse>;
  openDialog: (dialogType: string, data: any) => Promise<IpcResponse>;
  closeDialog: () => Promise<IpcResponse>;
  closeCommandCenter: (commandType?: CommandType) => Promise<IpcResponse>;
  refreshCommandCenter: (commandType?: CommandType) => Promise<IpcResponse>;
  checkCommandType: (commandType: CommandType) => Promise<IpcResponse>;
  searchFiles: (searchTerm: string) => Promise<any[]>;
  readFile: (filePath: string) => Promise<any>;
  ping: () => Promise<{ success: true; data: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
