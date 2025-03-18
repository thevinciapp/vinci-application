import { API_BASE_URL, refreshTokens, redirectToSignIn, tokenExpiryTime } from '../../core/auth/auth-service';
import { useStore } from '../../store';

/**
 * Core service for authenticated API requests
 * This service provides the basic fetch functionality used by other domain-specific services
 */

/**
 * Fetch with authentication header and token refresh capability
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    // Get current state 
    const store = useStore.getState();
    
    // Check if access token is expired
    const isTokenExpired = !tokenExpiryTime || Date.now() >= tokenExpiryTime;
    
    // If token is expired and we have a refresh token, try to refresh
    if (isTokenExpired && store.refreshToken) {
      const refreshed = await refreshTokens();
      if (!refreshed) {
        console.error('[ELECTRON] Failed to refresh tokens and no valid token available');
        await redirectToSignIn();
        throw new Error('Failed to refresh authentication tokens');
      }
    }
    
    // Get updated state after possible refresh
    const updatedStore = useStore.getState();
    
    // If we still don't have a valid access token, redirect and fail
    if (!updatedStore.accessToken) {
      console.error('[ELECTRON] No authentication token available');
      await redirectToSignIn();
      throw new Error('No authentication token available');
    }

    // Add auth header
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${updatedStore.accessToken}`);
    
    // Make the request
    const response = await fetch(url, { ...options, headers });
    
    // If we get a 401 or 403, try to refresh the token once
    if ((response.status === 401 || response.status === 403) && updatedStore.refreshToken) {
      console.log(`[ELECTRON] Got ${response.status}, attempting token refresh`);
      const refreshed = await refreshTokens();
      
      // Get the latest state after refresh attempt
      const refreshedStore = useStore.getState();
      
      if (refreshed && refreshedStore.accessToken) {
        // Retry the request with the new token
        headers.set('Authorization', `Bearer ${refreshedStore.accessToken}`);
        return fetch(url, { ...options, headers });
      } else {
        // If refresh failed and we got 401/403, redirect to sign-in
        console.error('[ELECTRON] Token refresh failed after auth error');
        await redirectToSignIn();
      }
    }
    
    // Handle other auth-related errors in the response
    if (response.status === 401 || response.status === 403) {
      console.error(`[ELECTRON] Authentication failed with status: ${response.status}`);
      await redirectToSignIn();
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