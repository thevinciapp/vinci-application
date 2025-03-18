import { ipcMain, IpcMainInvokeEvent } from 'electron';
import {
  fetchConversations,
  createConversation,
  updateConversation,
  deleteConversation
} from '../../../services/conversations/conversation-service';
import { fetchMessages } from '../../../services/messages/message-service';
import { IpcResponse } from './index';
import { ConversationEvents, SpaceEvents, MessageEvents } from '../constants';

/**
 * Register conversation-related IPC handlers
 */
export function registerConversationHandlers() {
  // Note: SpaceEvents.GET_SPACE_CONVERSATIONS is registered in space-handlers.ts

  // Handle conversation-to-message relationship
  ipcMain.handle(MessageEvents.GET_CONVERSATION_MESSAGES, async (_event: IpcMainInvokeEvent, conversationId: string): Promise<IpcResponse> => {
    try {
      const messages = await fetchMessages(conversationId);
      return { success: true, data: messages };
    } catch (error) {
      console.error('[ELECTRON] Error in get-conversation-messages handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Handle conversation-specific operations
  ipcMain.handle(ConversationEvents.GET_CONVERSATIONS, async (_event: IpcMainInvokeEvent): Promise<IpcResponse> => {
    try {
      // Pass empty string as space ID to get all conversations
      const conversations = await fetchConversations('');
      return { success: true, data: conversations };
    } catch (error) {
      console.error('[ELECTRON] Error in get-conversations handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(ConversationEvents.CREATE_CONVERSATION, async (_event: IpcMainInvokeEvent, data: { spaceId: string, title: string }): Promise<IpcResponse> => {
    try {
      const result = await createConversation(data.spaceId, data.title);
      
      // Emit an event to notify all renderers that conversations have been updated
      const updatedConversations = await fetchConversations('');
      ipcMain.emit(ConversationEvents.CONVERSATIONS_UPDATED, null, { conversations: updatedConversations });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('[ELECTRON] Error in create-conversation handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(ConversationEvents.UPDATE_CONVERSATION, async (_event: IpcMainInvokeEvent, data: { spaceId: string, id: string, title: string }): Promise<IpcResponse> => {
    try {
      const result = await updateConversation(data.spaceId, data.id, data.title);
      
      // Emit an event to notify all renderers that conversations have been updated
      const updatedConversations = await fetchConversations('');
      ipcMain.emit(ConversationEvents.CONVERSATIONS_UPDATED, null, { conversations: updatedConversations });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('[ELECTRON] Error in update-conversation handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(ConversationEvents.DELETE_CONVERSATION, async (_event: IpcMainInvokeEvent, data: { spaceId: string, conversationId: string }): Promise<IpcResponse> => {
    try {
      const result = await deleteConversation(data.spaceId, data.conversationId);
      
      // Emit an event to notify all renderers that conversations have been updated
      const updatedConversations = await fetchConversations('');
      ipcMain.emit(ConversationEvents.CONVERSATIONS_UPDATED, null, { conversations: updatedConversations });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('[ELECTRON] Error in delete-conversation handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
