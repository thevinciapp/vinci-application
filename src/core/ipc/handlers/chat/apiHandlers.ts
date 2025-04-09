import { Logger } from 'shared/lib/logger';
import { IpcMainInvokeEvent } from 'electron';
import { ChatPayload, StreamEventHandlers } from './types';
import { initiateChatApiStream } from '@/services/chat/chat-service';
import { StreamControllerManager } from './streamControllers';

const logger = new Logger('ChatApiHandlers');

/**
 * Create a request payload with stream enabled
 */
export function createRequestPayload(payload: ChatPayload) {
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

/**
 * Get a stream response from the API with timeout handling
 */
export async function getStreamResponseWithTimeout(
  payload: ChatPayload,
  conversationId: string,
  abortController: AbortController
): Promise<Response> {
  try {
    const requestPayload = {
      ...createRequestPayload(payload),
      conversationId
    };
    
    // Set timeout for API request (20 seconds)
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('API request timed out after 20 seconds')), 20000);
    });
    
    const response = await Promise.race([
      initiateChatApiStream(requestPayload),
      timeoutPromise
    ]);
    
    // Validate response
    if (!response.ok) {
      const errorDetails = await response.text().catch(() => 'No error details available');
      throw new Error(`API returned error status ${response.status}: ${errorDetails}`);
    }
    
    if (!response.body) {
      throw new Error('No response body from API');
    }
    
    return response;
  } catch (apiError: any) {
    if (apiError.name === 'AbortError') {
      throw new Error('Stream was cancelled by the user');
    }
    throw new Error(`API error: ${apiError.message || 'Failed to connect to API'}`);
  }
}

/**
 * Setup a stall detection timeout for a stream
 */
export function setupStreamStallDetection(
  event: IpcMainInvokeEvent,
  conversationId: string,
  abortController: AbortController,
  eventHandlers: StreamEventHandlers
): NodeJS.Timeout {
  const { sendErrorEvent } = eventHandlers;
  
  return setTimeout(() => {
    logger.error('Stream processing timed out after 60 seconds');
    sendErrorEvent(
      event, 
      'Stream processing stalled. Please try again.'
    );
    
    if (!abortController.signal.aborted) {
      abortController.abort('Timed out');
    }
  }, 60000);
}

/**
 * Creates an abortable stream from a regular ReadableStream
 */
export function createAbortableStream(
  originalStream: ReadableStream<Uint8Array>,
  abortController: AbortController
): ReadableStream<Uint8Array> {
  const reader = originalStream.getReader();
  
  return new ReadableStream<Uint8Array>({
    start(controller) {
      function push() {
        if (abortController.signal.aborted) {
          controller.close();
          return;
        }
        
        reader.read().then(({ done, value }) => {
          if (done) {
            controller.close();
            return;
          }
          
          controller.enqueue(value);
          push();
        }).catch(error => {
          controller.error(error);
        });
      }
      
      push();
      
      abortController.signal.addEventListener('abort', () => {
        reader.cancel().catch(e => logger.error('Error cancelling reader', e));
        controller.close();
      });
    },
    cancel() {
      reader.cancel().catch(e => logger.error('Error cancelling reader', e));
    }
  });
}

/**
 * Handle errors from the stream
 */
export function handleStreamError(
  event: IpcMainInvokeEvent,
  error: any,
  conversationId: string,
  abortController: AbortController,
  streamTimeout: NodeJS.Timeout | undefined,
  eventHandlers: StreamEventHandlers,
  controllerManager: StreamControllerManager
): { success: false; error: string } {
  const { sendErrorEvent } = eventHandlers;
  const errorMsg = error.message || 'Failed to process chat stream';
  const isAborted = abortController.signal.aborted;
  
  if (isAborted) {
    logger.info(`Stream was cancelled for conversation ${conversationId}`);
  } else {
    logger.error(
      `Error processing stream for ${conversationId}`,
      { error: errorMsg, stack: error.stack }
    );
    
    sendErrorEvent(event, errorMsg, {
      errorType: error.name,
      conversationId,
      timestamp: new Date().toISOString()
    });
  }
  
  // Cleanup
  if (streamTimeout) clearTimeout(streamTimeout);
  controllerManager.cleanup(conversationId);
  
  return { 
    success: false, 
    error: isAborted ? 'Stream cancelled' : errorMsg 
  };
}