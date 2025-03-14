import { API_BASE_URL } from '@/src/config/api';
import { Conversation } from '@/src/types';
import { useStore } from '@/src/store';
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
    
    useStore.getState().updateConversations(conversations);
    
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
    
    // Update conversations in Zustand store
    const store = useStore.getState();
    const conversations = [data.data, ...store.conversations];
    store.updateConversations(conversations);
    
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
    
    // Update conversations in Zustand store
    const store = useStore.getState();
    const conversations = store.conversations.map(c => 
      c.id === conversationId ? { ...c, title } : c
    );
    store.updateConversations(conversations);
    
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
    
    // Update conversations in Zustand store
    const store = useStore.getState();
    const conversations = store.conversations.filter(c => c.id !== conversationId);
    store.updateConversations(conversations);
    
    return true;
  } catch (error) {
    console.error(`[ELECTRON] Error deleting conversation ${conversationId}:`, error);
    throw error;
  }
}