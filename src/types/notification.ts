export type NotificationType =
  | 'space_created'
  | 'space_deleted'
  | 'model_changed'
  | 'conversation_created'
  | 'conversation_deleted';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  description: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetNotificationsResponse {
  notifications: Notification[];
}

export interface UpdateNotificationRequest {
  is_read?: boolean;
}

export interface UpdateNotificationResponse {
  notification: Notification;
} 