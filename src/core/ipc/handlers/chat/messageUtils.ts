import { Message } from '@/entities/message/model/types';
import { UIMessage } from '@/core/utils/ai-sdk-adapter/types';
import { getMessageParts } from '@/core/utils/ai-sdk-adapter/get-message-parts';
import { generateId } from '@/core/utils/ai-sdk-adapter/adapter-utils';
import { ChatPayload } from './types';
import { useMainStore, getMainStoreState } from '@/store/main';
import { BrowserWindow } from 'electron';
import { AppStateEvents } from '@/core/ipc/constants';
import { sanitizeStateForIPC } from '@/core/utils/state-utils';
import { Logger } from 'shared/lib/logger';

const logger = new Logger('ChatMessageUtils');

/**
 * Converts a handler message to a UI message format
 */
export function mapHandlerMessageToUIMessage(handlerMessage: Message): UIMessage {
  const uiMessageBase = {
    id: handlerMessage.id,
    role: handlerMessage.role as 'user' | 'assistant' | 'system',
    content: handlerMessage.content,
    createdAt: new Date(handlerMessage.created_at),
    annotations: handlerMessage.annotations as any[] | undefined
  };

  return {
    ...uiMessageBase,
    parts: getMessageParts(uiMessageBase)
  };
}

/**
 * Creates an assistant message from the streaming message data
 */
export function createAssistantMessage(
  message: UIMessage, 
  messageIdForStream: string | undefined, 
  payload: ChatPayload
): any {
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

/**
 * Find similar messages in the current message set
 */
export function findSimilarMessages(
  currentMessages: any[], 
  conversationId: string | undefined, 
  assistantMessage: any
): any[] {
  if (!conversationId) return [];
  
  // First filter messages from this conversation
  const conversationMessages = currentMessages.filter(
    m => m.conversation_id === conversationId
  );
  
  // Now look for streaming messages or messages with the same ID prefix
  // This is more reliable than comparing content which can be problematic
  return conversationMessages.filter(m => {
    // If it's an assistant message
    if (m.role === 'assistant') {
      // Look for messages with the same ID or streaming messages
      const idMatch = m.id === assistantMessage.id;
      const isStreamMessage = m.id.includes('streaming_');
      const isSameStreamPrefix = 
        (assistantMessage.id.includes('streaming_') && m.id.includes(assistantMessage.id)) || 
        (m.id.includes('streaming_') && assistantMessage.id.includes(m.id));
        
      return (idMatch || isStreamMessage || isSameStreamPrefix) && m.id !== assistantMessage.id;
    }
    return false;
  });
}

/**
 * Remove duplicate messages from an array
 */
export function deduplicateMessages(messages: any[]): any[] {
  const seenIds = new Set<string>();
  return messages.filter(m => {
    if (seenIds.has(m.id)) {
      return false;
    }
    seenIds.add(m.id);
    return true;
  });
}

/**
 * Update messages in the store when a stream completes
 */
export function updateStoreMessages(
  message: UIMessage, 
  messageIdForStream: string | undefined, 
  payload: ChatPayload
): void {
  if (!payload.conversationId) {
    logger.warn('Cannot update messages: Conversation ID is missing');
    return;
  }
  
  const store = useMainStore.getState();
  const currentMessages = store.messages || [];
  const assistantMessage = createAssistantMessage(message, messageIdForStream, payload);
  
  // First, ensure user messages from payload are preserved
  let updatedMessages: any[] = [];
  
  // Step 1: Add all user messages from the payload
  if (payload.messages && payload.messages.length > 0) {
    // Process and add user messages from the payload
    payload.messages.forEach(payloadMsg => {
      // Only add if it's a valid message and not already in the currentMessages array
      if (payloadMsg && payloadMsg.id && payloadMsg.role) {
        const userMessage = {
          id: payloadMsg.id,
          role: payloadMsg.role,
          content: payloadMsg.content || '',
          createdAt: payloadMsg.created_at ? new Date(payloadMsg.created_at) : new Date(),
          conversation_id: payload.conversationId || '',
          space_id: payload.spaceId,
          parts: getMessageParts({
            role: payloadMsg.role,
            content: payloadMsg.content || ''
          }) as any,
          annotations: payloadMsg.annotations || []
        };
        
        // Only add if not already in currentMessages
        if (!currentMessages.some(m => m.id === userMessage.id)) {
          updatedMessages.push(userMessage);
        }
      }
    });
  }
  
  // Step 2: Add all existing messages except for ones that will be replaced
  currentMessages.forEach(existingMessage => {
    // Skip if already added from payload to avoid duplication
    if (!updatedMessages.some(m => m.id === existingMessage.id)) {
      updatedMessages.push(existingMessage);
    }
  });
  
  // Step 3: Add or update the assistant message
  const existingAssistantIndex = updatedMessages.findIndex(m => m.id === assistantMessage.id);
  if (existingAssistantIndex >= 0) {
    updatedMessages[existingAssistantIndex] = assistantMessage;
  } else {
    const similarMessages = findSimilarMessages(updatedMessages, payload.conversationId, assistantMessage);
    if (similarMessages.length > 0) {
      const latestSimilarMessage = similarMessages[similarMessages.length - 1];
      updatedMessages = updatedMessages.map(m => 
        m.id === latestSimilarMessage.id ? assistantMessage : m
      );
    } else {
      updatedMessages.push(assistantMessage);
    }
  }
  
  // Step 4: Remove any duplicates by ID
  const dedupedMessages = deduplicateMessages(updatedMessages);
  
  // Step 5: Sort messages by creation date to ensure correct order
  const sortedMessages = dedupedMessages.sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Add detailed logging to help with debugging
  logger.debug(`Updating store with ${sortedMessages.length} messages after stream finished (including user messages)`);
  
  // Actually update the store
  useMainStore.getState().updateMessages(sortedMessages);
  broadcastStateUpdate();
}

/**
 * Broadcast state updates to all windows
 */
export function broadcastStateUpdate(): void {
  const state = getMainStoreState();
  const serializableState = sanitizeStateForIPC(state);
  BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
    if (window && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(AppStateEvents.STATE_UPDATED, { success: true, data: serializableState });
    }
  });
}