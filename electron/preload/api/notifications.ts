import { ipcRenderer } from 'electron';
import { NotificationEvents } from '@/src/core/ipc/constants';
import { IpcResponse } from '@/src/types';

export const notificationApi = {
  getNotifications: async () => {
    try {
      const response = await ipcRenderer.invoke(NotificationEvents.GET_NOTIFICATIONS);
      return response.success ? response.data : null;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] getNotifications error:", error);
      return null;
    }
  },

  markNotificationAsRead: async (notificationId: string) => {
    try {
      const response = await ipcRenderer.invoke(NotificationEvents.MARK_AS_READ, notificationId);
      return response.success ? response.data : null;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] markNotificationAsRead error:", error);
      return null;
    }
  },

  markAllNotificationsAsRead: async () => {
    try {
      const response = await ipcRenderer.invoke(NotificationEvents.MARK_ALL_AS_READ);
      return response.success ? response.data : null;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] markAllNotificationsAsRead error:", error);
      return null;
    }
  },

  onNotificationReceived: (callback: (notification: any) => void) => {
    const handler = (_event: any, response: any) => {
      if (response.success && response.data) {
        callback(response.data);
      }
    };

    ipcRenderer.on(NotificationEvents.NOTIFICATION_RECEIVED, handler);
    return () => ipcRenderer.removeListener(NotificationEvents.NOTIFICATION_RECEIVED, handler);
  },
};