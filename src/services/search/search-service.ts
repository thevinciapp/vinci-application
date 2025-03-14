import { API_BASE_URL } from '@/src/core/auth/auth-service';
import { Message } from '@/src/types';
import { fetchWithAuth } from '@/src/services/api/api-service';

/**
 * Search for messages across all conversations
 */
export async function searchAllMessages(query: string): Promise<Message[]> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/search/messages?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to search messages');
    }
    
    return data.data || [];
  } catch (error) {
    console.error('[ELECTRON] Error searching messages:', error);
    throw error;
  }
}

/**
 * Search for messages in a specific space
 */
export async function searchSpaceMessages(spaceId: string, query: string): Promise<Message[]> {
  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/search/spaces/${spaceId}/messages?q=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to search space messages');
    }
    
    return data.data || [];
  } catch (error) {
    console.error(`[ELECTRON] Error searching messages in space ${spaceId}:`, error);
    throw error;
  }
}

/**
 * Search for messages in a specific conversation
 */
export async function searchConversationMessages(conversationId: string, query: string): Promise<Message[]> {
  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/search/conversations/${conversationId}/messages?q=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to search conversation messages');
    }
    
    return data.data || [];
  } catch (error) {
    console.error(`[ELECTRON] Error searching messages in conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Find similar messages to a given message
 */
export async function findSimilarMessages(messageId: string, limit: number = 5): Promise<Message[]> {
  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/search/similar-messages/${messageId}?limit=${limit}`
    );
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to find similar messages');
    }
    
    return data.data || [];
  } catch (error) {
    console.error(`[ELECTRON] Error finding similar messages to ${messageId}:`, error);
    throw error;
  }
}