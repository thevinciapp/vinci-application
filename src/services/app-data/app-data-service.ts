import { useStore } from '../../store';
import { fetchSpaces, fetchActiveSpace } from '../spaces/space-service';
import { fetchConversations } from '../conversations/conversation-service';
import { fetchMessages } from '../messages/message-service';
import { fetchUserProfile } from '../user/user-service';
import { checkServerHealth } from '../api/api-service';
import { isTokenExpiringSoon, refreshTokens } from '../../core/auth/auth-service';
import { safeStorage } from 'electron';
import { Conversation, Message, Space } from '@/types';
import { User } from '@supabase/supabase-js';

interface AppStateResult {
    spaces: Space[];
  activeSpace: Space | null;
  conversations: Conversation[];
  messages: Message[];
  initialDataLoaded: boolean;
  lastFetched: number | null;
  user: User | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiryTime?: number | null;
  error?: string;
}

export async function fetchInitialAppData(): Promise<AppStateResult> {
  const store = useStore.getState();
  
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
      return {
        ...useStore.getState(),
        error: 'Authentication required',
        lastFetched: Date.now(),
        user: null
      };
    }

    if (store.refreshToken && isTokenExpiringSoon()) {
      const refreshed = await refreshTokens(safeStorage);
      if (!refreshed) {
        return {
          ...useStore.getState(),
          error: 'Authentication expired',
          lastFetched: Date.now(),
          user: null
        };
      }
    }

    let user = null;
    try {
      user = await fetchUserProfile();
    } catch (error) {
      console.error('[ELECTRON] Error fetching user profile:', error);
    }

    const spaces = await fetchSpaces();
    const activeSpace = await fetchActiveSpace();
    
    let conversations: any[] = [];
    let messages: any[] = [];
    
    if (activeSpace) {
      conversations = await fetchConversations(activeSpace.id);
        
      if (conversations.length > 0) {
        try {
          messages = await fetchMessages(conversations[0].id);
        } catch (error) {
          console.error('[ELECTRON] Error fetching messages for most recent conversation:', error);
        }
      }
    }

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