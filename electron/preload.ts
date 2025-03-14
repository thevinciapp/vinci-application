import { contextBridge, ipcRenderer } from "electron";
import { replayActionRenderer } from 'electron-redux';

console.log('[ELECTRON PRELOAD] Initializing preload script');

replayActionRenderer(ipcRenderer);

contextBridge.exposeInMainWorld("electronAPI", {
  // Redux integration
  dispatchReduxAction: (action: any) => {
    console.log('[ELECTRON PRELOAD] Dispatching Redux action:', action);
    ipcRenderer.send('redux-action', action);
  },
  
  // Auth management
  setAuthTokens: (accessToken: string, refreshToken: string) => 
    ipcRenderer.invoke('set-auth-tokens', accessToken, refreshToken),
  getAuthToken: () => 
    ipcRenderer.invoke('get-auth-token'),
  refreshAuthTokens: () => 
    ipcRenderer.invoke('refresh-auth-tokens'),
  signOut: () => 
    ipcRenderer.invoke('sign-out'),
  resetPassword: (email: string) =>
    ipcRenderer.invoke('reset-password', email),
  signUp: (email: string, password: string) =>
    ipcRenderer.invoke('sign-up', email, password),
  getSession: () =>
    ipcRenderer.invoke('get-session'),
  
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
  
  getSpaceConversations: async (spaceId: string) => {
    return await ipcRenderer.invoke('get-space-conversations', spaceId);
  },

  getConversationMessages: async (conversationId: string) => {
    return await ipcRenderer.invoke('get-conversation-messages', conversationId);
  },

  // Search functionality
  searchMessages: async (query: string) => {
    return await ipcRenderer.invoke('search-messages', query);
  },

  // Chat functionality
  sendChatMessage: async (conversationId: string, message: string) => {
    return await ipcRenderer.invoke('send-chat-message', conversationId, message);
  },

  // Message operations
  deleteMessage: async (conversationId: string, messageId: string) => {
    return await ipcRenderer.invoke('delete-message', conversationId, messageId);
  },
  updateMessage: async (conversationId: string, messageId: string, content: string) => {
    return await ipcRenderer.invoke('update-message', conversationId, messageId, content);
  },

  updateSpace: async (spaceId: string, spaceData: any) => {
    return await ipcRenderer.invoke('update-space', spaceId, spaceData);
  },

  updateSpaceModel: async (spaceId: string, model: string, provider: string) => {
    console.log('[ELECTRON PRELOAD] Calling updateSpaceModel:', spaceId, model, provider);
    try {
      const result = await ipcRenderer.invoke('update-space-model', spaceId, model, provider);
      console.log('[ELECTRON PRELOAD] updateSpaceModel result:', result);
      return result;
    } catch (error) {
      console.error('[ELECTRON PRELOAD] updateSpaceModel error:', error);
      throw error;
    }
  },

  setActiveSpace: async (spaceId: string) => {
    try {
      console.log('[ELECTRON PRELOAD] setActiveSpace called with:', spaceId);
      const result = await ipcRenderer.invoke('set-active-space', spaceId);
      console.log('[ELECTRON PRELOAD] setActiveSpace result:', result);
      return result;
    } catch (error) {
      console.error('[ELECTRON PRELOAD] setActiveSpace error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
