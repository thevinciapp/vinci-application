import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { ChatEvents } from '@/core/ipc/constants';
import { Logger } from '@/utils/logger';
import { IpcResponse } from '@/types/ipc';
import type { Message } from '@/types/message';
import { initiateChatApiStream } from '@/services/chat/chat-service';

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
      messages: payload.messages, // API expects the original Message format
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

    try {
      logger.info(`Calling initiateChatApiStream`, {
        spaceId: requestPayload.spaceId,
        conversationId: requestPayload.conversationId,
      });
      const response = await initiateChatApiStream(requestPayload);

      if (!response.body) {
        throw new Error('No response body from API');
      }

      // Use processChatResponse from the local adapter
      await processChatResponse({
        stream: response.body,
        update: ({ message }) => {
           if (streamAborted) return;
           // Store the messageId when we first get it
           if (message.id && !messageIdForStream) {
              messageIdForStream = message.id;
           }
           
           // Extract the actual text content from the message
           // This is where we need to handle the structured content properly
           let cleanContent = "";
           
           // If message has parts, use the text parts to build the content
           if (Array.isArray(message.parts) && message.parts.length > 0) {
             const textParts = message.parts.filter(part => part.type === 'text');
             if (textParts.length > 0) {
               cleanContent = textParts.map(part => part.text).join('');
             }
           }
           
           // If we couldn't extract from parts, use content but with careful extraction
           if (!cleanContent && message.content) {
             // Use regex-based extraction to handle raw stream format
             cleanContent = extractTextFromRawStream(message.content);
           }
           
           // Calculate the delta compared to what we sent previously
           const chunk = cleanContent.substring(previousContentLength);
           previousContentLength = cleanContent.length;

           if (chunk) { 
              const idToSend = isFirstChunk ? messageIdForStream : undefined;
              logger.debug('[IPC Handler -> CHUNK]', { messageId: idToSend, chunk });
              event.sender.send(ChatEvents.CHAT_STREAM_CHUNK, {
                  success: true,
                  data: { chunk, messageId: idToSend },
              });
              if(isFirstChunk) isFirstChunk = false;
           }
           // Note: We are not sending data or annotations updates via CHUNK currently
        },
        onFinish: ({ message, finishReason, usage }) => {
          if (streamAborted) return;
          logger.info('[IPC Handler -> FINISH]', {
            messageId: message?.id,
            finishReason,
            usage,
          });
          event.sender.send(ChatEvents.CHAT_STREAM_FINISH, {
            success: true,
            data: { finishReason, usage }, 
          });
        },
        onToolCall: ({ toolCall }) => {
          if (streamAborted) return;
          logger.info('[IPC Handler -> TOOL_CALL] (Not Forwarded)', { toolCall });
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