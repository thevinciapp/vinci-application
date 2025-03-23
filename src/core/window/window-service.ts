import { BrowserWindow, screen, app } from 'electron';
import { join } from 'path';
import { CommandType, CommandGroup } from '../../types';
import { APP_BASE_URL } from '../auth/auth-service';
import { CommandCenterEvents } from '../ipc/constants';
import { useStore } from '../../store';
import { sanitizeStateForIPC } from '../utils/state-utils';
import { fetchInitialAppData } from '../../services/app-data/app-data-service';

const WINDOW_STATE = {
  main: null as BrowserWindow | null,
  commandWindows: new Map<CommandType, BrowserWindow>(),
  isDialogOpen: false
};

const COMMAND_CENTER_CONFIG = {
  width: 680,
  height: 600,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  hasShadow: false,
  skipTaskbar: true,
  show: false,
  webPreferences: {
    preload: join(app.getAppPath(), 'out', 'preload', 'index.js'),
    nodeIntegration: false,
    contextIsolation: true
  }
} as const;

const CONTEXT_COMMAND_CONFIG = {
  ...COMMAND_CENTER_CONFIG,
  width: 580,
  height: 500
} as const;

const MAIN_WINDOW_CONFIG = {
  width: 1200,
  height: 800,
  webPreferences: {
    preload: join(app.getAppPath(), 'out', 'preload', 'index.js'),
    nodeIntegration: false,
    contextIsolation: true
  }
} as const;

function getCommandGroups(state: any): CommandGroup[] {
  return [
    {
      type: 'spaces',
      title: 'Spaces',
      items: state.spaces || [],
      icon: 'SpaceIcon',
      description: 'Your workspaces'
    },
    {
      type: 'conversations',
      title: 'Conversations',
      items: state.conversations || [],
      icon: 'ChatIcon',
      description: 'Your chat history'
    },
    {
      type: 'models',
      title: 'Models',
      items: state.models || [],
      icon: 'ModelIcon',
      description: 'Available AI models'
    },
  ];
}

function syncStateToWindow(window: BrowserWindow, commandType?: CommandType) {
  try {
    const state = useStore.getState();
    const sanitizedState = sanitizeStateForIPC(state);
    
    const payload = commandType === 'unified' 
      ? { ...sanitizedState, isUnified: true, groups: getCommandGroups(sanitizedState) }
      : { ...sanitizedState, isUnified: false };

    window.webContents.send(CommandCenterEvents.SYNC_STATE, { success: true, data: payload });
  } catch (error) {
    console.error('Failed to sync state to window:', error);
    window.webContents.send(CommandCenterEvents.SYNC_STATE, { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to serialize state' 
    });
  }
}

function centerWindowOnScreen(window: BrowserWindow) {
  const { x, y, width } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const bounds = window.getBounds();
  window.setPosition(
    Math.floor(x + (width - bounds.width) / 2),
    Math.floor(y + 100)
  );
}

function configureWindowBehavior(window: BrowserWindow, commandType: CommandType) {
  window.setAlwaysOnTop(true, 'screen-saver');
  window.setVisibleOnAllWorkspaces(true);
  centerWindowOnScreen(window);
}

function setupBlurProtection(window: BrowserWindow, commandType: CommandType) {
  let lastShownTime = 0;
  let blurProtectionActive = false;

  window.on('show', () => {
    lastShownTime = Date.now();
    blurProtectionActive = true;
    setTimeout(() => blurProtectionActive = false, 500);
  });

  window.on('blur', () => {
    if (WINDOW_STATE.isDialogOpen) return;
    
    const timeSinceShown = Date.now() - lastShownTime;
    if (blurProtectionActive && timeSinceShown < 500) return;
    
    window.hide();
  });
}

function setupWindowEvents(window: BrowserWindow, commandType: CommandType) {
  window.webContents.once('did-finish-load', async () => {
    syncStateToWindow(window, commandType);
    try {
      const freshData = await fetchInitialAppData();
      useStore.getState().setAppState(freshData);
      syncStateToWindow(window, commandType);
    } catch (error) {
      console.error('Failed to fetch initial app data:', error);
    }
  });

  window.once('ready-to-show', () => {});
  window.on('close', event => {
    event.preventDefault();
    window.hide();
  });

  setupBlurProtection(window, commandType);
}

function getWindowUrl(commandType: CommandType): string {
  return process.env.NODE_ENV === 'development'
    ? `http://localhost:5173/#/command-center/${commandType}`
    : `file://${join(app.getAppPath(), 'out', 'renderer', 'index.html')}#/command-center/${commandType}`;
}

export async function createCommandCenterWindow(commandType: CommandType = 'unified'): Promise<BrowserWindow | null> {
  try {
    const existingWindow = WINDOW_STATE.commandWindows.get(commandType);
    if (existingWindow?.isDestroyed() === false) return existingWindow;

    const windowConfig = commandType === 'unified' ? COMMAND_CENTER_CONFIG : CONTEXT_COMMAND_CONFIG;
    const window = new BrowserWindow({ ...windowConfig, show: false });
    
    WINDOW_STATE.commandWindows.set(commandType, window);
    configureWindowBehavior(window, commandType);
    setupWindowEvents(window, commandType);
    
    await window.loadURL(getWindowUrl(commandType));
    return window;
  } catch (error) {
    console.error('[ELECTRON] Error creating command window:', error);
    return null;
  }
}

export async function createMainWindow() {
  WINDOW_STATE.main = new BrowserWindow(MAIN_WINDOW_CONFIG);
  const window = WINDOW_STATE.main;

  window.once('ready-to-show', () => window.show());
  window.webContents.once('did-finish-load', () => syncStateToWindow(window));
  window.on('closed', () => WINDOW_STATE.main = null);

  const url = process.env.NODE_ENV === 'development'
    ? APP_BASE_URL
    : `file://${join(app.getAppPath(), 'out', 'renderer', 'index.html')}`;
    
  await window.loadURL(url);
  return window;
}

export async function toggleCommandCenterWindow(commandType: CommandType = 'unified'): Promise<BrowserWindow | null> {
  return await createCommandCenterWindow(commandType);
}

export const getMainWindow = () => WINDOW_STATE.main;
export const getCommandCenterWindow = () => WINDOW_STATE.commandWindows.get('unified');
export const getContextCommandWindow = (type: CommandType) => WINDOW_STATE.commandWindows.get(type);
export const setDialogState = (state: boolean) => WINDOW_STATE.isDialogOpen = state;
export const getDialogState = () => WINDOW_STATE.isDialogOpen;

export const getAllVisibleCommandWindows = (): Array<[CommandType, BrowserWindow]> => {
  const visibleWindows: Array<[CommandType, BrowserWindow]> = [];
  
  Array.from(WINDOW_STATE.commandWindows.entries()).forEach(([type, window]) => {
    if (window && !window.isDestroyed() && window.isVisible()) {
      visibleWindows.push([type, window]);
    }
  });
  
  return visibleWindows;
};

export const getWindowState = () => WINDOW_STATE;

export const setCommandType = (commandType: CommandType) => {
  const window = WINDOW_STATE.commandWindows.get(commandType);
  if (window?.isDestroyed() === false) {
    window.webContents.send(CommandCenterEvents.SET_TYPE, { 
      success: true, 
      data: { 
        type: commandType, 
        isUnified: commandType === 'unified' 
      } 
    });
    window.focus();
  }
};