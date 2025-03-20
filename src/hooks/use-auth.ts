import { useState, useCallback } from 'react';
import { useToast } from 'vinci-ui';
import { AuthEvents, AppStateEvents } from '@/core/ipc/constants';

interface AuthSession {
  access_token: string;
  refresh_token: string;
}

interface AuthState {
  session: AuthSession | null;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  data?: AuthState;
  toast?: {
    title: string;
    description: string;
  };
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

  // Setup auth state listener
  const setupAuthListener = useCallback((callback?: (session: AuthSession | null) => void) => {
    // Only run in browser environment where Electron is available
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
  
  // Verify token
  const verifyAndGetToken = useCallback(async (): Promise<AuthSession | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Only run in browser environment where Electron is available
      if (typeof window === 'undefined' || !window.electron) {
        throw new Error('Electron API not available');
      }
      
      const verifyResponse = await window.electron.invoke(AuthEvents.VERIFY_TOKEN);
      
      if (verifyResponse.success && verifyResponse.data?.isValid) {
        // Token is valid, now get the actual token data
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

      // Check if Electron API is available
      if (typeof window === 'undefined' || !window.electron) {
        throw new Error("Electron API not available");
      }

      const response = await window.electron.invoke(AuthEvents.SIGN_IN, email, password);

      if (!response.success) {
        throw new Error(response.error || 'Authentication failed');
      }

      // Update session state with the new tokens
      if (response.data?.session) {
        setSession(response.data.session);
      }

      // Sync app state after successful auth
      await window.electron.invoke(AppStateEvents.SYNC_STATE);

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

      // Sync app state after successful signup
      await window.electron.invoke(AppStateEvents.SYNC_STATE);

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
