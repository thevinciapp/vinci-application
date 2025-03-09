/**
 * TypeScript definitions for Electron API
 * This file defines types for the APIs exposed through the preload script
 */

/**
 * Base interface for the minimal Electron API that should always be available
 */
interface BaseElectronAPI {
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
   * This method is always available and serves as a fallback
   */
  toggleCommandCenter: () => void;

  /**
   * Register listener for setting command type
   * This is the minimal listener needed for basic functionality
   */
  onSetCommandType: (callback: (event: any, commandType: string) => void) => () => void;
}

/**
 * Full Electron API with all methods
 * Some methods may not be available in older versions or during development
 */
interface ElectronAPI extends BaseElectronAPI {
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
   * This ensures consistent state between React hooks and Electron windows
   */
  onSyncCommandCenterState?: (callback: (event: any, action: string, data?: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
