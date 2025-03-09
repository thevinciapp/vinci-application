import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // File operations
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
  // Command center controls
  toggleCommandCenter: () => {
    ipcRenderer.send("toggle-command-center");
    ipcRenderer.send("sync-command-center-state", "toggle");
  },
  openCommandType: (commandType: string) => {
    ipcRenderer.send("show-command-center");
    ipcRenderer.send("set-command-type", commandType);
    ipcRenderer.send("sync-command-center-state", "open", commandType);
  },
  closeCommandCenter: () => {
    ipcRenderer.send("close-command-center");
    ipcRenderer.send("sync-command-center-state", "close");
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
});