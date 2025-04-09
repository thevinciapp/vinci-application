import { IpcRendererEvent } from 'electron';
import { ChatEvents } from '@/core/ipc/constants';
import { ipcUtils } from '../utils/ipc';
import { ChatPayload } from '@/core/ipc/handlers/chat/types';
import { IpcResponse } from 'shared/types/ipc';

type StreamChunkData = string | object;
type ChatStreamChunkCallback = (chunk: StreamChunkData) => void;
type ChatStreamFinishCallback = () => void;
type ChatStreamErrorCallback = (error: string) => void;

export const chatApi = {
  initiateChatStream: (payload: ChatPayload): Promise<IpcResponse> =>
    ipcUtils.invoke(ChatEvents.INITIATE_CHAT_STREAM, payload),

  onChatStreamChunk: (callback: ChatStreamChunkCallback): (() => void) => {
    const handler = (_event: IpcRendererEvent, response: IpcResponse<StreamChunkData>): void => {
      if (response.success && response.data !== undefined) {
        callback(response.data);
      }
    };
    return ipcUtils.on(ChatEvents.CHAT_STREAM_FINISH, handler);
  },
  onChatStreamFinish: (callback: ChatStreamFinishCallback): (() => void) => {
    const handler = (_event: IpcRendererEvent, response: IpcResponse): void => {
      if (response.success) callback();
    };
    return ipcUtils.on(ChatEvents.CHAT_STREAM_FINISH, handler);
  },

  onChatStreamError: (callback: ChatStreamErrorCallback): (() => void) => {
    const handler = (_event: IpcRendererEvent, response: IpcResponse): void => {
      if (!response.success) callback(response.error || 'Unknown stream error');
    };
    return ipcUtils.on(ChatEvents.CHAT_STREAM_ERROR, handler);
  },
}; 