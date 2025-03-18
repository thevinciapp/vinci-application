import { ipcMain } from 'electron';
import { UserEvents } from '../constants';
import { 
  updateUserPassword, 
  updateUserEmailPreferences,
  getUserSettings,
  updateUserSettings
} from '../../../services/user/user-service';

export function registerUserHandlers() {
  // Note: GET_PROFILE and UPDATE_PROFILE are handled in profile-handlers.ts

  ipcMain.handle(UserEvents.UPDATE_PASSWORD, async (_, data) => {
    try {
      await updateUserPassword(data);
      return { success: true };
    } catch (error) {
      console.error('Error in UPDATE_PASSWORD:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update password' };
    }
  });

  ipcMain.handle(UserEvents.UPDATE_EMAIL_PREFERENCES, async (_, preferences) => {
    try {
      await updateUserEmailPreferences(preferences);
      return { success: true };
    } catch (error) {
      console.error('Error in UPDATE_EMAIL_PREFERENCES:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update email preferences' };
    }
  });

  ipcMain.handle(UserEvents.GET_SETTINGS, async () => {
    try {
      const settings = await getUserSettings();
      return { success: true, data: { settings } };
    } catch (error) {
      console.error('Error in GET_SETTINGS:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch settings' };
    }
  });

  // Note: UPDATE_SETTINGS is handled in profile-handlers.ts
}
