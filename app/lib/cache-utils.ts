import { redis, CACHE_KEYS } from "@/app/lib/cache";

/**
 * Invalidate all space-related caches 
 * This ensures that all components that depend on space data will get fresh data
 */
export async function invalidateSpaceCache(spaceId: string): Promise<void> {
  const cacheKeys = [
    CACHE_KEYS.SPACE_DATA(spaceId),
    CACHE_KEYS.CONVERSATIONS(spaceId),
    CACHE_KEYS.SPACE_HISTORY(spaceId)
  ];
  
  await Promise.all(cacheKeys.map(key => redis.del(key)));
}

/**
 * Invalidate conversation-related caches
 */
export async function invalidateConversationCache(
  conversationId: string, 
  spaceId: string
): Promise<void> {
  const cacheKeys = [
    CACHE_KEYS.MESSAGES(conversationId),
    CACHE_KEYS.SPACE_DATA(spaceId),
    CACHE_KEYS.CONVERSATIONS(spaceId)
  ];
  
  await Promise.all(cacheKeys.map(key => redis.del(key)));
}

/**
 * Invalidate user-related caches
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const cacheKeys = [
    CACHE_KEYS.SPACES(userId),
    CACHE_KEYS.NOTIFICATIONS(userId)
  ];
  
  await Promise.all(cacheKeys.map(key => redis.del(key)));
}

/**
 * Invalidate multiple related caches at once for a specific operation
 */
export async function invalidateOperationCaches(options: {
  userId?: string;
  spaceId?: string;
  conversationId?: string;
}): Promise<void> {
  const { userId, spaceId, conversationId } = options;
  const invalidationPromises: Promise<void>[] = [];
  
  if (userId) {
    invalidationPromises.push(invalidateUserCache(userId));
  }
  
  if (spaceId) {
    invalidationPromises.push(invalidateSpaceCache(spaceId));
  }
  
  if (conversationId && spaceId) {
    invalidationPromises.push(invalidateConversationCache(conversationId, spaceId));
  }
  
  await Promise.all(invalidationPromises);
} 