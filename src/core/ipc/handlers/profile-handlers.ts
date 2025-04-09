import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { UserResponse } from '@/shared/types/ipc';
import { UserEvents } from '@/core/ipc/constants';
import { 
  fetchUserProfile, 
  updateUserProfile,
  updateUserSettings,
  UserUpdateData
} from '@/services/user/user-service';

export function registerProfileHandlers() {
  ipcMain.handle(UserEvents.GET_PROFILE, async (_event: IpcMainInvokeEvent): Promise<UserResponse> => {
    try {
      const profile = await fetchUserProfile();
      return { 
        success: true, 
        data: profile, 
        status: 'success' 
      };
    } catch (error) {
      console.error('[ELECTRON] Error in GET_PROFILE handler:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      };
    }
  });

  ipcMain.handle(UserEvents.UPDATE_PROFILE, async (_event: IpcMainInvokeEvent, profileData: UserUpdateData): Promise<UserResponse> => {
    try {
      const updatedProfile = await updateUserProfile(profileData);
      return { 
        success: true, 
        data: updatedProfile,
        status: 'success'
      };
    } catch (error) {
      console.error('[ELECTRON] Error in UPDATE_PROFILE handler:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      };
    }
  });

  ipcMain.handle(UserEvents.UPDATE_SETTINGS, async (_event: IpcMainInvokeEvent, settings: any): Promise<UserResponse> => {
    try {
      const updatedSettings = await updateUserSettings(settings);
      return { 
        success: true, 
        data: updatedSettings,
        status: 'success'
      };
    } catch (error) {
      console.error('[ELECTRON] Error in UPDATE_SETTINGS handler:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      };
    }
  });
}