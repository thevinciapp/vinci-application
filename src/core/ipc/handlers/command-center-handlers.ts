import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { useStore } from '../../../store';
import { fetchInitialAppData } from '../../../services/app-data/app-data-service';
import { 
  getCommandCenterWindow,
  createCommandCenterWindow,
  toggleCommandCenterWindow,
  setDialogState,
  setCommandType
} from '../../windows/command-center';
import { CommandType } from '../../../types';
import { IpcResponse } from './index';
import { CommandCenterEvents } from '../constants';

interface DialogData {
  title?: string;
  message?: string;
  type?: string;
  buttons?: string[];
}

/**
 * Register command center-related IPC handlers
 */
export function registerCommandCenterHandlers(): void {
  ipcMain.on(CommandCenterEvents.OPEN_DIALOG, (_event: IpcMainInvokeEvent, dialogType: string, data: DialogData) => {
    const commandCenterWindow = getCommandCenterWindow();
    if (commandCenterWindow?.isVisible()) {
      commandCenterWindow.webContents.send(CommandCenterEvents.OPEN_DIALOG, dialogType, data);
    } else {
      createCommandCenterWindow().then(() => {
        const window = getCommandCenterWindow();
        window?.webContents.send(CommandCenterEvents.OPEN_DIALOG, dialogType, data);
      });
    }
  });

  ipcMain.on(CommandCenterEvents.DIALOG_OPENED, () => { 
    setDialogState(true);
  });
  
  ipcMain.on(CommandCenterEvents.DIALOG_CLOSED, () => { 
    setDialogState(false);
    const commandCenterWindow = getCommandCenterWindow();
    if (!commandCenterWindow?.isFocused()) {
      commandCenterWindow?.hide();
    }
  });

  ipcMain.on(CommandCenterEvents.TOGGLE, () => {
    toggleCommandCenterWindow();
  });

  ipcMain.on(CommandCenterEvents.SHOW, async () => {
    const window = await createCommandCenterWindow();
    window.show();
    window.focus();
  });

  ipcMain.on(CommandCenterEvents.CLOSE, () => {
    const commandCenterWindow = getCommandCenterWindow();
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      commandCenterWindow.hide();
    }
  });
  
  // Add a handler for closing the command center from unauthenticated state
  ipcMain.handle('close-command-center', () => {
    const commandCenterWindow = getCommandCenterWindow();
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      commandCenterWindow.hide();
    }
    return { success: true, status: 'success' };
  });

  ipcMain.on(CommandCenterEvents.SET_TYPE, (_event: IpcMainInvokeEvent, commandType: CommandType) => {
    setCommandType(commandType);
  });

  ipcMain.on(CommandCenterEvents.SYNC_STATE, (_event: IpcMainInvokeEvent, action: string, data?: any) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      const commandCenterWindow = getCommandCenterWindow();
      if (!window.isDestroyed() && window !== commandCenterWindow) {
        window.webContents.send(CommandCenterEvents.SYNC_STATE, action, data);
      }
    });
  });

  ipcMain.on(CommandCenterEvents.REFRESH, () => {
    fetchInitialAppData().then((freshData) => {
      if (!freshData.error) {
        useStore.getState().setAppState(freshData);
      }
      
      const commandCenterWindow = getCommandCenterWindow();
      if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
        commandCenterWindow.webContents.send(CommandCenterEvents.REFRESH);
      }
    });
  });

  ipcMain.on(CommandCenterEvents.CHECK_TYPE, (_event: IpcMainInvokeEvent, commandType: CommandType) => {
    const commandCenterWindow = getCommandCenterWindow();
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      commandCenterWindow.webContents.send(CommandCenterEvents.CHECK_TYPE, commandType);
    }
  });

  // Handle window resize events
  ipcMain.on(CommandCenterEvents.ON_RESIZE, (_event: IpcMainInvokeEvent, dimensions: { width: number; height: number }) => {
    const commandCenterWindow = getCommandCenterWindow();
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      commandCenterWindow.setSize(dimensions.width, dimensions.height);
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
