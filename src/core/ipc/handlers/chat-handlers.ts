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
            const currentMessages = store.messages || [];
            
            // Extract relevant data from assistant message
            const messageId = message.id || messageIdForStream || generateId();
            const messageRole = message.role || 'assistant';
            const messageContent = message.content || '';
            
            // Create a properly formatted VinciUIMessage for the assistant response
            const assistantMessage: VinciUIMessage = {
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
            
            // Ensure we have a conversation ID before proceeding
            if (!payload.conversationId) {
              logger.warn('Cannot update messages: Conversation ID is missing');
              return;
            }
            
            // Filter out any duplicate assistant messages for this conversation
            // First, get all existing messages for this conversation
            const conversationMessages = currentMessages.filter(
              m => m.conversation_id === payload.conversationId
            );
            
            // Find any existing assistant message with this ID
            const existingAssistantIndex = conversationMessages.findIndex(
              m => m.id === assistantMessage.id
            );
            
            let updatedMessages: VinciUIMessage[];
            
            if (existingAssistantIndex >= 0) {
              // If the assistant message exists, update it in place
              updatedMessages = [...currentMessages];
              const globalIndex = currentMessages.findIndex(m => m.id === assistantMessage.id);
              if (globalIndex >= 0) {
                updatedMessages[globalIndex] = assistantMessage;
              }
            } else {
              // If the assistant message doesn't exist, add it to the array
              // But first check for any other messages with very similar content
              // that might be duplicates from different streaming sessions
              const similarAssistantMessages = conversationMessages.filter(
                m => m.role === 'assistant' && 
                     m.content.trim() === assistantMessage.content.trim() &&
                     m.id !== assistantMessage.id
              );
              
              if (similarAssistantMessages.length > 0) {
                // If there are similar assistant messages, replace the most recent one
                logger.debug('Found similar assistant message, replacing instead of adding new one');
                updatedMessages = currentMessages.map(m => 
                  m.id === similarAssistantMessages[similarAssistantMessages.length - 1].id ? assistantMessage : m
                );
              } else {
                // No similar messages, just add the new one
                updatedMessages = [...currentMessages, assistantMessage];
              }
            }
            
            // Filter out any message IDs that might appear more than once
            const seenIds = new Set<string>();
            const dedupedMessages = updatedMessages.filter(m => {
              if (seenIds.has(m.id)) {
                return false;
              }
              seenIds.add(m.id);
              return true;
            });
            
            // Update the store with all messages
            logger.debug(`Updating store with ${dedupedMessages.length} messages after stream finished`);
            useMainStore.getState().updateMessages(dedupedMessages);
            
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