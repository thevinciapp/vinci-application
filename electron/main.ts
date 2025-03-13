import { app, BrowserWindow, ipcMain, globalShortcut, screen, safeStorage } from "electron";
import { join } from "path";
import { writeFile, readFile, unlink, mkdirSync } from 'fs';
import { existsSync } from 'fs';
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

const IS_MAC = process.platform==='darwin'
if (IS_MAC) {
  app.dock.hide()                                    // Hide dock icon
}

const API_BASE_URL = 'http://localhost:3001';

const STORAGE_DIR = join(app.getPath('userData'), 'secure');
const STORAGE_ACCESS_TOKEN_PATH = join(STORAGE_DIR, 'access_token.enc');
const STORAGE_REFRESH_TOKEN_PATH = join(STORAGE_DIR, 'refresh_token.enc');

if (!existsSync(STORAGE_DIR)) {
  mkdirSync(STORAGE_DIR, { recursive: true });
}

// Global variables
let mainWindow: BrowserWindow | null = null;
let commandCenterWindow: BrowserWindow | null = null;
let isDialogOpen = false;
let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiryTime: number | null = null; // Store expiry time for access token

// App state management
const initialAppState: AppState = {
  spaces: [],
  activeSpace: null,
  conversations: [],
  messages: [], // Add messages array to initial state
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

  commandCenterWindow.webContents.openDevTools();

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

  // Check auth status before loading command center
  if (!accessToken && !refreshToken) {
    commandCenterWindow.hide();
    mainWindow?.loadURL(`${API_BASE_URL}/sign-in`);
    return;
  }
  await commandCenterWindow.loadURL(`${API_BASE_URL}/command-center`);
  
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
function createWindow(): BrowserWindow {
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

  mainWindow.webContents.openDevTools();

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) mainWindow.show();
  });
  
  // Check auth status and redirect if needed
  if (!accessToken && !refreshToken) {
    mainWindow.loadURL(`${API_BASE_URL}/sign-in`);
  } else {
    mainWindow.loadURL(API_BASE_URL);
  }
  
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
  
  return mainWindow;
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

  // Track last shortcut and time for toggle behavior
  let lastUsedShortcut: string | null = null;
  let lastUsedTime = 0;
  const SHORTCUT_TOGGLE_TIMEOUT = 1500; // 1.5 seconds timeout for toggling with same shortcut

  Object.entries(commandTypeShortcuts).forEach(([shortcut, commandType]) => {
    globalShortcut.register(shortcut as ShortcutKey, () => {
      const now = Date.now();
      const isSameShortcut = shortcut === lastUsedShortcut;
      const isWithinToggleTime = (now - lastUsedTime) < SHORTCUT_TOGGLE_TIMEOUT;
      const shouldToggleOff = isSameShortcut && isWithinToggleTime;
      
      // Update tracking
      lastUsedShortcut = shortcut;
      lastUsedTime = now;

      console.log(`${shortcut} pressed - ${commandType || "general toggle"} (${shouldToggleOff ? 'toggle' : 'open/switch'})`);
      
      if (shouldToggleOff && commandCenterWindow?.isVisible()) {
        // Toggle off when same shortcut is pressed within timeout window
        console.log(`[ELECTRON] Closing command center (toggle with same shortcut: ${shortcut})`);
        commandCenterWindow.hide();
        broadcastAppState();
        return;
      }
      
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
async function saveAuthData(access: string, refresh: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available');
      }

      console.log('[ELECTRON] Saving auth tokens...');
      const encryptedAccessToken = safeStorage.encryptString(access);
      const encryptedRefreshToken = safeStorage.encryptString(refresh);

      // Save access token
      writeFile(STORAGE_ACCESS_TOKEN_PATH, encryptedAccessToken, (err) => {
        if (err) {
          console.error('[ELECTRON] Failed to write access token file:', err);
          reject(err);
          return;
        }
        
        // Save refresh token
        writeFile(STORAGE_REFRESH_TOKEN_PATH, encryptedRefreshToken, (err) => {
          if (err) {
            console.error('[ELECTRON] Failed to write refresh token file:', err);
            reject(err);
            return;
          }
          
          console.log('[ELECTRON] Auth tokens encrypted and saved');
          resolve();
        });
      });
    } catch (error) {
      console.error('[ELECTRON] Failed to save auth tokens:', error);
      reject(error);
    }
  });
}

