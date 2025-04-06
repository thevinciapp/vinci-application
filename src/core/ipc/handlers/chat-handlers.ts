import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { ChatEvents, AppStateEvents } from '@/core/ipc/constants';
import { Logger } from '@/utils/logger';
import { IpcResponse } from '@/types/ipc';
import type { Message, VinciUIMessage } from '@/types/message';
import { initiateChatApiStream } from '@/services/chat/chat-service';
import { useMainStore, getMainStoreState } from '@/store/main';
import { sanitizeStateForIPC } from '@/core/utils/state-utils';

import {
  processChatResponse,
} from '@/core/utils/ai-sdk-adapter/process-chat-response';  
import {
  getMessageParts
} from '@/core/utils/ai-sdk-adapter/get-message-parts'; 
import {
  generateId,
} from '@/core/utils/ai-sdk-adapter/adapter-utils';
import type {
  JSONValue,
  UIMessage,
} from '@/core/utils/ai-sdk-adapter/types'; 


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

// Helper function to extract text content from raw Vercel AI SDK stream format
function extractTextFromRawStream(content: string): string {
  let extractedText = '';
  
  // Match text chunks which typically have format: 0:"text content here"
  const textChunkRegex = /0:"([^"]*)"/g;
  let match;
  
  while ((match = textChunkRegex.exec(content)) !== null) {
    if (match[1]) {
      extractedText += match[1];
    }
  }
  
  // If we couldn't extract anything with the regex but content exists,
  // fall back to using the content as-is (though it might contain raw format)
  if (!extractedText && content) {
    return content;
  }
  
  return extractedText;
}

// Function to broadcast state updates to all renderers
function broadcastStateUpdate() {
  const state = getMainStoreState();
  const serializableState = sanitizeStateForIPC(state);
  BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
    if (window && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(AppStateEvents.STATE_UPDATED, { success: true, data: serializableState });
    }
  });
}

