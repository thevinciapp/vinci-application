import { AuthEvents, AppStateEvents, CommandCenterEvents, SpaceEvents, MessageEvents, NotificationEvents, ConversationEvents } from '@/core/ipc/constants'; // Assuming this path is correct or will be updated later
import { IpcResponse } from '@/shared/types/ipc';
import { AppState } from '@/app/types';
import { Space } from '@/entities/space/model/types';
import { Conversation } from '@/entities/conversation/model/types';
import { Message } from '@/entities/message/model/types';
import { CommandType } from '@/features/command-palette/model/types';
import { AuthSession } from '@/features/auth/model/types';

// Types for auth-related responses (Should use AuthSession from features/auth/model/types)

// Types for command center data
type CommandCenterState = {
  isOpen: boolean;
  activeCommand?: CommandType; // Use imported CommandType
  dialogType?: string;
  dialogData?: unknown;
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
  [AuthEvents.GET_SESSION]?: () => Promise<AuthSession | null>; // Use imported AuthSession

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
  [AppStateEvents.GET_STATE]?: () => Promise<IpcResponse<AppState>>; // Use imported AppState

  /**
   * Refresh the application data from the server
   */
  [AppStateEvents.REFRESH_DATA]?: () => Promise<IpcResponse<AppState>>; // Use imported AppState

  /**
   * Get conversations for a specific space
   */
  [SpaceEvents.GET_CONVERSATIONS]?: (spaceId: string) => Promise<IpcResponse<Conversation[]>>; // Use imported Conversation

  /**
   * Get messages for a specific conversation
   */
  [MessageEvents.GET_MESSAGES]?: (conversationId: string) => Promise<IpcResponse<Message[]>>; // Use imported Message

  /**
   * Update a space with new data
   */
  [SpaceEvents.UPDATE_SPACE]?: (spaceId: string, spaceData: Partial<Space>) => Promise<IpcResponse<Space>>; // Use imported Space

  /**
   * Update a space's model and provider
   */
  [SpaceEvents.UPDATE_MODEL]?: (spaceId: string, model: string, provider: string) => Promise<IpcResponse<void>>;

  /**
   * Set the active space
   */
  [SpaceEvents.SET_ACTIVE]?: (spaceId: string) => Promise<IpcResponse<Space>>; // Use imported Space

  /**
   * Sync application state changes to other windows
   */
  [AppStateEvents.SYNC_STATE]?: (newState: AppState) => void; // Use imported AppState

  /**
   * Listen for initialization of app state
   */
  [AppStateEvents.GET_STATE]?: (callback: (event: unknown, response: IpcResponse<AppState>) => void) => () => void; // Use imported AppState

  /**
   * Listen for app data updates
   */
  [AppStateEvents.STATE_UPDATED]?: (callback: (event: Electron.IpcRendererEvent, update: IpcResponse<AppState>) => void) => () => void; // Use imported AppState
  /**
   * Open a specific command type
   */
  [CommandCenterEvents.OPEN]?: (commandType: CommandType) => void; // Use imported CommandType

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
  [CommandCenterEvents.SYNC_STATE]?: (callback: (event: unknown, response: IpcResponse<CommandCenterState>) => void) => () => void;

  /**
   * Open a dialog with a specific type and data
   */
  [CommandCenterEvents.OPEN_DIALOG]?: (dialogType: string, data: object) => void;

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
  [CommandCenterEvents.ON_DIALOG_OPEN]?: (callback: (event: unknown, dialogType: string, data: object) => void) => () => void;

  /**
   * Check if a command type is active
   */
  [CommandCenterEvents.CHECK_TYPE]?: (commandType: CommandType) => void; // Use imported CommandType

  /**
   * Register listener for checking command type
   */
  [CommandCenterEvents.ON_CHECK_TYPE]?: (callback: (event: unknown, commandType: CommandType) => void) => () => void; // Use imported CommandType

  /**
   * Window resize listener
   */
  [CommandCenterEvents.ON_RESIZE]?: (callback: (event: Electron.IpcRendererEvent, dimensions: { width: number; height: number }) => void) => () => void;

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
    metadata?: object;
  }>;

  /**
   * Test function to check if Electron API is available
   */
  [CommandCenterEvents.PING]?: () => Promise<{ success: true; data: string }>; // Updated ping return type

  /**
   * Toggle command center visibility
   */
  [CommandCenterEvents.TOGGLE]?: (commandType?: CommandType) => Promise<IpcResponse>; // Use imported CommandType

  /**
   * Register listener for setting command type
   */
  [CommandCenterEvents.ON_SET_TYPE]?: (callback: (event: unknown, commandType: CommandType) => void) => () => void; // Use imported CommandType

  // Add other methods from the second ElectronAPI definition if they are distinct and needed
  toggleCommandCenter?: (commandType?: CommandType) => Promise<IpcResponse>;
  openCommandType?: (commandType: CommandType) => Promise<IpcResponse>;
  openDialog?: (dialogType: string, data: object) => Promise<IpcResponse>;
  closeDialog?: () => Promise<IpcResponse>;
  closeCommandCenter?: (commandType?: CommandType) => Promise<IpcResponse>;
  refreshCommandCenter?: (commandType?: CommandType) => Promise<IpcResponse>;
  checkCommandType?: (commandType: CommandType) => Promise<IpcResponse>;
  searchFiles?: (searchTerm: string) => Promise<unknown[]>; // Adjust return type if needed
  readFile?: (filePath: string) => Promise<unknown>; // Adjust return type if needed
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
     * Unified Electron interface exposed via contextBridge
     */
    electron: {
      invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
      on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): () => void;
      off(channel: string, listener: (...args: unknown[]) => void): void;
      removeAllListeners(channel: string): void;
    };

    /**
     * IPC Event Handlers
     * These are injected by the preload script
     */
    ipcRenderer: {
      // Standard IPC methods
      invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
      send(channel: string, ...args: unknown[]): void;
      on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
      once(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
      removeListener(channel: string, listener: (...args: unknown[]) => void): void;
      removeAllListeners(channel: string): void;

      // Typed event handlers for our IPC events
      on(event: typeof AuthEvents[keyof typeof AuthEvents], listener: (event: unknown, ...args: unknown[]) => void): void;
      on(event: typeof AppStateEvents[keyof typeof AppStateEvents], listener: (event: unknown, state: IpcResponse<AppState>) => void): void; // Use imported AppState
      on(event: typeof CommandCenterEvents[keyof typeof CommandCenterEvents], listener: (event: unknown, ...args: unknown[]) => void): void;
      on(event: typeof SpaceEvents[keyof typeof SpaceEvents], listener: (event: unknown, ...args: unknown[]) => void): void;
      on(event: typeof MessageEvents[keyof typeof MessageEvents], listener: (event: unknown, ...args: unknown[]) => void): void;
      on(event: typeof NotificationEvents[keyof typeof NotificationEvents], listener: (event: unknown, ...args: unknown[]) => void): void;
      on(event: typeof ConversationEvents[keyof typeof ConversationEvents], listener: (event: unknown, ...args: unknown[]) => void): void;
    };
  }
}

// Export the main API interface
export type { ElectronAPI, CommandCenterState };