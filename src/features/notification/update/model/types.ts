import { Notification } from '@/entities/notification/model/types';

export interface UpdateNotificationRequest {
  is_read?: boolean;
}

export interface UpdateNotificationResponse {
  notification: Notification;
}