import { app, BrowserWindow, ipcMain, globalShortcut, screen } from "electron";
import { join } from "path";
import { API } from "../lib/api-client";
import keytar from "keytar";

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

// Keytar settings
const KEYTAR_SERVICE = 'SpatialApp';
const KEYTAR_ACCOUNT = 'SpatialAuthCookies';

// Global variables
let mainWindow: BrowserWindow | null = null;
let commandCenterWindow: BrowserWindow | null = null;
let isDialogOpen = false;
let authCookies: Record<string, string> = {};
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
          // Send the current app state immediately
          if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
            console.log('[ELECTRON] Sending app state to command center on shortcut');
            commandCenterWindow.webContents.send('init-app-state', appState);
          }
          
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
    
    // Make sure we send the app state when toggling
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      console.log('[ELECTRON] Sending app state to command center on toggle');
      commandCenterWindow.webContents.send('init-app-state', appState);
    }
  }
  broadcastAppState();
}

/**
 * Auth management with keytar
 */
async function saveAuthData(cookies: Record<string, string>, token: string): Promise<void> {
  try {
    // Store auth cookies
    const cookiesJson = JSON.stringify(cookies);
    await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, cookiesJson);
    
    // Also store access token for additional operations
    await keytar.setPassword(KEYTAR_SERVICE, `${KEYTAR_ACCOUNT}_token`, token);
    
    console.log('[ELECTRON] Auth data saved to keychain');
  } catch (error) {
    console.error('[ELECTRON] Failed to save auth data to keychain:', error);
  }
}

async function loadAuthData(): Promise<{ cookies: Record<string, string>, token: string | null }> {
  try {
    const cookiesJson = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
    const token = await keytar.getPassword(KEYTAR_SERVICE, `${KEYTAR_ACCOUNT}_token`);
    
    if (cookiesJson) {
      const cookies = JSON.parse(cookiesJson) as Record<string, string>;
      return { cookies, token };
    }
    
    return { cookies: {}, token };
  } catch (error) {
    console.error('[ELECTRON] Failed to load auth data from keychain:', error);
    return { cookies: {}, token: null };
  }
}

async function deleteAuthData(): Promise<boolean> {
  try {
    await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
    await keytar.deletePassword(KEYTAR_SERVICE, `${KEYTAR_ACCOUNT}_token`);
    console.log('[ELECTRON] Auth data deleted from keychain');
    return true;
  } catch (error) {
    console.error('[ELECTRON] Failed to delete auth data from keychain:', error);
    return false;
  }
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
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
    'Content-Type': 'application/json',
  };
  
  // Add the token as a bearer token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'  // Still include credentials for extra safety
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

    // Use our custom fetchWithAuth function to ensure cookies are attached
    const spacesResponse = await fetchWithAuth(`${API_BASE_URL}/api/spaces`);
    const spacesData = await spacesResponse.json();
    
    if (spacesData.status !== 'success') {
      throw new Error(spacesData.error || 'Failed to fetch spaces');
    }
    
    const spacesResult = {
      success: true,
      data: spacesData.data
    };
    
    // Use fetchWithAuth for active space
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
      // Use fetchWithAuth for conversations
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

// Auth management
ipcMain.handle('set-auth-token', async (event, token) => {
  if (!token) {
    console.error('[ELECTRON] Empty token received');
    return false;
  }
  
  // Store token in memory
  authToken = token;
  console.log('[ELECTRON] Auth token received');
  
  try {
    // Create a simpler approach - we'll store the token and use it directly
    // in the Authorization header for future requests
    const testRequest = await fetch('http://localhost:3000/api/spaces', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Check if the token works
    if (!testRequest.ok) {
      console.error(`[ELECTRON] Auth token validation failed: ${testRequest.status}`);
      const errorText = await testRequest.text();
      console.error(`[ELECTRON] Error response: ${errorText}`);
      throw new Error(`Auth validation failed: ${testRequest.status}`);
    }
    
    // If we got here, token is valid
    console.log('[ELECTRON] Auth token validated successfully');
    
    // Just save the token to keychain - we'll use it directly in headers
    authCookies = {}; // No need for cookies with this approach
    await saveAuthData(authCookies, token);
    
    // Refresh app data immediately with the new cookies
    try {
      const freshData = await fetchInitialAppData();
      if (!freshData.error) {
        appState = { ...freshData };
        broadcastAppState();
        console.log('[ELECTRON] Data refreshed after receiving auth credentials');
      }
    } catch (error) {
      console.error('[ELECTRON] Failed to refresh data after receiving auth credentials:', error);
    }
    
    return true;
  } catch (error) {
    console.error('[ELECTRON] Error during auth setup:', error);
    return false;
  }
});

ipcMain.handle('get-auth-token', () => authToken);

// Sign out handler
ipcMain.handle('sign-out', async () => {
  try {
    // Clear auth data from memory
    authToken = null;
    authCookies = {};
    
    // Delete auth data from keychain
    await deleteAuthData();
    
    // Reset app state
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

    // Load auth data from keychain
    const { cookies, token } = await loadAuthData();
    if (Object.keys(cookies).length > 0 && token) {
      // Store in memory
      authCookies = cookies;
      authToken = token;
      console.log('[ELECTRON] Auth data loaded from keychain');
      
      // Verify the auth data is valid
      try {
        // Test request to validate cookies and token
        const testResponse = await fetchWithAuth(`${API_BASE_URL}/api/auth/session`);
        const testData = await testResponse.json();
        
        if (testData.status === 'success' && testData.data?.session) {
          console.log('[ELECTRON] Saved auth data is valid');
          
          // Attempt to fetch initial data with the loaded cookies
          try {
            const freshData = await fetchInitialAppData();
            if (!freshData.error) {
              appState = { ...freshData };
              console.log('[ELECTRON] Initial data loaded with saved auth data');
            } else {
              console.log('[ELECTRON] Failed to load initial data:', freshData.error);
              // Keep auth data, may just be a temporary issue
            }
          } catch (error) {
            console.error('[ELECTRON] Failed to fetch initial data with saved auth data:', error);
          }
        } else {
          console.log('[ELECTRON] Saved auth data is invalid or expired, clearing');
          // Clear invalid auth data
          authCookies = {};
          authToken = null;
          await deleteAuthData();
        }
      } catch (error) {
        console.error('[ELECTRON] Failed to validate saved auth data:', error);
        // Don't delete auth data, may just be a server connectivity issue
      }
    } else {
      console.log('[ELECTRON] No saved auth data found');
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