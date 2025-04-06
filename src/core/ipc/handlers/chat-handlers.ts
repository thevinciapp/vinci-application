import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { ChatEvents, AppStateEvents } from '@/core/ipc/constants';
import { Logger } from '@/utils/logger';
import { IpcResponse } from '@/types/ipc';
import type { Message, VinciUIMessage } from '@/types/message';
import { initiateChatApiStream } from '@/services/chat/chat-service';
import { useMainStore, getMainStoreState } from '@/store/main';
import { sanitizeStateForIPC } from '@/core/utils/state-utils';
import { processChatResponse } from '@/core/utils/ai-sdk-adapter/process-chat-response';  
import { getMessageParts } from '@/core/utils/ai-sdk-adapter/get-message-parts'; 
import { generateId } from '@/core/utils/ai-sdk-adapter/adapter-utils';
import type { JSONValue, UIMessage } from '@/core/utils/ai-sdk-adapter/types'; 

const logger = new Logger('ChatHandler');

interface ChatPayload {
  messages: Message[];
  spaceId: string;
  conversationId?: string;
  provider?: string;
  model?: string;
  files?: any;
  searchMode?: string;
  chatMode?: string;
}

function extractTextFromRawStream(content: string): string {
  let extractedText = '';
  const textChunkRegex = /0:"([^"]*)"/g;
  let match;
  
  while ((match = textChunkRegex.exec(content)) !== null) {
    if (match[1]) {
      extractedText += match[1];
    }
  }
  
  if (!extractedText && content) {
    return content;
  }
  
  return extractedText;
}

function broadcastStateUpdate() {
  const state = getMainStoreState();
  const serializableState = sanitizeStateForIPC(state);
  BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
    if (window && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(AppStateEvents.STATE_UPDATED, { success: true, data: serializableState });
    }
  });
}

function createRequestPayload(payload: ChatPayload) {
  return {
    messages: payload.messages,
    spaceId: payload.spaceId,
    conversationId: payload.conversationId,
    provider: payload.provider,
    model: payload.model,
    files: payload.files,
    searchMode: payload.searchMode,
    chatMode: payload.chatMode,
    stream: true,
  };
}

function extractTextContent(message: UIMessage): string {
  let textContent = "";
  
  if (Array.isArray(message.parts) && message.parts.length > 0) {
    const textParts = message.parts.filter(part => part.type === 'text');
    if (textParts.length > 0) {
      textContent = textParts.map(part => part.text).join('');
    }
  }
  
  if (!textContent && message.content) {
    textContent = extractTextFromRawStream(message.content);
  }
  
  return textContent;
}

function createFullMessageData(message: UIMessage, messageIdForStream: string | undefined, textContent: string) {
  return {
    id: message.id || messageIdForStream || generateId(),
    role: message.role,
    content: textContent,
    createdAt: message.createdAt,
    parts: message.parts || [],
    annotations: message.annotations || [],
    toolInvocations: message.toolInvocations || [],
    reasoning: message.reasoning,
  };
}

function sendStreamChunk(event: IpcMainInvokeEvent, textDelta: string, metadataUpdates: Partial<UIMessage> | undefined, isFirstChunk: boolean, messageId?: string, fullMessage?: any) {
  if (isFirstChunk && fullMessage) {
    event.sender.send(ChatEvents.CHAT_STREAM_CHUNK, {
      success: true,
      data: { 
        chunk: textDelta, 
        messageId,
        fullMessage,
        isFirstChunk: true
      },
    });
  } else {
    event.sender.send(ChatEvents.CHAT_STREAM_CHUNK, {
      success: true,
      data: { 
        chunk: textDelta,
        metadataUpdates,
        isFirstChunk: false
      },
    });
  }
}

function sendFinishEvent(event: IpcMainInvokeEvent, message: UIMessage | undefined, finishReason: any, usage: any) {
  event.sender.send(ChatEvents.CHAT_STREAM_FINISH, {
    success: true,
    data: { 
      finishReason, 
      usage,
      finalMessage: message 
    }, 
  });
}

function createAssistantMessage(message: UIMessage, messageIdForStream: string | undefined, payload: ChatPayload): VinciUIMessage {
  const messageId = message.id || messageIdForStream || generateId();
  const messageRole = message.role || 'assistant';
  const messageContent = message.content || '';
  
  return {
    id: messageId,
    role: messageRole as any,
    content: messageContent,
    createdAt: new Date(),
    conversation_id: payload.conversationId || '',
    space_id: payload.spaceId,
    parts: getMessageParts({
      role: messageRole,
      content: messageContent
    }) as any,
    annotations: message.annotations as any[] || [],
  };
}

function findSimilarMessages(currentMessages: VinciUIMessage[], conversationId: string | undefined, assistantMessage: VinciUIMessage) {
  if (!conversationId) return [];
  
  const conversationMessages = currentMessages.filter(
    m => m.conversation_id === conversationId
  );
  
  return conversationMessages.filter(
    m => m.role === 'assistant' && 
         m.content.trim() === assistantMessage.content.trim() &&
         m.id !== assistantMessage.id
  );
}

