import { API_BASE_URL } from '@/src/core/auth/auth-service';
import { Space } from '@/src/types';
import { store } from '@/src/store';
import { updateSpaces, setActiveSpace } from '@/src/store/actions';
import { fetchWithAuth } from '@/src/services/api/api-service';
import { fetchConversations } from '@/src/services/conversations/conversation-service';
import { fetchMessages } from '@/src/services/messages/message-service';

/**
 * Fetch all spaces for the current user
 */
export async function fetchSpaces(): Promise<Space[]> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces`);
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to fetch spaces');
    }
    
    // Update spaces in Redux store
    store.dispatch(updateSpaces(data.data || []));
    
    return data.data || [];
  } catch (error) {
    console.error('[ELECTRON] Error fetching spaces:', error);
    throw error;
  }
}

/**
 * Fetch the active space
 */
export async function fetchActiveSpace(): Promise<Space | null> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/active-space`);
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to fetch active space');
    }
    
    const activeSpace = data.data?.activeSpace || null;
    
    // Update active space in Redux store
    if (activeSpace) {
      store.dispatch(setActiveSpace(activeSpace));
    }
    
    return activeSpace;
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
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(spaceData)
    });
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to update space');
    }
    
    // Update Redux store
    const state = store.getState();
    const spaces = state.spaces.map(s => s.id === spaceId ? { ...s, ...data.data } : s);
    store.dispatch(updateSpaces(spaces));
    
    // If this is the active space, update that too
    if (state.activeSpace && state.activeSpace.id === spaceId) {
      const updatedSpace = spaces.find(s => s.id === spaceId);
      if (updatedSpace) {
        store.dispatch(setActiveSpace(updatedSpace));
      }
    }
    
    return data.data;
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
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to create space');
    }
    
    // Update Redux store - add new space to list
    const state = store.getState();
    const spaces = [...state.spaces, data.data];
    store.dispatch(updateSpaces(spaces));
    
    return data.data;
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
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to delete space');
    }
    
    // Update Redux store - remove deleted space
    const state = store.getState();
    const spaces = state.spaces.filter(s => s.id !== spaceId);
    store.dispatch(updateSpaces(spaces));
    
    // If this was the active space, clear it
    if (state.activeSpace && state.activeSpace.id === spaceId) {
      store.dispatch(setActiveSpace(null));
    }
    
    return true;
  } catch (error) {
    console.error(`[ELECTRON] Error deleting space ${spaceId}:`, error);
    throw error;
  }
}

/**
 * Update the active space model
 */
export async function updateSpaceModel(spaceId: string, modelId: string, provider: string): Promise<boolean> {
  try {
    console.log(`[ELECTRON] Updating space ${spaceId} with model ID: ${modelId}, provider: ${provider}`);
    
    // Use the standard space update endpoint
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: modelId, provider })
    });
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to update space model');
    }
    
    // Update the space in our Redux store
    const state = store.getState();
    if (state.spaces) {
      // Update spaces array
      const spaces = state.spaces.map(space => 
        space.id === spaceId ? { ...space, model: modelId, provider } : space
      );
      store.dispatch(updateSpaces(spaces));
      
      // Update active space if needed
      if (state.activeSpace && state.activeSpace.id === spaceId) {
        store.dispatch(setActiveSpace({
          ...state.activeSpace,
          model: modelId,
          provider
        }));
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
    
    const response = await fetchWithAuth(`${API_BASE_URL}/api/active-space`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ spaceId })
    });
    
    const responseText = await response.text();
    console.log(`[ELECTRON] Active space API response status: ${response.status}`);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[ELECTRON] Failed to parse response as JSON:', e);
      throw new Error('Invalid response from server');
    }
    
    if (data.status !== 'success') {
      console.error('[ELECTRON] API error response:', data);
      throw new Error(data.error || 'Failed to set active space');
    }
    
    // Find the space in our spaces array from Redux store
    const state = store.getState();
    const space = state.spaces?.find(s => s.id === spaceId);
    
    if (space) {
      // Update the active space in our Redux store
      store.dispatch(setActiveSpace(space));
      
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
      
      // State is automatically synchronized with electron-redux
    } else {
      console.warn(`[ELECTRON] Space with ID ${spaceId} not found in Redux store`);
    }
    
    return data.data;
  } catch (error) {
    console.error(`[ELECTRON] Error setting active space ${spaceId}:`, error);
    throw error;
  }
}