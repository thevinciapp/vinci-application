import { app, safeStorage, BrowserWindow } from 'electron';
import { join } from 'path';

// Import utilities
import { isMac } from '@/lib/utils/env-utils';

// Import core modules
import { registerIpcHandlers } from '@/core/ipc/ipc-handlers';
import { registerGlobalShortcuts } from '@/core/window/shortcuts';
import { 
  loadAuthData, 
  refreshTokens, 
  redirectToSignIn
} from '@/core/auth/auth-service';

import {
  fetchInitialAppData
} from '@/services/app-data/app-data-service';
import { useStore } from '@/store';

// Hide dock icon on macOS
if (isMac()) {
  app.dock.hide();
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  
  // Log for debugging
  console.log('[ELECTRON] Preload path:', join(__dirname, '../preload/index.js'));

  // Determine which URL to load based on environment
  // Add error handlers for better debugging
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[ELECTRON] Page failed to load:', errorDescription, '(error code:', errorCode, ')');
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[ELECTRON] Renderer process crashed or killed:', details.reason);
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.error('[ELECTRON] Renderer process has become unresponsive');
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173'); // Vite dev server port
    // Open DevTools automatically in development mode
    mainWindow.webContents.openDevTools();
    console.log('[ELECTRON] DevTools opened automatically in development mode');
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

/**
 * Application initialization
 */
async function initialize() {
  try {
    console.log('[ELECTRON] Starting application in', 
      process.env.NODE_ENV === 'development' ? 'DEVELOPMENT' : 'PRODUCTION', 
      'mode');
    console.log('[ELECTRON] Working directory:', process.cwd());
    
    registerIpcHandlers();

    await loadAuthData(safeStorage);
    
    // Create the main window
    mainWindow = createWindow();

    // Register global shortcuts
    registerGlobalShortcuts();

    // Check token state
    const store = useStore.getState();
    
    // If no auth tokens, redirect to sign-in
    if (!store.accessToken && !store.refreshToken) {
      console.log('[ELECTRON] No auth tokens available, redirecting to sign-in');
      mainWindow.loadURL(
        process.env.NODE_ENV === 'development' 
          ? 'http://localhost:5173/#/sign-in' 
          : `file://${join(__dirname, '../renderer/index.html')}#/sign-in`
      );
    } else {
      // Try to load data with saved token
      try {
        // If we have a refresh token but no access token, try to refresh
        if (!store.accessToken && store.refreshToken) {
          console.log('[ELECTRON] No access token, attempting refresh with saved refresh token');
          const refreshed = await refreshTokens(safeStorage);
          if (!refreshed) {
            console.log('[ELECTRON] Failed to refresh tokens on startup');
            await redirectToSignIn();
            return;
          }
          console.log('[ELECTRON] Successfully refreshed tokens on startup');
        }

        // Load initial app data
        const freshData = await fetchInitialAppData();
        if (!freshData.error) {
          store.setAppState(freshData);
          console.log('[ELECTRON] Initial data loaded with saved auth token');
        } else {
          console.error('[ELECTRON] Failed to load initial data:', freshData.error);
          // Check if it's an auth error
          if (freshData.error.includes('Authentication') || 
              freshData.error.includes('auth') || 
              freshData.error.includes('token')) {
            console.log('[ELECTRON] Auth error detected, redirecting to sign-in');
            await redirectToSignIn();
          }
        }
      } catch (error) {
        console.error('[ELECTRON] Error during token validation:', error);
        await redirectToSignIn();
      }
    }
  } catch (error) {
    console.error('[ELECTRON] Startup failed:', error);
    app.quit();
  }
}

/**
 * App event listeners
 */
app.whenReady().then(initialize);

app.on('window-all-closed', () => {
  if (!isMac()) {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});