async function loadAuthData(): Promise<{ accessToken: string | null, refreshToken: string | null }> {
  return new Promise((resolve) => {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('[ELECTRON] Encryption not available during load');
      resolve({ accessToken: null, refreshToken: null });
      return;
    }

    console.log('[ELECTRON] Loading auth tokens...');
    
    // Load access token
    readFile(STORAGE_ACCESS_TOKEN_PATH, (err, encryptedAccessToken) => {
      if (err) {
        console.log('[ELECTRON] No access token file found or error reading:', err);
        
        // Even if access token fails, try to load refresh token
        readFile(STORAGE_REFRESH_TOKEN_PATH, (err, encryptedRefreshToken) => {
          if (err) {
            console.log('[ELECTRON] No refresh token file found or error reading:', err);
            resolve({ accessToken: null, refreshToken: null });
            return;
          }
          
          try {
            const refreshToken = safeStorage.decryptString(encryptedRefreshToken);
            console.log('[ELECTRON] Refresh token loaded successfully');
            resolve({ accessToken: null, refreshToken });
          } catch (decryptError) {
            console.error('[ELECTRON] Failed to decrypt refresh token:', decryptError);
            resolve({ accessToken: null, refreshToken: null });
          }
        });
        
        return;
      }
      
      try {
        const accessToken = safeStorage.decryptString(encryptedAccessToken);
        
        // Now load refresh token
        readFile(STORAGE_REFRESH_TOKEN_PATH, (err, encryptedRefreshToken) => {
          if (err) {
            console.log('[ELECTRON] No refresh token file found or error reading:', err);
            resolve({ accessToken, refreshToken: null });
            return;
          }
          
          try {
            const refreshToken = safeStorage.decryptString(encryptedRefreshToken);
            console.log('[ELECTRON] Both tokens loaded successfully');
            resolve({ accessToken, refreshToken });
          } catch (decryptError) {
            console.error('[ELECTRON] Failed to decrypt refresh token:', decryptError);
            resolve({ accessToken, refreshToken: null });
          }
        });
      } catch (decryptError) {
        console.error('[ELECTRON] Failed to decrypt access token:', decryptError);
        
        // Try to load refresh token even if access token fails
        readFile(STORAGE_REFRESH_TOKEN_PATH, (err, encryptedRefreshToken) => {
          if (err) {
            console.log('[ELECTRON] No refresh token file found or error reading:', err);
            resolve({ accessToken: null, refreshToken: null });
            return;
          }
          
          try {
            const refreshToken = safeStorage.decryptString(encryptedRefreshToken);
            console.log('[ELECTRON] Only refresh token loaded successfully');
            resolve({ accessToken: null, refreshToken });
          } catch (decryptError) {
            console.error('[ELECTRON] Failed to decrypt refresh token:', decryptError);
            resolve({ accessToken: null, refreshToken: null });
          }
        });
      }
    });
  });
}

async function deleteAuthData(): Promise<boolean> {
  let accessDeleted = false;
  let refreshDeleted = false;
  
  return new Promise((resolve) => {
    // Delete access token
    unlink(STORAGE_ACCESS_TOKEN_PATH, (err) => {
      if (err) {
        console.error('[ELECTRON] Failed to delete access token file:', err);
      } else {
        accessDeleted = true;
        console.log('[ELECTRON] Access token deleted');
      }
      
      // Delete refresh token
      unlink(STORAGE_REFRESH_TOKEN_PATH, (err) => {
        if (err) {
          console.error('[ELECTRON] Failed to delete refresh token file:', err);
        } else {
          refreshDeleted = true;
          console.log('[ELECTRON] Refresh token deleted');
        }
        
        // Return true if at least one token was deleted
        resolve(accessDeleted || refreshDeleted);
      });
    });
  });
}

