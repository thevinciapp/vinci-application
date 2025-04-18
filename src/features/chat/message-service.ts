import { API_BASE_URL } from '@/core/auth/auth-service';
import { useMainStore } from '@/stores/main';
import { fetchWithAuth } from '@/shared/api/api-service';
import { Message, VinciUIMessage } from '@/entities/message/model/types';

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  try {
    const spaceId = useMainStore.getState().activeSpace?.id;
    if (!spaceId) {
      throw new Error('No active space found');
    }

    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}/conversations/${conversationId}/messages`);
    const { status, error, messages: messagesData } = await response.json();

    console.log('[ELECTRON] Messages response:', messagesData);
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to fetch messages');
    }

    const messageItems: Message[] = messagesData?.items || [];
    
    console.log(`[ELECTRON] Fetched ${messageItems.length} messages for conversation ${conversationId}`);
    
    // Map Message[] to VinciUIMessage[] for the store update
    const storeMessages: VinciUIMessage[] = messageItems.map((msg: Message): VinciUIMessage => ({
      id: msg.id,
      role: msg.role ?? 'user', // Default role if missing
      content: msg.content ?? '',
      conversation_id: msg.conversation_id,
      createdAt: new Date(msg.created_at ?? Date.now()), // Convert string to Date
      updated_at: msg.updated_at,
      annotations: msg.annotations ?? [],
      parts: msg.content ? [{ type: 'text', text: msg.content }] : [], // Create basic parts
      // space_id: spaceId, // Can add spaceId if VinciUIMessage requires it
    }));

    // Update the store with the correctly typed VinciUIMessage array
    useMainStore.getState().updateMessages(storeMessages);
    
    // Still return the original Message[] as per function signature
    return messageItems;
  } catch (error) {
    console.error(`[ELECTRON] Error fetching messages for conversation ${conversationId}:`, error);
    if (error instanceof Error) {
      throw new Error(error.message);
    } else if (typeof error === 'object' && error !== null) {
      throw new Error(JSON.stringify(error));
    } else {
      throw new Error(String(error));
    }
  }
}

/**
 * Send a chat message
 */ 
export async function sendChatMessage(conversationId: string, content: string): Promise<Message> {
  try {
    const store = useMainStore.getState();
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
    const store = useMainStore.getState();
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
    const store = useMainStore.getState();
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
    
    const { status, error, message } = await response.json();
    
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
    const { status, error, searchResult } = await response.json();
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to search messages');
    }
    
    return searchResult?.results || [];
  } catch (error) {
    console.error('[ELECTRON] Error searching messages:', error);
    throw error;
  }
}