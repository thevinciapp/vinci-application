import { useState, useCallback } from 'react';
import { useToast } from '@/shared/hooks/use-toast';
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
    const handleStateUpdate = (
      _event: Electron.IpcRendererEvent,
      response: { success: boolean; data?: { session?: AuthSession | null }; error?: string }
    ) => {
      if (response.success && response.data?.session) {
        setSession(response.data.session);
        if (callback) callback(response.data.session);
      }
    };
    
    window.electron.on(AppStateEvents.STATE_UPDATED, (event: unknown, ...args: unknown[]) => {
  handleStateUpdate(
    event as Electron.IpcRendererEvent,
    args[0] as { success: boolean; data?: { session?: AuthSession | null }; error?: string }
  );
});
    
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
      
      const verifyResponse = await window.electron.invoke<{ success: boolean; verification?: { isValid: boolean } }>(AuthEvents.VERIFY_TOKEN);
      
      if (verifyResponse.success && verifyResponse.verification?.isValid) {
        const tokenResponse = await window.electron.invoke<{ success: boolean; data?: { accessToken: string; refreshToken: string } }>(AuthEvents.GET_AUTH_TOKEN);
        
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

      const response = await window.electron.invoke<{ success: boolean; error?: string; session?: AuthSession }>(AuthEvents.SIGN_IN, email, password);

      if (!response.success) {
        throw new Error(response.error || 'Authentication failed');
      }

      if (response.session) {
        setSession(response.session);
      }

      try {
        const syncResponse = await window.electron.invoke<{ success: boolean; error?: string }>(AppStateEvents.SYNC_STATE);
        if (!syncResponse.success) {
          console.warn("State sync was not successful after login:", syncResponse.error);
        }
        
        const stateResponse = await window.electron.invoke<{ success: boolean; error?: string }>(AppStateEvents.GET_STATE);
        if (!stateResponse.success) {
          console.warn("Failed to get app state after login:", stateResponse.error);
        }
      } catch (syncError) {
        console.error("Error during state synchronization after login:", syncError);
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

      if (typeof window === 'undefined' || !window.electron) {
        throw new Error("Electron API not available");
      }

      console.log("Sign up request:", { email, password });
      const response = await window.electron.invoke<{ success: boolean; error?: string }>(AuthEvents.SIGN_UP, { email, password });
      console.log("Sign up response:", response);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create account');
      }

      try {
        const syncResponse = await window.electron.invoke<{ success: boolean; error?: string }>(AppStateEvents.SYNC_STATE);
        if (!syncResponse.success) {
          console.warn("State sync was not successful after signup:", syncResponse.error);
        }
        
        const stateResponse = await window.electron.invoke<{ success: boolean; error?: string }>(AppStateEvents.GET_STATE);
        if (!stateResponse.success) {
          console.warn("Failed to get app state after signup:", stateResponse.error);
        }
      } catch (syncError) {
        console.error("Error during state synchronization after signup:", syncError);
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

      const response = await window.electron.invoke<{ success: boolean; error?: string }>(AuthEvents.RESET_PASSWORD, { email });

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
      
      const response = await window.electron.invoke<{ success: boolean; error?: string }>(AppStateEvents.SYNC_STATE);
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

      const response = await window.electron.invoke<{ success: boolean; error?: string }>(AuthEvents.SIGN_OUT);

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
