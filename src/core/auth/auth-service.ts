import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { writeFile, readFile, unlink, mkdirSync, existsSync } from 'fs';
import { AuthSession } from 'vinci-common';
import { API_BASE_URL, APP_BASE_URL } from '@/config/api';
import { useStore } from '@/store';

interface SignInResponse {
  session: AuthSession | null;
}

// Use app.getPath('userData') to get the correct user data directory
const STORAGE_DIR = join(app.getPath('userData'), 'secure');
const STORAGE_ACCESS_TOKEN_PATH = join(STORAGE_DIR, 'access_token.enc');
const STORAGE_REFRESH_TOKEN_PATH = join(STORAGE_DIR, 'refresh_token.enc');

// Ensure the secure directory exists
if (!existsSync(STORAGE_DIR)) {
  try {
    mkdirSync(STORAGE_DIR, { recursive: true });
    console.log('[ELECTRON] Created secure storage directory:', STORAGE_DIR);
  } catch (error) {
    console.error('[ELECTRON] Failed to create secure storage directory:', error);
  }
}

let tokenExpiryTime: number | null = null;

/**
 * Save authentication data securely
 */
export async function saveAuthData(access: string, refresh: string, safeStorage: Electron.SafeStorage): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available');
      }

      // Ensure the secure directory exists before writing
      if (!existsSync(STORAGE_DIR)) {
        try {
          mkdirSync(STORAGE_DIR, { recursive: true });
          console.log('[ELECTRON] Created secure storage directory:', STORAGE_DIR);
        } catch (dirError) {
          console.error('[ELECTRON] Failed to create secure storage directory:', dirError);
          reject(dirError);
          return;
        }
      }

      console.log('[ELECTRON] Saving auth tokens to:', STORAGE_DIR);
      const encryptedAccessToken = safeStorage.encryptString(access);
      const encryptedRefreshToken = safeStorage.encryptString(refresh);

      // Save access token
      writeFile(STORAGE_ACCESS_TOKEN_PATH, encryptedAccessToken, (err) => {
        if (err) {
          console.error('[ELECTRON] Failed to write access token file:', err);
          reject(err);
          return;
        }
        
        console.log('[ELECTRON] Access token saved to:', STORAGE_ACCESS_TOKEN_PATH);
        
        // Save refresh token
        writeFile(STORAGE_REFRESH_TOKEN_PATH, encryptedRefreshToken, (err) => {
          if (err) {
            console.error('[ELECTRON] Failed to write refresh token file:', err);
            reject(err);
            return;
          }
          
          console.log('[ELECTRON] Refresh token saved to:', STORAGE_REFRESH_TOKEN_PATH);
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

/**
 * Load authentication data from secure storage
 */
export async function loadAuthData(safeStorage: Electron.SafeStorage): Promise<{ accessToken: string | null, refreshToken: string | null }> {
  console.log('[ELECTRON] loadAuthData called');
  // Get current token state
  const store = useStore.getState();
  console.log('[ELECTRON] Store before loading: Access token exists:', !!store.accessToken, 'Refresh token exists:', !!store.refreshToken);
  return new Promise((resolve) => {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('[ELECTRON] Encryption not available during load');
      resolve({ accessToken: null, refreshToken: null });
      return;
    }

    // Check if the storage directory exists
    if (!existsSync(STORAGE_DIR)) {
      console.log('[ELECTRON] Secure storage directory does not exist:', STORAGE_DIR);
      resolve({ accessToken: null, refreshToken: null });
      return;
    }

    console.log('[ELECTRON] Loading auth tokens from:', STORAGE_DIR);
    
    // Check if access token file exists
    const accessTokenExists = existsSync(STORAGE_ACCESS_TOKEN_PATH);
    const refreshTokenExists = existsSync(STORAGE_REFRESH_TOKEN_PATH);
    
    if (!accessTokenExists && !refreshTokenExists) {
      console.log('[ELECTRON] No token files found in storage directory');
      resolve({ accessToken: null, refreshToken: null });
      return;
    }

    // Load access token if it exists
    if (accessTokenExists) {
      readFile(STORAGE_ACCESS_TOKEN_PATH, (err, encryptedAccessToken) => {
        if (err) {
          console.log('[ELECTRON] Error reading access token file:', err);
          
          // Even if access token fails, try to load refresh token
          if (refreshTokenExists) {
            readFile(STORAGE_REFRESH_TOKEN_PATH, (err, encryptedRefreshToken) => {
              if (err) {
                console.log('[ELECTRON] Error reading refresh token file:', err);
                resolve({ accessToken: null, refreshToken: null });
                return;
              }
              
              try {
                const refreshToken = safeStorage.decryptString(encryptedRefreshToken);
                console.log('[ELECTRON] Refresh token loaded successfully');
                store.setRefreshToken(refreshToken);
                // Check store state after setting
                console.log('[ELECTRON] Store after setting refresh token: token exists:', !!store.refreshToken);
                resolve({ accessToken: null, refreshToken });
              } catch (decryptError) {
                console.error('[ELECTRON] Failed to decrypt refresh token:', decryptError);
                resolve({ accessToken: null, refreshToken: null });
              }
            });
          } else {
            resolve({ accessToken: null, refreshToken: null });
          }
          
          return;
        }
        
        try {
          const accessToken = safeStorage.decryptString(encryptedAccessToken);
          store.setAccessToken(accessToken);
          console.log('[ELECTRON] Access token loaded successfully');
          console.log('[ELECTRON] Store after setting access token: token exists:', !!store.accessToken);
          
          // Now load refresh token if it exists
          if (refreshTokenExists) {
            readFile(STORAGE_REFRESH_TOKEN_PATH, (err, encryptedRefreshToken) => {
              if (err) {
                console.log('[ELECTRON] Error reading refresh token file:', err);
                resolve({ accessToken, refreshToken: null });
                return;
              }
              
              try {
                const refreshToken = safeStorage.decryptString(encryptedRefreshToken);
                console.log('[ELECTRON] Both tokens loaded successfully');
                store.setRefreshToken(refreshToken);
                resolve({ accessToken, refreshToken });
              } catch (decryptError) {
                console.error('[ELECTRON] Failed to decrypt refresh token:', decryptError);
                resolve({ accessToken, refreshToken: null });
              }
            });
          } else {
            resolve({ accessToken, refreshToken: null });
          }
        } catch (decryptError) {
          console.error('[ELECTRON] Failed to decrypt access token:', decryptError);
          
          // Try to load refresh token even if access token fails
          if (refreshTokenExists) {
            readFile(STORAGE_REFRESH_TOKEN_PATH, (err, encryptedRefreshToken) => {
              if (err) {
                console.log('[ELECTRON] Error reading refresh token file:', err);
                resolve({ accessToken: null, refreshToken: null });
                return;
              }
              
              try {
                const refreshToken = safeStorage.decryptString(encryptedRefreshToken);
                console.log('[ELECTRON] Only refresh token loaded successfully');
                store.setRefreshToken(refreshToken);
                resolve({ accessToken: null, refreshToken });
              } catch (decryptError) {
                console.error('[ELECTRON] Failed to decrypt refresh token:', decryptError);
                resolve({ accessToken: null, refreshToken: null });
              }
            });
          } else {
            resolve({ accessToken: null, refreshToken: null });
          }
        }
      });
    } else if (refreshTokenExists) {
      // Only refresh token exists
      readFile(STORAGE_REFRESH_TOKEN_PATH, (err, encryptedRefreshToken) => {
        if (err) {
          console.log('[ELECTRON] Error reading refresh token file:', err);
          resolve({ accessToken: null, refreshToken: null });
          return;
        }
        
        try {
          const refreshToken = safeStorage.decryptString(encryptedRefreshToken);
          console.log('[ELECTRON] Only refresh token loaded successfully');
          store.setRefreshToken(refreshToken);
          resolve({ accessToken: null, refreshToken });
        } catch (decryptError) {
          console.error('[ELECTRON] Failed to decrypt refresh token:', decryptError);
          resolve({ accessToken: null, refreshToken: null });
        }
      });
    } else {
      // This should never happen (we already checked if both don't exist)
      resolve({ accessToken: null, refreshToken: null });
    }
  });
}

/**
 * Delete authentication data
 */
export async function clearAuthData(): Promise<boolean> {
  let accessDeleted = false;
  let refreshDeleted = false;
  
  return new Promise((resolve) => {
    // Check if storage directory exists
    if (!existsSync(STORAGE_DIR)) {
      console.log('[ELECTRON] Secure storage directory does not exist:', STORAGE_DIR);
      resolve(false);
      return;
    }
    
    // Check if access token file exists
    const accessTokenExists = existsSync(STORAGE_ACCESS_TOKEN_PATH);
    const refreshTokenExists = existsSync(STORAGE_REFRESH_TOKEN_PATH);
    
    if (!accessTokenExists && !refreshTokenExists) {
      console.log('[ELECTRON] No token files found to delete');
      resolve(false);
      return;
    }
    
    // Function to delete the refresh token file
    const deleteRefreshToken = () => {
      if (!refreshTokenExists) {
        console.log('[ELECTRON] Refresh token file does not exist, nothing to delete');
        resolve(accessDeleted); // Return based on whether access token was deleted
        return;
      }
      
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
    };
    
    // Delete access token if it exists
    if (accessTokenExists) {
      unlink(STORAGE_ACCESS_TOKEN_PATH, (err) => {
        if (err) {
          console.error('[ELECTRON] Failed to delete access token file:', err);
        } else {
          accessDeleted = true;
          console.log('[ELECTRON] Access token deleted');
        }
        
        // Then delete refresh token
        deleteRefreshToken();
      });
    } else {
      // Only delete refresh token
      deleteRefreshToken();
    }
  });
}

/**
 * Redirect to sign-in page
 */
export async function redirectToSignIn(): Promise<void> {
  console.log('[ELECTRON] Redirecting to sign-in page');
  
  // Clear tokens in Zustand store
  const store = useStore.getState();
  store.setAccessToken(null);
  store.setRefreshToken(null);
  tokenExpiryTime = null;
  
  // Reset app state using Zustand
  store.setAppState({ 
    spaces: [],
    activeSpace: null,
    conversations: [],
    messages: [],
    initialDataLoaded: false,
    lastFetched: null,
    user: null
  });
  
  // Delete stored tokens
  await clearAuthData();
  
  // Redirect all windows to sign-in
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      // Use hash-based routing for Vite/React Router
      if (process.env.NODE_ENV === 'development') {
        window.loadURL(`http://localhost:5173/#/sign-in`);
      } else {
        // For production build
        const basePath = join(__dirname, '../renderer/index.html');
        window.loadURL(`file://${basePath}#/sign-in`);
      }
    }
  });
  
  // Hide command center if open
  const commandCenterWindow = BrowserWindow.getAllWindows().find(win => 
    win.webContents.getURL().includes('command-center'));
  
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.hide();
  }
}

