import { IpcMainInvokeEvent } from 'electron';
import { Logger } from '@/shared/lib/logger';
import { ChatEvents } from '@/core/ipc/constants';
import { UIMessage } from '@/core/utils/ai-sdk-adapter/types';
import { StreamEventHandlers } from './types';

const logger = new Logger('ChatEventHandlers');

/**
 * Creates event handlers for stream events
 */
export function createStreamEventHandlers(): StreamEventHandlers {
  return {
    sendStreamChunk,
    sendFinishEvent,
    sendErrorEvent,
    sendToolCallEvent,
    sendStatusUpdate
  };
}

/**
 * Sends a chunk of streamed content to the renderer
 */
function sendStreamChunk(
  event: IpcMainInvokeEvent,
  textDelta: string,
  metadataUpdates: Partial<UIMessage> | undefined,
  isFirstChunk: boolean,
  messageId?: string,
  fullMessage?: UIMessage
) {
  try {
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
      
      logger.debug('Sent first chunk with message ID:', { messageId });
    } else {
      event.sender.send(ChatEvents.CHAT_STREAM_CHUNK, {
        success: true,
        data: { 
          chunk: textDelta,
          messageId, // Always include messageId with every chunk
          metadataUpdates,
          isFirstChunk: false
        },
      });
    }
  } catch (error) {
    logger.error('Error sending stream chunk:', { error, textDelta });
  }
}

/**
 * Sends a finish event when streaming completes
 */
function sendFinishEvent(
  event: IpcMainInvokeEvent,
  message: UIMessage | undefined,
  finishReason: string,
  usage: Record<string, unknown>
) {
  try {
    logger.debug('Sending finish event', { 
      messageId: message?.id, 
      finishReason, 
      usage: typeof usage === 'object' ? '✓' : 'missing'
    });
    
    event.sender.send(ChatEvents.CHAT_STREAM_FINISH, {
      success: true,
      data: { 
        finishReason, 
        usage,
        finalMessage: message 
      }, 
    });
  } catch (error) {
    logger.error('Error sending finish event:', { error });
    // Try to send a simplified finish event without the potentially large message object
    try {
      event.sender.send(ChatEvents.CHAT_STREAM_FINISH, {
        success: true,
        data: { 
          finishReason,
          usage
        },
      });
    } catch (innerError) {
      logger.error('Failed to send simplified finish event:', { innerError });
    }
  }
}

/**
 * Sends an error event to the renderer
 */
function sendErrorEvent(
  event: IpcMainInvokeEvent,
  errorMessage: string,
  details?: Record<string, unknown>
) {
  const errorData = {
    success: false,
    error: errorMessage || 'An error occurred during streaming',
    data: details ? { details } : undefined
  };
  
  logger.error('Sending error event to renderer:', { 
    error: errorMessage, 
    details: details ? JSON.stringify(details).substring(0, 200) : undefined 
  });
  
  try {
    event.sender.send(ChatEvents.CHAT_STREAM_ERROR, errorData);
  } catch (error) {
    logger.error('Error sending error event:', { error });
  }
}

/**
 * Sends a tool call event to the renderer
 */
function sendToolCallEvent(
  event: IpcMainInvokeEvent,
  toolCall: Record<string, unknown>
) {
  event.sender.send(ChatEvents.CHAT_STREAM_TOOL_CALL, {
    success: true,
    data: { toolCall },
  });
}

/**
 * Sends a status update event to the renderer
 */
function sendStatusUpdate(
  event: IpcMainInvokeEvent,
  status: 'initiated' | 'streaming' | 'completed' | 'cancelled',
  conversationId: string
) {
  event.sender.send(ChatEvents.CHAT_STREAM_STATUS, {
    success: true,
    data: { status, conversationId }
  });
}