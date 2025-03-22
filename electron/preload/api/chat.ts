import { ipcRenderer } from 'electron';
import { ChatEvents } from '../../../src/core/ipc/constants';

export const chatApi = {
  /**
   * Initiate a chat stream
   */
  initiateChat: (chatId: string, chatRequest: any) => {
    return ipcRenderer.invoke(ChatEvents.INITIATE_CHAT, chatId, chatRequest);
  },

  /**
   * Cancel an active chat stream
   */
  cancelChat: (chatId: string) => {
    return ipcRenderer.invoke(ChatEvents.CANCEL_CHAT, chatId);
  }
};