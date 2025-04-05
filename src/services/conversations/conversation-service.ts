import { API_BASE_URL } from '@/config/api';
import { useMainStore } from '@/store/main';
import { fetchWithAuth } from '@/services/api/api-service';
import { Conversation } from '@/types/conversation';

export async function fetchConversations(spaceId: string): Promise<Conversation[]> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}/conversations`);
    const { status, error, conversations: conversationsData } = await response.json();

    if (status !== 'success') {
      throw new Error(error || 'Failed to fetch conversations');
    }

    const conversationItems = conversationsData?.items || [];
    useMainStore.getState().updateConversations(conversationItems);
    
    return conversationItems;
  } catch (error) {
    console.error(`[ELECTRON] Error fetching conversations for space ${spaceId}:`, error);
    throw error;
  }
}


export async function createConversation(spaceId: string, title: string): Promise<Conversation> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });
    
    const { status, error, conversation } = await response.json();
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to create conversation');
    }
    
    const store = useMainStore.getState();
    const conversations = [conversation, ...store.conversations];
    store.updateConversations(conversations);
    
    return conversation;
  } catch (error) {
    console.error(`[ELECTRON] Error creating conversation in space ${spaceId}:`, error);
    throw error;
  }
}


export async function updateConversation(spaceId: string, conversationId: string, title: string): Promise<Conversation> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });
    
    const { status, error, conversation: updatedConversation } = await response.json();
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to update conversation');
    }
    
    const store = useMainStore.getState();
    const conversations = store.conversations.map(c => 
      c.id === conversationId ? { ...c, title } : c
    );
    store.updateConversations(conversations);
    
    return updatedConversation;
  } catch (error) {
    console.error(`[ELECTRON] Error updating conversation ${conversationId}:`, error);
    throw error;
  }
}

export async function deleteConversation(spaceId: string, conversationId: string): Promise<boolean> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}/conversations/${conversationId}`, {
      method: 'DELETE'
    });
    
    const { status, error } = await response.json();
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to delete conversation');
    }
    
    const store = useMainStore.getState();
    const conversations = store.conversations.filter(c => c.id !== conversationId);
    store.updateConversations(conversations);
    
    return true;
  } catch (error) {
    console.error(`[ELECTRON] Error deleting conversation ${conversationId}:`, error);
    throw error;
  }
}


export async function setActiveConversationInAPI(conversationId: string, spaceId: string) {
  try {
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }

    if (!spaceId) {
      throw new Error('Space ID is required');
    }
    
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}/active-conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ conversationId })
    });
    
    const responseText = await response.text();
    console.log(`[ELECTRON] Active conversation API response status: ${response.status}`);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (e) {
      console.error('[ELECTRON] Failed to parse response as JSON:', e);
      throw new Error('Invalid response from server');
    }
    
    const { status, error, conversation: apiConversation } = parsedResponse;
    
    if (status !== 'success') {
      console.error('[ELECTRON] API error response:', parsedResponse);
      throw new Error(error || 'Failed to set active conversation');
    }
    
    const store = useMainStore.getState();
    const conversation = store.conversations?.find(c => c.id === conversationId);
    
    if (conversation) {
      const updatedConversations = store.conversations.map(c => ({
        ...c,
        active: c.id === conversationId
      }));
      store.updateConversations(updatedConversations);
      store.updateActiveConversation(conversation);
    } else {
      console.warn(`[ELECTRON] Conversation with ID ${conversationId} not found in Zustand store`);
    }
    
    return apiConversation;
  } catch (error) {
    console.error(`[ELECTRON] Error setting active conversation ${conversationId}:`, error);
    throw error;
  }
}

export async function fetchActiveConversation(spaceId: string): Promise<Conversation> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}/active-conversation`);
    const { status, error, conversation } = await response.json();

    if (status !== 'success') {
      throw new Error(error || 'Failed to fetch active conversation');
    }

    const store = useMainStore.getState();
    store.updateActiveConversation(conversation);

    return conversation;
  } catch (error) {
    console.error('[ELECTRON] Error fetching active conversation:', error);
    throw error;
  }
}