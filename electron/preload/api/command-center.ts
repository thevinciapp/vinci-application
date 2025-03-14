import { ipcRenderer } from 'electron';
import { CommandCenterEvents, AppStateEvents } from '@/src/core/ipc/constants';
import { IpcResponse } from '@/src/types';

export const commandCenterApi = {
  searchFiles: async (searchTerm: string) => {
    try {
      const response = await ipcRenderer.invoke(CommandCenterEvents.SEARCH_FILES, searchTerm);
      return response.success ? response.data : [];
    } catch (error) {
      console.error("Error searching files:", error);
      return [];
    }
  },

  readFile: async (filePath: string) => {
    try {
      const response = await ipcRenderer.invoke(CommandCenterEvents.READ_FILE, filePath);
      if (!response.success) throw new Error(response.error);
      return response.data;
    } catch (error) {
      console.error("Error reading file:", error);
      throw error;
    }
  },

  ping: () => ({ success: true, data: "pong" }),

  toggleCommandCenter: async () => {
    try {
      await ipcRenderer.invoke(AppStateEvents.REFRESH_DATA);
      ipcRenderer.send(CommandCenterEvents.TOGGLE);
      ipcRenderer.send(CommandCenterEvents.SYNC_STATE, { success: true, data: { action: "toggle" } });
    } catch (error) {
      console.error("Error preloading data for command center:", error);
    }
  },

  closeCommandCenter: () => {
    ipcRenderer.send(CommandCenterEvents.CLOSE);
    ipcRenderer.send(CommandCenterEvents.SYNC_STATE, { success: true, data: { action: "close" } });
  },

  openCommandType: async (commandType: string) => {
    try {
      await ipcRenderer.invoke(AppStateEvents.REFRESH_DATA);
      ipcRenderer.send(CommandCenterEvents.SHOW);
      ipcRenderer.send(CommandCenterEvents.SET_TYPE, { success: true, data: { type: commandType } });
      ipcRenderer.send(CommandCenterEvents.SYNC_STATE, { success: true, data: { action: "open", type: commandType } });
    } catch (error) {
      console.error("Error preloading data for command center:", error);
    }
  },

  refreshCommandCenter: () => {
    ipcRenderer.send(CommandCenterEvents.REFRESH);
    ipcRenderer.send(CommandCenterEvents.SYNC_STATE, { success: true, data: { action: "refresh" } });
  },

  checkCommandType: (commandType: string) => {
    ipcRenderer.send(CommandCenterEvents.CHECK_TYPE, { success: true, data: { type: commandType } });
  },

  // Dialog APIs
  openDialog: (dialogType: string, data: any) => 
    ipcRenderer.send(CommandCenterEvents.OPEN_DIALOG, { success: true, data: { type: dialogType, ...data } }),
  
  notifyDialogOpened: () => 
    ipcRenderer.send(CommandCenterEvents.DIALOG_OPENED, { success: true }),
  
  notifyDialogClosed: () => 
    ipcRenderer.send(CommandCenterEvents.DIALOG_CLOSED, { success: true }),
};
