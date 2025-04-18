import { useState, useMemo } from 'react';
import { SpaceEvents } from '@/core/ipc/constants';
import { Space } from '@/entities/space/model/types';
import { useMainState } from '@/stores/MainStateContext';

// Define a standard response type for IPC calls
type IpcResponse<T = null> = { 
  success: boolean;
  data?: T;
  error?: string;
};

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
      // Assert the expected response type
      const result = response as IpcResponse;
      if (!result.success) {
        // Remove optional chaining after assertion
        setActionError(result.error || 'Failed to set active space');
      }
      // Remove optional chaining after assertion
      return result.success || false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set active space';
      setActionError(errorMessage);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  // Update return type to use IpcResponse<Space>
  const createSpace = async (spaceData: Partial<Space>): Promise<IpcResponse<Space>> => {
    setIsActionLoading(true);
    setActionError(null);
    try {
       const result = await window.electron.invoke(SpaceEvents.CREATE_SPACE, spaceData);
       // Assert the expected response type
       const typedResult = result as IpcResponse<Space>; 
       if (!typedResult.success) {
         setActionError(typedResult.error || 'Failed to create space');
       }
       return typedResult;
    } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'Failed to create space';
       setActionError(errorMessage);
       // Ensure catch block returns the correct type
       return { success: false, error: errorMessage, data: undefined };
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
      // Assert the expected response type
      const result = response as IpcResponse;
      if (!result.success) {
        setActionError(result.error || 'Failed to delete space');
      }
      return result.success;
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
      // Assert the expected response type
      const typedResult = result as IpcResponse;
      if (!typedResult.success) {
         setActionError(typedResult.error || 'Failed to update space');
      }
      return typedResult.success;
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
       // Assert the expected response type
       const typedResult = result as IpcResponse;
       if (!typedResult.success) {
         setActionError(typedResult.error || 'Failed to update space model');
       }
       return typedResult.success;
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
