import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { UserEvents } from '@/core/ipc/constants';
import { 
  updateUserPassword, 
  updateUserEmailPreferences,
  getUserSettings,
  PasswordUpdateData, 
  EmailPreferences
} from '@/services/user/user-service';
import { IpcResponse } from '@/types/ipc';

export function registerUserHandlers() {
  ipcMain.handle(UserEvents.UPDATE_PASSWORD, async (_event: IpcMainInvokeEvent, data: PasswordUpdateData): Promise<IpcResponse<null>> => {
    try {
      await updateUserPassword(data);
      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error in UPDATE_PASSWORD:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update password'
      };
    }
  });

  ipcMain.handle(UserEvents.UPDATE_EMAIL_PREFERENCES, async (_event: IpcMainInvokeEvent, preferences: EmailPreferences): Promise<IpcResponse<null>> => {
    try {
      await updateUserEmailPreferences(preferences);
      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error in UPDATE_EMAIL_PREFERENCES:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update email preferences'
      };
    }
  });

  ipcMain.handle(UserEvents.GET_SETTINGS, async (_event: IpcMainInvokeEvent): Promise<IpcResponse<{ settings: any }>> => {
    try {
      const settings = await getUserSettings();
      return { 
        success: true, 
        data: { settings }
      };
    } catch (error) {
      console.error('[ELECTRON] Error in GET_SETTINGS:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch settings'
      };
    }
  });

  // Note: UPDATE_SETTINGS is handled in profile-handlers.ts
}