/**
 * Refresh tokens using the refresh token
 */
async function refreshTokens(): Promise<boolean> {
  if (!refreshToken) {
    console.log('[ELECTRON] No refresh token available');
    return false;
  }
  
  try {
    console.log('[ELECTRON] Attempting to refresh tokens');
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (!response.ok) {
      console.error('[ELECTRON] Token refresh failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    
    if (data.status !== 'success' || !data.data?.session?.access_token) {
      console.error('[ELECTRON] Invalid response from refresh endpoint:', data);
      return false;
    }
    
    // Update tokens
    accessToken = data.data.session.access_token;
    if (data.data.session.refresh_token) {
      refreshToken = data.data.session.refresh_token;
    }
    
    // Set expiry time to 1 hour from now
    tokenExpiryTime = Date.now() + (60 * 60 * 1000);
    
    // Save the new tokens
    await saveAuthData(accessToken, refreshToken);
    
    console.log('[ELECTRON] Tokens refreshed successfully');
    return true;
  } catch (error) {
    console.error('[ELECTRON] Error refreshing tokens:', error);
    return false;
  }
}

/**
 * Helper functions
 */
async function checkServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
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
  try {
    // Check if access token is expired
    const isTokenExpired = !tokenExpiryTime || Date.now() >= tokenExpiryTime;
    
    // If token is expired and we have a refresh token, try to refresh
    if (isTokenExpired && refreshToken) {
      const refreshed = await refreshTokens();
      if (!refreshed) {
        throw new Error('Failed to refresh authentication tokens');
      }
    }
    
    // If we still don't have a valid access token, fail
    if (!accessToken) {
      throw new Error('No authentication token available');
    }

    // Add auth header
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    
    // Make the request
    const response = await fetch(url, { ...options, headers });
    
    // If we get a 401, try to refresh the token once
    if (response.status === 401 && refreshToken) {
      console.log('[ELECTRON] Got 401, attempting token refresh');
      const refreshed = await refreshTokens();
      
      if (refreshed && accessToken) {
        // Retry the request with the new token
        headers.set('Authorization', `Bearer ${accessToken}`);
        return fetch(url, { ...options, headers });
      }
    }
    
    return response;
  } catch (error) {
    console.error('[ELECTRON] Error in fetchWithAuth:', error);
    throw error;
  }
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
    
    if (!accessToken) {
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
    let messages: any[] = [];
    
    if (activeSpaceResult.data?.activeSpace) {
      const convResponse = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${activeSpaceResult.data.activeSpace.id}/conversations`);
      const convData = await convResponse.json();
      
      if (convData.status === 'success') {
        conversations = convData.data || [];
        
        // If we have conversations, fetch messages for the most recent one
        if (conversations.length > 0) {
          const mostRecentConversation = conversations[0];
          try {
            console.log(`[ELECTRON] Fetching messages for conversation ${mostRecentConversation.id}`);
            messages = await fetchConversationMessages(mostRecentConversation.id);
            console.log(`[ELECTRON] Fetched ${messages.length} messages for conversation ${mostRecentConversation.id}`);
          } catch (error) {
            console.error('[ELECTRON] Error fetching messages for most recent conversation:', error);
          }
        }
      }
    }

    return {
      spaces: spacesResult.data || [],
      activeSpace: activeSpaceResult.data?.activeSpace || null,
      conversations,
      messages, // Include messages in the returned state
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

/**
 * Fetch conversations for a specific space
 */
async function fetchSpaceConversations(spaceId: string): Promise<Conversation[]> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}/conversations`);
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to fetch conversations');
    }
    
    return data.data || [];
  } catch (error) {
    console.error(`[ELECTRON] Error fetching conversations for space ${spaceId}:`, error);
    throw error;
  }
}

/**
 * Fetch messages for a specific conversation
 */
