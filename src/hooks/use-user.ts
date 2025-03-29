import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserEvents, AppStateEvents, AuthEvents } from '@/core/ipc/constants';
import { UserProfile, UserUpdateData, EmailPreferences } from '@/services/user/user-service';
import { useRendererStore } from '@/store/renderer';

export function useUser() {
  const rendererStore = useRendererStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const setupProfileListener = useCallback((callback?: (profile: UserProfile | null) => void) => {
    const handleStateUpdate = (event: any, response: any) => {
      if (response.success && response.user) {
        rendererStore.setProfile(response.user);
        if (callback) callback(response.user);
      } else if (response.success && response.user === null) {
        rendererStore.setProfile(null);
        if (callback) callback(null);
      }
    };
    
    window.electron.on(AppStateEvents.STATE_UPDATED, handleStateUpdate);
    
    return () => {
      window.electron.off(AppStateEvents.STATE_UPDATED, handleStateUpdate);
    };
  }, [rendererStore]);
  
  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await window.electron.invoke(UserEvents.GET_PROFILE);
      
      if (response.success && response.user) {
        rendererStore.setProfile(response.user);
        return response.user;
      }
      
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user profile';
      setError(errorMessage);
      rendererStore.setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [rendererStore]);

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

  const updateProfile = async (updatedProfile: UserUpdateData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await window.electron.invoke(UserEvents.UPDATE_PROFILE, updatedProfile);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update profile');
      }

      if (response.user) {
        rendererStore.setProfile(response.user);
      }

      return handleSuccess("Profile updated successfully");
    } catch (error) {
      return handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await window.electron.invoke(UserEvents.UPDATE_PASSWORD, {
        currentPassword,
        newPassword
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update password');
      }

      return handleSuccess("Password updated successfully");
    } catch (error) {
      return handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmailPreferences = async (preferences: EmailPreferences) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await window.electron.invoke(UserEvents.UPDATE_EMAIL_PREFERENCES, preferences);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update email preferences');
      }

      return handleSuccess("Email preferences updated successfully");
    } catch (error) {
      return handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await window.electron.invoke(AuthEvents.SIGN_OUT);

      if (!response.success) {
        throw new Error(response.error || 'Failed to sign out');
      }
      
      rendererStore.setProfile(null);

      return handleSuccess("Signed out successfully");
    } catch (error) {
      return handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get profile from renderer store
  const profile = rendererStore.profile;

  return {
    isLoading: isLoading || rendererStore.isLoading,
    error: error || rendererStore.error,
    profile,
    fetchProfile,
    setupProfileListener,
    updateProfile,
    updatePassword,
    updateEmailPreferences,
    signOut
  };
}
