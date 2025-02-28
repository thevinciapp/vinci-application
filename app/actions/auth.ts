"use server";

import { createClient } from "@/utils/supabase/server";
import { redis, CACHE_KEYS } from "@/app/lib/cache";
import { ActionResponse, successResponse, errorResponse, handleActionError } from "./utils/responses";

/**
 * Sign out the current user and clear all cache
 */
export async function signOutAction(): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const supabase = await createClient();
    
    // Clear all redis cache for the user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await Promise.all([
        redis.del(CACHE_KEYS.SPACES(user.id)),
        redis.del(CACHE_KEYS.ACTIVE_SPACE(user.id)),
        redis.del(CACHE_KEYS.NOTIFICATIONS(user.id))
      ]);
    }

    // Sign out from Supabase
    await supabase.auth.signOut();

    return await successResponse({ success: true });
  } catch (error) {
    console.error('Error during sign out:', error);
    return await handleActionError(error);
  }
} 