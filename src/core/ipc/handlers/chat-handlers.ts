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
  // If the content is empty or not a string, return empty string
  if (!content || typeof content !== 'string') {
    return '';
  }

  let extractedText = '';
  
  try {
    // Try to parse as JSON first - the most robust approach
    let parsed;
    try {
      parsed = JSON.parse(content);
      
      // If successfully parsed and has a text property, use that
      if (parsed && parsed.text) {
        return parsed.text;
      }
      
      // If it has a content property, use that
      if (parsed && parsed.content) {
        return parsed.content;
      }
    } catch (e) {
      // Not valid JSON, continue with regex approaches
    }
    
    // Try the pattern matching approach for different stream formats
    // Format 1: 0:"text content here"
    const textChunkRegex = /0:"([^"]*)"/g;
    let match;
    let foundMatch = false;
    
    while ((match = textChunkRegex.exec(content)) !== null) {
      if (match[1]) {
        extractedText += match[1];
        foundMatch = true;
      }
    }
    
    if (foundMatch) {
      return extractedText;
    }
    
    // Format 2: {"text":"content here"}
    const jsonTextRegex = /"text"\s*:\s*"([^"]*)"/g;
    foundMatch = false;
    
    while ((match = jsonTextRegex.exec(content)) !== null) {
      if (match[1]) {
        extractedText += match[1];
        foundMatch = true;
      }
    }
    
    if (foundMatch) {
      return extractedText;
    }
    
    // Format 3: text:content here
    const simpleTextRegex = /text:([^\n]*)/g;
    foundMatch = false;
    
    while ((match = simpleTextRegex.exec(content)) !== null) {
      if (match[1]) {
        extractedText += match[1];
        foundMatch = true;
      }
    }
    
    if (foundMatch) {
      return extractedText;
    }
    
    // If all else fails, return the raw content as-is
    return content;
  } catch (error) {
    logger.warn('Error extracting text from stream:', { error, content });
    // Return the original content as a fallback
    return content;
  }
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

