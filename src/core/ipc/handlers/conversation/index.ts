import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import {
  fetchConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  setActiveConversationInAPI
} from 'features/chat/conversation-service';
import { fetchMessages } from 'features/chat/message-service';
import { ConversationResponse, Conversation } from '@/entities/conversation/model/types';
import { ConversationEvents, SpaceEvents, MessageEvents, AppStateEvents } from '@/core/ipc/constants';
import { CreateConversationRequest } from '@/features/conversation/create/model/types';
import { MessageResponse, Message } from '@/entities/message/model/types';
import { useMainStore, getMainStoreState } from '@/store/main';
import { sanitizeStateForIPC } from '@/core/utils/state-utils';
import { IpcResponse } from '@/shared/types/ipc';

function broadcastStateUpdate() {
  const state = getMainStoreState();
  const serializableState = sanitizeStateForIPC(state);
  BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
    if (window && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(AppStateEvents.STATE_UPDATED, { success: true, data: serializableState });
    }
  });
}

export function registerConversationHandlers() {
  ipcMain.handle(MessageEvents.GET_CONVERSATION_MESSAGES, async (_event: IpcMainInvokeEvent, conversationId: string): Promise<IpcResponse<{ messages: Message[] }>> => {
    try {
      const store = useMainStore.getState();
      if (store.activeConversation?.id === conversationId) {
        return { success: true, data: { messages: store.messages || [] } };
      }
      const messages = await fetchMessages(conversationId);
      return { success: true, data: { messages: messages || [] } };
    } catch (error) {
      console.error('[ELECTRON] Error in get-conversation-messages handler:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching messages';
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle(ConversationEvents.GET_CONVERSATIONS, async (_event: IpcMainInvokeEvent): Promise<IpcResponse<{ conversations: Conversation[] }>> => {
    try {
      const store = useMainStore.getState();
      return { success: true, data: { conversations: store.conversations || [] } };
    } catch (error) {
      console.error('[ELECTRON] Error in get-conversations handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(ConversationEvents.CREATE_CONVERSATION, async (_event: IpcMainInvokeEvent, data: CreateConversationRequest): Promise<IpcResponse<{ id: string }>> => {
    try {
      // 1. Call service to create conversation
      const newConversation = await createConversation(data.space_id, data.title);

      // 2. Update store manually, using previous state + newConversation object
      useMainStore.setState(prevState => {
        const existing = prevState.conversations?.find(c => c.id === newConversation.id);
        if (existing) {
          // If it somehow already exists, log warning and just set it active
          console.warn(`[CONVERSATION HANDLER] Conversation ${newConversation.id} already found in store state during CREATE operation. Setting active.`);
          return {
             ...prevState, // Keep the list as is
             activeConversation: existing, // Set the existing one active
             messages: [] // Clear messages
           };
        }
        // Prepend the new conversation if it wasn't already there
        return {
          conversations: [newConversation, ...(prevState.conversations || [])],
          activeConversation: newConversation,
          messages: []
        };
      });

      // 3. Broadcast the updated state
      broadcastStateUpdate();
      return { success: true, data: { id: newConversation.id } };
    } catch (error) {
      console.error('[ELECTRON] Error in create-conversation handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(ConversationEvents.UPDATE_CONVERSATION, async (_event: IpcMainInvokeEvent, data: { id: string, title: string, space_id: string }): Promise<IpcResponse<null>> => {
    try {
      const updatedConversation = await updateConversation(data.space_id, data.id, data.title);
      
      useMainStore.setState(state => ({
        conversations: state.conversations.map(c => 
          c.id === data.id ? { ...c, ...updatedConversation } : c
        ),
        activeConversation: state.activeConversation?.id === data.id 
          ? { ...state.activeConversation, ...updatedConversation } 
          : state.activeConversation
      }));

      broadcastStateUpdate();
      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error in update-conversation handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(ConversationEvents.DELETE_CONVERSATION, async (_event: IpcMainInvokeEvent, data: { space_id: string, id: string }): Promise<IpcResponse<null>> => {
    try {
      const storeBeforeDelete = useMainStore.getState();
      const conversationToDelete = storeBeforeDelete.conversations.find(c => c.id === data.id);
      const wasActive = storeBeforeDelete.activeConversation?.id === data.id;
      
      await deleteConversation(data.space_id, data.id);

      const remainingConversations = storeBeforeDelete.conversations.filter(c => c.id !== data.id);
      let newActiveConversation: Conversation | null = null;
      let newMessages: Message[] = [];

      if (wasActive) {
        if (remainingConversations.length > 0) {
          newActiveConversation = remainingConversations[0];
          newMessages = await fetchMessages(newActiveConversation.id);
        } else {
          newActiveConversation = null;
          newMessages = [];
        }
      } else {
        newActiveConversation = storeBeforeDelete.activeConversation;
        newMessages = storeBeforeDelete.messages;
      }

      useMainStore.setState({
        conversations: remainingConversations,
        activeConversation: newActiveConversation,
        messages: newMessages
      });

      broadcastStateUpdate();
      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error in delete-conversation handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(ConversationEvents.SET_ACTIVE_CONVERSATION, async (_event: IpcMainInvokeEvent, data: { conversationId: string, spaceId: string }): Promise<IpcResponse<null>> => {
    try {
      if (!data.conversationId || !data.spaceId) {
        return { success: false, error: 'Conversation ID and Space ID are required' };
      }

      const store = useMainStore.getState();
      const newActiveConversation = store.conversations.find(c => c.id === data.conversationId);

      if (!newActiveConversation) {
         console.error(`[ELECTRON] Attempted to set active conversation ${data.conversationId}, but it was not found in the current list for space ${data.spaceId}`);
         return { success: false, error: 'Conversation not found in current list' };
      }
      
      await setActiveConversationInAPI(data.conversationId, data.spaceId);
      
      const messages = await fetchMessages(data.conversationId);
      
      useMainStore.setState({
        activeConversation: newActiveConversation,
        messages: messages || []
      });

      broadcastStateUpdate();
      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error in set-active-conversation handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
