import { IpcMainInvokeEvent } from 'electron';
import { ChatEvents, AppStateEvents } from '@/core/ipc/constants';
import { Logger } from '@/utils/logger';
import { IpcResponse } from '@/types/ipc';
import { Message } from '@/types/message';
import { Conversation } from '@/types/conversation'; 
import { Space } from '@/types/space';
import { WorkspaceWithAuth } from '@/services/api/workspace';
import { useMainStore } from '@/store/main';
import { makeSerializable } from '@/core/utils/state-utils';

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

export const chatHandlers = {
  [ChatEvents.INITIATE_CHAT_STREAM]: async (
    event: IpcMainInvokeEvent,
    payload: ChatPayload
  ): Promise<IpcResponse> => {
    logger.info(`[IPC Handler: ${ChatEvents.INITIATE_CHAT_STREAM}] Received request`, { spaceId: payload.spaceId, conversationId: payload.conversationId });
    const { messages, spaceId, conversationId, provider, model, files, ...rest } = payload;

    const currentMessages = messages; 

    const requestBody = {
      messages: currentMessages,
      spaceId,
      conversationId,
      provider,
      model,
      files,
      stream: true, 
      ...rest,
    };

    try {
      logger.info(`Calling WorkspaceWithAuth`, { spaceId, conversationId });
      const response = await WorkspaceWithAuth.chat(requestBody);

      if (!response.body) {
        throw new Error('No response body from API');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let finalAssistantMessageContent = '';
      let finalAssistantMessageId = '';
      let isFirstChunk = true;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          finalAssistantMessageContent += chunk; 

          if (isFirstChunk) {
            isFirstChunk = false;
            finalAssistantMessageId = `assistant_${Date.now()}`;
          }
          
          event.sender.send(ChatEvents.CHAT_STREAM_CHUNK, {
            success: true,
            data: { chunk: chunk, messageId: finalAssistantMessageId }, 
          });
        }
      }

      logger.info(`Stream finished`, { conversationId });
      event.sender.send(ChatEvents.CHAT_STREAM_FINISH, { success: true });

      try {
        // Get current state from the store
        const store = useMainStore.getState();
        
        // Create the final assistant message
        const now = new Date().toISOString();
        const finalMessage: Message = {
          id: finalAssistantMessageId || `assistant_${Date.now()}`, 
          content: finalAssistantMessageContent,
          role: 'assistant',
          created_at: now,
          updated_at: now,
          conversation_id: conversationId || '',
          user_id: 'assistant_placeholder_id',
          is_deleted: false,
          annotations: [],
        };

        // Update the store's messages array with the new message
        // Based on patterns seen in other handlers
        const updatedMessages = [...store.messages, finalMessage];
        useMainStore.setState({ messages: updatedMessages });
        
        logger.info(`Updated main store with new message`, { conversationId, messageId: finalMessage.id });
        
        // Broadcast state update to all renderers
        event.sender.send(AppStateEvents.STATE_UPDATED, {
          success: true,
          data: makeSerializable(useMainStore.getState()),
        });
      } catch (storeError: any) {
        logger.error('Error updating main store after chat stream finish', { error: storeError.message || storeError });
      }

      return { success: true };
    } catch (error: any) {
      logger.error(`[IPC Handler: ${ChatEvents.INITIATE_CHAT_STREAM}] Error`, { error: error.message || error });
      event.sender.send(ChatEvents.CHAT_STREAM_ERROR, {
        success: false,
        error: error.message || 'Failed to process chat stream',
      });
      return { success: false, error: error.message };
    }
  },
}; 