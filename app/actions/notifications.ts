"use server";

import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/constants";
import { redis, CACHE_KEYS, CACHE_TTL } from "@/app/lib/cache";
import { ActionResponse, successResponse, errorResponse, handleActionError } from "./utils/responses";

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
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationOptions {
  type: NotificationType;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  isInApp?: boolean; // If true, notification will be marked as read automatically
}

/**
 * Create a new notification
 */
export async function createNotification({
  type,
  title,
  description,
  metadata,
  isInApp = true // Default to true for backward compatibility
}: CreateNotificationOptions): Promise<ActionResponse<Notification>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse('User not authenticated');
    }

    const { data, error } = await supabase
      .from(DB_TABLES.NOTIFICATIONS)
      .insert([{
        user_id: user.id,
        type,
        title,
        description,
        metadata,
        is_read: isInApp, // Automatically mark as read if it's an in-app notification
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return errorResponse(`Error creating notification: ${error.message}`);
    }

    // Update notifications cache
    const cacheKey = CACHE_KEYS.NOTIFICATIONS(user.id);
    const cachedNotifications = await redis.get<Notification[]>(cacheKey) || [];
    await redis.set(cacheKey, [data, ...cachedNotifications], { ex: CACHE_TTL.NOTIFICATIONS });

    return successResponse(data);
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Get all notifications for the current user
 */
export async function getNotifications(limit = 50): Promise<ActionResponse<Notification[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse('User not authenticated');
    }

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.NOTIFICATIONS(user.id);
    const cachedNotifications = await redis.get<Notification[]>(cacheKey);
    if (cachedNotifications) {
      return successResponse(cachedNotifications);
    }

    const { data, error } = await supabase
      .from(DB_TABLES.NOTIFICATIONS)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching notifications:", error);
      return errorResponse(`Error fetching notifications: ${error.message}`);
    }

    // Cache the result
    if (data) {
      await redis.set(cacheKey, data, { ex: CACHE_TTL.NOTIFICATIONS });
    }

    return successResponse(data || []);
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse('User not authenticated');
    }

    const { error } = await supabase
      .from(DB_TABLES.NOTIFICATIONS)
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error marking notification as read:", error);
      return errorResponse(`Error marking notification as read: ${error.message}`);
    }

    // Update cache
    const cacheKey = CACHE_KEYS.NOTIFICATIONS(user.id);
    const cachedNotifications = await redis.get<Notification[]>(cacheKey);
    if (cachedNotifications) {
      const updatedNotifications = cachedNotifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      );
      await redis.set(cacheKey, updatedNotifications, { ex: CACHE_TTL.NOTIFICATIONS });
    }

    return successResponse(true);
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse('User not authenticated');
    }

    const { error } = await supabase
      .from(DB_TABLES.NOTIFICATIONS)
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      return errorResponse(`Error marking all notifications as read: ${error.message}`);
    }

    // Update cache
    const cacheKey = CACHE_KEYS.NOTIFICATIONS(user.id);
    const cachedNotifications = await redis.get<Notification[]>(cacheKey);
    if (cachedNotifications) {
      const updatedNotifications = cachedNotifications.map(n => ({ ...n, is_read: true }));
      await redis.set(cacheKey, updatedNotifications, { ex: CACHE_TTL.NOTIFICATIONS });
    }

    return successResponse(true);
  } catch (error) {
    return handleActionError(error);
  }
} 