import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { useStore, getStoreState } from '../../../store';
import {
  fetchInitialAppData,
  refreshAppData
} from '../../../services/app-data/app-data-service';
import { AppStateEvents } from '../constants';
import { sanitizeStateForIpc } from '../../utils/state-utils';

interface AppStateResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface StateUpdate {
  type: string;
  payload: any;
}

/**
 * Register app state-related IPC handlers
 */
export function registerAppStateHandlers() {
  ipcMain.on(AppStateEvents.STATE_UPDATED, (event: Electron.IpcMainEvent, update: StateUpdate) => {
    console.log('[ELECTRON] Received state update from renderer:', update);
    const store = useStore.getState();
    const action = store[update.type as keyof typeof store];
    if (typeof action === 'function') {
      (action as Function)(update.payload);
    }
  });

  ipcMain.handle(AppStateEvents.GET_STATE, async (_event: IpcMainInvokeEvent): Promise<AppStateResponse> => {
    try {
      const state = getStoreState();
      if (!state.initialDataLoaded) {
        const freshData = await fetchInitialAppData();
        if (!freshData.error) {
          useStore.getState().setAppState({ ...freshData, initialDataLoaded: true });
          return { success: true, data: sanitizeStateForIpc(getStoreState()) };
        }
        return { success: false, error: freshData.error };
      }
      return { success: true, data: sanitizeStateForIpc(state) };
    } catch (error) {
      console.error('[ELECTRON] Error getting app state:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(AppStateEvents.REFRESH_DATA, async (_event: IpcMainInvokeEvent): Promise<AppStateResponse> => {
    try {
      const result = await refreshAppData();
      return { success: true, data: sanitizeStateForIpc(result) };
    } catch (error) {
      console.error('[ELECTRON] Error refreshing app data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