function sendFinishEvent(event: IpcMainInvokeEvent, message: UIMessage | undefined, finishReason: any, usage: any) {
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
  
  // First, ensure user messages from payload are preserved
  let updatedMessages: VinciUIMessage[] = [];
  
  // Step 1: Add all user messages from the payload
  if (payload.messages && payload.messages.length > 0) {
    // Process and add user messages from the payload
    payload.messages.forEach(payloadMsg => {
      // Only add if it's a valid message and not already in the currentMessages array
      if (payloadMsg && payloadMsg.id && payloadMsg.role) {
        const userMessage: VinciUIMessage = {
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
  
  // Log message summary for debugging purposes
  const messageSummary = sortedMessages.map(msg => ({
    id: msg.id,
    role: msg.role,
    conversation_id: msg.conversation_id,
    contentSnippet: msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : ''),
    createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt
  }));
  
  logger.debug('Message details for store update:', {
    conversationId: payload.conversationId,
    messageCount: sortedMessages.length,
    messages: messageSummary
  });
  
  // Actually update the store
  useMainStore.getState().updateMessages(sortedMessages);
  broadcastStateUpdate();
}

function sendToolCallEvent(event: IpcMainInvokeEvent, toolCall: any) {
  event.sender.send(ChatEvents.CHAT_STREAM_TOOL_CALL, {
    success: true,
    data: { toolCall },
  });
}

function sendErrorEvent(event: IpcMainInvokeEvent, errorMessage: string, details?: any) {
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
      try {
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
      } catch (error) {
        logger.error('Error handling stream update:', error);
      }
    },
    onFinish: ({ message, finishReason, usage }) => {
      try {
        handleStreamFinish(
          event, 
          message, 
          finishReason, 
          usage, 
          messageIdForStream,
          payload,
          streamAborted
        );
      } catch (error) {
        logger.error('Error handling stream finish:', error);
      }
    },
    onToolCall: ({ toolCall }) => {
      if (streamAborted) return;
      try {
        logger.info('[IPC Handler -> TOOL_CALL]', { toolCall });
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

async function handleChatStreamRequest(
  event: IpcMainInvokeEvent,
  payload: ChatPayload
): Promise<IpcResponse> {
  // Validate request
  if (!payload.spaceId) {
    return handleRequestError(event, 'Missing required space ID for chat request');
  }
  
  if (!payload.messages?.length) {
    return handleRequestError(event, 'No messages provided in chat request');
  }
  
  // Ensure conversation ID for proper tracking
  const conversationId = payload.conversationId || `temp_${generateId()}`; 
  
  // Setup abort controller for this stream
  const abortController = new AbortController();
  registerStreamController(conversationId, abortController);
  
  // Create a timeout to detect stalled streams
  let streamTimeout: NodeJS.Timeout | undefined;
  
  // Log request
  logger.info(`Chat stream requested for ${conversationId}`, {
    spaceId: payload.spaceId,
    messageCount: payload.messages.length
  });
  
  // Update status to initiated
  sendStatusUpdate(event, 'initiated', conversationId);
  
  try {
    // Get the API response with timeout
    const response = await getStreamResponseWithTimeout(
      payload, 
      conversationId,
      abortController
    );
    
    // Setup the stall detection (60 seconds without progress)
    streamTimeout = setupStreamStallDetection(
      event, 
      conversationId, 
      abortController
    );
    
    // Update status to streaming
    sendStatusUpdate(event, 'streaming', conversationId);
    
    // Transform the stream to be abortable
    const transformedStream = createAbortableStream(
      response.body!,
      abortController
    );
    
    // Process the stream
    await processStream(event, transformedStream, payload);
    
    // Update status to completed
    sendStatusUpdate(event, 'completed', conversationId);
    
    // Cleanup
    if (streamTimeout) clearTimeout(streamTimeout);
    cleanupStreamController(conversationId);
    
    return { success: true };
  } catch (error: any) {
    // Handle errors
    return handleStreamError(
      event,
      error,
      conversationId,
      abortController,
      streamTimeout
    );
  }
}

// Helper functions to keep the main function clean and follow SRP

function handleRequestError(
  event: IpcMainInvokeEvent, 
  errorMsg: string
): IpcResponse {
  logger.error(errorMsg);
  sendErrorEvent(event, errorMsg);
  return { success: false, error: errorMsg };
}

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

async function getStreamResponseWithTimeout(
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

function setupStreamStallDetection(
  event: IpcMainInvokeEvent,
  conversationId: string,
  abortController: AbortController
): NodeJS.Timeout {
  return setTimeout(() => {
    logger.error('Stream processing timed out after 60 seconds');
    sendErrorEvent(event, 'Stream processing stalled. Please try again.');
    
    if (!abortController.signal.aborted) {
      abortController.abort('Timed out');
    }
  }, 60000);
}

function createAbortableStream(
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

function handleStreamError(
  event: IpcMainInvokeEvent,
  error: any,
  conversationId: string,
  abortController: AbortController,
  streamTimeout?: NodeJS.Timeout
): IpcResponse {
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
  cleanupStreamController(conversationId);
  
  return { 
    success: false, 
    error: isAborted ? 'Stream cancelled' : errorMsg 
  };
}

// Store active stream controllers by conversation ID to allow cancellation
const activeStreamControllers: Map<string, AbortController> = new Map();

function registerStreamController(conversationId: string, controller: AbortController) {
  logger.debug(`Registering stream controller for conversation ${conversationId}`);
  // Cancel any existing stream for this conversation
  if (activeStreamControllers.has(conversationId)) {
    logger.debug(`Cancelling previous stream for conversation ${conversationId}`);
    try {
      activeStreamControllers.get(conversationId)?.abort();
    } catch (e) {
      logger.error(`Error aborting previous stream: ${e}`);
    }
  }
  activeStreamControllers.set(conversationId, controller);
}

function cleanupStreamController(conversationId: string) {
  logger.debug(`Cleaning up stream controller for conversation ${conversationId}`);
  activeStreamControllers.delete(conversationId);
}

// Handle stream cancellation
async function handleCancelStream(event: IpcMainInvokeEvent, conversationId: string): Promise<IpcResponse> {
  logger.info(`[IPC Handler: ${ChatEvents.CANCEL_CHAT_STREAM}] Received request`, { conversationId });
  
  if (!conversationId) {
    return { success: false, error: 'No conversation ID provided for cancellation' };
  }
  
  const controller = activeStreamControllers.get(conversationId);
  if (!controller) {
    logger.warn(`No active stream found for conversation ${conversationId}`);
    return { success: false, error: 'No active stream found for this conversation' };
  }
  
  try {
    controller.abort();
    cleanupStreamController(conversationId);
    
    // Notify the client that the stream was cancelled
    event.sender.send(ChatEvents.CHAT_STREAM_STATUS, {
      success: true,
      data: { 
        status: 'cancelled', 
        conversationId 
      }
    });
    
    return { success: true, data: { status: 'cancelled' } };
  } catch (error: any) {
    logger.error(`Error cancelling stream for conversation ${conversationId}:`, { error });
    return { success: false, error: error.message || 'Failed to cancel stream' };
  }
}

export function registerChatHandlers(): void {
  ipcMain.handle(
    ChatEvents.INITIATE_CHAT_STREAM, 
    (event: IpcMainInvokeEvent, payload: ChatPayload) => handleChatStreamRequest(event, payload)
  );
  
  ipcMain.handle(
    ChatEvents.CANCEL_CHAT_STREAM,
    (event: IpcMainInvokeEvent, conversationId: string) => handleCancelStream(event, conversationId)
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