import { BrowserWindow, screen, app } from 'electron';
import { join } from 'path';
import { CommandType, CommandGroup } from '../../types';
import { APP_BASE_URL } from '../auth/auth-service';
import { CommandCenterEvents } from '../ipc/constants';
import { useStore } from '../../store';
import { sanitizeStateForIPC } from '../utils/state-utils';
import { fetchInitialAppData } from '../../services/app-data/app-data-service';

/**
 * Track windows across all command types
 * In Raycast-style UI, we create a separate window for each command type
 */
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
    // Add other groups as needed
  ];
}

function syncStateToWindow(window: BrowserWindow, commandType?: CommandType) {
  try {
    const state = useStore.getState();
    const sanitizedState = sanitizeStateForIPC(state);
    
    if (commandType === 'unified') {
      const groups = getCommandGroups(sanitizedState);
      window.webContents.send(CommandCenterEvents.SYNC_STATE, { 
        success: true, 
        data: {
          ...sanitizedState,
          isUnified: true,
          groups
        }
      });
    } else {
      window.webContents.send(CommandCenterEvents.SYNC_STATE, { 
        success: true, 
        data: {
          ...sanitizedState,
          isUnified: false
        }
      });
    }
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

export async function createCommandCenterWindow(commandType: CommandType = 'unified'): Promise<BrowserWindow | null> {
  try {
    console.log(`[ELECTRON] Creating command window for type: ${commandType}`);
    
    // Check if a window for this command type already exists
    let existingWindow = WINDOW_STATE.commandWindows.get(commandType);
    if (existingWindow?.isDestroyed() === false) {
      console.log(`[ELECTRON] Reusing existing window for command type: ${commandType}`);
      return existingWindow;
    }
    
    // Choose the appropriate window config based on command type
    const windowConfig = commandType === 'unified' ? COMMAND_CENTER_CONFIG : CONTEXT_COMMAND_CONFIG;
    
    // Create a new window for this command type
    console.log(`[ELECTRON] Creating new window for command type: ${commandType}`);
    const window = new BrowserWindow(windowConfig);
    WINDOW_STATE.commandWindows.set(commandType, window);
    
    // Configure window behavior
    window.setAlwaysOnTop(true, 'screen-saver');
    window.setVisibleOnAllWorkspaces(true);
    window.once('ready-to-show', () => centerWindowOnScreen(window));
    
    // Initialize data when window loads
    window.webContents.once('did-finish-load', async () => {
      try {
        const freshData = await fetchInitialAppData();
        if (!freshData.error) {
          useStore.getState().setAppState(freshData);
        }
        syncStateToWindow(window, commandType);
      } catch (error) {
        console.error(`[ELECTRON] Failed to initialize state for ${commandType} window:`, error);
      }
    });
    
    // Set up window behavior events
    window.on('blur', () => !WINDOW_STATE.isDialogOpen && window.hide());
    window.on('close', (event) => {
      event.preventDefault();
      window.hide();
    });
    
    // Construct and load the appropriate URL
    const url = process.env.NODE_ENV === 'development'
      ? `http://localhost:5173/#/command-center/${commandType}`
      : `file://${join(app.getAppPath(), 'out', 'renderer', 'index.html')}#/command-center/${commandType}`;
      
    console.log(`[ELECTRON] Loading URL for ${commandType} window: ${url}`);
    await window.loadURL(url);
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
  try {
    console.log(`[ELECTRON] Toggling command window for type: ${commandType}`);
    
    const window = WINDOW_STATE.commandWindows.get(commandType);
    
    if (window?.isVisible()) {
      console.log(`[ELECTRON] Hiding ${commandType} window`);
      window.hide();
      return window;
    }
    
    console.log(`[ELECTRON] Creating/showing ${commandType} window`);
    const newWindow = await createCommandCenterWindow(commandType);
    if (newWindow) {
      // Reload fresh data for this specific command type
      try {
        const freshData = await fetchInitialAppData();
        if (!freshData.error) {
          useStore.getState().setAppState(freshData);
        }
      } catch (err) {
        console.error(`[ELECTRON] Error fetching fresh data for ${commandType}:`, err);
      }
      
      syncStateToWindow(newWindow, commandType);
      newWindow.show();
      newWindow.focus();
    }
    return newWindow;
  } catch (error) {
    console.error('[ELECTRON] Error toggling command window:', error);
    return null;
  }
}

export const getMainWindow = () => WINDOW_STATE.main;
export const getCommandCenterWindow = () => WINDOW_STATE.commandWindows.get('unified');
export const getContextCommandWindow = (type: CommandType) => WINDOW_STATE.commandWindows.get(type);
export const setDialogState = (state: boolean) => WINDOW_STATE.isDialogOpen = state;
export const getDialogState = () => WINDOW_STATE.isDialogOpen;

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