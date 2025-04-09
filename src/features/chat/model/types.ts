import { IpcResponse } from '@/shared/types/ipc';

export interface ChatResponse extends IpcResponse {
  chatId?: string;
  chunk?: string | object;
  error?: string;
}

export interface ChatStreamStartEvent {
  chatId: string;
}

export interface ChatStreamChunkEvent {
  chatId: string;
  chunk: string | object;
}

export interface ChatStreamFinishEvent {
  chatId: string;
}

export interface ChatStreamErrorEvent {
  chatId: string;
  error: string;
}