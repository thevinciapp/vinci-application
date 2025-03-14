import { API_BASE_URL } from '@/src/core/auth/auth-service';
import { Message } from '@/src/types';
import { store } from '@/src/store';
import { updateMessages } from '@/src/store/actions';
import { fetchWithAuth } from '@/src/services/api/api-service';

/**
 * Fetch messages for a specific conversation
 */
export async function fetchMessages(conversationId: string): Promise<Message[]> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/conversations/${conversationId}/messages`);
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to fetch messages');
    }
    
    const messages = data.data || [];
    
    // Update messages in Redux store
    store.dispatch(updateMessages(messages));
    
    return messages;
  } catch (error) {
    console.error(`[ELECTRON] Error fetching messages for conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Send a chat message
 */
export async function sendChatMessage(conversationId: string, content: string): Promise<Message> {
  try {
    const state = store.getState();
    if (!state.activeSpace) {
      throw new Error('No active space found');
    }
    
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/spaces/${state.activeSpace.id}/conversations/${conversationId}/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      }
    );
    
    const data = await response.json();
    
    if (data.status !== 'success' || !data.data) {
      throw new Error(data.error || 'Failed to send message');
    }
    
    // Update messages in Redux store
    const messages = [...state.messages, data.data];
    store.dispatch(updateMessages(messages));
    
    return data.data;
  } catch (error) {
    console.error(`[ELECTRON] Error sending chat message in conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(conversationId: string, messageId: string): Promise<boolean> {
  try {
    const state = store.getState();
    if (!state.activeSpace) {
      throw new Error('No active space found');
    }
    
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/spaces/${state.activeSpace.id}/conversations/${conversationId}/messages/${messageId}`,
      { method: 'DELETE' }
    );
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to delete message');
    }
    
    // Update messages in Redux store
    const messages = state.messages.filter(m => m.id !== messageId);
    store.dispatch(updateMessages(messages));
    
    return true;
  } catch (error) {
    console.error(`[ELECTRON] Error deleting message ${messageId}:`, error);
    throw error;
  }
}

/**
 * Update a message
 */
export async function updateMessage(conversationId: string, messageId: string, content: string): Promise<Message> {
  try {
    const state = store.getState();
    if (!state.activeSpace) {
      throw new Error('No active space found');
    }
    
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/spaces/${state.activeSpace.id}/conversations/${conversationId}/messages/${messageId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      }
    );
    
    const data = await response.json();
    
    if (data.status !== 'success' || !data.data) {
      throw new Error(data.error || 'Failed to update message');
    }
    
    // Update messages in Redux store
    const messages = state.messages.map(m => m.id === messageId ? { ...m, content } : m);
    store.dispatch(updateMessages(messages));
    
    return data.data;
  } catch (error) {
    console.error(`[ELECTRON] Error updating message ${messageId}:`, error);
    throw error;
  }
}

/**
 * Search messages
 */
export async function searchMessages(query: string): Promise<Message[]> {
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