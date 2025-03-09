import { app, BrowserWindow, ipcMain, globalShortcut, screen } from "electron";
import { join } from "path";
import * as fs from "fs";
import type { 
  CommandType,
  CommandCenterAction,
  CommandCenterStateData,
  ShortcutKey,
  DialogData,
  Space,
  Conversation,
  ApiResponse,
  AppState,
  AppStateResult
} from "./types";

// We'll dynamically import node-fetch
type FetchType = (url: string, init?: RequestInit) => Promise<Response>;
type RequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  credentials?: 'include' | 'omit' | 'same-origin';
};
type Response = {
  ok: boolean;
  status: number;
  json(): Promise<any>;
  text(): Promise<string>;
};

let fetchModule: FetchType | null = null;

// Global variables
let mainWindow: BrowserWindow | null = null;
let commandCenterWindow: BrowserWindow | null = null;
let isDialogOpen = false; 

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

  // No need to fetch data again, just use the existing appState
  commandCenterWindow.loadURL("http://localhost:3000/command-center");
  
  // Send the current app state to the command center when it's ready
  commandCenterWindow.webContents.once('did-finish-load', () => {
    if (!commandCenterWindow || commandCenterWindow.isDestroyed()) return;
    console.log('[ELECTRON] Sending app state to command center');
    commandCenterWindow.webContents.send('init-app-state', appState);
  });

  // Modified blur handler: only hide if no dialog is open
  commandCenterWindow.on("blur", () => {
    if (commandCenterWindow && !isDialogOpen) {
      commandCenterWindow.hide();
      BrowserWindow.getAllWindows().forEach((window) => {
        if (!window.isDestroyed()) {
          window.webContents.send("sync-command-center-state", 'close' as const);
        }
      });
    }
  });

  commandCenterWindow.on("close", (event) => {
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      event.preventDefault();
      commandCenterWindow.hide();
      BrowserWindow.getAllWindows().forEach((window) => {
        if (!window.isDestroyed()) {
          window.webContents.send("sync-command-center-state", 'close' as const);
        }
      });
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
  
  // Load the main app URL
  mainWindow.loadURL("http://localhost:3000");
  
  // Send the initial app state to the renderer when it's ready
  mainWindow.webContents.once('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('[ELECTRON] Sending initial app state to main window');
      mainWindow.webContents.send('init-app-state', appState);
    }
  });
  
  // Handle window close
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

  (Object.entries(commandTypeShortcuts) as [ShortcutKey, CommandType | null][]).forEach(([shortcut, commandType]) => {
    globalShortcut.register(shortcut, () => {
      console.log(`${shortcut} pressed - ${commandType || "general toggle"}`);
      if (commandCenterWindow && !commandCenterWindow.isDestroyed() && commandCenterWindow.isVisible()) {
        if (commandType) {
          BrowserWindow.getAllWindows().forEach((window) => {
            if (!window.isDestroyed()) {
              window.webContents.send("check-command-type", commandType);
            }
          });
          setTimeout(() => {
            if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
              commandCenterWindow.hide();
              BrowserWindow.getAllWindows().forEach((window) => {
                if (!window.isDestroyed()) {
                  window.webContents.send("sync-command-center-state", 'close' as const);
                }
              });
            }
          }, 50);
        } else {
          toggleCommandCenterWindow();
        }
      } else {
        // Call async function
        createCommandCenterWindow().then(() => {
          setTimeout(() => {
            if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
              if (commandType) {
                commandCenterWindow.webContents.send("set-command-type", commandType);
                BrowserWindow.getAllWindows().forEach((window) => {
                  if (!window.isDestroyed() && commandCenterWindow && window.webContents.id !== commandCenterWindow.webContents.id) {
                    window.webContents.send("sync-command-center-state", 'open' as const, commandType);
                  }
                });
              }
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
  if (commandCenterWindow && !commandCenterWindow.isDestroyed() && commandCenterWindow.isVisible()) {
    commandCenterWindow.hide();
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send("sync-command-center-state", "close");
      }
    });
  } else {
    await createCommandCenterWindow();
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send("sync-command-center-state", "open");
      }
    });
  }
}

// Types for IPC events
type IpcMainEventHandler = Electron.IpcMainEvent;
type IpcMainInvokeHandler = Electron.IpcMainInvokeEvent;

// IPC Handlers for Command Center
ipcMain.on("close-command-center", (event: IpcMainEventHandler) => {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.hide();
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send("sync-command-center-state", "close");
      }
    });
  }
});

