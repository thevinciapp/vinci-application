import { IpcMainInvokeEvent } from 'electron';
import { Logger } from 'shared/lib/logger';
import { UIMessage } from '@/core/utils/ai-sdk-adapter/types';
import { StreamEventHandlers, StreamUpdateResult, ChatPayload } from './types';
import { processChatResponse } from '@/core/utils/ai-sdk-adapter/process-chat-response';
import { generateId } from '@/core/utils/ai-sdk-adapter/adapter-utils';
import { mapHandlerMessageToUIMessage } from './messageUtils';

const logger = new Logger('StreamProcessor');

/**
 * Processes a ReadableStream from the API response
 */
export function processStream(
  event: IpcMainInvokeEvent,
  stream: ReadableStream<Uint8Array>,
  payload: ChatPayload,
  eventHandlers: StreamEventHandlers
): Promise<void> {
  let streamAborted = false;
  let messageIdForStream: string | undefined = undefined;
  let isFirstChunk = true;
  let previousContentLength = 0;
  let lastProcessedMessage: UIMessage | null = null;
  
  const { 
    sendStreamChunk, 
    sendFinishEvent, 
    sendErrorEvent, 
    sendToolCallEvent 
  } = eventHandlers;
  
  return processChatResponse({
    stream,
    update: ({ message, data }) => {
      try {
        const result = handleStreamUpdate(
          event, 
          message, 
          previousContentLength, 
          isFirstChunk, 
          messageIdForStream, 
          lastProcessedMessage,
          streamAborted,
          sendStreamChunk
        );
        
        previousContentLength = result.newPreviousContentLength;
        isFirstChunk = result.newIsFirstChunk;
        lastProcessedMessage = result.newLastProcessedMessage;
        
        // Update messageId if it was generated from the first chunk
        if (result.newLastProcessedMessage?.id && !messageIdForStream) {
          messageIdForStream = result.newLastProcessedMessage.id;
        }
      } catch (error) {
        logger.error('Error handling stream update:', error);
      }
    },
    onFinish: ({ message, finishReason, usage }) => {
      try {
        sendFinishEvent(
          event, 
          message, 
          finishReason, 
          usage
        );
      } catch (error) {
        logger.error('Error handling stream finish:', error);
      }
    },
    onToolCall: ({ toolCall }) => {
      if (streamAborted) return;
      
      try {
        logger.info('[Stream -> TOOL_CALL]', { toolCall });
        sendToolCallEvent(event, toolCall);
      } catch (error) {
        logger.error('Error handling tool call:', error);
      }
    },
    onError: (errorValue) => {
      logger.error('Stream error received from API:', { error: errorValue });
      const errorMsg = typeof errorValue === 'string' 
        ? errorValue 
        : errorValue instanceof Error
          ? errorValue.message
          : 'Unknown error occurred during streaming';
      
      sendErrorEvent(event, errorMsg, { source: 'stream-error-handler' });
    },
    generateId,
    lastMessage: payload.messages.length > 0
      ? mapHandlerMessageToUIMessage(payload.messages[payload.messages.length - 1])
      : undefined,
  }).catch(error => {
    streamAborted = true;
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Fatal error in stream processing:', { error: errorMsg });
    sendErrorEvent(event, errorMsg, { fatal: true });
    throw error;
  });
}

/**
 * Handles updates to the stream, managing content and message state
 */
function handleStreamUpdate(
  event: IpcMainInvokeEvent, 
  message: UIMessage, 
  previousContentLength: number, 
  isFirstChunk: boolean, 
  messageIdForStream: string | undefined, 
  lastProcessedMessage: UIMessage | null,
  streamAborted: boolean,
  sendStreamChunk: StreamEventHandlers['sendStreamChunk']
): StreamUpdateResult {
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
    const fullMessageData = createFullMessageData(message, messageIdForStream);
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

/**
 * Extracts plain text content from a message
 */
function extractTextContent(message: UIMessage): string {
  let textContent = '';
  
  if (Array.isArray(message.parts) && message.parts.length > 0) {
    const textParts = message.parts.filter(part => part.type === 'text');
    if (textParts.length > 0) {
      textContent = textParts.map(part => part.text).join('');
    }
  }
  
  if (!textContent && message.content) {
    textContent = message.content;
  }
  
  return textContent;
}

/**
 * Creates a full message data object from a message
 */
function createFullMessageData(message: UIMessage, messageIdForStream: string | undefined): any {
  return {
    id: message.id || messageIdForStream || generateId(),
    role: message.role,
    content: message.content || extractTextContent(message),
    createdAt: message.createdAt,
    parts: message.parts || [],
    annotations: message.annotations || [],
    toolInvocations: message.toolInvocations || [],
    reasoning: message.reasoning,
  };
}

/**
 * Checks if a message has metadata changes
 */
function messageHasMetadataChanges(newMessage: UIMessage, oldMessage: UIMessage | null): boolean {
  if (!oldMessage) return true;
  
  const hasAnnotationChanges = JSON.stringify(newMessage.annotations) !== JSON.stringify(oldMessage.annotations);
  const hasToolInvocationChanges = JSON.stringify(newMessage.toolInvocations) !== JSON.stringify(oldMessage.toolInvocations);
  const hasReasoningChanges = newMessage.reasoning !== oldMessage.reasoning;
  const hasPartsChanges = JSON.stringify(newMessage.parts) !== JSON.stringify(oldMessage.parts);
  
  return hasAnnotationChanges || hasToolInvocationChanges || hasReasoningChanges || hasPartsChanges;
}

/**
 * Gets metadata updates between messages
 */
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