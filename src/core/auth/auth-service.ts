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
const STORAGE_TOKEN_EXPIRY_PATH = join(STORAGE_DIR, 'token_expiry.enc');

// Ensure the secure directory exists
if (!existsSync(STORAGE_DIR)) {
  try {
    mkdirSync(STORAGE_DIR, { recursive: true });
    console.log('[ELECTRON] Created secure storage directory:', STORAGE_DIR);
  } catch (error) {
    console.error('[ELECTRON] Failed to create secure storage directory:', error);
  }
}

/**
 * Save authentication data securely
 */
export async function saveAuthData(access: string, refresh: string, safeStorage: Electron.SafeStorage, expiryTime?: number): Promise<void> {
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
      
      let encryptedExpiryTime: Buffer | null = null;
      if (expiryTime) {
        encryptedExpiryTime = safeStorage.encryptString(expiryTime.toString());
      }

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
          
          if (encryptedExpiryTime) {
            writeFile(STORAGE_TOKEN_EXPIRY_PATH, encryptedExpiryTime, (err) => {
              if (err) {
                console.error('[ELECTRON] Failed to write token expiry file:', err);
                resolve(); // Still resolve since we have the core tokens saved
                return;
              }
              
              console.log('[ELECTRON] Token expiry time saved to:', STORAGE_TOKEN_EXPIRY_PATH);
              console.log('[ELECTRON] Auth tokens and expiry encrypted and saved');
              resolve();
            });
          } else {
            console.log('[ELECTRON] Auth tokens encrypted and saved (no expiry time)');
            resolve();
          }
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
export async function loadAuthData(safeStorage: Electron.SafeStorage): Promise<{ accessToken: string | null, refreshToken: string | null, tokenExpiryTime: number | null }> {
  console.log('[ELECTRON] loadAuthData called');
  // Get current token state
  const store = useStore.getState();
  console.log('[ELECTRON] Store before loading: Access token exists:', !!store.accessToken, 'Refresh token exists:', !!store.refreshToken);
  return new Promise((resolve) => {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('[ELECTRON] Encryption not available during load');
      resolve({ accessToken: null, refreshToken: null, tokenExpiryTime: null });
      return;
    }

    // Check if the storage directory exists
    if (!existsSync(STORAGE_DIR)) {
      console.log('[ELECTRON] Secure storage directory does not exist:', STORAGE_DIR);
      resolve({ accessToken: null, refreshToken: null, tokenExpiryTime: null });
      return;
    }

    console.log('[ELECTRON] Loading auth tokens from:', STORAGE_DIR);
    
    // Check if token files exist
    const accessTokenExists = existsSync(STORAGE_ACCESS_TOKEN_PATH);
    const refreshTokenExists = existsSync(STORAGE_REFRESH_TOKEN_PATH);
    const expiryTimeExists = existsSync(STORAGE_TOKEN_EXPIRY_PATH);
    
    if (!accessTokenExists && !refreshTokenExists) {
      console.log('[ELECTRON] No token files found in storage directory');
      resolve({ accessToken: null, refreshToken: null, tokenExpiryTime: null });
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
                
                // Try to load token expiry
                if (expiryTimeExists) {
                  readFile(STORAGE_TOKEN_EXPIRY_PATH, (err, encryptedExpiryTime) => {
                    if (err) {
                      console.log('[ELECTRON] Error reading token expiry file:', err);
                      resolve({ accessToken: null, refreshToken, tokenExpiryTime: null });
                      return;
                    }
                    
                    try {
                      const expiryTimeStr = safeStorage.decryptString(encryptedExpiryTime);
                      const tokenExpiryTime = parseInt(expiryTimeStr, 10);
                      console.log('[ELECTRON] Token expiry loaded successfully:', new Date(tokenExpiryTime * 1000).toISOString());
                      store.setTokenExpiryTime(tokenExpiryTime);
                      resolve({ accessToken: null, refreshToken, tokenExpiryTime });
                    } catch (decryptError) {
                      console.error('[ELECTRON] Failed to decrypt token expiry time:', decryptError);
                      resolve({ accessToken: null, refreshToken, tokenExpiryTime: null });
                    }
                  });
                } else {
                  resolve({ accessToken: null, refreshToken, tokenExpiryTime: null });
                }
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
                
                // Try to load token expiry
                if (expiryTimeExists) {
                  readFile(STORAGE_TOKEN_EXPIRY_PATH, (err, encryptedExpiryTime) => {
                    if (err) {
                      console.log('[ELECTRON] Error reading token expiry file:', err);
                      resolve({ accessToken, refreshToken, tokenExpiryTime: null });
                      return;
                    }
                    
                    try {
                      const expiryTimeStr = safeStorage.decryptString(encryptedExpiryTime);
                      const tokenExpiryTime = parseInt(expiryTimeStr, 10);
                      console.log('[ELECTRON] Token expiry loaded successfully:', new Date(tokenExpiryTime * 1000).toISOString());
                      store.setTokenExpiryTime(tokenExpiryTime);
                      resolve({ accessToken, refreshToken, tokenExpiryTime });
                    } catch (decryptError) {
                      console.error('[ELECTRON] Failed to decrypt token expiry time:', decryptError);
                      resolve({ accessToken, refreshToken, tokenExpiryTime: null });
                    }
                  });
                } else {
                  resolve({ accessToken, refreshToken, tokenExpiryTime: null });
                }
              } catch (decryptError) {
                console.error('[ELECTRON] Failed to decrypt refresh token:', decryptError);
                resolve({ accessToken, refreshToken: null, tokenExpiryTime: null });
              }
            });
          } else {
            resolve({ accessToken, refreshToken: null, tokenExpiryTime: null });
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
                
                // Try to load token expiry
                if (expiryTimeExists) {
                  readFile(STORAGE_TOKEN_EXPIRY_PATH, (err, encryptedExpiryTime) => {
                    if (err) {
                      console.log('[ELECTRON] Error reading token expiry file:', err);
                      resolve({ accessToken: null, refreshToken, tokenExpiryTime: null });
                      return;
                    }
                    
                    try {
                      const expiryTimeStr = safeStorage.decryptString(encryptedExpiryTime);
                      const tokenExpiryTime = parseInt(expiryTimeStr, 10);
                      console.log('[ELECTRON] Token expiry loaded successfully:', new Date(tokenExpiryTime * 1000).toISOString());
                      store.setTokenExpiryTime(tokenExpiryTime);
                      resolve({ accessToken: null, refreshToken, tokenExpiryTime });
                    } catch (decryptError) {
                      console.error('[ELECTRON] Failed to decrypt token expiry time:', decryptError);
                      resolve({ accessToken: null, refreshToken, tokenExpiryTime: null });
                    }
                  });
                } else {
                  resolve({ accessToken: null, refreshToken, tokenExpiryTime: null });
                }
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
          resolve({ accessToken: null, refreshToken: null, tokenExpiryTime: null });
          return;
        }
        
        try {
          const refreshToken = safeStorage.decryptString(encryptedRefreshToken);
          console.log('[ELECTRON] Only refresh token loaded successfully');
          store.setRefreshToken(refreshToken);
          
          // Try to load token expiry
          if (expiryTimeExists) {
            readFile(STORAGE_TOKEN_EXPIRY_PATH, (err, encryptedExpiryTime) => {
              if (err) {
                console.log('[ELECTRON] Error reading token expiry file:', err);
                resolve({ accessToken: null, refreshToken, tokenExpiryTime: null });
                return;
              }
              
              try {
                const expiryTimeStr = safeStorage.decryptString(encryptedExpiryTime);
                const tokenExpiryTime = parseInt(expiryTimeStr, 10);
                console.log('[ELECTRON] Token expiry loaded successfully:', new Date(tokenExpiryTime * 1000).toISOString());
                store.setTokenExpiryTime(tokenExpiryTime);
                resolve({ accessToken: null, refreshToken, tokenExpiryTime });
              } catch (decryptError) {
                console.error('[ELECTRON] Failed to decrypt token expiry time:', decryptError);
                resolve({ accessToken: null, refreshToken, tokenExpiryTime: null });
              }
            });
          } else {
            resolve({ accessToken: null, refreshToken, tokenExpiryTime: null });
          }
        } catch (decryptError) {
          console.error('[ELECTRON] Failed to decrypt refresh token:', decryptError);
          resolve({ accessToken: null, refreshToken: null, tokenExpiryTime: null });
        }
      });
    } else {
      // This should never happen (we already checked if both don't exist)
      resolve({ accessToken: null, refreshToken: null, tokenExpiryTime: null });
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
    
    // Check if token files exist
    const accessTokenExists = existsSync(STORAGE_ACCESS_TOKEN_PATH);
    const refreshTokenExists = existsSync(STORAGE_REFRESH_TOKEN_PATH);
    const expiryTimeExists = existsSync(STORAGE_TOKEN_EXPIRY_PATH);
    
    if (!accessTokenExists && !refreshTokenExists) {
      console.log('[ELECTRON] No token files found to delete');
      resolve(false);
      return;
    }
    
    // Function to delete the refresh token file
    const deleteRefreshToken = () => {
      if (!refreshTokenExists) {
        console.log('[ELECTRON] Refresh token file does not exist, nothing to delete');
        
        // Check if token expiry exists and delete it
        if (existsSync(STORAGE_TOKEN_EXPIRY_PATH)) {
          unlink(STORAGE_TOKEN_EXPIRY_PATH, (err) => {
            if (err) {
              console.error('[ELECTRON] Failed to delete token expiry file:', err);
            } else {
              console.log('[ELECTRON] Token expiry deleted');
            }
            resolve(accessDeleted); // Return based on whether access token was deleted
          });
          return;
        }
        
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
        
        // Also delete token expiry if it exists
        if (existsSync(STORAGE_TOKEN_EXPIRY_PATH)) {
          unlink(STORAGE_TOKEN_EXPIRY_PATH, (err) => {
            if (err) {
              console.error('[ELECTRON] Failed to delete token expiry file:', err);
            } else {
              console.log('[ELECTRON] Token expiry deleted');
            }
            // Return true if at least one token was deleted
            resolve(accessDeleted || refreshDeleted);
          });
        } else {
          // Return true if at least one token was deleted
          resolve(accessDeleted || refreshDeleted);
        }
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

export async function redirectToSignIn(): Promise<void> {
  const store = useStore.getState();
  store.setAccessToken(null);
  store.setRefreshToken(null);
  
  store.setAppState({ 
    spaces: [],
    activeSpace: null,
    conversations: [],
    messages: [],
    initialDataLoaded: false,
    lastFetched: null,
    user: null
  });
  
  await clearAuthData();
  
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      if (process.env.NODE_ENV === 'development') {
        window.loadURL(`http://localhost:5173/#/sign-in`);
      } else {
        const basePath = join(__dirname, '../renderer/index.html');
        window.loadURL(`file://${basePath}#/sign-in`);
      }
    }
  });
  
  const commandCenterWindow = BrowserWindow.getAllWindows().find(win => 
    win.webContents.getURL().includes('command-center'));
  
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    commandCenterWindow.hide();
  }
}