// IPC Handlers for Dialogs
ipcMain.on("open-dialog", (event: IpcMainEventHandler, dialogType: string, data: DialogData) => {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.show();
    commandCenterWindow.webContents.send("open-dialog", dialogType, data);
  } else {
    createCommandCenterWindow().then(() => {
      setTimeout(() => {
        if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
          commandCenterWindow.webContents.send("open-dialog", dialogType, data);
        }
      }, 100);
    });
  }
});

ipcMain.on("dialog-opened", (event: IpcMainEventHandler) => {
  isDialogOpen = true;
});

ipcMain.on("dialog-closed", (event: IpcMainEventHandler) => {
  isDialogOpen = false;
  if (commandCenterWindow && !commandCenterWindow.isDestroyed() && !commandCenterWindow.isFocused()) {
    commandCenterWindow.hide();
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send("sync-command-center-state", "close");
      }
    });
  }
});

// Existing IPC Handlers
ipcMain.on("show-command-center", (event: IpcMainEventHandler) => 
  createCommandCenterWindow().catch(err => console.error('Error showing command center:', err)));
ipcMain.on("close-command-center", () => {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) commandCenterWindow.hide();
});
ipcMain.on("toggle-command-center", (event: IpcMainEventHandler) => toggleCommandCenterWindow());
ipcMain.on("set-command-type", (event: IpcMainEventHandler, commandType: CommandType) => {
  createCommandCenterWindow().then(() => {
    setTimeout(() => {
      if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
        commandCenterWindow.webContents.send("set-command-type", commandType);
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("set-command-type", commandType);
      }
    }, 100);
  }).catch(err => console.error('Error opening command center with type:', commandType, err));
});
ipcMain.on("refresh-command-center", async (event: IpcMainEventHandler) => {
  try {
    // Refresh the app data first
    await refreshAppData();
    
    // Then notify windows that command center should refresh
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      commandCenterWindow.webContents.send("refresh-command-center");
      commandCenterWindow.webContents.send("app-data-updated", appState);
    }
    
    // Also notify the main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("app-data-updated", appState);
    }
  } catch (error) {
    console.error('[ELECTRON] Error refreshing command center:', error);
  }
});

ipcMain.on("sync-command-center-state", (event: IpcMainEventHandler, action: CommandCenterAction, commandType?: CommandType) => {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (window.webContents.id !== event.sender.id && !window.isDestroyed()) {
      window.webContents.send("sync-command-center-state", action, commandType);
    }
  });
});
ipcMain.on("command-type-check", (event: IpcMainEventHandler, commandType: CommandType) => {
  if (
    commandCenterWindow &&
    !commandCenterWindow.isDestroyed() &&
    event.sender.id === commandCenterWindow.webContents.id
  ) {
    commandCenterWindow.hide();
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send("sync-command-center-state", "close");
      }
    });
  }
});

// App lifecycle
let appState: AppState = {
  spaces: [],
  activeSpace: null,
  conversations: [],
  initialDataLoaded: false,
  lastFetched: null
};

