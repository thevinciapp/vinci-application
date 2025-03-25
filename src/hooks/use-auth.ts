import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AuthEvents, AppStateEvents } from '@/core/ipc/constants';

interface AuthSession {
  access_token: string;
  refresh_token: string;
}

interface AuthCredentials {
  email: string;
  password: string;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const { toast } = useToast();
  
  const setupAuthListener = useCallback((callback?: (session: AuthSession | null) => void) => {
    if (typeof window === 'undefined' || !window.electron) {
      console.log('Electron API not available');
      return () => {};
    }
    
    // Set up listener for state updates
    const handleStateUpdate = (event: any, response: any) => {
      if (response.success && response.data?.session) {
        setSession(response.data.session);
        if (callback) callback(response.data.session);
      }
    };
    
    window.electron.on(AppStateEvents.STATE_UPDATED, handleStateUpdate);
    
    return () => {
      window.electron.off(AppStateEvents.STATE_UPDATED, handleStateUpdate);
    };
  }, []);
  
  const verifyAndGetToken = useCallback(async (): Promise<AuthSession | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (typeof window === 'undefined' || !window.electron) {
        throw new Error('Electron API not available');
      }
      
      const verifyResponse = await window.electron.invoke(AuthEvents.VERIFY_TOKEN);
      
      if (verifyResponse.success && verifyResponse.data?.isValid) {
        const tokenResponse = await window.electron.invoke(AuthEvents.GET_AUTH_TOKEN);
        
        if (tokenResponse?.success && tokenResponse.data) {
          const { accessToken, refreshToken } = tokenResponse.data;
          if (accessToken && refreshToken) {
            const authSession = {
              access_token: accessToken,
              refresh_token: refreshToken
            };
            setSession(authSession);
            return authSession;
          }
        }
      }
      
      return null;
    } catch (err) {
      console.error('Error verifying/getting tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify token');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleError = (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    setError(errorMessage);
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive"
    });
    return false;
  };

  const handleSuccess = (message: string) => {
    setError(null);
    toast({
      title: "Success",
      description: message,
      variant: "success"
    });
    return true;
  };

  const signIn = async ({ email, password }: AuthCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!email || !password) {
        throw new Error("Please fill in all fields");
      }

      if (typeof window === 'undefined' || !window.electron) {
        throw new Error("Electron API not available");
      }

      const response = await window.electron.invoke(AuthEvents.SIGN_IN, email, password);

      if (!response.success) {
        throw new Error(response.error || 'Authentication failed');
      }

      if (response.data?.session) {
        setSession(response.data.session);
      }

      // Sync state and wait for the complete data to be loaded
      try {
        const syncResponse = await window.electron.invoke(AppStateEvents.SYNC_STATE);
        if (!syncResponse.success) {
          console.warn("State sync was not successful after login:", syncResponse.error);
        }
        
        // Get the complete state data after syncing
        const stateResponse = await window.electron.invoke(AppStateEvents.GET_STATE);
        if (!stateResponse.success) {
          console.warn("Failed to get app state after login:", stateResponse.error);
        }
      } catch (syncError) {
        console.error("Error during state synchronization after login:", syncError);
        // We don't throw here because we want to return successful login
        // The UI layer will handle data loading errors separately
      }

      return handleSuccess("Successfully signed in");
    } catch (error) {
      return handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async ({ email, password }: AuthCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!email || !password) {
        throw new Error("Please fill in all fields");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      // Check if Electron API is available
      if (typeof window === 'undefined' || !window.electron) {
        throw new Error("Electron API not available");
      }

      const response = await window.electron.invoke(AuthEvents.SIGN_UP, { email, password });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create account');
      }

      // Sync state and wait for the complete data to be loaded
      try {
        const syncResponse = await window.electron.invoke(AppStateEvents.SYNC_STATE);
        if (!syncResponse.success) {
          console.warn("State sync was not successful after signup:", syncResponse.error);
        }
        
        // Get the complete state data after syncing
        const stateResponse = await window.electron.invoke(AppStateEvents.GET_STATE);
        if (!stateResponse.success) {
          console.warn("Failed to get app state after signup:", stateResponse.error);
        }
      } catch (syncError) {
        console.error("Error during state synchronization after signup:", syncError);
        // We don't throw here because we want to return successful signup
        // The UI layer will handle data loading errors separately
      }

      return handleSuccess("Successfully signed up");
    } catch (error) {
      return handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!email) {
        throw new Error("Please provide an email address");
      }

      // Check if Electron API is available
      if (typeof window === 'undefined' || !window.electron) {
        throw new Error("Electron API not available");
      }

      const response = await window.electron.invoke(AuthEvents.RESET_PASSWORD, { email });

      if (!response.success) {
        throw new Error(response.error || 'Failed to reset password');
      }

      return handleSuccess("Password reset email sent");
    } catch (error) {
      return handleError(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to sync the application state
  const syncAppState = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if Electron API is available
      if (typeof window === 'undefined' || !window.electron) {
        throw new Error("Electron API not available");
      }
      
      const response = await window.electron.invoke(AppStateEvents.SYNC_STATE);
      return response.success || false;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to sync app state');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if Electron API is available
      if (typeof window === 'undefined' || !window.electron) {
        throw new Error("Electron API not available");
      }

      // Reset renderer state to ensure clean state on next sign-in
      if (window.electron) {
        try {
          // Reset initialDataLoaded in renderer store
          const rendererStore = window.rendererStore;
          if (rendererStore) {
            rendererStore.setAppState({ 
              initialDataLoaded: false,
              spaces: [],
              activeSpace: null,
              conversations: [],
              messages: [],
              user: null,
              profile: null
            });
          }
        } catch (storeError) {
          console.error("Error resetting renderer store:", storeError);
        }
      }

      const response = await window.electron.invoke(AuthEvents.SIGN_OUT);

      if (!response.success) {
        throw new Error(response.error || 'Failed to sign out');
      }

      setSession(null);
      return handleSuccess("Successfully signed out");
    } catch (error) {
      return handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper property to check if user is authenticated
  const isAuthenticated = !!session?.access_token;

  return {
    isLoading,
    error,
    session,
    isAuthenticated,
    setupAuthListener,
    verifyAndGetToken,
    signIn,
    signUp,
    signOut,
    resetPassword,
    syncAppState
  };
}
