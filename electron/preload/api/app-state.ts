import { ipcRenderer } from 'electron';
import { AppStateEvents } from '@/core/ipc/constants';
import { MainProcessState } from '@/store/main';
export const appStateApi = {
  getAppState: async () => {
    try {
      const response = await ipcRenderer.invoke(AppStateEvents.GET_STATE);
      return response.success ? response.data : null;
    } catch (error) {
      console.error("Error getting app state:", error);
      return null;
    }
  },
  
  refreshAppData: async () => {
    try {
      const response = await ipcRenderer.invoke(AppStateEvents.REFRESH_DATA);
      return response.success ? response.data : null;
    } catch (error) {
      console.error("Error refreshing app data:", error);
      return null;
    }
  },

  syncAppState: (newState: Partial<MainProcessState>) => {
    ipcRenderer.send(AppStateEvents.SYNC_STATE, { success: true, data: newState });
  },
};
