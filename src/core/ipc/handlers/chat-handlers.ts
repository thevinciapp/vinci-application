import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { ChatEvents, AppStateEvents } from '@/core/ipc/constants';
import { Logger } from '@/utils/logger';
import { IpcResponse } from '@/types/ipc';
import { Message } from '@/types/message';
import { initiateChatApiStream } from '@/services/chat/chat-service';
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

export function registerChatHandlers(): void {
  ipcMain.handle(ChatEvents.INITIATE_CHAT_STREAM, async (
    event: IpcMainInvokeEvent,
    payload: ChatPayload
  ): Promise<IpcResponse> => {
    logger.info(`[IPC Handler: ${ChatEvents.INITIATE_CHAT_STREAM}] Received request`, { spaceId: payload.spaceId, conversationId: payload.conversationId });
    const { messages, spaceId, conversationId, provider, model, files, ...rest } = payload;

    const currentMessages = messages; 

    const requestPayload = {
      messages: currentMessages,
      spaceId,
      conversationId,
      provider,
      model,
      files,
      searchMode: rest.searchMode,
      chatMode: rest.chatMode,
      stream: true,
    };

    try {
      logger.info(`Calling initiateChatApiStream`, { spaceId: requestPayload.spaceId, conversationId: requestPayload.conversationId });
      const response = await initiateChatApiStream(requestPayload);

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
        const store = useMainStore.getState();
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

        const updatedMessages = [...store.messages, finalMessage];
        useMainStore.setState({ messages: updatedMessages });
        
        logger.info(`Updated main store with new message`, { conversationId, messageId: finalMessage.id });
        
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
  });
} 