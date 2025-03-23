import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { NotificationEvents } from '@/core/ipc/constants';
import type { 
  NotificationResponse, 
  MarkNotificationResponse, 
  MarkAllNotificationsResponse 
} from '@/services/notification/notification-service';
import { Notification } from '@/types/notification';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response: NotificationResponse = await window.electron.invoke(
        NotificationEvents.GET_NOTIFICATIONS
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to load notifications');
      }

      setNotifications(response.data || []);
      setUnreadCount(
        (response.data || []).filter(
          (notification) => !notification.is_read
        ).length
      );
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      setError(null);

      const response: MarkNotificationResponse = await window.electron.invoke(
        NotificationEvents.MARK_AS_READ,
        notificationId
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to mark notification as read');
      }

      // Fetch updated notifications
      await fetchNotifications();
      
      return response.data;
    } catch (err: any) {
      setError(err.message);
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      setError(null);

      const response: MarkAllNotificationsResponse = await window.electron.invoke(
        NotificationEvents.MARK_ALL_AS_READ
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to mark all notifications as read');
      }

      // Fetch updated notifications
      await fetchNotifications();
      
      // Show success message
      toast.success('All notifications marked as read');
      
      return response.data;
    } catch (err: any) {
      setError(err.message);
      console.error('Error marking all notifications as read:', err);
      toast.error(err.message);
      throw err;
    }
  }, [fetchNotifications]);

  const setupNotificationListener = useCallback(() => {
    const handleNotificationReceived = (event: any, response: any) => {
      if (response.success && response.data) {
        fetchNotifications();
          
        const newNotification = response.data;
        toast(newNotification.title, {
          description: newNotification.description,
        });
      }
    };
    
    window.electron.on(
      NotificationEvents.NOTIFICATION_RECEIVED,
      handleNotificationReceived
    );
    
    return () => {
      window.electron.off(
        NotificationEvents.NOTIFICATION_RECEIVED,
        handleNotificationReceived
      );
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    setupNotificationListener,
    markAsRead,
    markAllAsRead
  };
}
