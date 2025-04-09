import { ipcRenderer, IpcRendererEvent } from 'electron';
import { ConversationEvents } from '@/core/ipc/constants';
import { Conversation } from 'entities/conversation/model/types';
import { CreateConversationRequest } from 'features/conversation/create/model/types'; // Assuming CreateConversationRequest moved here
import { IpcResponse } from 'shared/types/ipc';
export const conversationApi = {
  getConversations: async () => {
    try {
      const response = await ipcRenderer.invoke(ConversationEvents.GET_CONVERSATIONS);
      return response.success ? response.data : null;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] getConversations error:", error);
      return null;
    }
  },

  createConversation: async (spaceId: string, conversationData: Omit<CreateConversationRequest, 'space_id'>) => {
    try {
      const response = await ipcRenderer.invoke(ConversationEvents.CREATE_CONVERSATION, { 
        spaceId, 
        ...conversationData 
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] createConversation error:", error);
      return null;
    }
  },

  updateConversation: async (conversationId: string, conversationData: { title: string, space_id: string }) => {
    try {
      const response = await ipcRenderer.invoke(ConversationEvents.UPDATE_CONVERSATION, { 
        id: conversationId, 
        ...conversationData 
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] updateConversation error:", error);
      return null;
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      const response = await ipcRenderer.invoke(ConversationEvents.DELETE_CONVERSATION, { 
        conversationId 
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] deleteConversation error:", error);
      return null;
    }
  },

  setActiveConversation: async (conversationId: string, spaceId: string) => {
    try {
      const response = await ipcRenderer.invoke(ConversationEvents.SET_ACTIVE_CONVERSATION, { 
        conversationId, 
        spaceId 
      });
      return response;
    } catch (error) {
      console.error("[ELECTRON PRELOAD] setActiveConversation error:", error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  onConversationsUpdated: (callback: (conversations: Conversation[]) => void) => {
    const handler = (_event: IpcRendererEvent, response: IpcResponse<Conversation[]>) => {
      if (response.success && response.data) {
        callback(response.data);
      }
    };

    ipcRenderer.on(ConversationEvents.CONVERSATIONS_UPDATED, handler);
    return () => ipcRenderer.removeListener(ConversationEvents.CONVERSATIONS_UPDATED, handler);
  },
};