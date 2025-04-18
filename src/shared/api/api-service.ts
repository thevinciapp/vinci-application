import { API_BASE_URL, refreshTokens, redirectToSignIn } from '@/core/auth/auth-service';
import { useMainStore } from '@/stores/main';
import { safeStorage } from 'electron';

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const store = useMainStore.getState();
    
    const currentTimeSeconds = Math.floor(Date.now() / 1000);
    const isTokenExpired = !store.tokenExpiryTime || store.tokenExpiryTime <= currentTimeSeconds;
    
    if (isTokenExpired && store.refreshToken) {
      console.log('[ELECTRON] Token expired, attempting refresh');
      const refreshed = await refreshTokens(safeStorage);
      if (!refreshed) {
        console.log('[ELECTRON] Failed to refresh tokens and no valid token available');
        await redirectToSignIn();
        throw new Error('Failed to refresh authentication tokens');
      }
    }
    
    const currentToken = useMainStore.getState().accessToken;
    if (!currentToken) {
      console.log('[ELECTRON] No access token available');
      await redirectToSignIn();
      throw new Error('No authentication token available');
    }
    
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${currentToken}`);
    
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    if ((response.status === 401 || response.status === 403) && store.refreshToken) {
      console.log(`[ELECTRON] Got ${response.status}, attempting one-time token refresh`);
      const refreshed = await refreshTokens(safeStorage);
      
      if (refreshed) {
        const retryToken = useMainStore.getState().accessToken;
        if (retryToken) {
          headers.set('Authorization', `Bearer ${retryToken}`);
          return fetch(url, { ...options, headers });
        }
      }
      
      await redirectToSignIn();
      throw new Error('Authentication failed after token refresh attempt');
    }
    
    return response;
  } catch (error) {
    console.error('[ELECTRON] Error in fetchWithAuth:', error);
    throw error;
  }
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('[ELECTRON] Server health check failed:', error);
    return false;
  }
}