import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { NotificationEvents } from '@/core/ipc/constants';
import type { 
  Notification, 
  NotificationResponse, 
  MarkNotificationResponse, 
  MarkAllNotificationsResponse 
} from '@/services/notification/notification-service';

/**
 * Hook to manage user notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load notifications from the IPC service
   */
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

  /**
   * Mark a notification as read
   */
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

  /**
   * Mark all notifications as read
   */
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

  // Set up event listener for new notifications
  useEffect(() => {
    const cleanup = window.electron.on(
      NotificationEvents.NOTIFICATION_RECEIVED,
      (event, response) => {
        if (response.success && response.data) {
          fetchNotifications();
          
          // Optionally show a toast for the new notification
          const newNotification = response.data;
          toast(newNotification.title, {
            description: newNotification.description,
          });
        }
      }
    );

    // Initial fetch
    fetchNotifications();

    // Return the cleanup function directly
    return cleanup;
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };
}
