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
        rendererStore.setSpaces(response.spaces || []);
        return response.spaces || [];
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
      if (space?.success && space.space) {
        rendererStore.setActiveSpace(space.space);
        return space.space;
      }
      if (space?.success && space.space === null) {
        rendererStore.setActiveSpace(null);
        return null;
      }
      console.warn('Unexpected response structure for GET_ACTIVE_SPACE:', space);
      rendererStore.setActiveSpace(null);
      return null;
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
        rendererStore.setConversations(response.conversations?.items || []);
        return response.conversations?.items || [];
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
        rendererStore.setMessages(response.messages?.items || []);
        return response.messages?.items || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch messages');
      return [];
    }
  }, [rendererStore]);

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
        const { activeSpace, conversations, messages, activeConversation } = result.data;
        if (activeSpace) {
          rendererStore.addSpace(activeSpace);
        }
        rendererStore.setActiveSpace(activeSpace);
        rendererStore.setActiveConversation(activeConversation);
        rendererStore.setConversations(conversations || []);
        rendererStore.setMessages(messages || []);
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
      const spaces = rendererStore.spaces;
      if (spaces.length === 1) {
        setError('Cannot delete the last space');
        return false;
      }
      
      const response = await window.electron.invoke(SpaceEvents.DELETE_SPACE, spaceId);
      if (response.success) {
        const { spaces, activeSpace, conversations, messages } = response.data;
        rendererStore.setSpaces(spaces);
        rendererStore.setActiveSpace(activeSpace);
        rendererStore.setConversations(conversations);
        rendererStore.setMessages(messages);
      } else {
        setError(response.error || 'Failed to delete space');
      }
      return response.success;
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
        const updatedSpace = result.data;
        const spaces = rendererStore.spaces.map(s => 
          s.id === spaceId ? { ...s, ...updatedSpace } : s
        );
        rendererStore.setSpaces(spaces);
        
        if (rendererStore.activeSpace?.id === spaceId) {
          rendererStore.setActiveSpace({ ...rendererStore.activeSpace, ...updatedSpace });
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