// Helper function to check if server is available
async function checkServerAvailable(): Promise<boolean> {
  if (!fetchModule) {
    const module = await import('node-fetch');
    fetchModule = module.default;
  }
  try {
    const response = await fetchModule('http://localhost:8000/api/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Helper function to wait for server with timeout
async function waitForServer(maxAttempts: number = 10, delayMs: number = 1000): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`[ELECTRON] Checking server availability (attempt ${attempt + 1}/${maxAttempts})...`);
    if (await checkServerAvailable()) {
      console.log('[ELECTRON] Server is available');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  console.error('[ELECTRON] Server not available after maximum attempts');
  return false;
}

// Function to fetch initial data for app startup
// Define a return type for our data fetching functions
async function fetchInitialAppData(): Promise<AppStateResult> {
  if (!fetchModule) {
    const module = await import('node-fetch');
    fetchModule = module.default;
  }
  
  // Check server availability first
  if (!await checkServerAvailable()) {
    console.error('[ELECTRON] Server not available during data fetch');
    return {
      spaces: [],
      activeSpace: null,
      conversations: [],
      initialDataLoaded: false,
      error: 'Server not available. Please ensure the Next.js server is running.',
      lastFetched: Date.now()
    };
  }
  try {
    console.log('[ELECTRON] Fetching initial application data...');
    
    // For a real implementation, we would need to make fetch requests to the Next.js server
    // to get spaces, active space, and conversations from Supabase
    
    // Example implementation with actual HTTP requests:
    try {
      // Fetch spaces
      const spacesResponse = await fetchModule('http://localhost:8000/api/spaces', {
        credentials: 'include' // Important to include cookies for auth
      });
      
      let spaces: Space[] = [];
      let activeSpace: Space | null = null;
      let conversations: Conversation[] = [];
      
      if (spacesResponse.ok) {
        const rawSpacesData = await spacesResponse.json();
        const spacesData = rawSpacesData as ApiResponse<Space[]>;
        spaces = spacesData.status === 'success' ? spacesData.data || [] : [];
        
        // Fetch active space
        const activeSpaceResponse = await fetchModule('http://localhost:8000/api/active-space', {
          credentials: 'include'
        });
        
        if (activeSpaceResponse.ok) {
          const rawActiveSpaceData = await activeSpaceResponse.json();
          const activeSpaceData = rawActiveSpaceData as ApiResponse<{ activeSpace: Space }>;
          activeSpace = activeSpaceData.status === 'success' && activeSpaceData.data ? activeSpaceData.data.activeSpace : null;
          
          // If we have an active space, fetch its conversations
          if (activeSpace?.id) {
            const conversationsResponse = await fetchModule(`http://localhost:8000/api/spaces/${activeSpace.id}/conversations`, {
              credentials: 'include'
            });
            
            if (conversationsResponse.ok) {
              const rawConversationsData = await conversationsResponse.json();
              const conversationsData = rawConversationsData as ApiResponse<Conversation[]>;
              conversations = conversationsData.status === 'success' ? conversationsData.data || [] : [];
            }
          }
        }
      }
      
      // Set the app state
      appState = {
        spaces: spaces || [],
        activeSpace: activeSpace,
        conversations: conversations || [],
        initialDataLoaded: true,
        lastFetched: Date.now()
      };
    } catch (fetchError) {
      const error = fetchError instanceof Error ? fetchError : new Error('Unknown fetch error');
      console.error('[ELECTRON] Error fetching from API:', error);
      console.log('[ELECTRON] Using empty initial state due to fetch error');
      
      // Fallback to empty state
      appState = {
        spaces: [],
        activeSpace: null,
        conversations: [],
        initialDataLoaded: true,
        lastFetched: Date.now()
      };
    }
    
    console.log('[ELECTRON] Initial data loaded successfully:', {
      spacesCount: appState.spaces?.length || 0,
      hasActiveSpace: !!appState.activeSpace,
      conversationsCount: appState.conversations?.length || 0
    });
    
    return appState;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error('[ELECTRON] Error fetching initial app data:', err);
    return { 
      spaces: [],
      activeSpace: null,
      conversations: [],
      initialDataLoaded: false, 
      error: err.message,
      lastFetched: Date.now()
    };
  }
}

// Function to refresh app data - can be called when updates are needed
async function refreshAppData(): Promise<AppStateResult> {
  if (!fetchModule) {
    const module = await import('node-fetch');
    fetchModule = module.default;
  }
  
  // Check server availability first
  if (!await checkServerAvailable()) {
    console.error('[ELECTRON] Server not available during refresh');
    return {
      ...appState,
      error: 'Server not available. Please ensure the Next.js server is running.',
      lastFetched: Date.now()
    };
  }
  try {
    console.log('[ELECTRON] Refreshing application data...');
    
    // Use the same approach as in fetchInitialAppData
    // but keep old data if new fetching fails
    const oldState = { ...appState };
    
    try {
      // Fetch spaces
      const spacesResponse = await fetchModule('http://localhost:8000/api/spaces', {
        credentials: 'include'
      });
      
      let spaces = oldState.spaces || [];
      let activeSpace = oldState.activeSpace;
      let conversations = oldState.conversations || [];
      
      if (spacesResponse.ok) {
        const rawSpacesData = await spacesResponse.json();
        const spacesData = rawSpacesData as ApiResponse<Space[]>;
        spaces = spacesData.status === 'success' ? spacesData.data || spaces : spaces;
        
        // Fetch active space
        const activeSpaceResponse = await fetchModule('http://localhost:8000/api/active-space', {
          credentials: 'include'
        });
        
        if (activeSpaceResponse.ok) {
          const rawActiveSpaceData = await activeSpaceResponse.json();
          const activeSpaceData = rawActiveSpaceData as ApiResponse<{ activeSpace: Space }>;
          activeSpace = activeSpaceData.status === 'success' && activeSpaceData.data ? activeSpaceData.data.activeSpace || activeSpace : activeSpace;
          
          // If active space changed or we need fresh conversations for current space
          if (activeSpace?.id) {
            if (activeSpace.id !== oldState.activeSpace?.id || !conversations.length) {
              // Fetch conversations for the active space
              const conversationsResponse = await fetchModule(`http://localhost:8000/api/spaces/${activeSpace.id}/conversations`, {
                credentials: 'include'
              });
              
              if (conversationsResponse.ok) {
                const rawConversationsData = await conversationsResponse.json();
                const conversationsData = rawConversationsData as ApiResponse<Conversation[]>;
                conversations = conversationsData.status === 'success' ? conversationsData.data || conversations : conversations;
              }
            }
          }
        }
      }
      
      // Update app state with the new data
      appState = {
        spaces: spaces || [],
        activeSpace: activeSpace,
        conversations: conversations || [],
        initialDataLoaded: true,
        lastFetched: Date.now()
      };
    } catch (fetchError) {
      const error = fetchError instanceof Error ? fetchError : new Error('Unknown fetch error');
      console.error('[ELECTRON] Error refreshing data from API:', error);
      console.log('[ELECTRON] Keeping old state due to refresh error');
      
      // Just update the timestamp but keep old data
      appState = {
        ...oldState,
        lastFetched: Date.now()
      };
    }
    
    // Broadcast data update to all windows
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('app-data-updated', appState);
      }
    });
    
    console.log('[ELECTRON] Data refreshed successfully:', {
      spacesCount: appState.spaces?.length || 0,
      hasActiveSpace: !!appState.activeSpace,
      conversationsCount: appState.conversations?.length || 0
    });
    
    return appState;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error('[ELECTRON] Error in refresh app data:', err);
    // Keep existing spaces and conversations but update the error status
    return { 
      spaces: appState.spaces,
      activeSpace: appState.activeSpace,
      conversations: appState.conversations,
      initialDataLoaded: false,
      lastFetched: Date.now(),
      error: err.message
    };
  }
}

