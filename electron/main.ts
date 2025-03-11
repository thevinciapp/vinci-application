import { app, BrowserWindow, ipcMain, globalShortcut, screen, safeStorage } from "electron";
import { join } from "path";
import { writeFile, readFile, unlink, mkdirSync } from 'fs';
import { existsSync } from 'fs';
import { API } from "../lib/api-client";

// API base URL
const API_BASE_URL = 'http://localhost:3000';

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

// Storage configuration
const STORAGE_DIR = join(app.getPath('userData'), 'secure');
const STORAGE_TOKEN_PATH = join(STORAGE_DIR, 'auth_token.enc');

// Ensure storage directory exists at startup
if (!existsSync(STORAGE_DIR)) {
  mkdirSync(STORAGE_DIR, { recursive: true });
}

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
        commandCenterWindow.webContents.executeJavaScript('window.currentCommandType').then((currentType: string | null) => {
          if (commandType && commandType !== currentType) {
            console.log(`[ELECTRON] Switching command type from ${currentType} to ${commandType}`);
            commandCenterWindow?.webContents.send("set-command-type", commandType);
            commandCenterWindow?.focus();
          } else {
            console.log(`[ELECTRON] Closing command center (same type: ${commandType})`);
            commandCenterWindow?.hide();
            broadcastAppState();
          }
        }).catch((error) => {
          console.error('[ELECTRON] Error getting current command type:', error);
          if (commandType) {
            console.log(`[ELECTRON] Setting command type to ${commandType} after error`);
            commandCenterWindow?.webContents.send("set-command-type", commandType);
            commandCenterWindow?.focus();
          } else {
            console.log('[ELECTRON] Closing command center after error');
            commandCenterWindow?.hide();
            broadcastAppState();
          }
        });
      } else {
        createCommandCenterWindow().then(() => {
          if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
            console.log(`[ELECTRON] Opening command center with type: ${commandType || 'default'}`);
            if (commandType) {
              commandCenterWindow.webContents.send("set-command-type", commandType);
            }
            commandCenterWindow.show();
            commandCenterWindow.focus();
            commandCenterWindow.webContents.send('init-app-state', appState);
          }
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
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      console.log('[ELECTRON] Sending app state to command center on toggle');
      commandCenterWindow.webContents.send('init-app-state', appState);
    }
  }
  broadcastAppState();
}

/**
 * Auth management with safeStorage
 */
async function saveAuthData(token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available');
      }

      console.log('[ELECTRON] Saving auth token...');
      const encryptedToken = safeStorage.encryptString(token);

      writeFile(STORAGE_TOKEN_PATH, encryptedToken, (err) => {
        if (err) {
          console.error('[ELECTRON] Failed to write token file:', err);
          reject(err);
          return;
        }
        console.log('[ELECTRON] Token file written successfully');
        console.log('[ELECTRON] Auth token encrypted and saved');
        resolve();
      });
    } catch (error) {
      console.error('[ELECTRON] Failed to save auth token:', error);
      reject(error);
    }
  });
}

async function loadAuthData(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('[ELECTRON] Encryption not available during load');
      resolve(null);
      return;
    }

    console.log('[ELECTRON] Loading auth token...');
    readFile(STORAGE_TOKEN_PATH, (err, encryptedToken) => {
      if (err) {
        console.log('[ELECTRON] No token file found or error reading:', err);
        resolve(null);
        return;
      }
      try {
        const token = safeStorage.decryptString(encryptedToken);
        console.log('[ELECTRON] Auth token loaded successfully');
        resolve(token);
      } catch (decryptError) {
        console.error('[ELECTRON] Failed to decrypt auth token:', decryptError);
        resolve(null);
      }
    });
  });
}

