import { IpcResponse } from '@/shared/types/ipc';

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
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationResponse extends IpcResponse {
  data?: Notification | Notification[] | { deleted: boolean } | { updated: boolean };
}

export interface GetNotificationsResponse {
  notifications: Notification[];
}