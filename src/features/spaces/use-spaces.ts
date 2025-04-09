import { useState, useMemo } from 'react';
import { SpaceEvents } from '@/core/ipc/constants';
import { Space } from '@/entities/space/model/types';
import { useMainState } from '@/context/MainStateContext';

export function useSpaces() {
  const { state, isLoading: isGlobalLoading, error: globalError } = useMainState();
  
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const spaces = useMemo(() => state.spaces || [], [state.spaces]);
  const activeSpace = useMemo(() => state.activeSpace || null, [state.activeSpace]);

  const setActiveSpaceById = async (spaceId: string): Promise<boolean> => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await window.electron.invoke(SpaceEvents.SET_ACTIVE_SPACE, spaceId);
      if (!response?.success) {
        setActionError(response?.error || 'Failed to set active space');
      }
      return response?.success || false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set active space';
      setActionError(errorMessage);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const createSpace = async (spaceData: Partial<Space>): Promise<{ success: boolean, data?: any, error?: string }> => {
    setIsActionLoading(true);
    setActionError(null);
    try {
       const result = await window.electron.invoke(SpaceEvents.CREATE_SPACE, spaceData);
       if (!result.success) {
         setActionError(result.error || 'Failed to create space');
       }
       return result;
    } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'Failed to create space';
       setActionError(errorMessage);
       return { success: false, error: errorMessage };
    } finally {
       setIsActionLoading(false);
    }
  };

  const deleteSpace = async (spaceId: string): Promise<boolean> => {
    setIsActionLoading(true);
    setActionError(null);

    if (spaces.length <= 1) {
        setActionError('Cannot delete the last space');
        setIsActionLoading(false);
        return false;
    }

    try {
      const response = await window.electron.invoke(SpaceEvents.DELETE_SPACE, spaceId);
      if (!response.success) {
        setActionError(response.error || 'Failed to delete space');
      }
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete space';
      setActionError(errorMessage);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const updateSpace = async (spaceId: string, spaceData: Partial<Space>): Promise<boolean> => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const result = await window.electron.invoke(SpaceEvents.UPDATE_SPACE, spaceId, spaceData);
      if (!result.success) {
         setActionError(result.error || 'Failed to update space');
      }
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update space';
      setActionError(errorMessage);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const updateSpaceModel = async (spaceId: string, modelId: string, provider: string): Promise<boolean> => {
    setIsActionLoading(true);
    setActionError(null);
    try {
       const result = await window.electron.invoke(SpaceEvents.UPDATE_SPACE_MODEL, spaceId, modelId, provider);
       if (!result.success) {
         setActionError(result.error || 'Failed to update space model');
       }
       return result.success;
    } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'Failed to update space model';
       setActionError(errorMessage);
       return false;
    } finally {
       setIsActionLoading(false);
    }
  };

  return {
    activeSpace,
    spaces,
    isLoading: isGlobalLoading || isActionLoading,
    error: actionError || globalError,
    setActiveSpaceById,
    createSpace,
    deleteSpace,
    updateSpace,
    updateSpaceModel
  };
}
