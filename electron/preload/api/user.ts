import { ipcRenderer } from 'electron';
import { UserEvents } from '@/core/ipc/constants';
import { User } from '@entities/user/model/types';

export const userApi = {
  getProfile: async () => {
    try {
      const response = await ipcRenderer.invoke(UserEvents.GET_PROFILE);
      return response.success ? response.data : null;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] getProfile error:", error);
      return null;
    }
  },

  updateProfile: async (profileData: Partial<User>) => {
    try {
      const response = await ipcRenderer.invoke(UserEvents.UPDATE_PROFILE, profileData);
      return response.success ? response.data : null;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] updateProfile error:", error);
      return null;
    }
  },

  updatePassword: async (currentPassword: string, newPassword: string) => {
    try {
      const response = await ipcRenderer.invoke(UserEvents.UPDATE_PASSWORD, { 
        currentPassword, 
        newPassword 
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] updatePassword error:", error);
      return null;
    }
  },

  updateEmailPreferences: async (preferences: object) => {
    try {
      const response = await ipcRenderer.invoke(UserEvents.UPDATE_EMAIL_PREFERENCES, preferences);
      return response.success ? response.data : null;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] updateEmailPreferences error:", error);
      return null;
    }
  },

  getSettings: async () => {
    try {
      const response = await ipcRenderer.invoke(UserEvents.GET_SETTINGS);
      return response.success ? response.data : null;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] getSettings error:", error);
      return null;
    }
  },

  updateSettings: async (settings: object) => {
    try {
      const response = await ipcRenderer.invoke(UserEvents.UPDATE_SETTINGS, settings);
      return response.success ? response.data : null;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] updateSettings error:", error);
      return null;
    }
  },
};