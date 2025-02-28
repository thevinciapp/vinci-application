"use server";

import { createClient } from "@/utils/supabase/server";
import { redis, CACHE_KEYS, CACHE_TTL } from "@/app/lib/cache";
import { ActionResponse, successResponse, errorResponse, handleActionError } from "./utils/responses";

export type SpaceActionType = 
  | 'space_created'
  | 'space_updated'
  | 'space_deleted'
  | 'conversation_created'
  | 'conversation_deleted'
  | 'model_changed'
  | 'message_sent'
  | 'message_deleted';

export interface SpaceHistoryEntry {
  id: string;
  space_id: string;
  user_id: string;
  action_type: SpaceActionType;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface CreateSpaceHistoryOptions {
  spaceId: string;
  actionType: SpaceActionType;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new space history entry
 */
export async function createSpaceHistory({
  spaceId,
  actionType,
  title,
  description,
  metadata
}: CreateSpaceHistoryOptions): Promise<ActionResponse<SpaceHistoryEntry>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse('User not authenticated');
    }

    const { data, error } = await supabase
      .from('space_history')
      .insert([{
        space_id: spaceId,
        user_id: user.id,
        action_type: actionType,
        title,
        description,
        metadata
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating space history entry:", error);
      return errorResponse(`Error creating space history entry: ${error.message}`);
    }

    // Update space history cache
    const cacheKey = CACHE_KEYS.SPACE_HISTORY(spaceId);
    const cachedHistory = await redis.get<SpaceHistoryEntry[]>(cacheKey) || [];
    await redis.set(cacheKey, [data, ...cachedHistory], { ex: CACHE_TTL.SPACE_HISTORY });

    return successResponse(data);
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Get space history entries
 */
export async function getSpaceHistory(spaceId: string, limit = 50): Promise<ActionResponse<SpaceHistoryEntry[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse('User not authenticated');
    }

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.SPACE_HISTORY(spaceId);
    const cachedHistory = await redis.get<SpaceHistoryEntry[]>(cacheKey);
    if (cachedHistory) {
      return successResponse(cachedHistory);
    }

    const { data, error } = await supabase
      .from('space_history')
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching space history:", error);
      return errorResponse(`Error fetching space history: ${error.message}`);
    }

    // Cache the result
    if (data) {
      await redis.set(cacheKey, data, { ex: CACHE_TTL.SPACE_HISTORY });
    }

    return successResponse(data || []);
  } catch (error) {
    return handleActionError(error);
  }
} 