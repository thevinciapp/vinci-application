import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import {
  createConversation,
  updateConversation,
  deleteConversation,
  setActiveConversationInAPI
} from '@/features/chat/conversation-service';
import { fetchMessages } from '@/features/chat/message-service';
import { Conversation } from '@/entities/conversation/model/types';
import { Message, VinciUIMessage } from '@/entities/message/model/types';
import { ConversationEvents, MessageEvents, AppStateEvents } from '@/core/ipc/constants';
import { CreateConversationRequest } from '@/features/conversation/create/model/types';
import { IpcResponse } from '@/shared/types/ipc';
import { useMainStore, getMainStoreState } from '@/stores/main';
import { sanitizeStateForIPC } from '@/core/utils/state-utils';

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
  ipcMain.handle(MessageEvents.GET_CONVERSATION_MESSAGES, async (_: IpcMainInvokeEvent, conversationId: string): Promise<IpcResponse<{ messages: Message[] }>> => {
    try {
      const store = useMainStore.getState();
      if (store.activeConversation?.id === conversationId && store.messages) {
        const responseMessages: Message[] = store.messages.map((msg: VinciUIMessage): Message => ({
          id: msg.id,
          user_id: '', // Provide default
          role: msg.role === 'data' ? 'system' : (msg.role ?? 'user'), // Map 'data', provide default role
          content: msg.content ?? '',
          conversation_id: msg.conversation_id,
          is_deleted: false, // Provide default
          created_at: msg.createdAt?.toISOString() ?? new Date().toISOString(), // Use createdAt, provide default
          updated_at: msg.updated_at ?? new Date().toISOString(), // Use updated_at, provide default
          annotations: msg.annotations ?? []
        }));
        return { success: true, data: { messages: responseMessages } };
      }

      // fetchMessages returns Message[]
      const fetchedMessages = await fetchMessages(conversationId);
      // Map fetched Message[] to Message[] for the response (ensure conformance)
      const responseMessages: Message[] = (fetchedMessages || []).map((msg: Message): Message => ({
        id: msg.id,
        user_id: msg.user_id ?? '', // Use user_id from Message
        role: msg.role ?? 'user', // Remove check: msg is Message, cannot be 'data'
        content: msg.content ?? '',
        conversation_id: msg.conversation_id,
        is_deleted: msg.is_deleted ?? false, // Use is_deleted from Message
        created_at: msg.created_at ?? new Date().toISOString(), // Use created_at from Message
        updated_at: msg.updated_at ?? new Date().toISOString(), // Use updated_at from Message
        annotations: msg.annotations ?? []
      }));
      return { success: true, data: { messages: responseMessages } };
    } catch (error) {
      console.error('[ELECTRON] Error in get-conversation-messages handler:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching messages';
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle(ConversationEvents.GET_CONVERSATIONS, async (): Promise<IpcResponse<{ conversations: Conversation[] }>> => {
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
      const newConversation = await createConversation(data.space_id, data.title);

      useMainStore.setState(prevState => {
        const existing = prevState.conversations?.find(c => c.id === newConversation.id);
        if (existing) {
          console.warn(`[CONVERSATION HANDLER] Conversation ${newConversation.id} already found in store state during CREATE operation. Setting active.`);
          return {
            ...prevState,
            activeConversation: existing,
            messages: []
          };
        }
        return {
          conversations: [newConversation, ...(prevState.conversations || [])],
          activeConversation: newConversation,
          messages: []
        };
      });

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
      const wasActive = storeBeforeDelete.activeConversation?.id === data.id;

      await deleteConversation(data.space_id, data.id);

      const remainingConversations = storeBeforeDelete.conversations.filter(c => c.id !== data.id);
      let newActiveConversation: Conversation | null = null;
      let newMessages: VinciUIMessage[] = [];

      if (wasActive) {
        if (remainingConversations.length > 0) {
          newActiveConversation = remainingConversations[0];
          // fetchMessages returns Message[]
          const fetchedMessages = await fetchMessages(newActiveConversation.id);
          // Map fetched Message[] to VinciUIMessage[] for the store update
          newMessages = (fetchedMessages || []).map((msg: Message): VinciUIMessage => ({ // Map *from* Message *to* VinciUIMessage
            id: msg.id,
            role: msg.role ?? 'user', // Remove check: msg is Message, cannot be 'data'
            content: msg.content ?? '',
            conversation_id: newActiveConversation!.id, // Use the new active conversation ID
            createdAt: new Date(msg.created_at ?? Date.now()), // Convert created_at string to Date for VinciUIMessage
            updated_at: msg.updated_at, // VinciUIMessage has optional updated_at string
            annotations: msg.annotations ?? [],
            parts: msg.content ? [{ type: 'text', text: msg.content }] : [] // Create basic 'parts' from content
            // space_id: newActiveConversation.space_id // Add space_id if needed
          }));
        } else {
          newActiveConversation = null;
          newMessages = [];
        }
      } else {
        newActiveConversation = storeBeforeDelete.activeConversation;
        newMessages = storeBeforeDelete.messages ?? [];
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
