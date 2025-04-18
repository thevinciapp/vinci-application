import { AuthResponse } from '@/features/auth/model/types';
import { API_BASE_URL } from '@/core/auth/auth-service';
import { fetchWithAuth } from '@/shared/api/api-service';
import { useMainStore } from '@/stores/main';

export interface UserProfile {
  full_name: string;
  avatar_url: string;
  website: string;
  bio: string;
  email: string;
}

export interface UserUpdateData {
  full_name?: string;
  avatar_url?: string;
  website?: string;
  bio?: string;
}

export interface PasswordUpdateData {
  currentPassword: string;
  newPassword: string;
}

export interface EmailPreferences {
  [key: string]: boolean;
}

/**
 * Fetch current user profile
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/user`);
    
    // Check if response is valid before parsing JSON
    if (!response.ok) {
      const statusText = `Status code: ${response.status}`;
      console.error(`[ELECTRON] User profile API returned error: ${statusText}`);
      
      // Try to get text content to see what was returned
      try {
        const textContent = await response.text();
        const isHtml = textContent.trim().startsWith('<!DOCTYPE') || textContent.trim().startsWith('<html');
        
        if (isHtml) {
          console.error('[ELECTRON] API returned HTML instead of JSON. Server may be down or returning error page.');
          throw new Error(`API returned HTML instead of JSON. ${statusText}`);
        } else {
          console.error('[ELECTRON] API returned non-JSON response:', textContent);
          throw new Error(`Invalid API response. ${statusText}`);
        }
      } catch (error) {
        console.error('[ELECTRON] Failed to read error response:', error);
        throw new Error(`Failed to read error response. ${statusText}`);
      }
    }

    // API returns { status: 'success', user: {...} }
    const { status, error, user } = await response.json();
    
    console.log('[ELECTRON] User profile response:', { user }); // Log the user object

    if (status !== 'success') {
      throw new Error(error || 'Failed to fetch user profile');
    }

    if (!user) {
      throw new Error('User profile not found in response');
    }

    // Update user in store
    useMainStore.getState().setUser(user);

    return user;
  } catch (error) {
    console.error('[ELECTRON] Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(data: UserUpdateData): Promise<UserProfile> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/users/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    // Revert: Assuming structure might be different until API is verified
    const { status, error, data: profile } = await response.json(); 
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to update user profile');
    }

    useMainStore.getState().setUser(profile);

    return profile;
  } catch (error) {
    console.error('[ELECTRON] Error updating user profile:', error);
    throw error;
  }
}

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string): Promise<UserProfile> {
  try {
    console.log('[ELECTRON] Signing up with email:', email, 'and password:', password);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    // API returns { status: 'success', authResult: { user: ..., session: {...} } }
    const data = await response.json();
    
    // API returns { status: 'success', authResult: { user: ..., session: {...} } }
    const session = data.authResult?.session;
    if (data.status === 'success' && session?.access_token && session?.refresh_token && session?.expires_at) {
      const store = useMainStore.getState();
      store.setAccessToken(session.access_token);
      store.setRefreshToken(session.refresh_token);
      store.setTokenExpiryTime(session.expires_at);
      console.log('[ELECTRON] Sign-up: Token expiry set from API:', new Date(session.expires_at * 1000).toISOString());
    }
    
    return data;
  } catch (error) {
    console.error('[ELECTRON] Error signing up:', error);
    throw error;
  }
}

/**
 * Reset user password
 */
export async function resetPassword(email: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();

    if (data.status === 'success') {
      return { success: true, data: data.user, status: data.status };
    } else {
      return { success: false, error: data.error || 'Password reset failed', status: data.status };
    }
  } catch (error) {
    console.error('[ELECTRON] Error resetting password:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Password reset failed', status: 'error' };
  }
}

/**
 * Get user preference settings
 */
export async function getUserSettings(): Promise<EmailPreferences> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/users/settings`);
    // Revert: Assuming structure might be different until API is verified
    const { status, error, data: settings } = await response.json(); 
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to fetch user settings');
    }
    
    return settings || {};
  } catch (error) {
    console.error('[ELECTRON] Error fetching user settings:', error);
    throw error;
  }
}

/**
 * Update user preference settings
 */
export async function updateUserSettings(settings: EmailPreferences): Promise<EmailPreferences> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/users/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });
    
    // Revert: Assuming structure might be different until API is verified
    const { status, error, data: updatedSettings } = await response.json(); 
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to update user settings');
    }
    
    return updatedSettings;
  } catch (error) {
    console.error('[ELECTRON] Error updating user settings:', error);
    throw error;
  }
}

/**
 * Update user password
 */
export async function updateUserPassword(data: PasswordUpdateData): Promise<void> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/users/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    // Revert: Assuming structure might be different until API is verified
    const { status, error } = await response.json(); 
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to update password');
    }
  } catch (error) {
    console.error('[ELECTRON] Error updating password:', error);
    throw error;
  }
}

/**
 * Update user email preferences
 */
export async function updateUserEmailPreferences(preferences: EmailPreferences): Promise<void> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/users/email-preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ preferences })
    });

    // Revert: Assuming structure might be different until API is verified
    const { status, error, data: user } = await response.json(); 
    
    if (status !== 'success') {
      throw new Error(error || 'Failed to update email preferences');
    }

    useMainStore.getState().setUser(user);
  } catch (error) {
    console.error('[ELECTRON] Error updating email preferences:', error);
    throw error;
  }
}