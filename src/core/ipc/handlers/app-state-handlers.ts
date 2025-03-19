import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { useMainStore, getMainStoreState } from '@/store/main';
import {
  fetchInitialAppData,
  refreshAppData
} from '@/services/app-data/app-data-service';
import { AppStateEvents } from '@/core/ipc/constants';

interface AppStateResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface StateUpdate {
  type: string;
  payload: any;
}

function makeSerializable(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(makeSerializable);
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value !== 'function' && key !== 'zustand' && key !== 'store') {
        result[key] = makeSerializable(value);
      }
    }
    return result;
  }
  
  return obj;
}

/**
 * Register app state-related IPC handlers
 */
export function registerAppStateHandlers() {
  ipcMain.on(AppStateEvents.STATE_UPDATED, (event: Electron.IpcMainEvent, update: StateUpdate) => {
    console.log('[ELECTRON] Received state update from renderer:', update);
    const store = useMainStore.getState();
    const action = store[update.type as keyof typeof store];
    if (typeof action === 'function') {
      (action as Function)(update.payload);
    }
  });

  // Handler for sync-app-state
  ipcMain.handle(AppStateEvents.SYNC_STATE, async (_event: IpcMainInvokeEvent, state: any): Promise<AppStateResponse> => {
    try {
      console.log('[ELECTRON] Syncing app state from renderer');
      
      // Check if state is valid before attempting to use it
      if (!state || typeof state !== 'object') {
        console.log('[ELECTRON] Received invalid state object:', state);
        return { 
          success: false, 
          error: 'Invalid state object received',
        };
      }
      
      // Process and merge the incoming state with the main process state
      const currentState = getMainStoreState();
      const mergedState = { ...currentState, ...state };
      
      // Update only changed properties to avoid circular updates
      Object.keys(state).forEach(key => {
        const setter = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
        const store = useMainStore.getState();
        const setterFn = store[setter as keyof typeof store];
        if (typeof setterFn === 'function') {
          (setterFn as Function)(state[key]);
        }
      });
      
      return { 
        success: true, 
      };
    } catch (error) {
      console.error('[ELECTRON] Error syncing app state:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle(AppStateEvents.GET_STATE, async (_event: IpcMainInvokeEvent): Promise<AppStateResponse> => {
    try {
      const state = getMainStoreState();
      console.log('[ELECTRON] Getting app state from renderer, initialDataLoaded:', state.initialDataLoaded);
      
      if (!state.initialDataLoaded) {
        const freshData = await fetchInitialAppData();
        if (!freshData.error) {
          useMainStore.getState().setAppState({ ...freshData, initialDataLoaded: true });
          return { 
            success: true, 
            data: makeSerializable(getMainStoreState()),
          };
        }
        return { 
          success: false, 
          error: freshData.error
        };
      }
      return { 
        success: true, 
        data: makeSerializable(getMainStoreState())
      };
    } catch (error) {
      console.error('[ELECTRON] Error getting app state:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Handler for refreshing app data
  ipcMain.handle(AppStateEvents.REFRESH_DATA, async (_event: IpcMainInvokeEvent): Promise<AppStateResponse> => {
    try {
      const refreshedData = await refreshAppData();
      if (!refreshedData.error) {
        useMainStore.getState().setAppState({ ...refreshedData });
        return {
          success: true,
          data: makeSerializable(getMainStoreState())
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
