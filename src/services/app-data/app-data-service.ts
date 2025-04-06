import { useMainStore } from '@/store/main';
import { fetchSpaces, fetchActiveSpace } from '@/services/spaces/space-service';
import { fetchActiveConversation, fetchConversations } from '@/services/conversations/conversation-service';
import { fetchMessages } from '@/services/messages/message-service';
import { fetchUserProfile } from '@/services/user/user-service';
import { checkServerHealth } from '@/services/api/api-service';
import { isTokenExpiringSoon, refreshTokens } from '@/core/auth/auth-service';
import { safeStorage } from 'electron';
import { Conversation } from '@/types/conversation';
import { Message } from '@/types/message';
import { Space } from '@/types/space';
import { User } from '@supabase/supabase-js';
import { VinciUIMessage } from '@/types/message';
import { getMessageParts } from '@ai-sdk/ui-utils';
import { generateId } from '@/core/utils/ai-sdk-adapter/adapter-utils';

interface AppStateResult {
    spaces?: Space[];
  activeSpace?: Space | null;
  conversations?: Conversation[];
  activeConversation?: Conversation | null;
  messages?: VinciUIMessage[];
  initialDataLoaded?: boolean;
  lastFetched?: number;
  user?: User | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiryTime?: number | null;
  error?: string;
}

function formatMessageForUI(message: Message): VinciUIMessage {
  const formattedMessage: VinciUIMessage = {
    id: message.id || generateId(),
    role: message.role || 'user',
    content: message.content || '',
    createdAt: new Date(message.created_at),
    conversation_id: message.conversation_id || '',
    parts: getMessageParts({
      role: message.role || 'user',
      content: message.content || ''
    }),
    annotations: message.annotations || [],
  };

  return formattedMessage;
}

export async function fetchInitialAppData(): Promise<AppStateResult> {
  const store = useMainStore.getState();
  
  try {
    if (!await checkServerHealth()) {
      return {
        ...useMainStore.getState(),
        error: 'Server not available',
        lastFetched: Date.now(),
        user: null
      };
    }
    
    if (!store.accessToken) {
      return {
        ...useMainStore.getState(),
        error: 'Authentication required',
        lastFetched: Date.now(),
        user: null
      };
    }

    if (store.refreshToken && isTokenExpiringSoon()) {
      const refreshed = await refreshTokens(safeStorage);
      if (!refreshed) {
        return {
          ...useMainStore.getState(),
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
    
    let conversations: Conversation[] = [];
    let messages: Message[] = [];
    let activeConversation: Conversation | null = null;
    
    if (activeSpace) {
      conversations = await fetchConversations(activeSpace.id);
      activeConversation = await fetchActiveConversation(activeSpace.id);

      if (activeConversation) {
        messages = await fetchMessages(activeConversation.id);
      }
    }

    const currentStore = useMainStore.getState();
    
    const formattedMessages = messages ? messages.map(formatMessageForUI) : [];
    
    return {
      spaces,
      activeSpace,
      conversations,
      activeConversation,
      messages: formattedMessages,
      initialDataLoaded: true,
      lastFetched: Date.now(),
      user: user as User | null,
      accessToken: currentStore.accessToken,
      refreshToken: currentStore.refreshToken,
      tokenExpiryTime: currentStore.tokenExpiryTime
    };
  } catch (error) {
    console.error('[ELECTRON] Fetch initial data failed:', error);
    return {
      ...useMainStore.getState(),
      error: error instanceof Error ? error.message : 'Unknown error',
      lastFetched: Date.now()
    };
  }
}

export async function refreshAppData(): Promise<AppStateResult> {
  try {
    const freshData = await fetchInitialAppData();
    if (!freshData.error) {
      const store = useMainStore.getState();
      store.setAppState(freshData);
    }
    return freshData;
  } catch (error) {
    console.error('[ELECTRON] Refresh failed:', error);
    return {
      ...useMainStore.getState(),
      error: error instanceof Error ? error.message : 'Unknown error',
      lastFetched: Date.now()
    };
  }
}