async function fetchConversationMessages(conversationId: string) {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${appState.activeSpace?.id}/conversations/${conversationId}/messages`);
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to fetch messages');
    }
    
    return data.data || [];
  } catch (error) {
    console.error(`[ELECTRON] Error fetching messages for conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Update a space with new data
 */
async function updateSpace(spaceId: string, spaceData: Partial<Space>): Promise<Space> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(spaceData)
    });
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to update space');
    }
    
    // Update the space in our local state
    if (appState.spaces) {
      const spaceIndex = appState.spaces.findIndex(s => s.id === spaceId);
      if (spaceIndex >= 0) {
        appState.spaces[spaceIndex] = {
          ...appState.spaces[spaceIndex],
          ...data.data
        };
        
        // If this is the active space, update that too
        if (appState.activeSpace && appState.activeSpace.id === spaceId) {
          appState.activeSpace = {
            ...appState.activeSpace,
            ...data.data
          };
        }
        
        broadcastAppState();
      }
    }
    
    return data.data;
  } catch (error) {
    console.error(`[ELECTRON] Error updating space ${spaceId}:`, error);
    throw error;
  }
}

/**
 * Update the active space model
 */
async function updateSpaceModel(spaceId: string, modelId: string, provider: string): Promise<boolean> {
  try {
    console.log(`[ELECTRON] Updating space ${spaceId} with model ID: ${modelId}, provider: ${provider}`);
    
    // Use the standard space update endpoint instead of a dedicated model endpoint
    const response = await fetchWithAuth(`${API_BASE_URL}/api/spaces/${spaceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: modelId, provider })
    });
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to update space model');
    }
    
    // Update the space in our local state
    if (appState.spaces) {
      const spaceIndex = appState.spaces.findIndex(s => s.id === spaceId);
      if (spaceIndex >= 0) {
        appState.spaces[spaceIndex] = {
          ...appState.spaces[spaceIndex],
          model: modelId,
          provider
        };
        
        // If this is the active space, update that too
        if (appState.activeSpace && appState.activeSpace.id === spaceId) {
          appState.activeSpace = {
            ...appState.activeSpace,
            model: modelId,
            provider
          };
        }
        
        broadcastAppState();
      }
    }
    
    return true;
  } catch (error) {
    console.error(`[ELECTRON] Error updating model for space ${spaceId}:`, error);
    throw error;
  }
}

/**
 * Set the active space
 */
async function setActiveSpace(spaceId: string) {
  try {
    // Validate space ID
    if (!spaceId) {
      throw new Error('Space ID is required');
    }

    console.log(`[ELECTRON] Setting active space: ${spaceId}`);
    
    const response = await fetchWithAuth(`${API_BASE_URL}/api/active-space`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ spaceId })
    });
    
    const responseText = await response.text();
    console.log(`[ELECTRON] Active space API response status: ${response.status}`);
    console.log(`[ELECTRON] Active space API response body: ${responseText}`);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[ELECTRON] Failed to parse response as JSON:', e);
      throw new Error('Invalid response from server');
    }
    
    if (data.status !== 'success') {
      console.error('[ELECTRON] API error response:', data);
      throw new Error(data.error || 'Failed to set active space');
    }
    
    // Find the space in our spaces array
    const space = appState.spaces?.find(s => s.id === spaceId);
    if (space) {
      // Update the active space in our state
      appState.activeSpace = space;
      
      // Also fetch the conversations for this space
      const conversations = await fetchSpaceConversations(spaceId);
      appState.conversations = conversations;
      
      // If we have conversations, fetch messages for the most recent one
      if (conversations.length > 0) {
        try {
          const messages = await fetchConversationMessages(conversations[0].id);
          appState.messages = messages;
        } catch (error) {
          console.error(`[ELECTRON] Error fetching messages for conversation ${conversations[0].id}:`, error);
          appState.messages = [];
        }
      } else {
        appState.messages = [];
      }
      
      broadcastAppState();
    } else {
      console.warn(`[ELECTRON] Space with ID ${spaceId} not found in app state`);
    }
    
    return data.data;
  } catch (error) {
    console.error(`[ELECTRON] Error setting active space ${spaceId}:`, error);
    throw error;
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
// App State
ipcMain.handle('get-app-state', async () => appState);

// Auth Routes
ipcMain.handle('get-session', async () => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/auth/session`);
    return await response.json();
  } catch (error) {
    console.error('Error getting session:', error);
    return { error: 'Failed to get session' };
  }
});

