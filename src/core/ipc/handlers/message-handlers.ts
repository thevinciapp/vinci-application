import { ipcMain, IpcMainInvokeEvent } from 'electron';
import {
  fetchMessages,
  sendChatMessage,
  deleteMessage,
  updateMessage
} from '@/src/services/messages/message-service';
import {
  searchAllMessages
} from '@/src/services/search/search-service';
import { MessageResponse } from './index';
import { MessageEvents, SearchEvents } from '../constants';

interface Message {
  id: string;
  content: string;
  conversationId: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Register message-related IPC handlers
 */
export function registerMessageHandlers() {
  // Search Routes
  ipcMain.handle(SearchEvents.SEARCH_MESSAGES, async (_event: IpcMainInvokeEvent, query: string): Promise<MessageResponse> => {
    try {
      const messages = await searchAllMessages(query);
      return { success: true, data: messages };
    } catch (error) {
      console.error('Error searching messages:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to search messages' };
    }
  });

  // Message Routes
  ipcMain.handle(MessageEvents.SEND_MESSAGE, async (_event: IpcMainInvokeEvent, conversationId: string, message: string): Promise<MessageResponse> => {
    try {
      const result = await sendChatMessage(conversationId, message);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error sending chat message:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send message' };
    }
  });

  ipcMain.handle(MessageEvents.DELETE_MESSAGE, async (_event: IpcMainInvokeEvent, conversationId: string, messageId: string): Promise<MessageResponse> => {
    try {
      const success = await deleteMessage(conversationId, messageId);
      return { success: true, data: { deleted: success } };
    } catch (error) {
      console.error('Error deleting message:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete message' };
    }
  });

  ipcMain.handle(MessageEvents.UPDATE_MESSAGE, async (_event: IpcMainInvokeEvent, conversationId: string, messageId: string, content: string): Promise<MessageResponse> => {
    try {
      const updatedMessage = await updateMessage(conversationId, messageId, content);
      return { success: true, data: updatedMessage };
    } catch (error) {
      console.error('Error updating message:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update message' };
    }
  });
}