/**
 * Refresh authentication tokens
 */
export async function refreshTokens(safeStorage: Electron.SafeStorage): Promise<boolean> {
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
    
    store.setAccessToken(data.session.access_token);
    
    if (data.session.refresh_token) {
      store.setRefreshToken(data.session.refresh_token);
    }
    
    if (!data.session.expires_at) {
      console.error('[ELECTRON] No expires_at received from refresh endpoint');
      return false;
    }
    
    store.setTokenExpiryTime(data.session.expires_at);
    
    console.log('[ELECTRON] Token expiry set from API:', new Date(data.session.expires_at * 1000).toISOString());
    
    if (data.session.refresh_token && safeStorage) {
      await saveAuthData(data.session.access_token, data.session.refresh_token, safeStorage, data.session.expires_at);
    } else {
      console.log('[ELECTRON] Safe storage not available or encryption not available, skipping token save');
    }
    
    return true;
  } catch (error) {
    console.error('[ELECTRON] Error refreshing tokens:', error);
    return false;
  }
}

/**
 * Check if the current token needs to be refreshed
 * Returns true if token expiry is less than 5 minutes away or already expired
 */
export function isTokenExpiringSoon(): boolean {
  const store = useStore.getState();
  const tokenExpiryTime = store.tokenExpiryTime;
  const accessToken = store.accessToken;
  
  // If there's no access token, no need to check expiry
  if (!accessToken) {
    return false;
  }
  
  // If there's no expiry time, but there is an access token, 
  // we should refresh to be safe and to get a proper expiry time
  if (!tokenExpiryTime) {
    console.warn('[ELECTRON] No token expiry time found for existing access token');
    return true;
  }
  
  const currentTimeSeconds = Math.floor(Date.now() / 1000);
  const fiveMinutesFromNow = currentTimeSeconds + 300;
  
  return tokenExpiryTime <= fiveMinutesFromNow;
}

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
export async function signIn(email: string, password: string, safeStorage?: Electron.SafeStorage): Promise<{ success: boolean; error?: string; data?: any }> {
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

    if (status !== 'success' || !data?.session?.access_token || !data?.session?.refresh_token || !data?.session?.expires_at) {
      return { 
        success: false, 
        error: error || 'Invalid response from server'
      };
    }

    const store = useStore.getState();
    store.setAccessToken(data.session.access_token);
    store.setRefreshToken(data.session.refresh_token);
    store.setTokenExpiryTime(data.session.expires_at);
    
    if (data.session.user) {
      store.setUser(data.session.user);
    }
    
    // Save tokens and expiry time to secure storage
    try {
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        await saveAuthData(
          data.session.access_token, 
          data.session.refresh_token, 
          safeStorage,
          data.session.expires_at
        );
        console.log('[ELECTRON] Auth data saved to secure storage after sign-in');
      } else {
        console.log('[ELECTRON] Safe storage not available or encryption not available, skipping token save after sign-in');
      }
    } catch (error) {
      console.error('[ELECTRON] Error saving auth data after sign-in:', error);
      // Continue since we already have tokens in memory
    }

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

// Expose constants
export { API_BASE_URL, APP_BASE_URL };
