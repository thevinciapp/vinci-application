import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Auth management
  setAuthToken: (token: string) => ipcRenderer.invoke('set-auth-token', token),
  getAuthToken: () => ipcRenderer.invoke('get-auth-token'),
  signOut: () => ipcRenderer.invoke('sign-out'),
  
  searchFiles: async (searchTerm: string) => {
    try {
      const results = await ipcRenderer.invoke("search-files", searchTerm);
      return results;
    } catch (error) {
      console.error("Error searching files:", error);
      return [];
    }
  },
  readFile: async (filePath: string) => {
    try {
      const result = await ipcRenderer.invoke("read-file", filePath);
      return result;
    } catch (error) {
      console.error("Error reading file:", error);
      throw error;
    }
  },
  ping: () => "pong",
  toggleCommandCenter: async () => {
    // Pre-load data before toggling the command center
    try {
      // This will ensure data is fresh and already in the state when command center opens
      await ipcRenderer.invoke('refresh-app-data'); 
    } catch (error) {
      console.error("Error preloading data for command center:", error);
    }
    
    ipcRenderer.send("toggle-command-center");
    ipcRenderer.send("sync-command-center-state", "toggle");
  },
  closeCommandCenter: () => {
    ipcRenderer.send("close-command-center");
    ipcRenderer.send("sync-command-center-state", "close");
  },
  openCommandType: async (commandType: string) => {
    // Pre-load data before showing the command center
    try {
      // This will ensure data is fresh and already in the state when command center opens
      await ipcRenderer.invoke('refresh-app-data'); 
    } catch (error) {
      console.error("Error preloading data for command center:", error);
    }
    
    // Then open the command center with data already loaded
    ipcRenderer.send("show-command-center");
    ipcRenderer.send("set-command-type", commandType);
    ipcRenderer.send("sync-command-center-state", "open", commandType);
  },
  refreshCommandCenter: () => {
    ipcRenderer.send("refresh-command-center");
    ipcRenderer.send("sync-command-center-state", "refresh");
  },
  checkCommandType: (commandType: string) => {
    ipcRenderer.send("command-type-check", commandType);
  },
  // Event listeners
  onToggleCommandCenter: (callback: () => void) => {
    ipcRenderer.on("toggle-command-center", callback);
    return () => ipcRenderer.removeListener("toggle-command-center", callback);
  },
  onSetCommandType: (callback: (event: any, commandType: string) => void) => {
    ipcRenderer.on("set-command-type", callback);
    return () => ipcRenderer.removeListener("set-command-type", callback);
  },
  onRefreshCommandCenter: (callback: () => void) => {
    ipcRenderer.on("refresh-command-center", callback);
    return () => ipcRenderer.removeListener("refresh-command-center", callback);
  },
  onSyncCommandCenterState: (callback: (event: any, action: string, data?: any) => void) => {
    ipcRenderer.on("sync-command-center-state", callback);
    return () => ipcRenderer.removeListener("sync-command-center-state", callback);
  },
  onWindowResize: (callback: (event: any, dimensions: { width: number; height: number }) => void) => {
    ipcRenderer.on("window-resized", callback);
    return () => ipcRenderer.removeListener("window-resized", callback);
  },
  onCheckCommandType: (callback: (event: any, commandType: string) => void) => {
    ipcRenderer.on("check-command-type", callback);
    return () => ipcRenderer.removeListener("check-command-type", callback);
  },
  removeWindowResizeListener: () => {
    ipcRenderer.removeAllListeners("window-resized");
  },
  // Dialog APIs
  openDialog: (dialogType: string, data: any) => ipcRenderer.send("open-dialog", dialogType, data),
  notifyDialogOpened: () => ipcRenderer.send("dialog-opened"),
  notifyDialogClosed: () => ipcRenderer.send("dialog-closed"),
  onOpenDialog: (callback: (event: any, dialogType: string, data: any) => void) => {
    ipcRenderer.on("open-dialog", callback);
    return () => ipcRenderer.removeListener("open-dialog", callback);
  },
  
  // App state management
  getAppState: async () => {
    try {
      return await ipcRenderer.invoke('get-app-state');
    } catch (error) {
      console.error("Error getting app state:", error);
      return null;
    }
  },
  
  refreshAppData: async () => {
    try {
      return await ipcRenderer.invoke('refresh-app-data');
    } catch (error) {
      console.error("Error refreshing app data:", error);
      return null;
    }
  },
  
  syncAppState: (newState: any) => {
    ipcRenderer.send('sync-app-state', newState);
  },
  
  onInitAppState: (callback: (event: any, state: any) => void) => {
    ipcRenderer.on('init-app-state', callback);
    return () => ipcRenderer.removeListener('init-app-state', callback);
  },
  
  onAppDataUpdated: (callback: (event: any, state: any) => void) => {
    ipcRenderer.on('app-data-updated', callback);
    return () => ipcRenderer.removeListener('app-data-updated', callback);
  },
  
  // Legacy handler for backward compatibility
  onInitData: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on("init-data", callback);
    return () => ipcRenderer.removeListener("init-data", callback);
  },
});