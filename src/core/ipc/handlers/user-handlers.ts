import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { UserEvents } from '@/core/ipc/constants';
import { 
  updateUserPassword, 
  updateUserEmailPreferences,
  getUserSettings,
  PasswordUpdateData, 
  EmailPreferences
} from '@/services/user/user-service';
import { UserResponse } from '@/types/ipc';

export function registerUserHandlers() {
  ipcMain.handle(UserEvents.UPDATE_PASSWORD, async (_event: IpcMainInvokeEvent, data: PasswordUpdateData): Promise<UserResponse> => {
    try {
      await updateUserPassword(data);
      return { success: true, status: 'success' };
    } catch (error) {
      console.error('[ELECTRON] Error in UPDATE_PASSWORD:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update password',
        status: 'error' 
      };
    }
  });

  ipcMain.handle(UserEvents.UPDATE_EMAIL_PREFERENCES, async (_event: IpcMainInvokeEvent, preferences: EmailPreferences): Promise<UserResponse> => {
    try {
      await updateUserEmailPreferences(preferences);
      return { success: true, status: 'success' };
    } catch (error) {
      console.error('[ELECTRON] Error in UPDATE_EMAIL_PREFERENCES:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update email preferences',
        status: 'error' 
      };
    }
  });

  ipcMain.handle(UserEvents.GET_SETTINGS, async (_event: IpcMainInvokeEvent): Promise<UserResponse> => {
    try {
      const settings = await getUserSettings();
      return { 
        success: true, 
        data: settings, 
        status: 'success' 
      };
    } catch (error) {
      console.error('[ELECTRON] Error in GET_SETTINGS:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch settings',
        status: 'error' 
      };
    }
  });

  // Note: UPDATE_SETTINGS is handled in profile-handlers.ts
}
