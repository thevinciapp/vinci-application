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
          status: 'error'
        };
      }
      
      // Process and merge the incoming state with the main process state
      const currentState = getStoreState();
      const mergedState = { ...currentState, ...state };
      
      // Update only changed properties to avoid circular updates
      Object.keys(state).forEach(key => {
        const setter = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
        const store = useStore.getState();
        const setterFn = store[setter as keyof typeof store];
        if (typeof setterFn === 'function') {
          (setterFn as Function)(state[key]);
        }
      });
      
      return { 
        success: true, 
        status: 'success'
      };
    } catch (error) {
      console.error('[ELECTRON] Error syncing app state:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      };
    }
  });

  ipcMain.handle(AppStateEvents.GET_STATE, async (_event: IpcMainInvokeEvent): Promise<AppStateResponse> => {
    try {
      const state = getStoreState();
      if (!state.initialDataLoaded) {
        const freshData = await fetchInitialAppData();
        if (!freshData.error) {
          useStore.getState().setAppState({ ...freshData, initialDataLoaded: true });
          return { 
            success: true, 
            data: sanitizeStateForIpc(getStoreState()),
            status: 'success'
          };
        }
        return { 
          success: false, 
          error: freshData.error,
          status: 'error'
        };
      }
      return { 
        success: true, 
        data: sanitizeStateForIpc(state),
        status: 'success'
      };
    } catch (error) {
      console.error('[ELECTRON] Error getting app state:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      };
    }
  });

  ipcMain.handle(AppStateEvents.REFRESH_DATA, async (_event: IpcMainInvokeEvent): Promise<AppStateResponse> => {
    try {
      const result = await refreshAppData();
      return { 
        success: true, 
        data: sanitizeStateForIpc(result),
        status: 'success'
      };
    } catch (error) {
      console.error('[ELECTRON] Error refreshing app data:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      };
    }
  });
}