function deduplicateMessages(messages: VinciUIMessage[]): VinciUIMessage[] {
  const seenIds = new Set<string>();
  return messages.filter(m => {
    if (seenIds.has(m.id)) {
      return false;
    }
    seenIds.add(m.id);
    return true;
  });
}

function updateStoreMessages(message: UIMessage, messageIdForStream: string | undefined, payload: ChatPayload) {
  if (!payload.conversationId) {
    logger.warn('Cannot update messages: Conversation ID is missing');
    return;
  }
  
  const store = useMainStore.getState();
  const currentMessages = store.messages || [];
  const assistantMessage = createAssistantMessage(message, messageIdForStream, payload);
  
  const existingAssistantIndex = currentMessages.findIndex(m => m.id === assistantMessage.id);
  let updatedMessages: VinciUIMessage[];
  
  if (existingAssistantIndex >= 0) {
    updatedMessages = [...currentMessages];
    updatedMessages[existingAssistantIndex] = assistantMessage;
  } else {
    const similarMessages = findSimilarMessages(currentMessages, payload.conversationId, assistantMessage);
    
    if (similarMessages.length > 0) {
      const latestSimilarMessage = similarMessages[similarMessages.length - 1];
      updatedMessages = currentMessages.map(m => 
        m.id === latestSimilarMessage.id ? assistantMessage : m
      );
    } else {
      updatedMessages = [...currentMessages, assistantMessage];
    }
  }
  
  const dedupedMessages = deduplicateMessages(updatedMessages);
  logger.debug(`Updating store with ${dedupedMessages.length} messages after stream finished`);
  useMainStore.getState().updateMessages(dedupedMessages);
  broadcastStateUpdate();
}

function sendToolCallEvent(event: IpcMainInvokeEvent, toolCall: any) {
  event.sender.send(ChatEvents.CHAT_STREAM_TOOL_CALL, {
    success: true,
    data: { toolCall },
  });
}

function sendErrorEvent(event: IpcMainInvokeEvent, errorMessage: string) {
  event.sender.send(ChatEvents.CHAT_STREAM_ERROR, {
    success: false,
    error: errorMessage,
  });
}

function handleStreamUpdate(
  event: IpcMainInvokeEvent, 
  message: UIMessage, 
  previousContentLength: number, 
  isFirstChunk: boolean, 
  messageIdForStream: string | undefined, 
  lastProcessedMessage: UIMessage | null,
  streamAborted: boolean
): { 
  newPreviousContentLength: number; 
  newIsFirstChunk: boolean; 
  newLastProcessedMessage: UIMessage | null;
} {
  if (streamAborted) {
    return { 
      newPreviousContentLength: previousContentLength, 
      newIsFirstChunk: isFirstChunk, 
      newLastProcessedMessage: lastProcessedMessage 
    };
  }
  
  if (message.id && !messageIdForStream) {
    messageIdForStream = message.id;
  }
  
  const textContent = extractTextContent(message);
  const textDelta = textContent.substring(previousContentLength);
  
  if (isFirstChunk) {
    const fullMessageData = createFullMessageData(message, messageIdForStream, textContent);
    sendStreamChunk(event, textDelta, undefined, true, messageIdForStream, fullMessageData);
    return { 
      newPreviousContentLength: textContent.length, 
      newIsFirstChunk: false, 
      newLastProcessedMessage: message 
    };
  } else if (textDelta || !lastProcessedMessage || messageHasMetadataChanges(message, lastProcessedMessage)) {
    const metadataUpdates = getMetadataUpdates(message, lastProcessedMessage);
    sendStreamChunk(event, textDelta, metadataUpdates, false);
    return { 
      newPreviousContentLength: textContent.length, 
      newIsFirstChunk: false, 
      newLastProcessedMessage: message 
    };
  }
  
  return { 
    newPreviousContentLength: previousContentLength, 
    newIsFirstChunk: isFirstChunk, 
    newLastProcessedMessage: lastProcessedMessage 
  };
}

function handleStreamFinish(
  event: IpcMainInvokeEvent, 
  message: UIMessage | undefined, 
  finishReason: any, 
  usage: any, 
  messageIdForStream: string | undefined,
  payload: ChatPayload,
  streamAborted: boolean
) {
  if (streamAborted) return;
  
  logger.info('[IPC Handler -> FINISH]', {
    messageId: message?.id,
    finishReason,
    usage,
  });
  
  sendFinishEvent(event, message, finishReason, usage);
  
  if (message) {
    updateStoreMessages(message, messageIdForStream, payload);
  }
}

