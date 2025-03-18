import { API_BASE_URL } from '../../core/auth/auth-service';
import { fetchWithAuth } from '../api/api-service';

/**
 * Notification service interface and types
 */

export interface Notification {
  id: string;
  title: string;
  description: string;
  is_read: boolean;
  created_at: string;
  user_id: string;
  type: NotificationType;
  source_id?: string;
  action_url?: string;
}

export enum NotificationType {
  System = 'system',
  Message = 'message',
  Space = 'space',
  User = 'user'
}

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
    const data = await response.json();
    
    if (data.status !== 'success') {
      return {
        success: false,
        error: data.error || 'Failed to fetch notifications'
      };
    }
    
    return {
      success: true,
      data: data.data || []
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
    const data = await response.json();
    
    if (data.status !== 'success') {
      return {
        success: false,
        error: data.error || 'Failed to mark notification as read'
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
    const data = await response.json();
    
    if (data.status !== 'success') {
      return {
        success: false,
        error: data.error || 'Failed to mark all notifications as read'
      };
    }
    
    return {
      success: true,
      data: {
        count: data.data?.count || 0,
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
    const data = await response.json();
    
    if (data.status !== 'success') {
      return {
        success: false,
        error: data.error || 'Failed to create notification'
      };
    }
    
    return {
      success: true,
      data: [data.data] // Return as array to match response type
    };
  } catch (error: any) {
    console.error('[ELECTRON] Error creating notification:', error);
    return {
      success: false,
      error: error.message || 'Failed to create notification'
    };
  }
}