ipcMain.handle('sign-up', async (_, email: string, password: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return await response.json();
  } catch (error) {
    console.error('Error signing up:', error);
    return { error: 'Failed to sign up' };
  }
});

ipcMain.handle('reset-password', async (_, email: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await response.json();
  } catch (error) {
    console.error('Error resetting password:', error);
    return { error: 'Failed to reset password' };
  }
});

// Search Routes
ipcMain.handle('search-messages', async (_, query: string) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/search/messages?q=${encodeURIComponent(query)}`);
    return await response.json();
  } catch (error) {
    console.error('Error searching messages:', error);
    return { error: 'Failed to search messages' };
  }
});

// Message Routes
ipcMain.handle('send-chat-message', async (_, conversationId: string, message: string) => {
  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/spaces/${appState.activeSpace?.id}/conversations/${conversationId}/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message })
      }
    );
    return await response.json();
  } catch (error) {
    console.error('Error sending chat message:', error);
    return { error: 'Failed to send message' };
  }
});

ipcMain.handle('delete-message', async (_, conversationId: string, messageId: string) => {
  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/spaces/${appState.activeSpace?.id}/conversations/${conversationId}/messages/${messageId}`,
      { method: 'DELETE' }
    );
    return await response.json();
  } catch (error) {
    console.error('Error deleting message:', error);
    return { error: 'Failed to delete message' };
  }
});

ipcMain.handle('update-message', async (_, conversationId: string, messageId: string, content: string) => {
  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/spaces/${appState.activeSpace?.id}/conversations/${conversationId}/messages/${messageId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      }
    );
    return await response.json();
  } catch (error) {
    console.error('Error updating message:', error);
    return { error: 'Failed to update message' };
  }
});
ipcMain.handle('refresh-app-data', refreshAppData);

