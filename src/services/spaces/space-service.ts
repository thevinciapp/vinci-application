import { API_BASE_URL } from '@/core/auth/auth-service';
import { Space } from '@/types/space';
import { useMainStore } from '@/store/main';
import { fetchWithAuth } from '@/services/api/api-service';
import { fetchConversations } from '@/services/conversations/conversation-service';
import { fetchMessages } from '@/services/messages/message-service';
import { Provider } from '@/types/provider';

export async function fetchSpaces(): Promise<Space[]> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces`);
    const { status, error, data } = await response.json();

    console.log("[ELECTRON] Fetch spaces response:", status, error, data.spaces);
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to fetch spaces');
    }
    
    useMainStore.getState().updateSpaces(data.spaces || []);
    
    return data.spaces || [];
  } catch (error) {
    console.error('[ELECTRON] Error fetching spaces:', error);
    throw error;
  }
}

export async function fetchActiveSpace(): Promise<Space | null> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/user/active-space`);
    const { status, error, data } = await response.json();

    console.log("[ELECTRON] Fetch active space response:", status, error, data);
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to fetch active space');
    }
    
    if (data?.space) {
      useMainStore.getState().setActiveSpace(data.space);
    }
    
    return data?.space || null;
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
    
    const { status, error, data: updatedSpace } = await response.json();
    
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
export async function createSpace(spaceData: Partial<Space>): Promise<Space> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(spaceData)
    });
    
    const { status, error, data: newSpace } = await response.json();
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to create space');
    }
    
    // Update Zustand store - add new space to list
    const store = useMainStore.getState();
    const spaces = [...store.spaces, newSpace];
    store.updateSpaces(spaces);
    
    return newSpace;
  } catch (error) {
    console.error('[ELECTRON] Error creating space:', error);
    throw error;
  }
}

/**
 * Delete a space
 */
export async function deleteSpace(spaceId: string): Promise<boolean> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}`, {
      method: 'DELETE'
    });
    
    const { status, error } = await response.json();
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to delete space');
    }
    
    // Update Zustand store - remove deleted space
    const store = useMainStore.getState();
    const spaces = store.spaces.filter(s => s.id !== spaceId);
    store.updateSpaces(spaces);
    
    // If this was the active space, clear it
    if (store.activeSpace && store.activeSpace.id === spaceId) {
      store.setActiveSpace(null);
    }
    
    return true;
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
    // Validate space ID
    if (!spaceId) {
      throw new Error('Space ID is required');
    }

    console.log(`[ELECTRON] Setting active space: ${spaceId}`);
    
    const response = await fetchWithAuth(`${API_BASE_URL}/api/user/active-space`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ spaceId })
    });
    
    const responseText = await response.text();
    console.log(`[ELECTRON] Active space API response status: ${response.status}`);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (e) {
      console.error('[ELECTRON] Failed to parse response as JSON:', e);
      throw new Error('Invalid response from server');
    }
    
    const { status, error, data } = parsedResponse;
    
    if (status !== 'success') {
      console.error('[ELECTRON] API error response:', parsedResponse);
      throw new Error(error || 'Failed to set active space');
    }
    
    // Find the space in our spaces array from Zustand store
    const store = useMainStore.getState();
    const space = store.spaces?.find(s => s.id === spaceId);
    
    if (space) {
      // Update the active space in our Zustand store
      store.setActiveSpace(space);
      
      // Also fetch the conversations for this space
      const conversations = await fetchConversations(spaceId);
      
      // If we have conversations, fetch messages for the most recent one
      if (conversations.length > 0) {
        try {
          await fetchMessages(conversations[0].id);
        } catch (error) {
          console.error(`[ELECTRON] Error fetching messages for conversation ${conversations[0].id}:`, error);
        }
      }
      
      // State is automatically synchronized with Zustand
    } else {
      console.warn(`[ELECTRON] Space with ID ${spaceId} not found in Zustand store`);
    }
    
    return data;
  } catch (error) {
    console.error(`[ELECTRON] Error setting active space ${spaceId}:`, error);
    throw error;
  }
}