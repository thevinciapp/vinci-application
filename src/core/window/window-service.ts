import { BrowserWindow, screen, app } from 'electron';
import { join } from 'path';
import { CommandType } from '../../../electron/types';
import { APP_BASE_URL } from '../auth/auth-service';
import { CommandCenterEvents } from '../ipc/constants';
import { useStore } from '../../store';
import { sanitizeStateForIpc } from '../utils/state-utils';

// Global window references
let mainWindow: BrowserWindow | null = null;
let commandCenterWindow: BrowserWindow | null = null;
let isDialogOpen = false;

/**
 * Create the command center window
 */
export async function createCommandCenterWindow() {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    return commandCenterWindow;
  }

  const preloadPath = join(app.getAppPath(), "preload.js");
  commandCenterWindow = new BrowserWindow({
    width: 680,
    height: 600,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    fullscreenable: false,
    alwaysOnTop: true,
    hasShadow: false,
    titleBarStyle: 'customButtonsOnHover',
    titleBarOverlay: false,
    trafficLightPosition: { x: -100, y: -100 },
    vibrancy: "under-window",
    visualEffectState: "active",
    skipTaskbar: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    commandCenterWindow.webContents.openDevTools();
  }

  commandCenterWindow.setAlwaysOnTop(true, 'screen-saver');
  commandCenterWindow.setVisibleOnAllWorkspaces(true);
  app.dock.show();

  commandCenterWindow.once("ready-to-show", () => {
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      const { x, y, width } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
      const winBounds = commandCenterWindow.getBounds();
      commandCenterWindow.setPosition(
        Math.floor(x + (width - winBounds.width) / 2),
        Math.floor(y + 100)
      );
    }
  });

  // Use the correct URL format based on environment
  if (process.env.NODE_ENV === 'development') {
    await commandCenterWindow.loadURL('http://localhost:5173/#/command-center');
  } else {
    await commandCenterWindow.loadURL(`file://${join(__dirname, '../renderer/index.html')}#/command-center`);
  }
  
  commandCenterWindow.webContents.once('did-finish-load', async () => {
    if (!commandCenterWindow || commandCenterWindow.isDestroyed()) return;
    console.log('[ELECTRON] Sending app state to command center');
    try {
      const state = useStore.getState();
      // Create a sanitized copy of the state for IPC (removing non-serializable fields)
      const sanitizedState = sanitizeStateForIpc(state);
      commandCenterWindow.webContents.send(CommandCenterEvents.SYNC_STATE, { success: true, data: sanitizedState });
    } catch (error) {
      console.error('Error sending initial app state to command center:', error);
    }
  });

  commandCenterWindow.on("blur", () => {
    if (commandCenterWindow && !isDialogOpen) {
      commandCenterWindow.hide();
      // State is automatically synchronized with electron-redux
    }
  });

  commandCenterWindow.on("close", (event) => {
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      event.preventDefault();
      commandCenterWindow.hide();
      // State is automatically synchronized with electron-redux
    }
  });

  return commandCenterWindow;
}

/**
 * Create the main application window
 */
export async function createMainWindow(): Promise<BrowserWindow> {
  const preloadPath = join(app.getAppPath(), "preload.js");
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) mainWindow.show();
  });
  
  mainWindow.loadURL(APP_BASE_URL);
  
  mainWindow.webContents.once('did-finish-load', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('[ELECTRON] Sending initial app state to main window');
      try {
        const state = useStore.getState();
        // Create a sanitized copy of the state for IPC (removing non-serializable fields)
        const sanitizedState = sanitizeStateForIpc(state);
        mainWindow.webContents.send(CommandCenterEvents.SYNC_STATE, { success: true, data: sanitizedState });
      } catch (error) {
        console.error('Error sending initial app state to main window:', error);
      }
    }
  });
  
  mainWindow.on("closed", () => (mainWindow = null));
  
  return mainWindow;
}

/**
 * Toggle command center window
 */
export async function toggleCommandCenterWindow() {
  if (commandCenterWindow?.isVisible()) {
    commandCenterWindow.hide();
  } else {
    await createCommandCenterWindow();
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      console.log('[ELECTRON] Sending app state to command center on toggle');
      const state = useStore.getState();
      // Create a sanitized copy of the state for IPC (removing non-serializable fields)
      const sanitizedState = sanitizeStateForIpc(state);
      commandCenterWindow.webContents.send(CommandCenterEvents.SYNC_STATE, { success: true, data: sanitizedState });
      commandCenterWindow.show();
      commandCenterWindow.focus();
    }
  }
  // State is automatically synchronized with electron-redux
}

/**
 * Get main window
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * Get command center window
 */
export function getCommandCenterWindow(): BrowserWindow | null {
  return commandCenterWindow;
}

/**
 * Set dialog state
 */
export function setDialogState(isOpen: boolean): void {
  isDialogOpen = isOpen;
}

/**
 * Get dialog state
 */
export function getDialogState(): boolean {
  return isDialogOpen;
}

/**
 * Send command type to command center
 */
export function setCommandType(commandType: CommandType): void {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.webContents.send(CommandCenterEvents.SET_TYPE, { success: true, data: { type: commandType } });
    commandCenterWindow.focus();
  }
}