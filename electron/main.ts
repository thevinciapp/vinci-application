import { app, safeStorage } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Import utilities
import { isMac } from '@/src/utils/env-utils';

// Import core modules
import { registerIpcHandlers } from '@/src/core/ipc/ipc-handlers';
import { createMainWindow } from '@/src/core/window/window-service';
import { registerGlobalShortcuts } from '@/src/core/window/shortcuts';
import { 
  waitForServer, 
  loadAuthData, 
  refreshTokens, 
  redirectToSignIn
} from '@/src/core/auth/auth-service';

import {
  fetchInitialAppData
} from '@/src/services/app-data/app-data-service';

// Import Redux store
import { store } from '@/src/store';
import { setAppState, setAccessToken, setRefreshToken } from '@/src/store/actions';

// Check for secure storage directory
const STORAGE_DIR = join(app.getPath('userData'), 'secure');
if (!existsSync(STORAGE_DIR)) {
  mkdirSync(STORAGE_DIR, { recursive: true });
}

// Hide dock icon on macOS
if (isMac()) {
  app.dock.hide();
}

/**
 * Application initialization
 */
async function initialize() {
  try {
    // Check that server is available
    if (!await waitForServer()) {
      console.error('[ELECTRON] Server not available');
      app.quit();
      return;
    }

    // Register IPC handlers
    registerIpcHandlers();

    // Load authentication tokens
    await loadAuthData(safeStorage);
    
    // Create the main window
    const mainWindow = await createMainWindow();

    // Register global shortcuts
    registerGlobalShortcuts();

    // Check token state
    const state = store.getState();
    
    // If no auth tokens, redirect to sign-in
    if (!state.accessToken && !state.refreshToken) {
      console.log('[ELECTRON] No auth tokens available, redirecting to sign-in');
      mainWindow.loadURL('http://localhost:3000/sign-in');
    } else {
      // Try to load data with saved token
      try {
        // If we have a refresh token but no access token, try to refresh
        if (!state.accessToken && state.refreshToken) {
          console.log('[ELECTRON] No access token, attempting refresh with saved refresh token');
          const refreshed = await refreshTokens();
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
          store.dispatch(setAppState(freshData));
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
  if (!createMainWindow()) {
    createMainWindow();
  }
});