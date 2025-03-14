import { ipcMain } from 'electron';
import { UserEvents } from '../constants';
import { 
  fetchUserProfile, 
  updateUserProfile, 
  updateUserPassword, 
  updateUserEmailPreferences,
  updateUserSettings,
  getUserSettings
} from '@/src/services/user/user-service';

export function registerUserHandlers() {
  ipcMain.handle(UserEvents.GET_PROFILE, async () => {
    try {
      const profile = await fetchUserProfile();
      return { success: true, data: { profile } };
    } catch (error) {
      console.error('Error in GET_PROFILE:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch profile' };
    }
  });

  ipcMain.handle(UserEvents.UPDATE_PROFILE, async (_, data) => {
    try {
      const profile = await updateUserProfile(data);
      return { success: true, data: { profile } };
    } catch (error) {
      console.error('Error in UPDATE_PROFILE:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update profile' };
    }
  });

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

  ipcMain.handle(UserEvents.UPDATE_SETTINGS, async (_, settings) => {
    try {
      const updatedSettings = await updateUserSettings(settings);
      return { success: true, data: { settings: updatedSettings } };
    } catch (error) {
      console.error('Error in UPDATE_SETTINGS:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update settings' };
    }
  });
}
