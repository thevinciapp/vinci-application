import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { 
  getCommandCenterWindow,
  getContextCommandWindow,
  toggleCommandCenterWindow,
  setDialogState,
  setCommandType
} from '@/core/window/window-service';
import { CommandType } from '@/types/command';
import { CommandCenterEvents } from '@/core/ipc/constants';
import { IpcResponse } from '@/types/ipc';
interface DialogData {
  title?: string;
  message?: string;
  type?: string;
  buttons?: string[];
}

export function registerCommandCenterHandlers(): void {
  ipcMain.handle(CommandCenterEvents.TOGGLE, async (_, commandType: CommandType = 'unified') => {
    try {
      const window = await toggleCommandCenterWindow(commandType);
      return { success: true, window: window ? true : false };
    } catch (error) {
      console.error('Error toggling command center:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to toggle command center' };
    }
  });

  ipcMain.handle(CommandCenterEvents.SHOW, async (_, commandType: CommandType = 'unified') => {
    try {
      const window = await toggleCommandCenterWindow(commandType);
      if (window) {
        window.show();
        window.focus();
      }
      return { success: true };
    } catch (error) {
      console.error('Error showing command center:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to show command center' };
    }
  });

  ipcMain.handle(CommandCenterEvents.CLOSE, async (_, commandType: CommandType = 'unified') => {
    try {
      const window = await getContextCommandWindow(commandType);
      
      if (window?.isVisible()) {
        window.hide();
      }
      return { success: true };
    } catch (error) {
      console.error('Error closing command center:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to close command center' };
    }
  });

  ipcMain.handle(CommandCenterEvents.OPEN_DIALOG, async (_, dialogType: string, data: any) => {
    try {
      setDialogState(true);
      return { success: true };
    } catch (error) {
      console.error('Error opening dialog:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to open dialog' };
    }
  });

  ipcMain.handle(CommandCenterEvents.DIALOG_CLOSED, async () => {
    try {
      setDialogState(false);
      return { success: true };
    } catch (error) {
      console.error('Error closing dialog:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to close dialog' };
    }
  });

  ipcMain.handle(CommandCenterEvents.REFRESH, async (_, commandType: CommandType = 'unified') => {
    try {
      const window = await getContextCommandWindow(commandType);
        
      if (window) {
        window.reload();
      }
      return { success: true };
    } catch (error) {
      console.error('Error refreshing command center:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to refresh command center' };
    }
  });

  ipcMain.handle(CommandCenterEvents.CHECK_TYPE, async (_, commandType: CommandType) => {
    try {
      const window = await getContextCommandWindow(commandType);
      return { success: true, data: { type: commandType, exists: window ? true : false } };
    } catch (error) {
      console.error('Error checking command type:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to check command type' };
    }
  });

  ipcMain.on(CommandCenterEvents.SET_TYPE, (_event: IpcMainInvokeEvent, commandType: CommandType) => {
    setCommandType(commandType);
  });

  ipcMain.on(CommandCenterEvents.SYNC_STATE, (_event: IpcMainInvokeEvent, action: string, data?: any) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(CommandCenterEvents.SYNC_STATE, action, data);
      }
    });
  });

  // Handle window resize events
  ipcMain.on(CommandCenterEvents.ON_RESIZE, (_event: IpcMainInvokeEvent, dimensions: { width: number; height: number }, commandType?: CommandType) => {
    if (commandType) {
      const contextWindow = getContextCommandWindow(commandType);
      if (contextWindow && !contextWindow.isDestroyed()) {
        contextWindow.setSize(dimensions.width, dimensions.height);
      }
    } else {
      const commandCenterWindow = getCommandCenterWindow();
      if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
        commandCenterWindow.setSize(dimensions.width, dimensions.height);
      }
    }
  });

  // Handle file search
  ipcMain.handle(CommandCenterEvents.SEARCH_FILES, async (_event: IpcMainInvokeEvent, searchTerm: string): Promise<IpcResponse> => {
    try {
      // Implement file search logic here
      return { success: true, data: [], status: 'success' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return { success: false, error: errorMessage, status: 'error' };
    }
  });

  // Handle file reading
  ipcMain.handle(CommandCenterEvents.READ_FILE, async (_event: IpcMainInvokeEvent, filePath: string): Promise<IpcResponse> => {
    try {
      // Implement file reading logic here
      return { success: true, data: { content: '', metadata: {} }, status: 'success' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return { success: false, error: errorMessage, status: 'error' };
    }
  });

  // Test ping handler
  ipcMain.handle(CommandCenterEvents.PING, () => 'pong');
}