// Start the app and fetch initial data before creating windows
app.whenReady().then(async () => {
  if (process.platform !== "darwin") {
    app.quit();
    return;
  }
  
  try {
    console.log('[ELECTRON] Starting application...');
    // Wait for server to be available before proceeding
    const serverAvailable = await waitForServer();
    if (!serverAvailable) {
      console.error('[ELECTRON] Could not connect to server. Please ensure the Next.js server is running.');
      app.quit();
      return;
    }
    
    // Fetch initial data before creating any windows
    await fetchInitialAppData();
    
    // Register IPC handlers for data operations
    ipcMain.handle('refresh-app-data', async (event: IpcMainInvokeHandler) => {
      return await refreshAppData();
    });
    
    ipcMain.handle('get-app-state', (event: IpcMainInvokeHandler) => {
      return appState;
    });
    
    // Set up IPC handler for state sync between windows
    ipcMain.on('sync-app-state', (event: IpcMainEventHandler, newState: Partial<AppState>) => {
      // Update the global app state
      appState = {
        ...appState,
        ...newState,
        lastFetched: Date.now()
      };
      
      // Broadcast to all other windows
      BrowserWindow.getAllWindows().forEach(window => {
        if (!window.isDestroyed() && window.webContents.id !== event.sender.id) {
          window.webContents.send('app-data-updated', appState);
        }
      });
    });
    
    // Now we can create windows with data already loaded
    registerGlobalShortcuts();
    createWindow();
  } catch (error) {
    console.error('[ELECTRON] Error during startup:', error);
    // Still create the window even if data fetching fails
    registerGlobalShortcuts();
    createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});