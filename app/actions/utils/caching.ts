import { redis, CACHE_KEYS, CACHE_TTL } from '@/app/lib/cache';
import type { Space } from '@/types';

/**
 * Invalidate space-related caches
 */
export async function invalidateSpaceCache(userId: string, spaceId?: string) {
  const keys = [CACHE_KEYS.SPACES(userId)];
  
  if (spaceId) {
    keys.push(
      CACHE_KEYS.SPACE(spaceId),
      CACHE_KEYS.SPACE_DATA(spaceId),
      CACHE_KEYS.CONVERSATIONS(spaceId),
      CACHE_KEYS.MOST_RECENT_CONVERSATION(spaceId)
    );
  }
  
  await Promise.all(keys.map(key => redis.del(key)));
}

/**
 * Cache space data
 */
export async function cacheSpace(userId: string, space: Space) {
  await Promise.all([
    redis.set(CACHE_KEYS.SPACE(space.id), JSON.stringify(space), { ex: CACHE_TTL.SPACE }),
    invalidateSpaceCache(userId) // Invalidate spaces list to force refresh
  ]);
}

/**
 * Get space from cache
 */
export async function getCachedSpace(spaceId: string): Promise<Space | null> {
  const cached = await redis.get<string>(CACHE_KEYS.SPACE(spaceId));
  return cached ? JSON.parse(cached) : null;
}

/**
 * Cache spaces list
 */
export async function cacheSpaces(userId: string, spaces: Space[]) {
  await redis.set(CACHE_KEYS.SPACES(userId), JSON.stringify(spaces), { ex: CACHE_TTL.SPACES });
}

/**
 * Get spaces list from cache
 */
export async function getCachedSpaces(userId: string): Promise<Space[] | null> {
  const cached = await redis.get<string>(CACHE_KEYS.SPACES(userId));
  return cached ? JSON.parse(cached) : null;
}
