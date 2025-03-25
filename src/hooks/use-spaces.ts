import { useState, useCallback } from 'react';
import { SpaceEvents, MessageEvents } from '@/core/ipc/constants';
import { Space } from '@/types/space';
import { useRendererStore } from '@/store/renderer';
import { Conversation } from '@/types/conversation';
import { Message } from '@/types/message';
import { Provider } from '@/types/provider';

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

  const fetchSpaceConversations = useCallback(async (spaceId: string): Promise<Conversation[]> => {
    try {
      const response = await window.electron.invoke(SpaceEvents.GET_SPACE_CONVERSATIONS, spaceId);
      if (response && response.success) {
        rendererStore.setConversations(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch conversations');
      return [];
    }
  }, [rendererStore]);

  const fetchConversationMessages = useCallback(async (conversationId: string): Promise<Message[]> => {
    try {
      const response = await window.electron.invoke(MessageEvents.GET_CONVERSATION_MESSAGES, conversationId);
      if (response && response.success) {
        rendererStore.setMessages(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch messages');
      return [];
    }
  }, [rendererStore]);

  const updateStoreWithSpaceData = useCallback(async (space: Space | null) => {
    if (!space) {
      rendererStore.setConversations([]);
      rendererStore.setMessages([]);
      return;
    }

    try {
      const conversations = await fetchSpaceConversations(space.id);
      if (conversations.length > 0) {
        await fetchConversationMessages(conversations[0].id);
      } else {
        rendererStore.setMessages([]);
      }
    } catch (error) {
      console.error('Error updating store with space data:', error);
      setError(error instanceof Error ? error.message : 'Failed to update store with space data');
    }
  }, [rendererStore, fetchSpaceConversations, fetchConversationMessages]);

  const setupSpaceListener = useCallback((callback?: (space: Space | null) => void) => {
    const handleSpaceUpdate = async (event: any, data: { space: Space | null; conversations: Conversation[]; messages: Message[] }) => {
      rendererStore.setActiveSpace(data.space);
      rendererStore.setConversations(data.conversations || []);
      rendererStore.setMessages(data.messages || []);
      if (callback) callback(data.space);
    };

    window.electron.on(SpaceEvents.SPACE_UPDATED, handleSpaceUpdate);
    
    return () => {
      window.electron.off(SpaceEvents.SPACE_UPDATED, handleSpaceUpdate);
    };
  }, [rendererStore]);

  const setActiveSpaceById = async (spaceId: string) => {
    try {
      setIsLoading(true);
      const response = await window.electron.invoke(SpaceEvents.SET_ACTIVE_SPACE, spaceId);
      
      if (response?.success && response.data && 'space' in response.data) {
        const { space, conversations, messages } = response.data;
        rendererStore.setActiveSpace(space);
        rendererStore.setConversations(conversations || []);
        rendererStore.setMessages(messages || []);
      }

      return response?.success || false;
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
      if (result.success && result.data) {
        const spaces = [...rendererStore.spaces, result.data];
        rendererStore.setSpaces(spaces);
      }
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
      if (result.success) {
        const spaces = rendererStore.spaces.filter(s => s.id !== spaceId);
        rendererStore.setSpaces(spaces);
        if (rendererStore.activeSpace?.id === spaceId) {
          rendererStore.setActiveSpace(null);
        }
      }
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
      if (result.success && result.data) {
        const spaces = rendererStore.spaces.map(s => 
          s.id === spaceId ? { ...s, ...result.data.space } : s
        );
        rendererStore.setSpaces(spaces);
        
        if (rendererStore.activeSpace?.id === spaceId) {
          rendererStore.setActiveSpace({ ...rendererStore.activeSpace, ...result.data.space });
        }
      }
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
      if (result.success) {
        // Update spaces list
        const spaces = rendererStore.spaces.map(s => 
          s.id === spaceId ? { ...s, model: modelId, provider: provider as Provider } : s
        );
        rendererStore.setSpaces(spaces);
        
        // Update active space if this is the active one
        if (rendererStore.activeSpace?.id === spaceId) {
          rendererStore.setActiveSpace({
            ...rendererStore.activeSpace,
            model: modelId,
            provider: provider as Provider
          });
        }
      }
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
