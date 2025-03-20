import { API_BASE_URL, refreshTokens, redirectToSignIn } from '../../core/auth/auth-service';
import { useStore } from '../../store';

/**
 * Core service for authenticated API requests
 * This service provides the basic fetch functionality used by other domain-specific services
 */

/**
 * Fetch with authentication and automatic token refresh
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const store = useStore.getState();
    
    // Check if access token is expired
    const currentTimeSeconds = Math.floor(Date.now() / 1000);
    const isTokenExpired = !store.tokenExpiryTime || store.tokenExpiryTime <= currentTimeSeconds;
    
    // If token is expired and we have a refresh token, try to refresh
    if (isTokenExpired && store.refreshToken) {
      console.log('[ELECTRON] Token expired, attempting refresh');
      const refreshed = await refreshTokens();
      if (!refreshed) {
        console.log('[ELECTRON] Failed to refresh tokens and no valid token available');
        await redirectToSignIn();
        throw new Error('Failed to refresh authentication tokens');
      }
    }
    
    // Get the latest token from store
    const currentToken = useStore.getState().accessToken;
    if (!currentToken) {
      console.log('[ELECTRON] No access token available');
      await redirectToSignIn();
      throw new Error('No authentication token available');
    }
    
    // Add authorization header
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${currentToken}`);
    
    // Make the request
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // If we get a 401/403, the token might be invalid even if not expired
    if ((response.status === 401 || response.status === 403) && store.refreshToken) {
      console.log(`[ELECTRON] Got ${response.status}, attempting one-time token refresh`);
      const refreshed = await refreshTokens();
      
      if (refreshed) {
        // Retry the request once with the new token
        const retryToken = useStore.getState().accessToken;
        if (retryToken) {
          headers.set('Authorization', `Bearer ${retryToken}`);
          return fetch(url, { ...options, headers });
        }
      }
      
      // If refresh failed, redirect to sign-in
      await redirectToSignIn();
      throw new Error('Authentication failed after token refresh attempt');
    }
    
    return response;
  } catch (error) {
    console.error('[ELECTRON] Error in fetchWithAuth:', error);
    throw error;
  }
}

/**
 * Check if server is available
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('[ELECTRON] Server health check failed:', error);
    return false;
  }
}