import { useState, useEffect } from 'react';
import { SpaceEvents } from '@/src/core/ipc/constants';
import { Space } from '@/src/types';

export function useSpaces() {
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  
  const fetchSpaces = async (): Promise<Space[]> => {
    try {
      const response = await window.electron.invoke(SpaceEvents.GET_SPACES);
      if (response && response.success) {
        setSpaces(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch spaces');
      return [];
    }
  };

  useEffect(() => {
    const handleSpaceUpdate = (event: any, data: { space: Space | null }) => {
      setActiveSpace(data.space);
      setIsLoading(false);
      // Refresh the spaces list when a space is updated
      fetchSpaces();
    };

    window.electron.on(SpaceEvents.SPACE_UPDATED, handleSpaceUpdate);

    // Fetch active space and all spaces on component mount
    setIsLoading(true);
    
    // First, fetch the active space
    window.electron.invoke(SpaceEvents.GET_ACTIVE_SPACE)
      .then((space: Space | null) => {
        setActiveSpace(space);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setIsLoading(false);
      });
    
    // Then, fetch all spaces
    fetchSpaces();

    return () => {
      window.electron.off(SpaceEvents.SPACE_UPDATED, handleSpaceUpdate);
    };
  }, []);

  const setActiveSpaceById = async (spaceId: string): Promise<boolean> => {
    try {
      const result = await window.electron.invoke(SpaceEvents.SET_ACTIVE_SPACE, spaceId);
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to set active space');
      return false;
    }
  };

  const createSpace = async (spaceData: Partial<Space>): Promise<boolean> => {
    try {
      const result = await window.electron.invoke(SpaceEvents.CREATE_SPACE, spaceData);
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create space');
      return false;
    }
  };

  const deleteSpace = async (spaceId: string): Promise<boolean> => {
    try {
      const result = await window.electron.invoke(SpaceEvents.DELETE_SPACE, spaceId);
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete space');
      return false;
    }
  };

  const updateSpace = async (spaceId: string, spaceData: Partial<Space>): Promise<boolean> => {
    try {
      const result = await window.electron.invoke(SpaceEvents.UPDATE_SPACE, spaceId, spaceData);
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update space');
      return false;
    }
  };

  const updateSpaceModel = async (spaceId: string, modelId: string, provider: string): Promise<boolean> => {
    try {
      const result = await window.electron.invoke(SpaceEvents.UPDATE_SPACE_MODEL, spaceId, modelId, provider);
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update space model');
      return false;
    }
  };

  return { 
    activeSpace, 
    spaces,
    isLoading, 
    error,
    fetchSpaces,
    setActiveSpaceById,
    createSpace,
    deleteSpace,
    updateSpace,
    updateSpaceModel
  };
}
