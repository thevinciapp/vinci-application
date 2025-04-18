import { IpcResponse } from '@/shared/types/ipc';
import { Message, UIMessage } from '@/core/utils/ai-sdk-adapter/types';
import { IpcMainInvokeEvent } from 'electron';
import type { ToolCall } from '../../../utils/ai-sdk-adapter/types';

export interface ChatPayload {
  messages: Message[];
  spaceId: string;
  conversationId?: string;
  provider?: string;
  model?: string;
  files?: File[] | undefined;
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
    fullMessage?: UIMessage
  ) => void;
  
  sendFinishEvent: (
    event: IpcMainInvokeEvent,
    message: UIMessage | undefined,
    finishReason: string,
    usage: Record<string, unknown>
  ) => void;
  
  sendErrorEvent: (
    event: IpcMainInvokeEvent,
    errorMessage: string,
    details?: Record<string, unknown>
  ) => void;
  
  sendToolCallEvent: (
    event: IpcMainInvokeEvent,
    toolCall: ToolCall<string, unknown>
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