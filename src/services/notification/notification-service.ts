import { API_BASE_URL } from '@/core/auth/auth-service';
import { fetchWithAuth } from '@/services/api/api-service';
import { Notification, NotificationType } from '@/types/notification';

export interface NotificationResponse {
  success: boolean;
  data?: Notification[];
  error?: string;
}

export interface MarkNotificationResponse {
  success: boolean;
  data?: {
    id: string;
    updated: boolean;
  };
  error?: string;
}

export interface MarkAllNotificationsResponse {
  success: boolean;
  data?: {
    count: number;
    updated: boolean;
  };
  error?: string;
}

export interface CreateNotificationOptions {
  title: string;
  description: string;
  userId: string;
  type: NotificationType;
  sourceId?: string;
  actionUrl?: string;
}

/**
 * Fetch all notifications for the current user
 */
export async function fetchNotifications(): Promise<NotificationResponse> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/notifications`);
    const { status, error, data: notifications } = await response.json();
    
    if (status !== 'success') {
      return {
        success: false,
        error: error || 'Failed to fetch notifications'
      };
    }
    
    return {
      success: true,
      data: notifications || []
    };
  } catch (error: any) {
    console.error('[ELECTRON] Error fetching notifications:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch notifications'
    };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<MarkNotificationResponse> {
  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/notifications/${notificationId}/read`,
      {
        method: 'PUT'
      }
    );
    const { status, error } = await response.json();
    
    if (status !== 'success') {
      return {
        success: false,
        error: error || 'Failed to mark notification as read'
      };
    }
    
    return {
      success: true,
      data: {
        id: notificationId,
        updated: true
      }
    };
  } catch (error: any) {
    console.error('[ELECTRON] Error marking notification as read:', error);
    return {
      success: false,
      error: error.message || 'Failed to mark notification as read'
    };
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead(): Promise<MarkAllNotificationsResponse> {
  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/notifications/read-all`,
      {
        method: 'PUT'
      }
    );
    const { status, error, data } = await response.json();
    
    if (status !== 'success') {
      return {
        success: false,
        error: error || 'Failed to mark all notifications as read'
      };
    }
    
    return {
      success: true,
      data: {
        count: data?.count || 0,
        updated: true
      }
    };
  } catch (error: any) {
    console.error('[ELECTRON] Error marking all notifications as read:', error);
    return {
      success: false,
      error: error.message || 'Failed to mark all notifications as read'
    };
  }
}

/**
 * Create a new notification
 */
export async function createNotification(options: CreateNotificationOptions): Promise<NotificationResponse> {
  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/notifications`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: options.title,
          description: options.description,
          user_id: options.userId,
          type: options.type,
          source_id: options.sourceId,
          action_url: options.actionUrl
        })
      }
    );
    const { status, error, data: notification } = await response.json();
    
    if (status !== 'success') {
      return {
        success: false,
        error: error || 'Failed to create notification'
      };
    }
    
    return {
      success: true,
      data: [notification] // Return as array to match response type
    };
  } catch (error: any) {
    console.error('[ELECTRON] Error creating notification:', error);
    return {
      success: false,
      error: error.message || 'Failed to create notification'
    };
  }
}
