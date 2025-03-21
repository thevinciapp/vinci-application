import { API_BASE_URL } from '../../core/auth/auth-service';
import { Message } from 'vinci-common';
import { useStore } from '../../store';
import { fetchWithAuth } from '../api/api-service';

/**
 * Fetch messages for a specific conversation
 */
export async function fetchMessages(conversationId: string): Promise<Message[]> {
  try {
    // Get current space ID from store
    const spaceId = useStore.getState().activeSpace?.id;
    if (!spaceId) {
      throw new Error('No active space found');
    }

    // Add a circuit breaker to prevent infinite loops
    const store = useStore.getState();
    const conversationKey = `fetch_attempts_${conversationId}`;
    const fetchAttempts = (store as any)[conversationKey] || 0;
    
    if (fetchAttempts > 3) {
      console.log(`[ELECTRON] Too many fetch attempts for conversation ${conversationId}, aborting to prevent infinite loop`);
      // Reset the counter after a while
      setTimeout(() => {
        const currentStore = useStore.getState();
        const updatedStore = { ...currentStore };
        delete (updatedStore as any)[conversationKey];
        useStore.setState(updatedStore);
      }, 5000);
      return [];
    }
    
    // Increment attempt counter
    useStore.setState({ ...store, [conversationKey]: fetchAttempts + 1 });

    // Make the API request
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}/conversations/${conversationId}/messages`);
    const responseData = await response.json();
    const { status, error, data } = responseData;

    console.log('[ELECTRON] Messages response:', data);
    
    if (status !== 'success') {
      const errorMessage = typeof error === 'object' 
        ? JSON.stringify(error) 
        : (error || 'Failed to fetch messages');
      throw new Error(errorMessage);
    }

    const messages = data?.data || [];
    console.log(`[ELECTRON] Fetched ${messages.length} messages for conversation ${conversationId}`);
    
    // Reset attempt counter on success
    const updatedStore = { ...useStore.getState() };
    delete (updatedStore as any)[conversationKey];
    useStore.setState(updatedStore);
    
    // Update messages in store
    useStore.getState().updateMessages(messages);
    
    return messages;
  } catch (error) {
    // Properly format the error for logging and rethrowing
    let errorMessage: string;
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object') {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = 'Unknown error object';
      }
    } else {
      errorMessage = String(error);
    }
    
    console.error(`[ELECTRON] Error fetching messages for conversation ${conversationId}:`, errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Send a chat message
 */
export async function sendChatMessage(conversationId: string, content: string): Promise<Message> {
  try {
    const store = useStore.getState();
    if (!store.activeSpace) {
      throw new Error('No active space found');
    }
    
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/spaces/${store.activeSpace.id}/conversations/${conversationId}/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      }
    );
    
    const { status, error, data: message } = await response.json();
    
    if (status !== 'success' || !message) {
      throw new Error(error || 'Failed to send message');
    }
    
    // Update messages in Zustand store
    const messages = [...store.messages, message];
    store.updateMessages(messages);
    
    return message;
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
    const store = useStore.getState();
    if (!store.activeSpace) {
      throw new Error('No active space found');
    }
    
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/spaces/${store.activeSpace.id}/conversations/${conversationId}/messages/${messageId}`,
      { method: 'DELETE' }
    );
    
    const { status, error } = await response.json();
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to delete message');
    }
    
    // Update messages in Zustand store
    const messages = store.messages.filter(m => m.id !== messageId);
    store.updateMessages(messages);
    
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
    const store = useStore.getState();
    if (!store.activeSpace) {
      throw new Error('No active space found');
    }
    
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/spaces/${store.activeSpace.id}/conversations/${conversationId}/messages/${messageId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      }
    );
    
    const { status, error, data: message } = await response.json();
    
    if (status !== 'success' || !message) {
      throw new Error(error || 'Failed to update message');
    }
    
    // Update messages in Zustand store
    const messages = store.messages.map(m => m.id === messageId ? { ...m, content } : m);
    store.updateMessages(messages);
    
    return message;
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
    const { status, error, data: messages } = await response.json();
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to search messages');
    }
    
    return messages || [];
  } catch (error) {
    console.error('[ELECTRON] Error searching messages:', error);
    throw error;
  }
}