import { useStore } from '../../store';
import { Space, Conversation, Message } from 'vinci-common';
import { fetchSpaces, fetchActiveSpace } from '../spaces/space-service';
import { fetchConversations } from '../conversations/conversation-service';
import { fetchMessages } from '../messages/message-service';
import { fetchUserProfile } from '../user/user-service';
import { checkServerHealth } from '../api/api-service';
import { isTokenExpiringSoon, refreshTokens } from '../../core/auth/auth-service';
import { safeStorage } from 'electron';

interface AppStateResult {
  spaces: Space[];
  activeSpace: Space | null;
  conversations: Conversation[];
  messages: Message[];
  initialDataLoaded: boolean;
  lastFetched: number | null;
  user: any | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiryTime?: number | null;
  error?: string;
}

/**
 * Fetch initial app data from multiple services
 */
export async function fetchInitialAppData(): Promise<AppStateResult> {
  console.log('[ELECTRON] Fetching initial app data...');
  
  const store = useStore.getState();
  console.log('[ELECTRON] Current token state - Access token exists:', !!store.accessToken, 'Refresh token exists:', !!store.refreshToken);
  
  try {
    if (!await checkServerHealth()) {
      return {
        ...useStore.getState(),
        error: 'Server not available',
        lastFetched: Date.now(),
        user: null
      };
    }
    
    if (!store.accessToken) {
      console.log('[ELECTRON] No auth token available, deferring data fetch');
      return {
        ...useStore.getState(),
        error: 'Authentication required',
        lastFetched: Date.now(),
        user: null
      };
    }

    // Check if token is about to expire and refresh if needed
    if (store.refreshToken && isTokenExpiringSoon()) {
      console.log('[ELECTRON] Token is expiring soon, attempting to refresh...');
      const refreshed = await refreshTokens(safeStorage);
      if (!refreshed) {
        console.log('[ELECTRON] Token refresh failed during app data fetch');
        return {
          ...useStore.getState(),
          error: 'Authentication expired',
          lastFetched: Date.now(),
          user: null
        };
      }
      console.log('[ELECTRON] Token refreshed successfully before fetching app data');
    }

    // Fetch user profile first
    let user = null;
    try {
      user = await fetchUserProfile();
      console.log('[ELECTRON] User profile loaded:', user.email);
    } catch (error) {
      console.error('[ELECTRON] Error fetching user profile:', error);
    }

    const spaces = await fetchSpaces();
    const activeSpace = await fetchActiveSpace();
    
    let conversations: any[] = [];
    let messages: any[] = [];
    
    if (activeSpace) {
      conversations = await fetchConversations(activeSpace.id);
      console.log(`[ELECTRON] Fetched ${conversations.length} conversations for space ${activeSpace.id}`);
      
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

    // Get current store state for tokens and expiry time
    const currentStore = useStore.getState();
    
    return {
      spaces,
      activeSpace,
      conversations,
      messages,
      initialDataLoaded: true,
      lastFetched: Date.now(),
      user,
      accessToken: currentStore.accessToken,
      refreshToken: currentStore.refreshToken,
      tokenExpiryTime: currentStore.tokenExpiryTime
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