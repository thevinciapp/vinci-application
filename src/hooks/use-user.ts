import { useState, useEffect } from 'react';
import { useToast } from 'vinci-ui';
import { UserEvents, AppStateEvents, AuthEvents } from '@/src/core/ipc/constants';
import { UserProfile, UserUpdateData, EmailPreferences } from '@/src/services/user/user-service';

export function useUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set up listener for state updates
    const cleanup = window.electron.on(AppStateEvents.STATE_UPDATED, (event, response) => {
      if (response.success && response.data?.profile) {
        setProfile(response.data.profile);
      }
    });

    // Get initial profile state
    window.electron.invoke(UserEvents.GET_PROFILE)
      .then((response) => {
        if (response.success && response.data?.profile) {
          setProfile(response.data.profile);
        }
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

  const updateProfile = async (updatedProfile: UserUpdateData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await window.electron.invoke(UserEvents.UPDATE_PROFILE, updatedProfile);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update profile');
      }

      // Update local state
      if (response.data?.profile) {
        setProfile(response.data.profile);
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
      
      setProfile(null);

      return handleSuccess("Signed out successfully");
    } catch (error) {
      return handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    profile,
    updateProfile,
    updatePassword,
    updateEmailPreferences,
    signOut
  };
}
