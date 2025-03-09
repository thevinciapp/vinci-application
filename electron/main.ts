import { app, BrowserWindow, ipcMain, globalShortcut, screen } from "electron";
import { join } from "path";
import { API } from "../lib/api-client";

import type { 
  CommandType,
  CommandCenterAction,
  ShortcutKey,
  DialogData,
  Space,
  Conversation,
  AppState,
  AppStateResult
} from "./types";

// Global variables
let mainWindow: BrowserWindow | null = null;
let commandCenterWindow: BrowserWindow | null = null;
let isDialogOpen = false;
let authToken: string | null = null;

// App state management
const initialAppState: AppState = {
  spaces: [],
  activeSpace: null,
  conversations: [],
  initialDataLoaded: false,
  lastFetched: null
};

let appState: AppState = { ...initialAppState };

// Function to broadcast app state to all windows
function broadcastAppState() {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send('app-data-updated', appState);
    }
  });
}

/**
 * Create the command center window
 */
async function createCommandCenterWindow() {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.show();
    commandCenterWindow.focus();
    return;
  }

  const preloadPath = join(__dirname, "preload.js");
  commandCenterWindow = new BrowserWindow({
    width: 680,
    height: 600,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    fullscreenable: false,
    alwaysOnTop: true,
    vibrancy: "under-window",
    visualEffectState: "active",
    skipTaskbar: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  commandCenterWindow.once("ready-to-show", () => {
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      commandCenterWindow.show();
      const { x, y, width } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
      const winBounds = commandCenterWindow.getBounds();
      commandCenterWindow.setPosition(
        Math.floor(x + (width - winBounds.width) / 2),
        Math.floor(y + 100)
      );
    }
  });

  await commandCenterWindow.loadURL("http://localhost:3000/command-center");
  
  commandCenterWindow.webContents.once('did-finish-load', async () => {
    if (!commandCenterWindow || commandCenterWindow.isDestroyed()) return;
    console.log('[ELECTRON] Sending app state to command center');
    try {
      if (!appState.initialDataLoaded) {
        const freshData = await fetchInitialAppData();
        if (!freshData.error) {
          appState = { ...freshData, initialDataLoaded: true };
        }
      }
      commandCenterWindow.webContents.send('init-app-state', appState);
    } catch (error) {
      console.error('Error sending initial app state to command center:', error);
    }
  });

  commandCenterWindow.on("blur", () => {
    if (commandCenterWindow && !isDialogOpen) {
      commandCenterWindow.hide();
      broadcastAppState();
    }
  });

  commandCenterWindow.on("close", (event) => {
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      event.preventDefault();
      commandCenterWindow.hide();
      broadcastAppState();
    }
  });
}

/**
 * Create the main application window
 */
function createWindow() {
  const preloadPath = join(__dirname, "preload.js");
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

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) mainWindow.show();
  });
  
  mainWindow.loadURL("http://localhost:3000");
  
  mainWindow.webContents.once('did-finish-load', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('[ELECTRON] Sending initial app state to main window');
      try {
        if (!appState.initialDataLoaded) {
          const freshData = await fetchInitialAppData();
          if (!freshData.error) {
            appState = { ...freshData, initialDataLoaded: true };
          }
        }
        mainWindow.webContents.send('init-app-state', appState);
      } catch (error) {
        console.error('Error sending initial app state to main window:', error);
      }
    }
  });
  
  mainWindow.on("closed", () => (mainWindow = null));
}

/**
 * Register global shortcuts
 */
function registerGlobalShortcuts() {
  const commandTypeShortcuts: Record<ShortcutKey, CommandType | null> = {
    "CommandOrControl+Option+A": null,
    "CommandOrControl+Option+S": "spaces",
    "CommandOrControl+Option+C": "conversations",
    "CommandOrControl+Option+M": "models",
    "CommandOrControl+Option+T": "backgroundTasks",
    "CommandOrControl+Option+G": "suggestions",
    "CommandOrControl+Option+H": "actions",
    "CommandOrControl+Option+Q": "chatModes",
    "CommandOrControl+Option+W": "messageSearch",
    "CommandOrControl+Option+E": "similarMessages",
  };

  Object.entries(commandTypeShortcuts).forEach(([shortcut, commandType]) => {
    globalShortcut.register(shortcut as ShortcutKey, () => {
      console.log(`${shortcut} pressed - ${commandType || "general toggle"}`);
      if (commandCenterWindow?.isVisible()) {
        if (commandType) {
          commandCenterWindow.webContents.send("set-command-type", commandType);
          setTimeout(() => commandCenterWindow?.hide(), 50);
        } else {
          toggleCommandCenterWindow();
        }
      } else {
        createCommandCenterWindow().then(() => {
          setTimeout(() => {
            if (commandType) {
              commandCenterWindow?.webContents.send("set-command-type", commandType);
            }
          }, 100);
        });
      }
    });
  });

  app.on("will-quit", () => globalShortcut.unregisterAll());
}