export function registerChatHandlers(): void {
  ipcMain.handle(ChatEvents.INITIATE_CHAT_STREAM, async (
    event: IpcMainInvokeEvent,
    payload: ChatPayload
  ): Promise<IpcResponse> => {
    logger.info(`[IPC Handler: ${ChatEvents.INITIATE_CHAT_STREAM}] Received request`, {
      spaceId: payload.spaceId,
      conversationId: payload.conversationId,
    });

    const requestPayload = {
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

    let streamAborted = false;
    let messageIdForStream: string | undefined = undefined;
    let isFirstChunk = true;
    let previousContentLength = 0;
    let lastProcessedMessage: UIMessage | null = null;

    try {
      logger.info(`Calling initiateChatApiStream`, {
        spaceId: requestPayload.spaceId,
        conversationId: requestPayload.conversationId,
      });
      const response = await initiateChatApiStream(requestPayload);

      if (!response.body) {
        throw new Error('No response body from API');
      }

      await processChatResponse({
        stream: response.body,
        update: ({ message, data, replaceLastMessage }) => {
           if (streamAborted) return;
           
           if (message.id && !messageIdForStream) {
              messageIdForStream = message.id;
           }
           
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
           
           const textDelta = textContent.substring(previousContentLength);
           previousContentLength = textContent.length;

           if (isFirstChunk) {
              const fullMessageData = {
                id: message.id || messageIdForStream || generateId(),
                role: message.role,
                content: textContent,
                createdAt: message.createdAt,
                parts: message.parts || [],
                annotations: message.annotations || [],
                toolInvocations: message.toolInvocations || [],
                reasoning: message.reasoning,
              };
              
              event.sender.send(ChatEvents.CHAT_STREAM_CHUNK, {
                  success: true,
                  data: { 
                    chunk: textDelta, 
                    messageId: messageIdForStream,
                    fullMessage: fullMessageData,
                    isFirstChunk: true
                  },
              });
              
              isFirstChunk = false;
              lastProcessedMessage = message;
              
           } else if (textDelta || !lastProcessedMessage || messageHasMetadataChanges(message, lastProcessedMessage)) {
              const metadataUpdates = getMetadataUpdates(message, lastProcessedMessage);
              
              event.sender.send(ChatEvents.CHAT_STREAM_CHUNK, {
                  success: true,
                  data: { 
                    chunk: textDelta,
                    metadataUpdates: metadataUpdates,
                    isFirstChunk: false
                  },
              });
              
              lastProcessedMessage = message;
           }
        },
        onFinish: ({ message, finishReason, usage }) => {
          if (streamAborted) return;
          logger.info('[IPC Handler -> FINISH]', {
            messageId: message?.id,
            finishReason,
            usage,
          });
          
          // Send the finish event to the renderer
          event.sender.send(ChatEvents.CHAT_STREAM_FINISH, {
            success: true,
            data: { 
              finishReason, 
              usage,
              finalMessage: message 
            }, 
          });
          
          // Update the store with the final message if available
          if (message) {
            const store = useMainStore.getState();
            
            // Include all original messages from the payload (including user messages)
            let allMessages: VinciUIMessage[] = [];
            
            // Get existing messages from store first
            const currentMessages = store.messages || [];
            
            // Start with payload messages that might not be in the store
            // These are the messages that were sent to the API
            payload.messages.forEach(m => {
              // Create a properly formatted message
              const vinciUserMessage: VinciUIMessage = {
                id: m.id || generateId(),
                role: m.role,
                content: m.content || '',
                createdAt: m.createdAt instanceof Date ? m.createdAt : 
                          (m.createdAt ? new Date(m.createdAt) : 
                          (m.created_at ? new Date(m.created_at) : new Date())),
                conversation_id: payload.conversationId || '',
                space_id: payload.spaceId,
                parts: m.parts || getMessageParts({
                  role: m.role,
                  content: m.content || ''
                }),
                annotations: m.annotations || []
              };
              
              // Only add if this message isn't already in current messages
              if (!currentMessages.some(cm => cm.id === vinciUserMessage.id)) {
                allMessages.push(vinciUserMessage);
              }
            });
            
            // Add existing messages that aren't in payload
            currentMessages.forEach(m => {
              if (!allMessages.some(am => am.id === m.id)) {
                allMessages.push(m);
              }
            });
            
            // Extract relevant data from assistant message
            const messageId = message.id || messageIdForStream || generateId();
            const messageRole = message.role || 'assistant';
            const messageContent = message.content || '';
            
            // Create a properly formatted VinciUIMessage for the assistant response
            const assistantMessage: VinciUIMessage = {
              id: messageId,
              role: messageRole as any, // Type cast to avoid strict typing issues
              content: messageContent,
              createdAt: new Date(),
              conversation_id: payload.conversationId || '',
              space_id: payload.spaceId,
              parts: message.parts || getMessageParts({
                role: messageRole,
                content: messageContent
              }),
              annotations: message.annotations as any[] || [],
            };
            
            // Find if this assistant message already exists
            const existingAssistantIndex = allMessages.findIndex(m => m.id === assistantMessage.id);
            
            if (existingAssistantIndex >= 0) {
              // Update existing message
              allMessages[existingAssistantIndex] = assistantMessage;
            } else {
              // Add new message
              allMessages.push(assistantMessage);
            }
            
            // Update the store with all messages including user and assistant
            logger.debug(`Updating store with ${allMessages.length} messages after stream finished`);
            useMainStore.getState().updateMessages(allMessages);
            
            // Broadcast state update to all renderers
            broadcastStateUpdate();
          }
        },
        onToolCall: ({ toolCall }) => {
          if (streamAborted) return;
          logger.info('[IPC Handler -> TOOL_CALL]', { toolCall });
          
          event.sender.send(ChatEvents.CHAT_STREAM_TOOL_CALL, {
            success: true,
            data: { toolCall },
          });
        },
        generateId: generateId,
        lastMessage: payload.messages.length > 0
            ? mapHandlerMessageToUIMessage(payload.messages[payload.messages.length - 1])
            : undefined,
      });

      return { success: true };
    } catch (error: any) {
      streamAborted = true;
      logger.error(
        `[IPC Handler: ${ChatEvents.INITIATE_CHAT_STREAM}] Error processing stream`,
        { error: error.message || error }
      );

      event.sender.send(ChatEvents.CHAT_STREAM_ERROR, {
        success: false,
        error: error.message || 'Failed to process chat stream',
      });
      return { success: false, error: error.message };
    }
  });
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