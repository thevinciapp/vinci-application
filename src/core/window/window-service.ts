import { BrowserWindow, screen, app } from 'electron';
import { join } from 'path';
import { CommandType } from '@/types/command';
import { APP_BASE_URL } from '../auth/auth-service';
import { CommandCenterEvents } from '../ipc/constants';
import { useMainStore } from '@/store/main';
import { sanitizeStateForIPC } from '../utils/state-utils';
import { fetchInitialAppData } from '../../services/app-data/app-data-service';
import debounce from 'lodash/debounce';

type CommandGroup = {
  type: CommandType;
  title: string;
  items: any[];
  icon: string;
  description: string;
};

const WINDOW_STATE = {
  main: null as BrowserWindow | null,
  commandWindows: new Map<CommandType, BrowserWindow>(),
  isDialogOpen: false,
  cachedState: null as any,
  lastStateUpdate: 0
};

const COMMAND_CENTER_CONFIG = {
  width: 680,
  height: 600,
  frame: false,
  transparent: false,
  backgroundColor: '#161617',
  alwaysOnTop: true,
  hasShadow: true,
  skipTaskbar: true,
  resizable: false,
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

function getCachedState() {
  const now = Date.now();
  if (!WINDOW_STATE.cachedState || now - WINDOW_STATE.lastStateUpdate > 5000) {
    const state = useMainStore.getState();
    WINDOW_STATE.cachedState = sanitizeStateForIPC(state);
    WINDOW_STATE.lastStateUpdate = now;
  }
  return WINDOW_STATE.cachedState;
}

const debouncedStateSync = debounce((window: BrowserWindow, commandType?: CommandType) => {
  try {
    const sanitizedState = getCachedState();
    const payload = commandType === 'unified' as CommandType
      ? { ...sanitizedState, isUnified: true, groups: getCommandGroups(sanitizedState) }
      : { ...sanitizedState, isUnified: false };

    if (!window.isDestroyed()) {
      window.webContents.send(CommandCenterEvents.SYNC_STATE, { success: true, data: payload });
    }
  } catch (error) {
    console.error('Failed to sync state to window:', error);
  }
}, 100);

function syncStateToWindow(window: BrowserWindow, commandType?: CommandType) {
  debouncedStateSync(window, commandType);
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
      useMainStore.getState().setAppState(freshData);
      syncStateToWindow(window, commandType);
    } catch (error) {
      console.error('Failed to fetch initial app data:', error);
    }
  });

  window.once('ready-to-show', () => {});
  
  window.on('close', event => {
    if (WINDOW_STATE.main?.isVisible()) {
      event.preventDefault();
      window.hide();
    }
  });

  setupBlurProtection(window, commandType);
}

function getWindowUrl(commandType: CommandType): string {
  return process.env.NODE_ENV === 'development'
    ? `http://localhost:5173/#/command-center/${commandType}`
    : `${APP_BASE_URL}/#/command-center/${commandType}`;
}

export async function preloadCommandWindows() {
  const commandTypes: CommandType[] = ['spaces', 'conversations', 'models'];
  
  return Promise.all(commandTypes.map(async (type) => {
    if (!WINDOW_STATE.commandWindows.has(type)) {
      const window = await createCommandCenterWindow(type);
      if (window) {
        window.hide();
      }
    }
  }));
}

export async function toggleCommandCenterWindow(commandType: CommandType): Promise<BrowserWindow | null> {
  const window = getContextCommandWindow(commandType);
  
  if (window && !window.isDestroyed()) {
    if (window.isVisible()) {
      window.hide();
    } else {
      window.show();
      window.focus();
      
      setTimeout(() => {
        if (!window.isDestroyed()) {
          syncStateToWindow(window, commandType);
        }
      }, 0);
    }
    return window;
  }

  const newWindow = await createCommandCenterWindow(commandType);
  if (newWindow) {
    newWindow.show();
    newWindow.focus();
  }
  return newWindow;
}

export function getCommandCenterWindow(): BrowserWindow | null {
    return WINDOW_STATE.commandWindows.get('spaces') || null;
}

export function getContextCommandWindow(commandType: CommandType): BrowserWindow | null {
  return WINDOW_STATE.commandWindows.get(commandType) || null;
}

export function getAllVisibleCommandWindows(): [CommandType, BrowserWindow][] {
  return Array.from(WINDOW_STATE.commandWindows.entries())
    .filter(([_, win]) => win && !win.isDestroyed() && win.isVisible());
}

export function getWindowState() {
  return WINDOW_STATE;
}

export function setDialogState(isOpen: boolean) {
  WINDOW_STATE.isDialogOpen = isOpen;
}

export function setCommandType(commandType: CommandType) {
  const window = getContextCommandWindow(commandType);
  if (window && !window.isDestroyed()) {
    window.webContents.send(CommandCenterEvents.SET_TYPE, commandType);
  }
}

export async function createCommandCenterWindow(commandType: CommandType): Promise<BrowserWindow | null> {
  try {
    const config = commandType === 'spaces' ? COMMAND_CENTER_CONFIG : CONTEXT_COMMAND_CONFIG;
    const window = new BrowserWindow({
      ...config,
      show: false,
      webPreferences: {
        ...config.webPreferences,
        backgroundThrottling: false
      }
    });
    
    WINDOW_STATE.commandWindows.set(commandType, window);
    
    window.loadURL(getWindowUrl(commandType));
    
    window.once('ready-to-show', () => {
      setTimeout(() => {
        setupWindowEvents(window, commandType);
        if (process.env.NODE_ENV === 'development') {
          window.webContents.openDevTools({ mode: 'detach' });
        }
      }, 0);
    });
    
    return window;
  } catch (error) {
    console.error('Failed to create command center window:', error);
    return null;
  }
}

export async function createMainWindow(): Promise<BrowserWindow | null> {
  try {
    const window = new BrowserWindow(MAIN_WINDOW_CONFIG);
    WINDOW_STATE.main = window;

    const url = process.env.NODE_ENV === 'development'
      ? 'http://localhost:5173'
      : APP_BASE_URL;

    await window.loadURL(url);

    window.webContents.once('did-finish-load', async () => {
      try {
        const freshData = await fetchInitialAppData();
        useMainStore.getState().setAppState(freshData);
        window.webContents.send(CommandCenterEvents.SYNC_STATE, { success: true, data: sanitizeStateForIPC(useMainStore.getState()) });
      } catch (error) {
        console.error('Failed to fetch initial app data:', error);
      }
    });

    return window;
  } catch (error) {
    console.error('Failed to create main window:', error);
    return null;
  }
}

export function getMainWindow(): BrowserWindow | null {
  return WINDOW_STATE.main;
}