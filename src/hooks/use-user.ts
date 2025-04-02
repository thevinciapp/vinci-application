import { useState, useCallback, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserEvents, AppStateEvents, AuthEvents } from '@/core/ipc/constants';
import { UserProfile, UserUpdateData, EmailPreferences } from '@/services/user/user-service';
import { useMainState } from '@/context/MainStateContext';

export function useUser() {
  const { state, isLoading: isGlobalLoading, error: globalError } = useMainState();
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { toast } = useToast();

  const profile = useMemo(() => state.user || null, [state.user]);

  const handleError = (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    setActionError(errorMessage);
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive"
    });
    return false;
  };

  const handleSuccess = (message: string) => {
    setActionError(null);
    toast({
      title: "Success",
      description: message,
      variant: "success"
    });
    return true;
  };

  const updateProfile = async (updatedProfile: UserUpdateData) => {
    try {
      setIsActionLoading(true);
      setActionError(null);

      const response = await window.electron.invoke(UserEvents.UPDATE_PROFILE, updatedProfile);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update profile');
      }

      return handleSuccess("Profile updated successfully");
    } catch (error) {
      return handleError(error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setIsActionLoading(true);
      setActionError(null);

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
      setIsActionLoading(false);
    }
  };

  const updateEmailPreferences = async (preferences: EmailPreferences) => {
    try {
      setIsActionLoading(true);
      setActionError(null);

      const response = await window.electron.invoke(UserEvents.UPDATE_EMAIL_PREFERENCES, preferences);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update email preferences');
      }

      return handleSuccess("Email preferences updated successfully");
    } catch (error) {
      return handleError(error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsActionLoading(true);
      setActionError(null);

      const response = await window.electron.invoke(AuthEvents.SIGN_OUT);

      if (!response.success) {
        throw new Error(response.error || 'Failed to sign out');
      }

      return handleSuccess("Signed out successfully");
    } catch (error) {
      return handleError(error);
    } finally {
      setIsActionLoading(false);
    }
  };

  return {
    isLoading: isGlobalLoading || isActionLoading,
    error: actionError || globalError,
    profile,
    updateProfile,
    updatePassword,
    updateEmailPreferences,
    signOut
  };
}