/**
 * Toggle command center window
 */
async function toggleCommandCenterWindow() {
  if (commandCenterWindow?.isVisible()) {
    commandCenterWindow.hide();
  } else {
    await createCommandCenterWindow();
  }
  broadcastAppState();
}

/**
 * Helper functions
 */
async function checkServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    return response.ok;
  } catch (error) {
    console.error('[ELECTRON] Server check failed:', error);
    return false;
  }
}

async function waitForServer(maxAttempts = 10, delayMs = 1000): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (await checkServerAvailable()) return true;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return false;
}

// Custom API fetch with auth token
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
  };
  
  // Add auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}

async function fetchInitialAppData(): Promise<AppStateResult> {
  try {
    if (!await checkServerAvailable()) {
      return {
        ...initialAppState,
        error: 'Server not available',
        lastFetched: Date.now()
      };
    }
    
    // Don't attempt to fetch data if no auth token is available
    if (!authToken) {
      console.log('[ELECTRON] No auth token available, deferring data fetch');
      return {
        ...initialAppState,
        error: 'Authentication required',
        lastFetched: Date.now()
      };
    }

    const spacesResult = await API.spaces.getSpaces();
    if (!spacesResult.success) throw new Error(spacesResult.error);
    
    const activeSpaceResult = await API.activeSpace.getActiveSpace();
    if (!activeSpaceResult.success) throw new Error(activeSpaceResult.error);
    
    let conversations: Conversation[] = [];
    if (activeSpaceResult.data?.activeSpace) {
      const convResult = await API.conversations.getConversations(activeSpaceResult.data.activeSpace.id);
      if (convResult.success) conversations = convResult.data || [];
    }

    return {
      spaces: spacesResult.data || [],
      activeSpace: activeSpaceResult.data?.activeSpace || null,
      conversations,
      initialDataLoaded: true,
      lastFetched: Date.now()
    };
  } catch (error) {
    console.error('[ELECTRON] Fetch initial data failed:', error);
    return {
      ...initialAppState,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastFetched: Date.now()
    };
  }
}

async function refreshAppData(): Promise<AppStateResult> {
  try {
    const freshData = await fetchInitialAppData();
    if (!freshData.error) {
      appState = { ...freshData };
      broadcastAppState();
    }
    return freshData;
  } catch (error) {
    console.error('[ELECTRON] Refresh failed:', error);
    return {
      ...appState,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastFetched: Date.now()
    };
  }
}

/**
 * IPC Handlers
 */
ipcMain.handle('get-app-state', async () => appState);
ipcMain.handle('refresh-app-data', refreshAppData);

// Auth token management
ipcMain.handle('set-auth-token', (event, token) => {
  authToken = token;
  console.log('[ELECTRON] Auth token received');
  return true;
});

ipcMain.handle('get-auth-token', () => authToken);

ipcMain.on('sync-app-state', (event, newState: Partial<AppState>) => {
  appState = { ...appState, ...newState, lastFetched: Date.now() };
  broadcastAppState();
});

ipcMain.on("open-dialog", (event, dialogType: string, data: DialogData) => {
  if (commandCenterWindow?.isVisible()) {
    commandCenterWindow.webContents.send("open-dialog", dialogType, data);
  } else {
    createCommandCenterWindow().then(() => {
      commandCenterWindow?.webContents.send("open-dialog", dialogType, data);
    });
  }
});

ipcMain.on("dialog-opened", () => { isDialogOpen = true; });
ipcMain.on("dialog-closed", () => { 
  isDialogOpen = false; 
  if (!commandCenterWindow?.isFocused()) {
    commandCenterWindow?.hide();
    broadcastAppState();
  }
});

/**
 * App initialization
 */
app.whenReady().then(async () => {
  try {
    if (process.platform !== "darwin") {
      app.quit();
      return;
    }

    if (!await waitForServer()) {
      console.error('[ELECTRON] Server not available');
      app.quit();
      return;
    }

    await fetchInitialAppData();
    registerGlobalShortcuts();
    createWindow();
  } catch (error) {
    console.error('[ELECTRON] Startup failed:', error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});