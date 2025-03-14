import { API_BASE_URL } from '@/src/core/auth/auth-service';
import { User } from '@supabase/supabase-js';
import { fetchWithAuth } from '@/src/services/api/api-service';
import { useStore } from '@/src/store';

/**
 * Fetch current user profile
 */
export async function fetchUserProfile(): Promise<User | null> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/auth/session`);
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to fetch user profile');
    }
    
    const user = data.data?.session?.user || null;
    
    // Update user in Zustand store if found
    if (user) {
      useStore.getState().setUser(user);
    }
    
    return user;
  } catch (error) {
    console.error('[ELECTRON] Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(profileData: Partial<User>): Promise<User> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/users/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || 'Failed to update user profile');
    }
    
    // Update user in Zustand store
    useStore.getState().setUser(data.data);
    
    return data.data;
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