/**
 * Refresh authentication tokens
 * Note: This function will automatically save tokens to secure storage
 */
export async function refreshTokens(): Promise<boolean> {
  const store = useStore.getState();
  const refreshToken = store.refreshToken;
  
  if (!refreshToken) {
    console.log('[ELECTRON] No refresh token available');
    return false;
  }
  
  // Get safeStorage from electron
  const { safeStorage } = require('electron');
  
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
      // If refresh explicitly fails with 401/403, redirect to sign-in
      if (response.status === 401 || response.status === 403) {
        await redirectToSignIn();
      }
      return false;
    }
    
    const { status, error, data } = await response.json();
    
    if (status !== 'success' || !data?.session?.access_token) {
      console.error('[ELECTRON] Invalid response from refresh endpoint:', error || 'No session data');
      return false;
    }
    
    // Update tokens in Zustand store
    store.setAccessToken(data.session.access_token);
    
    // If a new refresh token was provided, update it too
    if (data.session.refresh_token) {
      store.setRefreshToken(data.session.refresh_token);
    }
    
    // Set expiry time to 1 hour from now
    tokenExpiryTime = Date.now() + (60 * 60 * 1000);
    
    // Always attempt to save the tokens to disk
    const newState = useStore.getState();
    if (newState.accessToken && newState.refreshToken) {
      try {
        await saveAuthData(
          newState.accessToken, 
          newState.refreshToken,
          safeStorage
        );
        console.log('[ELECTRON] Refreshed tokens saved to disk');
      } catch (saveError) {
        console.error('[ELECTRON] Error saving refreshed tokens:', saveError);
        // Even if saving fails, we still have the tokens in memory, so continue
      }
    } else {
      console.error('[ELECTRON] Cannot save tokens: One or both tokens are null');
      // This is a recoverable error - we still have tokens in memory
    }
    
    console.log('[ELECTRON] Tokens refreshed successfully');
    return true;
  } catch (error) {
    console.error('[ELECTRON] Error refreshing tokens:', error);
    return false;
  }
}

