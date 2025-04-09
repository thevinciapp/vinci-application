import { API_BASE_URL } from '@/core/auth/auth-service';
import { Space } from '@/entities/space/model/types';
import { useMainStore } from '@/store/main';
import { fetchWithAuth } from '@/shared/api/api-service';
import { fetchActiveConversation, fetchConversations } from 'features/chat/conversation-service';
import { fetchMessages } from 'features/chat/message-service';
import { Provider } from '@/entities/model/model/types';
import { Conversation } from '@/entities/conversation/model/types';
import { Message } from '@/entities/message/model/types';  

export async function fetchSpaces(): Promise<Space[]> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces`);
    const { status, error, spaces } = await response.json();

    if (status !== 'success') {
      throw new Error(error || 'Failed to fetch spaces');
    }
    
    useMainStore.getState().updateSpaces(spaces || []);
    
    return spaces || [];
  } catch (error) {
    console.error('[ELECTRON] Error fetching spaces:', error);
    throw error;
  }
}

export async function fetchActiveSpace(): Promise<Space | null> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/user/active-space`);
    const { status, error, space } = await response.json();

    if (status !== 'success') {
      throw new Error(error || 'Failed to fetch active space');
    }

    if (space) {
      useMainStore.getState().setActiveSpace(space);
    }
    
    return space || null;
  } catch (error) {
    console.error('[ELECTRON] Error fetching active space:', error);
    throw error;
  }
}

/**
 * Update a space with new data
 */
export async function updateSpace(spaceId: string, spaceData: Partial<Space>): Promise<Space> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(spaceData)
    });
    
    const { status, error, space: updatedSpace } = await response.json();
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to update space');
    }
    
    // Update Zustand store
    const store = useMainStore.getState();
    const spaces = store.spaces.map(s => s.id === spaceId ? { ...s, ...updatedSpace } : s);
    store.updateSpaces(spaces);
    
    // If this is the active space, update that too
    if (store.activeSpace && store.activeSpace.id === spaceId) {
      const updatedSpaceFromStore = spaces.find(s => s.id === spaceId);
      if (updatedSpaceFromStore) {
        store.setActiveSpace(updatedSpaceFromStore);
      }
    }
    
    return updatedSpace;
  } catch (error) {
    console.error(`[ELECTRON] Error updating space ${spaceId}:`, error);
    throw error;
  }
}

/**
 * Create a new space
 */
export async function createSpace(spaceData: Partial<Space>): Promise<{
  spaces: Space[];
  activeSpace: Space;
  conversations: Conversation[];
  activeConversation: Conversation;
  messages: Message[];
}> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(spaceData)
    });
    
    const { status, error, data: spaceResponse } = await response.json();
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to create space');
    }
    
    const store = useMainStore.getState();
    const spaces = [...store.spaces, spaceResponse.activeSpace];

    store.updateSpaces(spaces);

    if (spaceResponse.activeSpace) {
      store.setActiveSpace(spaceResponse.activeSpace);
    }

    if (spaceResponse.conversations) {
      store.updateConversations(spaceResponse.conversations);
    }

    if (spaceResponse.activeConversation) {
      store.updateActiveConversation(spaceResponse.activeConversation);
    }

    if (spaceResponse.messages) {
      store.updateMessages(spaceResponse.messages);
    }

    return spaceResponse;
  } catch (error) {
    console.error('[ELECTRON] Error creating space:', error);
    throw error;
  }
}

export async function deleteSpace(spaceId: string): Promise<{
  spaces: Space[];
  activeSpace: Space | null;
  activeConversation: Conversation | null;
  conversations: Conversation[];
  messages: Message[];
}> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}`, {
      method: 'DELETE'
    });
    
    const { status, error } = await response.json();
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to delete space');
    }
    
    const store = useMainStore.getState();
    const spaces = store.spaces.filter(s => s.id !== spaceId);
    store.updateSpaces(spaces);
    
    if (store.activeSpace && store.activeSpace.id === spaceId) {
     const activeSpace = await setActiveSpaceInAPI(spaces[0].id);
     store.setActiveSpace(activeSpace);

     const conversations = await fetchConversations(activeSpace.id);
     const activeConversation = await fetchActiveConversation(activeSpace.id);

     store.updateConversations(conversations);
     store.updateActiveConversation(activeConversation);

     const messages = await fetchMessages(activeConversation.id);
     store.updateMessages(messages);

     return { spaces, activeSpace: activeSpace, conversations: conversations, activeConversation: activeConversation,  messages: messages };
    }
    
    return { spaces, activeSpace: store.activeSpace, conversations: store.conversations, activeConversation: store.activeConversation, messages: store.messages };
  } catch (error) {
    console.error(`[ELECTRON] Error deleting space ${spaceId}:`, error);
    throw error;
  }
}


export async function updateSpaceModel(spaceId: string, modelId: string, provider: string): Promise<boolean> {
  try {
    console.log(`[ELECTRON] Updating space ${spaceId} with model ID: ${modelId}, provider: ${provider}`);
    
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: modelId, provider })
    });
    
    const { status, error } = await response.json();

    if (status !== 'success') {
      throw new Error(error || 'Failed to update space model');
    }
    
    const store = useMainStore.getState();
    if (store.spaces) {
      const spaces = store.spaces.map(space => 
        space.id === spaceId ? { ...space, model: modelId as Provider, provider: provider as Provider } : space
      );
      store.updateSpaces(spaces);
      
      if (store.activeSpace && store.activeSpace.id === spaceId) {
        store.setActiveSpace({
          ...store.activeSpace,
          model: modelId as Provider,
          provider: provider as Provider
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error(`[ELECTRON] Error updating model for space ${spaceId}:`, error);
    throw error;
  }
}

/**
 * Set the active space
 */
export async function setActiveSpaceInAPI(spaceId: string) {
  try {
    if (!spaceId) {
      throw new Error('Space ID is required');
    }

    const response = await fetchWithAuth(`${API_BASE_URL}/api/user/active-space`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ spaceId })
    });
    
    const { status, error, space } = await response.json();

    if (status !== 'success') {
      throw new Error(error || 'Failed to set active space');
    }
    
    console.log(`[ELECTRON] Active space`, space);
    return space;
  } catch (error) {
    console.error(`[ELECTRON] Error setting active space ${spaceId}:`, error);
    throw error;
  }
}