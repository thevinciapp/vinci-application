import { API_BASE_URL } from '../../core/auth/auth-service';
import { fetchWithAuth } from '../api/api-service';
import { useStore } from '../../store';

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
    const response = await fetchWithAuth(`${API_BASE_URL}/api/users/profile`);
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to fetch user profile');
    }

    const profile = data.data;
    useStore.getState().setUser(profile);

    return profile;
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
    
    const responseData = await response.json();
    
    if (responseData.status !== 'success') {
      throw new Error(responseData.error || 'Failed to update user profile');
    }

    const profile = responseData.data;
    useStore.getState().setUser(profile);

    return profile;
  } catch (error) {
    console.error('[ELECTRON] Error updating user profile:', error);
    throw error;
  }
}

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    return await response.json();
  } catch (error) {
    console.error('[ELECTRON] Error signing up:', error);
    throw error;
  }
}

/**
 * Reset user password
 */
export async function resetPassword(email: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    return await response.json();
  } catch (error) {
    console.error('[ELECTRON] Error resetting password:', error);
    throw error;
  }
}

/**
 * Get user preference settings
 */
export async function getUserSettings(): Promise<any> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/users/settings`);
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to fetch user settings');
    }
    
    return data.data || {};
  } catch (error) {
    console.error('[ELECTRON] Error fetching user settings:', error);
    throw error;
  }
}

/**
 * Update user preference settings
 */
export async function updateUserSettings(settings: any): Promise<any> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/users/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to update user settings');
    }
    
    return data.data;
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

    const responseData = await response.json();
    
    if (responseData.status !== 'success') {
      throw new Error(responseData.error || 'Failed to update password');
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

    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to update email preferences');
    }

    useStore.getState().setUser(data.data);
  } catch (error) {
    console.error('[ELECTRON] Error updating email preferences:', error);
    throw error;
  }
}