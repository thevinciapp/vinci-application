import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import {
  fetchMessages,
  sendChatMessage,
  deleteMessage,
  updateMessage
} from '@/services/messages/message-service';
import {
  searchAllMessages
} from '@/services/search/search-service';
import { MessageResponse, Message } from '@/types/message';
import { IpcResponse } from '@/types/ipc';
import { MessageEvents, SearchEvents, AppStateEvents } from '@/core/ipc/constants';
import { useMainStore, getMainStoreState } from '@/store/main';
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
}
