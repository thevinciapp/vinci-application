import { redis, CACHE_KEYS, CACHE_TTL } from '@/app/lib/cache';
import type { Space } from '@/types';

/**
 * Get cached spaces for a user
 */
export async function getCachedSpaces(userId: string): Promise<Space[] | null> {
  try {
    const spaces = await redis.get<Space[]>(CACHE_KEYS.SPACES(userId));
    return spaces;
  } catch (error) {
    console.error('Error getting cached spaces:', error);
    return null;
  }
}

/**
 * Cache spaces for a user
 */
export async function cacheSpaces(userId: string, spaces: Space[]): Promise<void> {
  try {
    await redis.set(CACHE_KEYS.SPACES(userId), spaces, { ex: CACHE_TTL.SPACES });
  } catch (error) {
    console.error('Error caching spaces:', error);
  }
}

/**
 * Invalidate space cache for a user
 */
export async function invalidateSpaceCache(userId: string): Promise<void> {
  try {
    await redis.del(CACHE_KEYS.SPACES(userId));
  } catch (error) {
    console.error('Error invalidating space cache:', error);
  }
}

/**
 * Get a cached space by ID
 */
export async function getCachedSpace(spaceId: string): Promise<Space | null> {
  try {
    const space = await redis.get<Space>(CACHE_KEYS.SPACE(spaceId));
    return space;
  } catch (error) {
    console.error('Error getting cached space:', error);
    return null;
  }
}

/**
 * Cache a single space
 */
export async function cacheSpace(space: Space): Promise<void> {
  try {
    await redis.set(CACHE_KEYS.SPACE(space.id), space, { ex: CACHE_TTL.SPACE });
  } catch (error) {
    console.error('Error caching space:', error);
  }
}

/**
 * Invalidate cache for a single space
 */
export async function invalidateSingleSpaceCache(spaceId: string): Promise<void> {
  try {
    await redis.del(CACHE_KEYS.SPACE(spaceId));
  } catch (error) {
    console.error('Error invalidating single space cache:', error);
  }
}
