import { ipcRenderer } from 'electron';
import { CommandCenterEvents, AppStateEvents } from '@/core/ipc/constants';
import { CommandType } from '@/types';

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
  
  closeCommandCenterFromUnauthenticated: async () => {
    try {
      return await ipcRenderer.invoke('close-command-center');
    } catch (error) {
      console.error("Error closing command center:", error);
      return { success: false, error };
    }
  },

  toggleCommandCenter: async (commandType: CommandType = 'unified') => {
    try {
      return await ipcRenderer.invoke(CommandCenterEvents.TOGGLE, commandType);
    } catch (error) {
      console.error("Error toggling command center:", error);
      return { success: false, error };
    }
  },

  closeCommandCenter: async (commandType: CommandType = 'unified') => {
    try {
      return await ipcRenderer.invoke(CommandCenterEvents.CLOSE, commandType);
    } catch (error) {
      console.error("Error closing command center:", error);
      return { success: false, error };
    }
  },

  openCommandType: async (commandType: CommandType) => {
    try {
      await ipcRenderer.invoke(AppStateEvents.REFRESH_DATA);
      return await ipcRenderer.invoke(CommandCenterEvents.SHOW, commandType);
    } catch (error) {
      console.error("Error opening command type:", error);
      return { success: false, error };
    }
  },

  refreshCommandCenter: async (commandType: CommandType = 'unified') => {
    try {
      return await ipcRenderer.invoke(CommandCenterEvents.REFRESH, commandType);
    } catch (error) {
      console.error("Error refreshing command center:", error);
      return { success: false, error };
    }
  },

  checkCommandType: async (commandType: CommandType) => {
    try {
      return await ipcRenderer.invoke(CommandCenterEvents.CHECK_TYPE, commandType);
    } catch (error) {
      console.error("Error checking command type:", error);
      return { success: false, error };
    }
  },

  openDialog: async (dialogType: string, data: any) => {
    try {
      return await ipcRenderer.invoke(CommandCenterEvents.OPEN_DIALOG, dialogType, data);
    } catch (error) {
      console.error("Error opening dialog:", error);
      return { success: false, error };
    }
  },
  
  notifyDialogOpened: () => 
    ipcRenderer.send(CommandCenterEvents.DIALOG_OPENED, { success: true }),
  
  notifyDialogClosed: () => 
    ipcRenderer.send(CommandCenterEvents.DIALOG_CLOSED, { success: true }),

  closeDialog: async () => {
    try {
      return await ipcRenderer.invoke(CommandCenterEvents.DIALOG_CLOSED);
    } catch (error) {
      console.error("Error closing dialog:", error);
      return { success: false, error };
    }
  }
};
