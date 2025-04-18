import { IpcMainInvokeEvent } from 'electron';
import { Logger } from '@/shared/lib/logger';
import { ChatPayload, ErrorResponse, StreamEventHandlers } from './types';

const logger = new Logger('ChatValidationHandler');

/**
 * Handles validation of the incoming chat request
 */
export function validateChatRequest(
  event: IpcMainInvokeEvent, 
  payload: ChatPayload, 
  eventHandlers: StreamEventHandlers
): { isValid: boolean; response?: ErrorResponse; conversationId?: string } {
  const { sendErrorEvent } = eventHandlers;
  
  // Validate essential payload fields
  if (!payload.spaceId) {
    const errorMsg = 'Missing required space ID for chat request';
    logger.error(errorMsg);
    sendErrorEvent(event, errorMsg);
    
    return { 
      isValid: false, 
      response: { success: false, error: errorMsg }
    };
  }
  
  // Ensure we have a conversation ID for proper stream tracking
  const conversationId = payload.conversationId || `temp_${generateId()}`;
  
  // Validate messages array
  if (!payload.messages || payload.messages.length === 0) {
    const errorMsg = 'No messages provided in chat request';
    logger.error(errorMsg);
    sendErrorEvent(event, errorMsg);
    
    return { 
      isValid: false, 
      response: { success: false, error: errorMsg }
    };
  }

  return { isValid: true, conversationId };
}

/**
 * Generate a random ID for tracking
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}