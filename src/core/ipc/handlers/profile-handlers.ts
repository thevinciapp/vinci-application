import { ipcMain } from 'electron';
import { IpcResponse } from '.';
import { UserEvents } from '../constants';
import { 
  fetchUserProfile, 
  updateUserProfile,
  updateUserSettings
} from '../../../services/user/user-service';

/**
 * Register profile-related IPC handlers
 */
export function registerProfileHandlers() {
  ipcMain.handle(UserEvents.GET_PROFILE, async (): Promise<IpcResponse> => {
    try {
      const profile = await fetchUserProfile();
      return { success: true, data: profile };
    } catch (error) {
      console.error('[ELECTRON] Error in GET_PROFILE handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(UserEvents.UPDATE_PROFILE, async (_event, profileData): Promise<IpcResponse> => {
    try {
      const updatedProfile = await updateUserProfile(profileData);
      return { success: true, data: updatedProfile };
    } catch (error) {
      console.error('[ELECTRON] Error in UPDATE_PROFILE handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(UserEvents.UPDATE_SETTINGS, async (_event, settings): Promise<IpcResponse> => {
    try {
      const updatedSettings = await updateUserSettings(settings);
      return { success: true, data: updatedSettings };
    } catch (error) {
      console.error('[ELECTRON] Error in UPDATE_SETTINGS handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}