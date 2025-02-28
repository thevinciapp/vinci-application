import { Redis } from "@upstash/redis";

// Initialize Redis client
export const redis = Redis.fromEnv();

// Cache keys for different resources
export const CACHE_KEYS = {
  SPACE_HISTORY: (spaceId: string) => `space_history:${spaceId}`,
  NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
  SPACES: (userId: string) => `spaces:${userId}`,
  SPACE: (spaceId: string) => `space:${spaceId}`,
  ACTIVE_SPACE: (userId: string) => `active_space:${userId}`,
  CONVERSATIONS: (spaceId: string) => `conversations:${spaceId}`,
  MESSAGES: (conversationId: string) => `messages:${conversationId}`,
  SPACE_DATA: (spaceId: string) => `space_data:${spaceId}`,
};

// Cache TTL for different resources (in seconds)
export const CACHE_TTL = {
  SPACE_HISTORY: 60 * 5, // 5 minutes
  NOTIFICATIONS: 60 * 5, // 5 minutes
  SPACES: 60 * 5, // 5 minutes
  SPACE: 60 * 5, // 5 minutes
  ACTIVE_SPACE: 60 * 60, // 1 hour
  CONVERSATIONS: 60 * 5, // 5 minutes
  MESSAGES: 60 * 5, // 5 minutes
  SPACE_DATA: 60 * 5, // 5 minutes
}; 