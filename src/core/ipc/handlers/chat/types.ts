import { IpcResponse } from '@/shared/types/ipc';
import { Message, UIMessage } from '@/core/utils/ai-sdk-adapter/types';
import { IpcMainInvokeEvent } from 'electron';

export interface ChatPayload {
  messages: Message[];
  spaceId: string;
  conversationId?: string;
  provider?: string;
  model?: string;
  files?: any;
  searchMode?: string;
  chatMode?: string;
}

export interface StreamEventHandlers {
  sendStreamChunk: (
    event: IpcMainInvokeEvent,
    textDelta: string,
    metadataUpdates: Partial<UIMessage> | undefined,
    isFirstChunk: boolean,
    messageId?: string,
    fullMessage?: any
  ) => void;
  
  sendFinishEvent: (
    event: IpcMainInvokeEvent,
    message: UIMessage | undefined,
    finishReason: any,
    usage: any
  ) => void;
  
  sendErrorEvent: (
    event: IpcMainInvokeEvent,
    errorMessage: string,
    details?: any
  ) => void;
  
  sendToolCallEvent: (
    event: IpcMainInvokeEvent,
    toolCall: any
  ) => void;
  
  sendStatusUpdate: (
    event: IpcMainInvokeEvent,
    status: 'initiated' | 'streaming' | 'completed' | 'cancelled',
    conversationId: string
  ) => void;
}

export interface StreamControllerManager {
  register: (conversationId: string, controller: AbortController) => void;
  cleanup: (conversationId: string) => void;
  get: (conversationId: string) => AbortController | undefined;
  has: (conversationId: string) => boolean;
}

export interface StreamUpdateResult {
  newPreviousContentLength: number;
  newIsFirstChunk: boolean;
  newLastProcessedMessage: UIMessage | null;
}

export interface ErrorResponse extends IpcResponse {
  error: string;
}