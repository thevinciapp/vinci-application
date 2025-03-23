import { IpcResponse } from '@/types/ipc';

export interface ChatResponse extends IpcResponse {
  chatId?: string;
  chunk?: any;
  error?: string;
}

export interface ChatStreamStartEvent {
  chatId: string;
}

export interface ChatStreamChunkEvent {
  chatId: string;
  chunk: any;
}

export interface ChatStreamFinishEvent {
  chatId: string;
}

export interface ChatStreamErrorEvent {
  chatId: string;
  error: string;
} 