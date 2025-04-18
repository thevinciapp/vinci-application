import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import {
  fetchMessages,
  sendChatMessage,
  deleteMessage,
  updateMessage
} from '@/features/chat/message-service';
import {
  searchAllMessages
} from '@/services/search/search-service';
import { Message } from '@/entities/message/model/types';
import { IpcResponse } from '@/shared/types/ipc';
import { MessageEvents, SearchEvents, AppStateEvents } from '@/core/ipc/constants';
import { useMainStore, getMainStoreState } from '@/stores/main';
import { sanitizeStateForIPC } from '@/core/utils/state-utils';
import { Logger } from '@/shared/lib/logger';

// Create logger instance for this handler
const logger = new Logger('MessageHandler');

function broadcastStateUpdate() {
  const state = getMainStoreState();
  const serializableState = sanitizeStateForIPC(state);
  BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
    if (window && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(AppStateEvents.STATE_UPDATED, { success: true, data: serializableState });
    }
  });
}

export function registerMessageHandlers() {
  ipcMain.handle(SearchEvents.SEARCH_MESSAGES, async (_event: IpcMainInvokeEvent, query: string): Promise<IpcResponse<{ messages: Message[] }>> => {
    try {
      const messages = await searchAllMessages(query);
      return { success: true, data: { messages: messages || [] } };
    } catch (error) {
      console.error('Error searching messages:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to search messages' };
    }
  });

  ipcMain.handle(MessageEvents.SEND_MESSAGE, async (_event: IpcMainInvokeEvent, data: { conversationId: string, content: string }): Promise<IpcResponse<null>> => {
    try {
      await sendChatMessage(data.conversationId, data.content);

      const updatedMessages = await fetchMessages(data.conversationId);
      
      const store = useMainStore.getState();
      if (store.activeConversation?.id === data.conversationId) {
        useMainStore.setState({ messages: updatedMessages || [] });
        broadcastStateUpdate();
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending chat message:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send message' };
    }
  });

  ipcMain.handle(MessageEvents.DELETE_MESSAGE, async (_event: IpcMainInvokeEvent, data: { conversationId: string, messageId: string }): Promise<IpcResponse<null>> => {
    try {
      await deleteMessage(data.conversationId, data.messageId);

      const updatedMessages = await fetchMessages(data.conversationId);

      const store = useMainStore.getState();
      if (store.activeConversation?.id === data.conversationId) {
         useMainStore.setState({ messages: updatedMessages || [] });
         broadcastStateUpdate();
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete message' };
    }
  });

  ipcMain.handle(MessageEvents.UPDATE_MESSAGE, async (_event: IpcMainInvokeEvent, data: { conversationId: string, messageId: string, content: string }): Promise<IpcResponse<null>> => {
    try {
      await updateMessage(data.conversationId, data.messageId, data.content);

      const updatedMessages = await fetchMessages(data.conversationId);
      
      const store = useMainStore.getState();
      if (store.activeConversation?.id === data.conversationId) {
        useMainStore.setState({ messages: updatedMessages || [] });
        broadcastStateUpdate();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating message:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update message' };
    }
  });

  // Handler for adding a single message to the store
  ipcMain.handle(MessageEvents.ADD_MESSAGE, async (_event: IpcMainInvokeEvent, message: Message): Promise<IpcResponse<{ message: Message }>> => {
    try {
      if (!message || !message.id || !message.conversation_id) {
        throw new Error('Invalid message object received');
      }
      
      const store = useMainStore.getState();
      
      // Avoid adding duplicates if the message somehow already exists
      if (store.messages.some(m => m.id === message.id)) {
        logger.warn('Attempted to add duplicate message:', { messageId: message.id });
        return { success: true, data: { message } }; // Return success, but don't modify state
      }

      // Add the new message to the existing messages array
      const updatedMessages = [...store.messages, message];
      useMainStore.setState({ messages: updatedMessages });
      
      // Broadcast the state update to all renderers
      broadcastStateUpdate();
      
      logger.info('Added user message to store via ADD_MESSAGE', { messageId: message.id, conversationId: message.conversation_id });
      return { success: true, data: { message } };
    } catch (error) {
      logger.error('Error adding message via ADD_MESSAGE:', { error: error instanceof Error ? error.message : error });
      return { success: false, error: error instanceof Error ? error.message : 'Failed to add message to store' };
    }
  });
}
