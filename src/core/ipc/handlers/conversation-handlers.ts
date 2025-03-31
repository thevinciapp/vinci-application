import { ipcMain, IpcMainInvokeEvent } from 'electron';
import {
  fetchConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  setActiveConversationInAPI
} from '@/services/conversations/conversation-service';
import { fetchMessages } from '@/services/messages/message-service';
import { ConversationResponse } from '@/types/conversation';
import { ConversationEvents, SpaceEvents, MessageEvents } from '@/core/ipc/constants';
import { CreateConversationRequest } from '@/types/conversation';
import { MessageResponse } from '@/types/message';

export function registerConversationHandlers() {
  ipcMain.handle(MessageEvents.GET_CONVERSATION_MESSAGES, async (_event: IpcMainInvokeEvent, conversationId: string): Promise<MessageResponse> => {
    try {
      const messages = await fetchMessages(conversationId);
      return { success: true, data: messages, status: 'success' };
    } catch (error) {
      console.error('[ELECTRON] Error in get-conversation-messages handler:', error);
      
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = 'Error occurred but could not be serialized';
        }
      } else {
        errorMessage = String(error);
      }
      
      return { success: false, error: errorMessage, status: 'error' };
    }
  });

  ipcMain.handle(ConversationEvents.GET_CONVERSATIONS, async (_event: IpcMainInvokeEvent): Promise<ConversationResponse> => {
    try {
      const conversations = await fetchConversations('');
      return { success: true, data: conversations, status: 'success' };
    } catch (error) {
      console.error('[ELECTRON] Error in get-conversations handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', status: 'error' };
    }
  });

  ipcMain.handle(ConversationEvents.CREATE_CONVERSATION, async (_event: IpcMainInvokeEvent, data: CreateConversationRequest): Promise<ConversationResponse> => {
    try {
      const result = await createConversation(data.space_id, data.title);
      
      // Emit an event to notify all renderers that conversations have been updated
      const updatedConversations = await fetchConversations('');
      ipcMain.emit(ConversationEvents.CONVERSATIONS_UPDATED, null, { conversations: updatedConversations });
      
      return { success: true, data: result, status: 'success' };
    } catch (error) {
      console.error('[ELECTRON] Error in create-conversation handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', status: 'error' };
    }
  });

  ipcMain.handle(ConversationEvents.UPDATE_CONVERSATION, async (_event: IpcMainInvokeEvent, data: { id: string, title: string, space_id: string }): Promise<ConversationResponse> => {
    try {
      const result = await updateConversation(data.space_id, data.id, data.title);
      return { success: true, data: result, status: 'success' };
    } catch (error) {
      console.error('[ELECTRON] Error in update-conversation handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', status: 'error' };
    }
  });

  ipcMain.handle(ConversationEvents.DELETE_CONVERSATION, async (_event: IpcMainInvokeEvent, data: { space_id: string, id: string }): Promise<ConversationResponse> => {
    try {
      const result = await deleteConversation(data.space_id, data.id);
      return { success: true, data: { deleted: result }, status: 'success' };
    } catch (error) {
      console.error('[ELECTRON] Error in delete-conversation handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', status: 'error' };
    }
  });

  ipcMain.handle(ConversationEvents.SET_ACTIVE_CONVERSATION, async (_event: IpcMainInvokeEvent, data: { conversationId: string, spaceId: string }): Promise<ConversationResponse> => {
    try {
      if (!data.conversationId) {
        return { success: false, error: 'Conversation ID is required', status: 'error' };
      }

      if (!data.spaceId) {
        return { success: false, error: 'Space ID is required', status: 'error' };
      }
      
      await setActiveConversationInAPI(data.conversationId, data.spaceId);
      const messages = await fetchMessages(data.conversationId);
      
      return { 
        success: true, 
        data: {
          messages
        },
        status: 'success'
      };
    } catch (error) {
      console.error('[ELECTRON] Error in set-active-conversation handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', status: 'error' };
    }
  });
}
