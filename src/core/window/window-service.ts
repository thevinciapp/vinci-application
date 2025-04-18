import { BrowserWindow, app } from 'electron';
import { join } from 'path';
import { CommandType } from '@/features/command-palette/model/types';
import { APP_BASE_URL } from '../auth/auth-service';
import { CommandCenterEvents, AppStateEvents } from '../ipc/constants';
import { useMainStore } from '@/stores/main';
import { sanitizeStateForIPC } from '../utils/state-utils';
import { fetchInitialAppData } from '../../services/app-data/app-data-service';
import debounce from 'lodash/debounce';

type CommandGroup = {
  type: CommandType;
  title: string;
  items: unknown[];
  icon: string;
  description: string;
};

interface WindowState {
  spaces?: unknown[];
  conversations?: unknown[];
  models?: unknown[];
}

const WINDOW_STATE = {
  main: null as BrowserWindow | null,
  commandWindows: new Map<CommandType, BrowserWindow>(),
  isDialogOpen: false,
  cachedState: null as WindowState | null,
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
  fullscreenable: false,
  type: 'panel',
  webPreferences: {
    preload: join(app.getAppPath(), 'out', 'preload', 'index.js'),
    nodeIntegration: false,
    contextIsolation: true
  }
} as const;

const CONTEXT_COMMAND_CONFIG = {
  ...COMMAND_CENTER_CONFIG,
  width: 580,
  height: 500,
  fullscreenable: false,
  type: 'panel'
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

function getCommandGroups(state: WindowState): CommandGroup[] {
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





function setupBlurProtection(window: BrowserWindow) {
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
  const commandTypes: CommandType[] = ['spaces', 'conversations', 'models', 'chatModes'];
  
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
    .filter(([, win]) => win && !win.isDestroyed() && win.isVisible());
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
      fullscreenable: false,
      webPreferences: {
        ...config.webPreferences,
        backgroundThrottling: false
      }
    });
    
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    window.setAlwaysOnTop(true, 'floating', 1);
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

function broadcastStateUpdate() {
  const state = useMainStore.getState();
  const serializableState = sanitizeStateForIPC(state);
  BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
    if (window && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(AppStateEvents.STATE_UPDATED, { success: true, data: serializableState });
    }
  });
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
        console.log('[ELECTRON] Main window finished loading. Fetching initial data...');
        const freshData = await fetchInitialAppData();
        console.log('[ELECTRON] Initial data fetched, updating store...');
        useMainStore.getState().setAppState(freshData);
        console.log('[ELECTRON] Store updated, broadcasting state...');
        broadcastStateUpdate(); 
        console.log('[ELECTRON] Initial state broadcasted.');
      } catch (error) {
        console.error('Failed to fetch initial app data:', error);
      }
    });

    window.on('enter-full-screen', () => {
      getAllVisibleCommandWindows().forEach(([, win]) => {
        if (!win.isDestroyed()) {
          win.hide();
        }
      });
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