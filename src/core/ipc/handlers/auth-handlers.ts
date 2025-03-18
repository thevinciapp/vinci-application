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
        data: signInResult.data
      };
    } catch (error) {
      console.error('[ELECTRON] Sign in handler error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign in' };
    }
  });

  ipcMain.handle(AuthEvents.GET_SESSION, async (_event: IpcMainInvokeEvent): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
        headers: {
          'Authorization': `Bearer ${getStoreState().accessToken}`
        }
      });
      const sessionData: SessionResponse = await response.json();
      return {
        success: sessionData.status === 'success',
        data: sessionData.data,
        error: sessionData.error
      };
    } catch (error) {
      console.error('Error getting session:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get session' };
    }
  });

  ipcMain.handle(AuthEvents.SIGN_UP, async (_event: IpcMainInvokeEvent, email: string, password: string): Promise<AuthResponse> => {
    try {
      return await signUp(email, password);
    } catch (error) {
      console.error('Error signing up:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign up' };
    }
  });

  ipcMain.handle(AuthEvents.RESET_PASSWORD, async (_event: IpcMainInvokeEvent, email: string): Promise<AuthResponse> => {
    try {
      return await resetPassword(email);
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to reset password' };
    }
  });

  ipcMain.handle(AuthEvents.SET_AUTH_TOKENS, async (_event: IpcMainInvokeEvent, newAccessToken: string, newRefreshToken: string): Promise<AuthResponse> => {
    if (!newAccessToken || !newRefreshToken) {
      console.error('[ELECTRON] Empty tokens received');
      return { success: false, error: 'Empty tokens received' };
    }
    
    console.log('[ELECTRON] Auth tokens received');
    
    try {
      // First, save the auth data to secure storage
      await saveAuthData(newAccessToken, newRefreshToken, safeStorage);
      console.log('[ELECTRON] Auth tokens saved to secure storage');
      
      // Validate the tokens by making a test API call
      try {
        const validationResponse = await fetch(`${API_BASE_URL}/api/auth/session`, {
          headers: {
            'Authorization': `Bearer ${newAccessToken}`
          }
        });
        
        if (!validationResponse.ok) {
          console.error('[ELECTRON] Token validation failed with status:', validationResponse.status);
          return { success: false, error: `Token validation failed with status: ${validationResponse.status}` };
        }
        
        const validationData = await validationResponse.json();
        if (validationData.status !== 'success') {
          console.error('[ELECTRON] Token validation returned error status:', validationData);
          return { success: false, error: 'Token validation returned error status' };
        }
        
        console.log('[ELECTRON] Tokens validated successfully');
        
        // Update Zustand store with user info if available
        if (validationData.data?.session?.user) {
          useStore.getState().setUser(validationData.data.session.user);
        }
      } catch (validationError) {
        console.error('[ELECTRON] Error validating tokens:', validationError);
        return { success: false, error: validationError instanceof Error ? validationError.message : 'Error validating tokens' };
      }
      
      return { success: true, data: { tokensValidated: true } };
    } catch (error) {
      console.error('[ELECTRON] Error during auth setup:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error during auth setup' };
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
      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error clearing auth data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error clearing auth data' };
    }
  });

  // Handle token refresh
  ipcMain.handle(AuthEvents.REFRESH_AUTH_TOKENS, async (_event: IpcMainInvokeEvent): Promise<AuthResponse> => {
    try {
      console.log('[ELECTRON] Refresh tokens handler called');
      const refreshed = await refreshTokens(safeStorage);
      
      if (!refreshed) {
        console.log('[ELECTRON] Failed to refresh tokens');
        return { success: false, error: 'Failed to refresh tokens' };
      }
      
      const store = useStore.getState();
      return { 
        success: true, 
        data: {
          accessToken: store.accessToken,
          refreshToken: store.refreshToken
        }
      };
    } catch (error) {
      console.error('[ELECTRON] Error refreshing tokens:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error refreshing tokens' };
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
        }
      };
    } catch (error) {
      console.error('[ELECTRON] Error getting auth token:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error getting auth token' };
    }
  });

  // Handle sign out
  ipcMain.handle(AuthEvents.SIGN_OUT, async (_event: IpcMainInvokeEvent): Promise<AuthResponse> => {
    try {
      await redirectToSignIn();
      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error signing out:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error signing out' };
    }
  });
}
