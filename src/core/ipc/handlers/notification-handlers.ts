import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { 
  fetchNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../../../services/notification/notification-service';
import { IpcResponse } from './index';
import { NotificationEvents } from '../constants';

/**
 * Register notification-related IPC handlers
 */
export function registerNotificationHandlers() {
  ipcMain.handle(NotificationEvents.GET_NOTIFICATIONS, async (_event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      const notifications = await fetchNotifications();
      return { success: true, data: notifications };
    } catch (error) {
      console.error('[ELECTRON] Error in get-notifications handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(NotificationEvents.MARK_AS_READ, async (_event: IpcMainInvokeEvent, notificationId: string): Promise<IpcResponse> => {
    try {
      const result = await markNotificationAsRead(notificationId);
      return { success: true, data: result };
    } catch (error) {
      console.error('[ELECTRON] Error in mark-notification-as-read handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(NotificationEvents.MARK_ALL_AS_READ, async (_event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      const result = await markAllNotificationsAsRead();
      return { success: true, data: result };
    } catch (error) {
      console.error('[ELECTRON] Error in mark-all-notifications-as-read handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