async function deleteAuthData(): Promise<boolean> {
  return new Promise((resolve) => {
    unlink(STORAGE_TOKEN_PATH, (err) => {
      if (err) {
        console.error('[ELECTRON] Failed to delete auth token file:', err);
        resolve(false);
      } else {
        console.log('[ELECTRON] Auth token deleted');
        resolve(true);
      }
    });
  });
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

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
    'Content-Type': 'application/json',
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
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
    
    if (!authToken) {
      console.log('[ELECTRON] No auth token available, deferring data fetch');
      return {
        ...initialAppState,
        error: 'Authentication required',
        lastFetched: Date.now()
      };
    }

    const spacesResponse = await fetchWithAuth(`${API_BASE_URL}/api/spaces`);
    const spacesData = await spacesResponse.json();
    
    if (spacesData.status !== 'success') {
      throw new Error(spacesData.error || 'Failed to fetch spaces');
    }
    
    const spacesResult = {
      success: true,
      data: spacesData.data
    };
    
    const activeSpaceResponse = await fetchWithAuth(`${API_BASE_URL}/api/active-space`);
    const activeSpaceData = await activeSpaceResponse.json();
    
    if (activeSpaceData.status !== 'success') {
      throw new Error(activeSpaceData.error || 'Failed to fetch active space');
    }
    
    const activeSpaceResult = {
      success: true,
      data: activeSpaceData.data
    };
    
    let conversations: Conversation[] = [];
    if (activeSpaceResult.data?.activeSpace) {
      const convResponse = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${activeSpaceResult.data.activeSpace.id}/conversations`);
      const convData = await convResponse.json();
      
      if (convData.status === 'success') {
        conversations = convData.data || [];
      }
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

ipcMain.handle('set-auth-token', async (event, token) => {
  if (!token) {
    console.error('[ELECTRON] Empty token received');
    return false;
  }
  
  authToken = token;
  console.log('[ELECTRON] Auth token received');
  
  try {
    // Add a longer delay to ensure Next.js has fully initialized
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try multiple times to validate the token
    let attempts = 0;
    let testRequest;
    
    while (attempts < 3) {
      try {
        testRequest = await fetch('http://localhost:3000/api/spaces', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (testRequest.ok) {
          break;
        }
        
        const errorText = await testRequest.text();
        console.warn(`[ELECTRON] Auth validation attempt ${attempts + 1} failed: ${testRequest.status}`, errorText);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error(`[ELECTRON] Auth validation attempt ${attempts + 1} error:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }
    
    if (!testRequest?.ok) {
      throw new Error(`Auth validation failed after ${attempts} attempts`);
    }
    
    console.log('[ELECTRON] Auth token validated successfully');
    await saveAuthData(token);
    
    try {
      const freshData = await fetchInitialAppData();
      if (!freshData.error) {
        appState = { ...freshData };
        broadcastAppState();
        console.log('[ELECTRON] Data refreshed after receiving auth token');
      }
    } catch (error) {
      console.error('[ELECTRON] Failed to refresh data after receiving auth token:', error);
    }
    
    return true;
  } catch (error) {
    console.error('[ELECTRON] Error during auth setup:', error);
    return false;
  }
});

ipcMain.handle('get-auth-token', () => authToken);

ipcMain.handle('sign-out', async () => {
  try {
    authToken = null;
    await deleteAuthData();
    appState = { ...initialAppState };
    broadcastAppState();
    console.log('[ELECTRON] User signed out successfully');
    return true;
  } catch (error) {
    console.error('[ELECTRON] Sign out failed:', error);
    return false;
  }
});

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

    const token = await loadAuthData();
    if (token) {
      authToken = token;
      console.log('[ELECTRON] Auth token loaded from storage');
      
      try {
        // Add a longer delay to ensure Next.js has fully initialized
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try multiple times to validate the token
        let attempts = 0;
        let testResponse;
        
        while (attempts < 3) {
          try {
            testResponse = await fetchWithAuth(`${API_BASE_URL}/api/spaces`);
            
            if (testResponse.ok) {
              console.log('[ELECTRON] Saved auth token is valid');
              break;
            }
            
            const errorText = await testResponse.text();
            console.warn(`[ELECTRON] Auth validation attempt ${attempts + 1} failed: ${testResponse.status}`, errorText);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          } catch (error) {
            console.error(`[ELECTRON] Auth validation attempt ${attempts + 1} error:`, error);
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }
        
        if (!testResponse?.ok) {
          console.log('[ELECTRON] Saved auth token is invalid or expired, clearing');
          authToken = null;
          await deleteAuthData();
          return;
        }
        
        // Token is valid, try to load initial data
        const freshData = await fetchInitialAppData();
        if (!freshData.error) {
          appState = { ...freshData };
          console.log('[ELECTRON] Initial data loaded with saved auth token');
        } else {
          console.log('[ELECTRON] Failed to load initial data:', freshData.error);
        }
      } catch (error) {
        console.error('[ELECTRON] Error during token validation:', error);
        authToken = null;
        await deleteAuthData();
      }
    } else {
      console.log('[ELECTRON] No saved auth token found');
    }
    
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