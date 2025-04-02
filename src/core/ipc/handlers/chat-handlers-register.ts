import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { chatHandlers } from './chat-handlers';

/**
 * Register all chat-related IPC handlers
 */
export function registerChatHandlers(): void {
  // Register each chat handler with ipcMain
  for (const [event, handler] of Object.entries(chatHandlers)) {
    ipcMain.handle(event, handler);
  }
} 