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
  show: false, // Don't show until ready
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
    const window = new BrowserWindow({
      ...windowConfig,
      show: false // Keep hidden until fully loaded to prevent flashing
    });
    
    // Store the window reference
    WINDOW_STATE.commandWindows.set(commandType, window);
    
    // Configure window behavior
    window.setAlwaysOnTop(true, 'screen-saver');
    window.setVisibleOnAllWorkspaces(true);
    
    // Pre-position the window for instant appearance
    centerWindowOnScreen(window);
    
    // Initialize data when window loads
    window.webContents.once('did-finish-load', async () => {
      try {
        console.log(`[ELECTRON] Window content loaded for ${commandType}`);
        
        // First synchronize with current state for immediate feedback
        syncStateToWindow(window, commandType);
        
        // Then fetch fresh data in background to update
        fetchInitialAppData().then(freshData => {
          if (!freshData.error) {
            useStore.getState().setAppState(freshData);
            syncStateToWindow(window, commandType);
          }
        }).catch(err => {
          console.error(`[ELECTRON] Background data fetch error:`, err);
        });
      } catch (error) {
        console.error(`[ELECTRON] Failed to initialize state for ${commandType} window:`, error);
      }
    });
    
    // Only set up the ready-to-show event ONCE to prevent flashing issues
    let hasShownBefore = false;
    window.once('ready-to-show', () => {
      console.log(`[ELECTRON] Window ready to show for ${commandType}`);
      hasShownBefore = true;
      // Window will be shown by the shortcut handler, not automatically
    });
    
    // Prevent immediate blur hiding by adding a small grace period
    let lastShownTime = 0;
    let blurProtectionActive = false;
    
    // Create a listener that will prevent blur hide immediately after showing
    window.on('show', () => {
      lastShownTime = Date.now();
      blurProtectionActive = true;
      console.log(`[ELECTRON] Show protection activated for ${commandType}`);
      
      // Disable blur protection after a short delay
      setTimeout(() => {
        blurProtectionActive = false;
        console.log(`[ELECTRON] Show protection deactivated for ${commandType}`);
      }, 500);
    });
    
    // Set up window behavior events with blur protection
    window.on('blur', () => {
      if (WINDOW_STATE.isDialogOpen) {
        console.log(`[ELECTRON] Not hiding ${commandType} window on blur - dialog open`);
        return;
      }
      
      const timeSinceShown = Date.now() - lastShownTime;
      if (blurProtectionActive && timeSinceShown < 500) {
        console.log(`[ELECTRON] Not hiding ${commandType} window - too soon after showing (${timeSinceShown}ms)`);
        return;
      }
      
      console.log(`[ELECTRON] Hiding ${commandType} window on blur`);
      window.hide();
    });
    
    window.on('close', (event) => {
      event.preventDefault();
      console.log(`[ELECTRON] Preventing close of ${commandType} window`);
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

/**
 * This function is DEPRECATED - use createCommandCenterWindow instead
 * and handle the shown/hidden state explicitly in the shortcut handler
 */
export async function toggleCommandCenterWindow(commandType: CommandType = 'unified'): Promise<BrowserWindow | null> {
  try {
    // Create/get the window but DON'T modify the visible state
    return await createCommandCenterWindow(commandType);
  } catch (error) {
    console.error('[ELECTRON] Error in toggleCommandCenterWindow:', error);
    return null;
  }
}

export const getMainWindow = () => WINDOW_STATE.main;
export const getCommandCenterWindow = () => WINDOW_STATE.commandWindows.get('unified');
export const getContextCommandWindow = (type: CommandType) => WINDOW_STATE.commandWindows.get(type);
export const setDialogState = (state: boolean) => WINDOW_STATE.isDialogOpen = state;
export const getDialogState = () => WINDOW_STATE.isDialogOpen;

// Helper function to get all visible command windows
export const getAllVisibleCommandWindows = (): Array<[CommandType, BrowserWindow]> => {
  const visibleWindows: Array<[CommandType, BrowserWindow]> = [];
  
  for (const [type, window] of WINDOW_STATE.commandWindows.entries()) {
    if (window && !window.isDestroyed() && window.isVisible()) {
      visibleWindows.push([type, window]);
    }
  }
  
  return visibleWindows;
};

// Export the window state for access from other modules
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