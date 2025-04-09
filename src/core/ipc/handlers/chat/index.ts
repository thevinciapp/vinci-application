import { IpcMainInvokeEvent, ipcMain } from 'electron';
import { Logger } from 'shared/lib/logger';
import { ChatEvents } from '@/core/ipc/constants';
import { ChatPayload, IpcResponse } from './types';
import { createStreamEventHandlers } from './eventHandlers';
import { createStreamControllerManager } from './streamControllers';
import { validateChatRequest } from './validationHandler';
import { handleCancelStream } from './cancellationHandler';
import { processStream } from './streamProcessor';
import { 
  getStreamResponseWithTimeout, 
  setupStreamStallDetection, 
  createAbortableStream, 
  handleStreamError 
} from './apiHandlers';

const logger = new Logger('ChatHandler');
const streamControllerManager = createStreamControllerManager();
const eventHandlers = createStreamEventHandlers();

/**
 * Handles chat stream request from the renderer
 */
async function handleChatStreamRequest(
  event: IpcMainInvokeEvent,
  payload: ChatPayload
): Promise<IpcResponse> {
  // Step 1: Validate the request
  const validation = validateChatRequest(event, payload, eventHandlers);
  if (!validation.isValid) {
    return validation.response!;
  }
  
  const conversationId = validation.conversationId!;
  
  // Log request info
  logger.info(`Chat stream requested for ${conversationId}`, {
    spaceId: payload.spaceId,
    messageCount: payload.messages.length
  });
  
  // Step 2: Setup abort controller for this stream
  const abortController = new AbortController();
  streamControllerManager.register(conversationId, abortController);
  
  // Step 3: Update state to initiated
  eventHandlers.sendStatusUpdate(event, 'initiated', conversationId);
  
  // Timeout detection
  let streamTimeout: NodeJS.Timeout | undefined;
  
  try {
    // Step 4: Get API response with timeout handling
    const response = await getStreamResponseWithTimeout(
      payload, 
      conversationId,
      abortController
    );
    
    // Step 5: Setup stall detection
    streamTimeout = setupStreamStallDetection(
      event, 
      conversationId, 
      abortController,
      eventHandlers
    );
    
    // Step 6: Update state to streaming
    eventHandlers.sendStatusUpdate(event, 'streaming', conversationId);
    
    // Step 7: Create abortable stream
    const transformedStream = createAbortableStream(
      response.body!,
      abortController
    );
    
    // Step 8: Process the stream
    await processStream(event, transformedStream, payload, eventHandlers);
    
    // Step 9: Update state to completed
    eventHandlers.sendStatusUpdate(event, 'completed', conversationId);
    
    // Step 10: Cleanup
    if (streamTimeout) clearTimeout(streamTimeout);
    streamControllerManager.cleanup(conversationId);
    
    return { success: true };
  } catch (error: any) {
    // Step 11: Handle errors
    return handleStreamError(
      event,
      error,
      conversationId,
      abortController,
      streamTimeout,
      eventHandlers,
      streamControllerManager
    );
  }
}

/**
 * Register all chat-related IPC handlers
 */
export function registerChatHandlers(): void {
  // Handler for initiating chat streams
  ipcMain.handle(
    ChatEvents.INITIATE_CHAT_STREAM, 
    (event: IpcMainInvokeEvent, payload: ChatPayload) => 
      handleChatStreamRequest(event, payload)
  );
  
  // Handler for canceling chat streams
  ipcMain.handle(
    ChatEvents.CANCEL_CHAT_STREAM,
    (event: IpcMainInvokeEvent, conversationId: string) => 
      handleCancelStream(event, conversationId, streamControllerManager, eventHandlers)
  );
}