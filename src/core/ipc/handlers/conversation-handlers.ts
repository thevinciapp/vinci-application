import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { fetchConversations } from '@/src/services/conversations/conversation-service';
import { fetchMessages } from '@/src/services/messages/message-service';
import { IpcResponse } from './index';

/**
 * Register conversation-related IPC handlers
 */
export function registerConversationHandlers() {
  ipcMain.handle('get-space-conversations', async (_event: IpcMainInvokeEvent, spaceId: string): Promise<IpcResponse> => {
    try {
      const conversations = await fetchConversations(spaceId);
      return { success: true, data: conversations };
    } catch (error) {
      console.error('[ELECTRON] Error in get-space-conversations handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('get-conversation-messages', async (_event: IpcMainInvokeEvent, conversationId: string): Promise<IpcResponse> => {
    try {
      const messages = await fetchMessages(conversationId);
      return { success: true, data: messages };
    } catch (error) {
      console.error('[ELECTRON] Error in get-conversation-messages handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