function processStream(
  event: IpcMainInvokeEvent,
  stream: ReadableStream<Uint8Array>,
  payload: ChatPayload
): Promise<void> {
  let streamAborted = false;
  let messageIdForStream: string | undefined = undefined;
  let isFirstChunk = true;
  let previousContentLength = 0;
  let lastProcessedMessage: UIMessage | null = null;
  
  return processChatResponse({
    stream,
    update: ({ message, data, replaceLastMessage }) => {
      const result = handleStreamUpdate(
        event, 
        message, 
        previousContentLength, 
        isFirstChunk, 
        messageIdForStream, 
        lastProcessedMessage,
        streamAborted
      );
      
      previousContentLength = result.newPreviousContentLength;
      isFirstChunk = result.newIsFirstChunk;
      lastProcessedMessage = result.newLastProcessedMessage;
    },
    onFinish: ({ message, finishReason, usage }) => {
      handleStreamFinish(
        event, 
        message, 
        finishReason, 
        usage, 
        messageIdForStream,
        payload,
        streamAborted
      );
    },
    onToolCall: ({ toolCall }) => {
      if (streamAborted) return;
      logger.info('[IPC Handler -> TOOL_CALL]', { toolCall });
      sendToolCallEvent(event, toolCall);
    },
    generateId: generateId,
    lastMessage: payload.messages.length > 0
      ? mapHandlerMessageToUIMessage(payload.messages[payload.messages.length - 1])
      : undefined,
  }).catch(error => {
    streamAborted = true;
    throw error;
  });
}

async function handleChatStreamRequest(
  event: IpcMainInvokeEvent,
  payload: ChatPayload
): Promise<IpcResponse> {
  logger.info(`[IPC Handler: ${ChatEvents.INITIATE_CHAT_STREAM}] Received request`, {
    spaceId: payload.spaceId,
    conversationId: payload.conversationId,
  });

  const requestPayload = createRequestPayload(payload);

  try {
    logger.info(`Calling initiateChatApiStream`, {
      spaceId: requestPayload.spaceId,
      conversationId: requestPayload.conversationId,
    });
    
    const response = await initiateChatApiStream(requestPayload);

    if (!response.body) {
      throw new Error('No response body from API');
    }

    await processStream(event, response.body, payload);
    return { success: true };
    
  } catch (error: any) {
    logger.error(
      `[IPC Handler: ${ChatEvents.INITIATE_CHAT_STREAM}] Error processing stream`,
      { error: error.message || error }
    );

    sendErrorEvent(event, error.message || 'Failed to process chat stream');
    return { success: false, error: error.message };
  }
}

export function registerChatHandlers(): void {
  ipcMain.handle(
    ChatEvents.INITIATE_CHAT_STREAM, 
    (event: IpcMainInvokeEvent, payload: ChatPayload) => handleChatStreamRequest(event, payload)
  );
}

function messageHasMetadataChanges(newMessage: UIMessage, oldMessage: UIMessage | null): boolean {
  if (!oldMessage) return true;
  
  const hasAnnotationChanges = JSON.stringify(newMessage.annotations) !== JSON.stringify(oldMessage.annotations);
  const hasToolInvocationChanges = JSON.stringify(newMessage.toolInvocations) !== JSON.stringify(oldMessage.toolInvocations);
  const hasReasoningChanges = newMessage.reasoning !== oldMessage.reasoning;
  const hasPartsChanges = JSON.stringify(newMessage.parts) !== JSON.stringify(oldMessage.parts);
  
  return hasAnnotationChanges || hasToolInvocationChanges || hasReasoningChanges || hasPartsChanges;
}

function getMetadataUpdates(newMessage: UIMessage, oldMessage: UIMessage | null): Partial<UIMessage> {
  if (!oldMessage) return newMessage;
  
  const updates: Partial<UIMessage> = {};
  
  if (JSON.stringify(newMessage.annotations) !== JSON.stringify(oldMessage.annotations)) {
    updates.annotations = newMessage.annotations;
  }
  
  if (JSON.stringify(newMessage.toolInvocations) !== JSON.stringify(oldMessage.toolInvocations)) {
    updates.toolInvocations = newMessage.toolInvocations;
  }
  
  if (newMessage.reasoning !== oldMessage.reasoning) {
    updates.reasoning = newMessage.reasoning;
  }
  
  if (JSON.stringify(newMessage.parts) !== JSON.stringify(oldMessage.parts)) {
    updates.parts = newMessage.parts;
  }
  
  return updates;
}

function mapHandlerMessageToUIMessage(handlerMessage: Message): UIMessage {
  const uiMessageBase = {
    id: handlerMessage.id,
    role: handlerMessage.role as 'user' | 'assistant' | 'system',
    content: handlerMessage.content,
    createdAt: new Date(handlerMessage.created_at),
    annotations: handlerMessage.annotations as JSONValue[] | undefined
  };

  return {
    ...uiMessageBase,
    parts: getMessageParts(uiMessageBase)
  };
} 