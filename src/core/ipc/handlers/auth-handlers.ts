import { ipcMain, IpcMainInvokeEvent, safeStorage } from 'electron';
import { useStore, getStoreState } from '../../../store';
import { API_BASE_URL } from '../../auth/auth-service';
import {
  signUp,
  resetPassword
} from '../../../services/user/user-service';
import {
  redirectToSignIn,
  refreshTokens,
  saveAuthData,
  clearAuthData,
  signIn
} from '../../auth/auth-service';
import { AuthResponse } from './index';
import { AuthEvents } from '../constants';

interface SessionResponse {
  status: string;
  data?: {
    session?: {
      user?: any;
    };
  };
  error?: string;
}

/**
 * Register authentication-related IPC handlers
 */
export function registerAuthHandlers() {
  ipcMain.handle(AuthEvents.SIGN_IN, async (_event: IpcMainInvokeEvent, email: string, password: string): Promise<AuthResponse> => {
    try {
      const signInResult = await signIn(email, password);
      
      if (!signInResult.success || !signInResult.data?.session?.access_token || !signInResult.data?.session?.refresh_token) {
        return { success: false, error: signInResult.error || 'Invalid credentials' };
      }

      // Save tokens to secure storage
      await saveAuthData(
        signInResult.data.session.access_token,
        signInResult.data.session.refresh_token,
        safeStorage
      );

      return {
        success: true,
        data: signInResult.data,
        status: 'success'
      };
    } catch (error) {
      console.error('[ELECTRON] Sign in handler error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign in', status: 'error' };
    }
  });

  ipcMain.handle(AuthEvents.VERIFY_TOKEN, async (_event: IpcMainInvokeEvent): Promise<AuthResponse> => {
    console.log('[ELECTRON] VERIFY_TOKEN handler called');
    try {
      // If there's no access token, return false immediately
      const accessToken = getStoreState().accessToken;
      console.log('[ELECTRON] Current access token exists:', !!accessToken);
      if (!accessToken) {
        console.log('[ELECTRON] No access token available to verify');
        return { 
          success: true, 
          data: { isValid: false },
          status: 'success'
        };
      }

      // Verify token with API
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Simply return if token is valid or not
      return {
        success: true,
        data: { 
          isValid: response.ok && responseData.status === 'success' && !!responseData.data?.session
        },
        status: 'success'
      };
    } catch (error) {
      console.error('[ELECTRON] Error verifying token:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to verify token', 
        status: 'error' 
      };
    }
  });

  ipcMain.handle(AuthEvents.SIGN_UP, async (_event: IpcMainInvokeEvent, email: string, password: string): Promise<AuthResponse> => {
    try {
      return await signUp(email, password);
    } catch (error) {
      console.error('Error signing up:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign up', status: 'error' };
    }
  });

  ipcMain.handle(AuthEvents.RESET_PASSWORD, async (_event: IpcMainInvokeEvent, email: string): Promise<AuthResponse> => {
    try {
      return await resetPassword(email);
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to reset password', status: 'error' };
    }
  });

  ipcMain.handle(AuthEvents.SET_AUTH_TOKENS, async (_event: IpcMainInvokeEvent, newAccessToken: string, newRefreshToken: string, expiresAt: number): Promise<AuthResponse> => {
    if (!newAccessToken || !newRefreshToken || !expiresAt) {
      console.error('[ELECTRON] Invalid token data received');
      return { success: false, error: 'Invalid token data received', status: 'error' };
    }
    
    console.log('[ELECTRON] Auth tokens received');
    
    try {
      await saveAuthData(newAccessToken, newRefreshToken, safeStorage);
      console.log('[ELECTRON] Auth tokens saved to secure storage');

      const store = useStore.getState();
      store.setAccessToken(newAccessToken);
      store.setRefreshToken(newRefreshToken);
      store.setTokenExpiryTime(expiresAt * 1000);
      console.log('[ELECTRON] Token expiry set from handler:', new Date(expiresAt * 1000).toISOString());
      
      return { success: true, data: { tokensValidated: true }, status: 'success' };
    } catch (error) {
      console.error('[ELECTRON] Error during auth setup:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error during auth setup', status: 'error' };
    }
  });

  ipcMain.handle(AuthEvents.CLEAR_AUTH_DATA, async (_event: IpcMainInvokeEvent): Promise<AuthResponse> => {
    try {
      // Clear auth data from secure storage
      await clearAuthData();
      
      // Clear user and tokens from Zustand store
      useStore.getState().setUser(null);
      useStore.getState().setAccessToken(null);
      useStore.getState().setRefreshToken(null);
      
      console.log('[ELECTRON] Auth data cleared successfully');
      return { success: true, status: 'success' };
    } catch (error) {
      console.error('[ELECTRON] Error clearing auth data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error clearing auth data', status: 'error' };
    }
  });

  // Handle token refresh
  ipcMain.handle(AuthEvents.REFRESH_AUTH_TOKENS, async (_event: IpcMainInvokeEvent): Promise<AuthResponse> => {
    try {
      console.log('[ELECTRON] Refresh tokens handler called');
      const refreshed = await refreshTokens();
      
      if (!refreshed) {
        console.log('[ELECTRON] Failed to refresh tokens');
        return { success: false, error: 'Failed to refresh tokens', status: 'error' };
      }
      
      const store = useStore.getState();
      return { 
        success: true, 
        data: {
          accessToken: store.accessToken,
          refreshToken: store.refreshToken
        },
        status: 'success'
      };
    } catch (error) {
      console.error('[ELECTRON] Error refreshing tokens:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error refreshing tokens', status: 'error' };
    }
  });

  // Handle getting auth token
  ipcMain.handle(AuthEvents.GET_AUTH_TOKEN, async (_event: IpcMainInvokeEvent): Promise<AuthResponse> => {
    try {
      const store = useStore.getState();
      return { 
        success: true, 
        data: {
          accessToken: store.accessToken,
          refreshToken: store.refreshToken
        },
        status: 'success'
      };
    } catch (error) {
      console.error('[ELECTRON] Error getting auth token:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error getting auth token', status: 'error' };
    }
  });

  // Handle sign out
  ipcMain.handle(AuthEvents.SIGN_OUT, async (_event: IpcMainInvokeEvent): Promise<AuthResponse> => {
    try {
      await redirectToSignIn();
      return { success: true, status: 'success' };
    } catch (error) {
      console.error('[ELECTRON] Error signing out:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error signing out', status: 'error' };
    }
  });
}
