import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { 
  fetchNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../../../services/notification/notification-service';
import { NotificationResponse } from './index';
import { NotificationEvents } from '../constants';

/**
 * Register notification-related IPC handlers
 */
export function registerNotificationHandlers() {
  ipcMain.handle(NotificationEvents.GET_NOTIFICATIONS, async (_event: IpcMainInvokeEvent): Promise<NotificationResponse> => {
    try {
      const notifications = await fetchNotifications();
      return { 
        success: true, 
        data: notifications.data, 
        status: 'success' 
      };
    } catch (error) {
      console.error('[ELECTRON] Error in get-notifications handler:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        status: 'error' 
      };
    }
  });

  ipcMain.handle(NotificationEvents.MARK_AS_READ, async (_event: IpcMainInvokeEvent, notificationId: string): Promise<NotificationResponse> => {
    try {
      const result = await markNotificationAsRead(notificationId);
      return { 
        success: true, 
        data: { updated: result.data?.updated || false, id: notificationId }, 
        status: 'success' 
      };
    } catch (error) {
      console.error('[ELECTRON] Error in mark-notification-as-read handler:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        status: 'error' 
      };
    }
  });

  ipcMain.handle(NotificationEvents.MARK_ALL_AS_READ, async (_event: IpcMainInvokeEvent): Promise<NotificationResponse> => {
    try {
      const result = await markAllNotificationsAsRead();
      return { 
        success: true, 
        data: { updated: result.data?.updated || false, count: result.data?.count || 0 }, 
        status: 'success' 
      };
    } catch (error) {
      console.error('[ELECTRON] Error in mark-all-notifications-as-read handler:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        status: 'error' 
      };
    }
  });
}
