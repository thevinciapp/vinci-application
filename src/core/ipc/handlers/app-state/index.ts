import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { getMainStoreState, useMainStore } from '@/store/main';
import {
  fetchInitialAppData,
  refreshAppData
} from '@/services/app-data/app-data-service';
import { AppStateEvents } from '@/core/ipc/constants';
import { IpcResponse } from '@/shared/types/ipc';
import { sanitizeStateForIPC } from '@/core/utils/state-utils';

function broadcastStateUpdate() {
  const state = getMainStoreState();
  const serializableState = sanitizeStateForIPC(state);
  BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
    if (window && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(AppStateEvents.STATE_UPDATED, { success: true, data: serializableState });
    }
  });
}

/**
 * Register app state-related IPC handlers
 */
export function registerAppStateHandlers() {
  ipcMain.handle(AppStateEvents.GET_STATE, async (_event: IpcMainInvokeEvent): Promise<IpcResponse<Partial<ReturnType<typeof getMainStoreState>>>> => {
    try {
      const state = getMainStoreState();
      console.log('[ELECTRON] Getting app state from renderer, initialDataLoaded:', state.initialDataLoaded);
      
      const accessTokenExists = !!state.accessToken;
      const needsFreshData = !state.initialDataLoaded || (accessTokenExists && (!state.spaces || state.spaces.length === 0));
      
      if (needsFreshData) {
        console.log('[ELECTRON] GET_STATE triggered initial data fetch.');
        const freshData = await fetchInitialAppData();
        if (!freshData.error) {
          console.log('[ELECTRON] Successfully fetched fresh data after GET_STATE');
          useMainStore.getState().setAppState({ ...freshData, initialDataLoaded: true });
          return { 
            success: true, 
            data: sanitizeStateForIPC(getMainStoreState()),
          };
        }
        
        return { 
          success: false, 
          error: freshData.error
        };
      }
      const serializedState = sanitizeStateForIPC(state);
      return { 
        success: true, 
        data: serializedState
      };
    } catch (error) {
      console.error('[ELECTRON] Error getting app state:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle(AppStateEvents.REFRESH_DATA, async (_event: IpcMainInvokeEvent): Promise<IpcResponse<null>> => {
    try {
      const refreshedData = await refreshAppData();
      if (!refreshedData.error) {
        useMainStore.getState().setAppState({ ...refreshedData });
        broadcastStateUpdate();
        return {
          success: true,
        };
      }
      return {
        success: false,
        error: refreshedData.error
      };
    } catch (error) {
      console.error('[ELECTRON] Error refreshing app data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}
