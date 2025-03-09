import { contextBridge, ipcRenderer } from "electron";

// Add debugging to see if preload is being executed
console.log("Preload script is running");

// Define TypeScript interface for our exposed API
declare global {
  interface Window {
    electronAPI: {
      searchFiles: (searchTerm: string) => Promise<any[]>;
      readFile: (filePath: string) => Promise<any>;
      ping: () => string;
      toggleCommandCenter: () => void;
      openCommandType: (commandType: string) => void;
      closeCommandCenter: () => void;
      refreshCommandCenter: () => void;
      checkCommandType: (commandType: string) => void;
      onToggleCommandCenter: (callback: () => void) => () => void;
      onSetCommandType: (callback: (event: any, commandType: string) => void) => () => void;
      onRefreshCommandCenter: (callback: () => void) => () => void;
      onSyncCommandCenterState: (callback: (event: any, action: string, data?: any) => void) => () => void;
      onWindowResize: (callback: (event: any, dimensions: {width: number, height: number}) => void) => () => void;
      onCheckCommandType: (callback: (event: any, commandType: string) => void) => () => void;
      removeWindowResizeListener: () => void;
    };
  }
}

// Expose safe electron APIs to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Search for files based on a pattern using IPC
  searchFiles: async (searchTerm: string) => {
    console.log("Searching for files with term:", searchTerm);
    try {
      const results = await ipcRenderer.invoke("search-files", searchTerm);
      console.log("Search results:", results);
      return results;
    } catch (error) {
      console.error("Error searching files:", error);
      return [];
    }
  },
  
  // Read file content using IPC
  readFile: async (filePath: string) => {
    console.log("Reading file:", filePath);
    try {
      const result = await ipcRenderer.invoke("read-file", filePath);
      console.log("File read successfully");
      return result;
    } catch (error) {
      console.error("Error reading file:", error);
      throw error;
    }
  },
  
  // Test function to check if Electron API is available
  ping: () => {
    console.log("electronAPI.ping called");
    return "pong";
  },
  
  // Command center integration - enhanced to work directly with useCommandCenter
  // These functions will be called by the main process AND from React
  toggleCommandCenter: () => {
    console.log("Toggling command center from preload");
    // First tell the main process to toggle the window if needed
    ipcRenderer.send("toggle-command-center");
    // Then broadcast to all renderer processes to stay in sync
    ipcRenderer.send("sync-command-center-state", "toggle");
  },
  
  // Enhanced to open a specific command type
  openCommandType: (commandType: string) => {
    console.log(`Opening command type: ${commandType} from preload`);
    // First tell main process to ensure window is open
    ipcRenderer.send("show-command-center");
    // Then set the command type via IPC
    ipcRenderer.send("set-command-type", commandType);
    // Broadcast state change to all renderer processes
    ipcRenderer.send("sync-command-center-state", "open", commandType);
  },
  
  // Enhanced to close the command center window
  closeCommandCenter: () => {
    console.log("Closing command center from preload");
    // Tell main process to hide the window
    ipcRenderer.send("close-command-center");
    // Broadcast state change to all renderer processes
    ipcRenderer.send("sync-command-center-state", "close");
  },
  
  // Enhanced to refresh command center data
  refreshCommandCenter: () => {
    console.log("Refreshing command center from preload");
    // Send refresh command to main process
    ipcRenderer.send("refresh-command-center");
    // Broadcast refresh state to all renderer processes
    ipcRenderer.send("sync-command-center-state", "refresh");
  },
  
  // New function to respond to command type check
  checkCommandType: (commandType: string) => {
    console.log(`Checking if command type ${commandType} is active`);
    // Send response back to main process
    ipcRenderer.send("command-type-check", commandType);
  },
  
  // Enhanced listener for command center toggle events
  onToggleCommandCenter: (callback: () => void) => {
    ipcRenderer.on("toggle-command-center", callback);
    return () => {
      ipcRenderer.removeListener("toggle-command-center", callback);
    };
  },
  
  // Enhanced listener for setting command type
  onSetCommandType: (callback: (event: any, commandType: string) => void) => {
    ipcRenderer.on("set-command-type", callback);
    return () => {
      ipcRenderer.removeListener("set-command-type", callback);
    };
  },
  
  // Enhanced listener for refreshing command center
  onRefreshCommandCenter: (callback: () => void) => {
    ipcRenderer.on("refresh-command-center", callback);
    return () => {
      ipcRenderer.removeListener("refresh-command-center", callback);
    };
  },
  
  // New listener for synced command center state across all windows
  // This ensures the React hook state stays in sync with Electron windows
  onSyncCommandCenterState: (callback: (event: any, action: string, data?: any) => void) => {
    ipcRenderer.on("sync-command-center-state", callback);
    return () => {
      ipcRenderer.removeListener("sync-command-center-state", callback);
    };
  },
  
  // New listener for window resize events
  onWindowResize: (callback: (event: any, dimensions: {width: number, height: number}) => void) => {
    ipcRenderer.on("window-resized", callback);
    return () => {
      ipcRenderer.removeListener("window-resized", callback);
    };
  },
  
  // New listener for command type checking
  onCheckCommandType: (callback: (event: any, commandType: string) => void) => {
    ipcRenderer.on("check-command-type", callback);
    return () => {
      ipcRenderer.removeListener("check-command-type", callback);
    };
  },
  
  // Convenience function to remove resize listener
  removeWindowResizeListener: () => {
    ipcRenderer.removeAllListeners("window-resized");
  }
});