import { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Only run in browser environment where Electron is available
    if (typeof window === 'undefined' || !window.electron) {
      console.log('Electron API not available');
      return;
    }
    
    // Set up listener for state updates
    const cleanup = window.electron.on(AppStateEvents.STATE_UPDATED, (event, response) => {
      if (response.success && response.data?.session) {
        setSession(response.data.session);
      }
    });

    // Get initial session state
    window.electron.invoke(AuthEvents.GET_SESSION)
      .then((response) => {
        if (response.success && response.data?.session) {
          setSession(response.data.session);
        }
      })
      .catch(err => {
        console.error('Error getting session:', err);
      });

    return cleanup;
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

  // Helper property to check if user is authenticated
  const isAuthenticated = !!session?.access_token;

  return {
    isLoading,
    error,
    session,
    isAuthenticated,
    signIn,
    signUp,
    resetPassword
  };
}
