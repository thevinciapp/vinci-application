import { AppState } from '../../types';
import { User } from '@supabase/supabase-js';

/**
 * Creates a sanitized version of the app state suitable for IPC communication
 * by removing or simplifying non-serializable elements
 */
export function sanitizeStateForIpc(state: AppState): Partial<AppState> {
  // Create safe copy of user without potentially non-serializable or circular references
  let sanitizedUser: User | null = null;
  
  if (state.user) {
    // Create a minimal serializable version of the user
    // that includes only the essential properties we need
    sanitizedUser = {
      id: state.user.id,
      app_metadata: state.user.app_metadata || {},
      user_metadata: state.user.user_metadata || {},
      aud: state.user.aud || '',
      created_at: state.user.created_at || '',
      // Include other required User properties with safe defaults
      confirmed_at: state.user.confirmed_at || '',
      email: state.user.email,
      phone: state.user.phone || '',
      updated_at: state.user.updated_at || '',
      email_confirmed_at: state.user.email_confirmed_at || '',
      phone_confirmed_at: state.user.phone_confirmed_at || '',
      last_sign_in_at: state.user.last_sign_in_at || '',
      role: state.user.role || '',
      factors: state.user.factors || undefined,
      identities: state.user.identities || []
    };
  }
  
  return {
    spaces: state.spaces || [],
    activeSpace: state.activeSpace,
    conversations: state.conversations || [],
    messages: state.messages || [],
    initialDataLoaded: state.initialDataLoaded || false,
    lastFetched: state.lastFetched,
    user: sanitizedUser,
    // Don't include tokens in the initial sync for security
    accessToken: null,
    refreshToken: null
  };
}
