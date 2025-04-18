import { ipcRenderer } from 'electron';
import { MessageEvents, SearchEvents } from '@/core/ipc/constants';
import { Message } from '@/entities/message/model/types';
import { IpcResponse } from '@/src/shared/types/ipc';

export const messageApi = {
  getConversationMessages: async (conversationId: string) => {
    const response = await ipcRenderer.invoke(MessageEvents.GET_CONVERSATION_MESSAGES, { conversationId });
    return response.success ? response.data : null;
  },

  searchMessages: async (query: string) => {
    const response = await ipcRenderer.invoke(SearchEvents.SEARCH_MESSAGES, { query });
    return response.success ? response.data : [];
  },

  sendChatMessage: async (conversationId: string, message: string) => {
    const response = await ipcRenderer.invoke(MessageEvents.SEND_MESSAGE, { conversationId, message });
    return response.success ? response.data : null;
  },

  deleteMessage: async (conversationId: string, messageId: string) => {
    const response = await ipcRenderer.invoke(MessageEvents.DELETE_MESSAGE, { conversationId, messageId });
    return response.success ? response.data : null;
  },

  updateMessage: async (conversationId: string, messageId: string, content: string) => {
    const response = await ipcRenderer.invoke(MessageEvents.UPDATE_MESSAGE, { conversationId, messageId, content });
    return response.success ? response.data : null;
  },

  /**
   * Sends a single message to the main process to be added to the store.
   */
  addMessage: (message: Message): Promise<IpcResponse<{ message: Message }>> => {
    return ipcRenderer.invoke(MessageEvents.ADD_MESSAGE, message);
  }
};
