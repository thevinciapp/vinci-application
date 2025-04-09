import { IpcMainInvokeEvent } from 'electron';
import { Logger } from '@/shared/lib/logger';
import { IpcResponse } from '@/shared/types/ipc';
import { ChatEvents } from '@/core/ipc/constants';
import { StreamControllerManager } from './streamControllers';
import { StreamEventHandlers } from './types';

const logger = new Logger('ChatCancellationHandler');

/**
 * Handles a request to cancel an active stream
 */
export async function handleCancelStream(
  event: IpcMainInvokeEvent, 
  conversationId: string,
  controllerManager: StreamControllerManager,
  eventHandlers: StreamEventHandlers
): Promise<IpcResponse> {
  const { sendStatusUpdate } = eventHandlers;
  
  logger.info(`[IPC Handler: ${ChatEvents.CANCEL_CHAT_STREAM}] Received request`, { conversationId });
  
  if (!conversationId) {
    return { success: false, error: 'No conversation ID provided for cancellation' };
  }
  
  const controller = controllerManager.get(conversationId);
  if (!controller) {
    logger.warn(`No active stream found for conversation ${conversationId}`);
    return { success: false, error: 'No active stream found for this conversation' };
  }
  
  try {
    controller.abort();
    controllerManager.cleanup(conversationId);
    
    // Notify the client that the stream was cancelled
    sendStatusUpdate(event, 'cancelled', conversationId);
    
    return { success: true, data: { status: 'cancelled' } };
  } catch (error: any) {
    logger.error(`Error cancelling stream for conversation ${conversationId}:`, { error });
    return { success: false, error: error.message || 'Failed to cancel stream' };
  }
}