// fetchInitialAppData has been moved to app-data-service.ts

/**
 * Helper to check server availability
 */
export async function checkServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('[ELECTRON] Server check failed:', error);
    return false;
  }
}

/**
 * Sign in user and get auth tokens
 */
export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      return { 
        success: false, 
        error: `Server error: ${response.status} ${response.statusText}`
      };
    }

    const { status, error, data } = await response.json();

    console.log('[ELECTRON] Sign in response:', { status, error, data });
    if (status !== 'success' || !data?.session?.access_token || !data?.session?.refresh_token) {
      return { 
        success: false, 
        error: error || 'Invalid credentials'
      };
    }

    // Update store with tokens
    const store = useStore.getState();
    store.setAccessToken(data.session.access_token);
    store.setRefreshToken(data.session.refresh_token);
    
    // Update store with user data if available
    if (data.session.user) {
      store.setUser(data.session.user);
    }

    // Note: We don't need to save tokens to disk here - the auth-handlers.ts
    // handles that when calling this method

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('[ELECTRON] Sign in error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to sign in'
    };
  }
}

// Get current auth data
export async function getAuthData() {
  const store = useStore.getState();
  const { accessToken, refreshToken } = store;
  return { accessToken, refreshToken };
}

// Export token expiry time
export { tokenExpiryTime };

// Expose constants
export { API_BASE_URL, APP_BASE_URL };
