// electron.d.ts
/**
 * TypeScript definitions for Electron API
 * This file defines types for the APIs exposed through the preload script
 */

interface ElectronAPI {
  /**
   * Set authentication tokens for Electron main process
   */
  setAuthTokens?: (accessToken: string, refreshToken: string) => Promise<boolean>;
  
  /**
   * Get current authentication token from Electron main process
   * Will automatically refresh if needed using the refresh token
   */
  getAuthToken?: () => Promise<string | null>;
  
  /**
   * Force refresh of authentication tokens
   */
  refreshAuthTokens?: () => Promise<{ 
    success: boolean; 
    accessToken?: string; 
    expiresAt?: number;
    error?: string;
  }>;
  
  /**
   * Sign out and clear all tokens
   */
  signOut?: () => Promise<boolean>;
  
  /**
   * Get the current application state
   */
  getAppState?: () => Promise<{
    spaces: any[];
    activeSpace: any | null;
    conversations: any[];
    initialDataLoaded: boolean;
    lastFetched: number | null;
  }>;

  /**
   * Refresh the application data from the server
   */
  refreshAppData?: () => Promise<{
    spaces: any[];
    activeSpace: any | null;
    conversations: any[];
    initialDataLoaded: boolean;
    lastFetched: number;
  }>;

  /**
   * Get conversations for a specific space
   */
  getSpaceConversations?: (spaceId: string) => Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }>;

  /**
   * Get messages for a specific conversation
   */
  getConversationMessages?: (conversationId: string) => Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }>;

  /**
   * Update a space with new data
   */
  updateSpace?: (spaceId: string, spaceData: any) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }>;

  /**
   * Update a space's model and provider
   */
  updateSpaceModel?: (spaceId: string, model: string, provider: string) => Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Set the active space
   */
  setActiveSpace?: (spaceId: string) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }>;

  /**
   * Sync application state changes to other windows
   */
  syncAppState?: (newState: any) => void;

  /**
   * Listen for initialization of app state
   */
  onInitAppState?: (callback: (event: any, state: any) => void) => () => void;

  /**
   * Listen for app data updates
   */
  onAppDataUpdated?: (callback: (event: any, state: any) => void) => () => void;
  /**
   * Open a specific command type
   */
  openCommandType?: (commandType: string) => void;

  /**
   * Close the command center window
   */
  closeCommandCenter?: () => void;

  /**
   * Refresh command center data
   */
  refreshCommandCenter?: () => void;

  /**
   * Register listener for command center toggle events
   */
  onToggleCommandCenter?: (callback: () => void) => () => void;

  /**
   * Register listener for refreshing command center
   */
  onRefreshCommandCenter?: (callback: () => void) => () => void;

  /**
   * Register listener for synced command center state across all windows
   */
  onSyncCommandCenterState?: (callback: (event: any, action: string, data?: any) => void) => () => void;

  /**
   * Open a dialog with a specific type and data
   */
  openDialog?: (dialogType: string, data: any) => void;

  /**
   * Notify the main process that a dialog has opened
   */
  notifyDialogOpened?: () => void;

  /**
   * Notify the main process that a dialog has closed
   */
  notifyDialogClosed?: () => void;

  /**
   * Register listener for opening dialogs
   */
  onOpenDialog?: (callback: (event: any, dialogType: string, data: any) => void) => () => void;

  /**
   * Check if a command type is active
   */
  checkCommandType?: (commandType: string) => void;

  /**
   * Register listener for checking command type
   */
  onCheckCommandType?: (callback: (event: any, commandType: string) => void) => () => void;

  /**
   * Window resize listener
   */
  onWindowResize?: (callback: (event: any, dimensions: { width: number; height: number }) => void) => () => void;

  /**
   * Remove window resize listener
   */
  removeWindowResizeListener?: () => void;

  /**
   * Search for files based on a search term
   */
  searchFiles: (searchTerm: string) => Promise<Array<{
    path: string;
    name: string;
    type: string;
    size?: number;
    modified?: number | string;
  }>>;

  /**
   * Read file content using IPC
   */
  readFile: (filePath: string) => Promise<{
    content: string;
    metadata?: any;
  }>;

  /**
   * Test function to check if Electron API is available
   */
  ping: () => string;

  /**
   * Toggle command center visibility
   */
  toggleCommandCenter: () => void;

  /**
   * Register listener for setting command type
   */
  onSetCommandType: (callback: (event: any, commandType: string) => void) => () => void;
}

/**
 * Augment the global Window interface to include electronAPI
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
