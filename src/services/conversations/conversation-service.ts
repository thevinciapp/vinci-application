import { API_BASE_URL } from '@/src/core/auth/auth-service';
import { Conversation } from '@/src/types';
import { store } from '@/src/store';
import { updateConversations } from '@/src/store/actions';
import { fetchWithAuth } from '@/src/services/api/api-service';

/**
 * Fetch conversations for a specific space
 */
export async function fetchConversations(spaceId: string): Promise<Conversation[]> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}/conversations`);
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to fetch conversations');
    }
    
    const conversations = data.data || [];
    
    // Update conversations in Redux store
    store.dispatch(updateConversations(conversations));
    
    return conversations;
  } catch (error) {
    console.error(`[ELECTRON] Error fetching conversations for space ${spaceId}:`, error);
    throw error;
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(spaceId: string, title: string): Promise<Conversation> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to create conversation');
    }
    
    // Update conversations in Redux store
    const state = store.getState();
    const conversations = [data.data, ...state.conversations];
    store.dispatch(updateConversations(conversations));
    
    return data.data;
  } catch (error) {
    console.error(`[ELECTRON] Error creating conversation in space ${spaceId}:`, error);
    throw error;
  }
}

/**
 * Update conversation title
 */
export async function updateConversation(spaceId: string, conversationId: string, title: string): Promise<Conversation> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to update conversation');
    }
    
    // Update conversations in Redux store
    const state = store.getState();
    const conversations = state.conversations.map(c => 
      c.id === conversationId ? { ...c, title } : c
    );
    store.dispatch(updateConversations(conversations));
    
    return data.data;
  } catch (error) {
    console.error(`[ELECTRON] Error updating conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(spaceId: string, conversationId: string): Promise<boolean> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}/conversations/${conversationId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to delete conversation');
    }
    
    // Update conversations in Redux store
    const state = store.getState();
    const conversations = state.conversations.filter(c => c.id !== conversationId);
    store.dispatch(updateConversations(conversations));
    
    return true;
  } catch (error) {
    console.error(`[ELECTRON] Error deleting conversation ${conversationId}:`, error);
    throw error;
  }
}