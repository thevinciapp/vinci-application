"use server";

import { redis, CACHE_KEYS, CACHE_TTL } from "@/app/lib/cache";

/**
 * Invalidate cache for a specific key
 */
export async function invalidateCache(key: string): Promise<void> {
  await redis.del(key);
}

/**
 * Invalidate all cache keys related to a space
 */
export async function invalidateSpaceCache(spaceId: string, userId?: string): Promise<void> {
  await Promise.all([
    redis.del(CACHE_KEYS.SPACE(spaceId)),
    redis.del(CACHE_KEYS.SPACE_DATA(spaceId)),
    redis.del(CACHE_KEYS.SPACE_HISTORY(spaceId)),
    redis.del(CACHE_KEYS.CONVERSATIONS(spaceId)),
    userId ? redis.del(CACHE_KEYS.SPACES(userId)) : Promise.resolve(),
  ]);
}

/**
 * Invalidate all cache keys related to a conversation
 */
export async function invalidateConversationCache(conversationId: string, spaceId?: string): Promise<void> {
  await Promise.all([
    redis.del(CACHE_KEYS.MESSAGES(conversationId)),
    spaceId ? redis.del(CACHE_KEYS.CONVERSATIONS(spaceId)) : Promise.resolve(),
    spaceId ? redis.del(CACHE_KEYS.SPACE_DATA(spaceId)) : Promise.resolve(),
  ]);
}

/**
 * Get Redis client instance
 */
export async function getRedisClient(): Promise<Redis> {
  return redis;
}

/**
 * Get cache key for a resource
 */
export async function getCacheKey(
  type: keyof typeof CACHE_KEYS, 
  id: string
): Promise<string> {
  return CACHE_KEYS[type](id);
}

/**
 * Get cache TTL for a resource type
 */
export async function getCacheTTL(type: keyof typeof CACHE_TTL): Promise<number> {
  return CACHE_TTL[type];
} 