ipcMain.handle('set-auth-tokens', async (event, newAccessToken, newRefreshToken) => {
  if (!newAccessToken || !newRefreshToken) {
    console.error('[ELECTRON] Empty tokens received');
    return false;
  }
  
  accessToken = newAccessToken;
  refreshToken = newRefreshToken;
  tokenExpiryTime = Date.now() + (60 * 60 * 1000); // 1 hour expiry
  
  console.log('[ELECTRON] Auth tokens received');
  
  try {
    // Add a longer delay to ensure Next.js has fully initialized
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try multiple times to validate the token
    let attempts = 0;
    let testRequest;
    
    while (attempts < 3) {
      try {
        testRequest = await fetch(`${API_BASE_URL}/api/spaces`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
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
    
    console.log('[ELECTRON] Auth tokens validated successfully');
    await saveAuthData(accessToken, refreshToken);
    
    try {
      const freshData = await fetchInitialAppData();
      if (!freshData.error) {
        appState = { ...freshData };
        broadcastAppState();
        console.log('[ELECTRON] Data refreshed after receiving auth tokens');
      }
    } catch (error) {
      console.error('[ELECTRON] Failed to refresh data after receiving auth tokens:', error);
    }
    
    return true;
  } catch (error) {
    console.error('[ELECTRON] Error during auth setup:', error);
    return false;
  }
});

ipcMain.handle('get-auth-token', async () => {
  // Check if token is expired
  const isTokenExpired = !tokenExpiryTime || Date.now() >= tokenExpiryTime;
  
  // If token is valid, return it
  if (accessToken && !isTokenExpired) {
    return accessToken;
  }
  
  // If token is expired and we have a refresh token, try to refresh
  if (isTokenExpired && refreshToken) {
    const refreshed = await refreshTokens();
    if (refreshed && accessToken) {
      return accessToken;
    }
  }
  
  // If we couldn't get a valid token
  return null;
});

ipcMain.handle('refresh-auth-tokens', async () => {
  if (!refreshToken) {
    return { success: false, error: 'No refresh token available' };
  }
  
  const refreshed = await refreshTokens();
  if (refreshed && accessToken) {
    return { 
      success: true, 
      accessToken,
      expiresAt: tokenExpiryTime
    };
  }
  
  return { success: false, error: 'Failed to refresh tokens' };
});

ipcMain.handle('sign-out', async () => {
  try {
    accessToken = null;
    refreshToken = null;
    tokenExpiryTime = null;
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

ipcMain.handle('get-space-conversations', async (event, spaceId: string) => {
  try {
    const conversations = await fetchSpaceConversations(spaceId);
    
    // Update app state with the new conversations if this is the active space
    if (appState.activeSpace && appState.activeSpace.id === spaceId) {
      appState.conversations = conversations;
      broadcastAppState();
    }
    
    return { success: true, data: conversations };
  } catch (error) {
    console.error('[ELECTRON] Error in get-space-conversations handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('get-conversation-messages', async (event, conversationId: string) => {
  try {
    const messages = await fetchConversationMessages(conversationId);
    return { success: true, data: messages };
  } catch (error) {
    console.error('[ELECTRON] Error in get-conversation-messages handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('update-space', async (event, spaceId: string, spaceData: Partial<Space>) => {
  try {
    const updatedSpace = await updateSpace(spaceId, spaceData);
    return { success: true, data: updatedSpace };
  } catch (error) {
    console.error('[ELECTRON] Error in update-space handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('update-space-model', async (event, spaceId: string, modelId: string, provider: string) => {
  try {
    await updateSpaceModel(spaceId, modelId, provider);
    return { success: true };
  } catch (error) {
    console.error('[ELECTRON] Error in update-space-model handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('set-active-space', async (event, spaceId) => {
  try {
    // Log the raw input from renderer
    console.log('[ELECTRON] set-active-space handler received raw input:', spaceId);
    
    // Ensure spaceId is a string
    const spaceIdStr = String(spaceId || '').trim();
    
    // Additional validation to ensure spaceId is provided and valid
    if (!spaceIdStr) {
      console.error('[ELECTRON] Invalid space ID in set-active-space handler after conversion:', spaceIdStr);
      return { success: false, error: 'Space ID is required' };
    }
    
    console.log('[ELECTRON] set-active-space handler calling setActiveSpace with ID:', spaceIdStr);
    
    const result = await setActiveSpace(spaceIdStr);
    console.log('[ELECTRON] setActiveSpace result:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('[ELECTRON] Error in set-active-space handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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

ipcMain.on("toggle-command-center", () => {
  toggleCommandCenterWindow();
});

ipcMain.on("show-command-center", async () => {
  await createCommandCenterWindow();
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.show();
    commandCenterWindow.focus();
  }
});

ipcMain.on("close-command-center", () => {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.hide();
    broadcastAppState();
  }
});

ipcMain.on("set-command-type", (event, commandType: CommandType) => {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.webContents.send("set-command-type", commandType);
  }
});

ipcMain.on("sync-command-center-state", (event, action: CommandCenterAction, data?: any) => {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed() && window !== commandCenterWindow) {
      window.webContents.send("sync-command-center-state", action, data);
    }
  });
});

ipcMain.on("refresh-command-center", () => {
  refreshAppData().then(() => {
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      commandCenterWindow.webContents.send("refresh-command-center");
    }
  });
});

ipcMain.on("command-type-check", (event, commandType: CommandType) => {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.webContents.send("check-command-type", commandType);
  }
});

/**
 * App initialization
 */
/**
 * Initialize the application with auth checks
 */
async function initializeApp() {
  if (!await waitForServer()) {
    console.error('[ELECTRON] Server not available');
    return false;
  }

  // Load both tokens
  const { accessToken: savedAccessToken, refreshToken: savedRefreshToken } = await loadAuthData();
  
  // Set the tokens in memory
  if (savedAccessToken) {
    accessToken = savedAccessToken;
    console.log('[ELECTRON] Access token loaded from storage');
  }
  
  if (savedRefreshToken) {
    refreshToken = savedRefreshToken;
    console.log('[ELECTRON] Refresh token loaded from storage');
    
    // If we have a refresh token but no access token, try to refresh
    if (!accessToken) {
      console.log('[ELECTRON] No access token, attempting refresh with saved refresh token');
      const refreshed = await refreshTokens();
      if (!refreshed) {
        console.log('[ELECTRON] Failed to refresh tokens on startup');
        refreshToken = null;
        await deleteAuthData();
        return false;
      }
      console.log('[ELECTRON] Successfully refreshed tokens on startup');
    }
  } else if (!accessToken) {
    // No tokens at all
    console.log('[ELECTRON] No auth tokens found');
    return false;
  }

  // If we have an access token, validate it
  try {
    const response = await fetch(`${API_BASE_URL}/api/spaces`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      console.error('[ELECTRON] Token validation failed');
      accessToken = null;
      refreshToken = null;
      await deleteAuthData();
      return false;
    }
  } catch (error) {
    console.error('[ELECTRON] Error validating token:', error);
    return false;
  }

  return true;
}

app.whenReady().then(async () => {
  try {
    if (process.platform !== "darwin") {
      app.quit();
      return;
    }

    // Create the main window
    mainWindow = createWindow();

    // Initialize app and check auth
    const isAuthenticated = await initializeApp();

    if (!await waitForServer()) {
      console.error('[ELECTRON] Server not available');
      app.quit();
      return;
    }

    // Load both tokens
    const { accessToken: savedAccessToken, refreshToken: savedRefreshToken } = await loadAuthData();
    
    // Set the tokens in memory
    if (savedAccessToken) {
      accessToken = savedAccessToken;
      console.log('[ELECTRON] Access token loaded from storage');
    }
    
    if (savedRefreshToken) {
      refreshToken = savedRefreshToken;
      console.log('[ELECTRON] Refresh token loaded from storage');
      
      // If we have a refresh token but no access token, try to refresh
      if (!accessToken) {
        console.log('[ELECTRON] No access token, attempting refresh with saved refresh token');
        const refreshed = await refreshTokens();
        if (refreshed) {
          console.log('[ELECTRON] Successfully refreshed tokens on startup');
        } else {
          console.log('[ELECTRON] Failed to refresh tokens on startup');
          refreshToken = null;
          await deleteAuthData();
          // Redirect to sign-in if refresh failed
          mainWindow?.loadURL(`${API_BASE_URL}/auth/sign-in`);
          return;
        }
      }
    } else if (!accessToken) {
      // No tokens at all, redirect to sign-in
      console.log('[ELECTRON] No auth tokens found, redirecting to sign-in');
      mainWindow?.loadURL(`${API_BASE_URL}/auth/sign-in`);
      return;
    }
    
    // If we have an access token, validate it
    if (accessToken) {
      try {
        // Add a longer delay to ensure Next.js has fully initialized
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try multiple times to validate the token
        let attempts = 0;
        let testResponse;
        
        while (attempts < 3) {
          try {
            testResponse = await fetch(`${API_BASE_URL}/api/spaces`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (testResponse.ok) {
              console.log('[ELECTRON] Saved access token is valid');
              // Set expiry time to 1 hour from now as a precaution
              tokenExpiryTime = Date.now() + (60 * 60 * 1000);
              break;
            }
            
            // If we get a 401 and have a refresh token, try to refresh
            if (testResponse.status === 401 && refreshToken) {
              console.log('[ELECTRON] Access token expired, attempting refresh');
              const refreshed = await refreshTokens();
              if (refreshed) {
                console.log('[ELECTRON] Successfully refreshed tokens after validation failure');
                break;
              }
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
          console.log('[ELECTRON] Saved tokens are invalid or expired, clearing');
          accessToken = null;
          refreshToken = null;
          tokenExpiryTime = null;
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
        accessToken = null;
        refreshToken = null;
        tokenExpiryTime = null;
        await deleteAuthData();
      }
    } else {
      console.log('[ELECTRON] No saved auth tokens found');
    }
    
    registerGlobalShortcuts();
    const mainWindow = createWindow();
    
    // Redirect to sign-in if no auth tokens
    if (!accessToken && !refreshToken) {
      mainWindow.loadURL(`${API_BASE_URL}/sign-in`);
    }
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
