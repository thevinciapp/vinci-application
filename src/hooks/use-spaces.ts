import { useState, useCallback } from 'react';
import { SpaceEvents } from '@/core/ipc/constants';
import { Space } from '@/types';
import { useRendererStore } from '@/store/renderer';

export function useSpaces() {
  const rendererStore = useRendererStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchSpaces = useCallback(async (): Promise<Space[]> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await window.electron.invoke(SpaceEvents.GET_SPACES);
      if (response && response.success) {
        rendererStore.setSpaces(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch spaces';
      setError(errorMessage);
      rendererStore.setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [rendererStore]);

  const fetchActiveSpace = useCallback(async (): Promise<Space | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const space = await window.electron.invoke(SpaceEvents.GET_ACTIVE_SPACE);
      if (space) {
        rendererStore.setActiveSpace(space);
      }
      return space;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch active space';
      setError(errorMessage);
      rendererStore.setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [rendererStore]);

  // Function to set up space update listener
  const setupSpaceListener = useCallback((callback?: (space: Space | null) => void) => {
    const handleSpaceUpdate = (event: any, data: { space: Space | null }) => {
      rendererStore.setActiveSpace(data.space);
      if (callback) callback(data.space);
    };

    window.electron.on(SpaceEvents.SPACE_UPDATED, handleSpaceUpdate);
    
    return () => {
      window.electron.off(SpaceEvents.SPACE_UPDATED, handleSpaceUpdate);
    };
  }, [rendererStore]);

  const setActiveSpaceById = async (spaceId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await window.electron.invoke(SpaceEvents.SET_ACTIVE_SPACE, spaceId);
      if (result.success) {
        // We don't set activeSpace here - it will come through the SPACE_UPDATED event
        return true;
      }
      return false;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to set active space');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const createSpace = async (spaceData: Partial<Space>): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await window.electron.invoke(SpaceEvents.CREATE_SPACE, spaceData);
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create space');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSpace = async (spaceId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await window.electron.invoke(SpaceEvents.DELETE_SPACE, spaceId);
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete space');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSpace = async (spaceId: string, spaceData: Partial<Space>): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await window.electron.invoke(SpaceEvents.UPDATE_SPACE, spaceId, spaceData);
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update space');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSpaceModel = async (spaceId: string, modelId: string, provider: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await window.electron.invoke(SpaceEvents.UPDATE_SPACE_MODEL, spaceId, modelId, provider);
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update space model');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const spaces = rendererStore.spaces;
  const activeSpace = rendererStore.activeSpace;

  return { 
    activeSpace, 
    spaces,
    isLoading: isLoading || rendererStore.isLoading, 
    error: error || rendererStore.error,
    fetchSpaces,
    fetchActiveSpace,
    setupSpaceListener,
    setActiveSpaceById,
    createSpace,
    deleteSpace,
    updateSpace,
    updateSpaceModel
  };
}
