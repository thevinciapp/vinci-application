import { BrowserWindow } from 'electron';
import { join } from 'path';
import { writeFile, readFile, unlink } from 'fs';
import { useStore } from '@/src/store';
import { APP_BASE_URL, API_BASE_URL } from '@/src/config/api';

interface SignInResponse {
  status: string;
  data?: {
    session?: {
      access_token: string;
      refresh_token: string;
      user?: any;
    };
  };
  error?: string;
}

const STORAGE_DIR = join(process.env.userData || '', 'secure');
const STORAGE_ACCESS_TOKEN_PATH = join(STORAGE_DIR, 'access_token.enc');
const STORAGE_REFRESH_TOKEN_PATH = join(STORAGE_DIR, 'refresh_token.enc');

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

/**
 * Load authentication data from secure storage
 */
export async function loadAuthData(safeStorage: Electron.SafeStorage): Promise<{ accessToken: string | null, refreshToken: string | null }> {
  // Get current token state
  const store = useStore.getState();
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
            store.setRefreshToken(refreshToken);
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
        store.setAccessToken(accessToken);
        
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
            store.setRefreshToken(refreshToken);
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
            store.setRefreshToken(refreshToken);
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

/**
 * Delete authentication data
 */
export async function clearAuthData(): Promise<boolean> {
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
      window.loadURL(`${APP_BASE_URL}/sign-in`);
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
 */
export async function refreshTokens(): Promise<boolean> {
  const store = useStore.getState();
  const refreshToken = store.refreshToken;
  
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
      // If refresh explicitly fails with 401/403, redirect to sign-in
      if (response.status === 401 || response.status === 403) {
        await redirectToSignIn();
      }
      return false;
    }
    
    const data = await response.json();
    
    if (data.status !== 'success' || !data.data?.session?.access_token) {
      console.error('[ELECTRON] Invalid response from refresh endpoint:', data);
      // If refresh explicitly returns error status, redirect to sign-in
      if (data.status === 'error' && data.error?.includes('token')) {
        await redirectToSignIn();
      }
      return false;
    }
    
    // Update tokens in Zustand store
    const store = useStore.getState();
    store.setAccessToken(data.data.session.access_token);
    if (data.data.session.refresh_token) {
      store.setRefreshToken(data.data.session.refresh_token);
    }
    
    // Set expiry time to 1 hour from now
    tokenExpiryTime = Date.now() + (60 * 60 * 1000);
    
    // Save the new tokens
    const newState = useStore.getState();
    if (newState.accessToken && newState.refreshToken) {
      // We need safeStorage from main process
      // This would be passed from the caller
      // await saveAuthData(newState.accessToken, newState.refreshToken);
    } else {
      console.error('[ELECTRON] Cannot save tokens: One or both tokens are null');
      return false;
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
 * Wait for server to become available
 */
export async function waitForServer(maxAttempts = 10, delayMs = 1000): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (await checkServerAvailable()) return true;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return false;
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

    const data: SignInResponse = await response.json();

    if (data.status !== 'success' || !data.data?.session?.access_token || !data.data?.session?.refresh_token) {
      return { 
        success: false, 
        error: data.error || 'Invalid credentials'
      };
    }

    // Update store with user data if available
    if (data.data.session.user) {
      useStore.getState().setUser(data.data.session.user);
    }

    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    console.error('[ELECTRON] Sign in error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to sign in'
    };
  }
}

// Export token expiry time
export { tokenExpiryTime };

// Expose constants
export { API_BASE_URL, APP_BASE_URL };