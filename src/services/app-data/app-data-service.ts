import { AppStateResult } from '@/src/types';
import { useStore } from '@/src/store';
import { fetchSpaces, fetchActiveSpace } from '@/src/services/spaces/space-service';
import { fetchConversations } from '@/src/services/conversations/conversation-service';
import { fetchMessages } from '@/src/services/messages/message-service';
import { fetchUserProfile } from '@/src/services/user/user-service';
import { checkServerHealth } from '@/src/services/api/api-service';

/**
 * Fetch initial app data from multiple services
 */
export async function fetchInitialAppData(): Promise<AppStateResult> {
  console.log('[ELECTRON] Fetching initial app data...');
  
  // Get current token state
  const store = useStore.getState();
  
  try {
    // First fetch user profile to validate session 
    try {
      const user = await fetchUserProfile();
      if (!user) {
        return {
          ...useStore.getState(),
          error: 'No active session',
          lastFetched: Date.now(),
          user: null
        };
      }
    } catch (error) {
      console.error('[ELECTRON] Failed to fetch user session:', error);
      return {
        ...useStore.getState(),
        error: 'Failed to fetch user session',
        lastFetched: Date.now(),
        user: null
      };
    }
  
    // Check if server is available
    if (!await checkServerHealth()) {
      return {
        ...useStore.getState(),
        error: 'Server not available',
        lastFetched: Date.now(),
        user: null
      };
    }
    
    // Check if we have an access token
    if (!store.accessToken) {
      console.log('[ELECTRON] No auth token available, deferring data fetch');
      return {
        ...useStore.getState(),
        error: 'Authentication required',
        lastFetched: Date.now(),
        user: null
      };
    }

    // Fetch spaces
    const spaces = await fetchSpaces();
    
    // Fetch active space
    const activeSpace = await fetchActiveSpace();
    
    let conversations: any[] = [];
    let messages: any[] = [];
    
    // If we have an active space, fetch its conversations
    if (activeSpace) {
      conversations = await fetchConversations(activeSpace.id);
      
      // If we have conversations, fetch messages for the most recent one
      if (conversations.length > 0) {
        try {
          console.log(`[ELECTRON] Fetching messages for conversation ${conversations[0].id}`);
          messages = await fetchMessages(conversations[0].id);
          console.log(`[ELECTRON] Fetched ${messages.length} messages for conversation ${conversations[0].id}`);
        } catch (error) {
          console.error('[ELECTRON] Error fetching messages for most recent conversation:', error);
        }
      }
    }

    // Construct the complete app state
    return {
      spaces,
      activeSpace,
      conversations,
      messages,
      initialDataLoaded: true,
      lastFetched: Date.now(),
      user: store.user,
      accessToken: store.accessToken,
      refreshToken: store.refreshToken
    };
  } catch (error) {
    console.error('[ELECTRON] Fetch initial data failed:', error);
    return {
      ...useStore.getState(),
      error: error instanceof Error ? error.message : 'Unknown error',
      lastFetched: Date.now()
    };
  }
}

/**
 * Refresh application data
 */
export async function refreshAppData(): Promise<AppStateResult> {
  try {
    const freshData = await fetchInitialAppData();
    if (!freshData.error) {
      const store = useStore.getState();
      store.setAppState(freshData);
    }
    return freshData;
  } catch (error) {
    console.error('[ELECTRON] Refresh failed:', error);
    return {
      ...useStore.getState(),
      error: error instanceof Error ? error.message : 'Unknown error',
      lastFetched: Date.now()
    };
  }
}