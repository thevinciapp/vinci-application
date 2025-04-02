import { ipcRenderer } from 'electron';
import { ChatEvents } from '@/core/ipc/constants';
import { ipcUtils } from '../utils/ipc';

export const chatApi = {
  initiateChatStream: (payload: any): Promise<any> =>
    ipcUtils.invoke(ChatEvents.INITIATE_CHAT_STREAM, payload),

  onChatStreamChunk: (callback: (chunk: any) => void): (() => void) => {
    const handler = (_event: any, response: any): void => {
      if (response.success && response.data) {
        callback(response.data);
      }
    };
    return ipcUtils.on(ChatEvents.CHAT_STREAM_CHUNK, handler);
  },
    
  onChatStreamFinish: (callback: () => void): (() => void) => {
    const handler = (_event: any, response: any): void => {
       if (response.success) callback();
    };
     return ipcUtils.on(ChatEvents.CHAT_STREAM_FINISH, handler);
  },

  onChatStreamError: (callback: (error: string) => void): (() => void) => {
    const handler = (_event: any, response: any): void => {
       if (!response.success) callback(response.error || 'Unknown stream error');
    };
     return ipcUtils.on(ChatEvents.CHAT_STREAM_ERROR, handler);
  },
  
  offChatStreamChunk: (callback: Function): void => ipcUtils.off(ChatEvents.CHAT_STREAM_CHUNK, callback as any),
  offChatStreamFinish: (callback: Function): void => ipcUtils.off(ChatEvents.CHAT_STREAM_FINISH, callback as any),
  offChatStreamError: (callback: Function): void => ipcUtils.off(ChatEvents.CHAT_STREAM_ERROR, callback as any),
}; 