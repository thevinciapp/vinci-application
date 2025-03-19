import { useState, useCallback } from 'react';
import { ConversationEvents } from '@/core/ipc/constants';
import { useRendererStore } from '@/store/renderer';
import { Conversation } from '@/types';

export function useConversations() {
  const rendererStore = useRendererStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await window.electron.invoke(ConversationEvents.GET_CONVERSATIONS);
      if (response && response.conversations) {
        rendererStore.setConversations(response.conversations);
        setActiveConversation(response.conversations[0] || null);
        return response.conversations;
      }
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch conversations';
      setError(errorMessage);
      rendererStore.setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [rendererStore]);

  const setupConversationsListener = useCallback((callback?: (conversations: Conversation[]) => void) => {
    const handleConversationsUpdate = (event: any, data: { conversations: Conversation[] }) => {
      rendererStore.setConversations(data.conversations);
      setActiveConversation(data.conversations[0] || null);
      if (callback) callback(data.conversations);
    };

    window.electron.on(ConversationEvents.CONVERSATIONS_UPDATED, handleConversationsUpdate);
    
    return () => {
      window.electron.off(ConversationEvents.CONVERSATIONS_UPDATED, handleConversationsUpdate);
    };
  }, [rendererStore]);

  const setActive = useCallback((conversation: Conversation | null) => {
    setActiveConversation(conversation);
  }, []);

  const createConversation = useCallback(async (spaceId: string, title: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await window.electron.invoke(ConversationEvents.CREATE_CONVERSATION, { spaceId, title });
      if (result.success) {
        await fetchConversations();
      }
      return result.success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
      setError(errorMessage);
      rendererStore.setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchConversations, rendererStore]);

  const updateConversation = async (spaceId: string, conversationId: string, title: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await window.electron.invoke(ConversationEvents.UPDATE_CONVERSATION, { 
        spaceId, 
        id: conversationId, 
        title 
      });
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update conversation');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (spaceId: string, conversationId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await window.electron.invoke(ConversationEvents.DELETE_CONVERSATION, { spaceId, conversationId });
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete conversation');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const conversations = rendererStore.conversations;

  return {
    conversations,
    activeConversation,
    fetchConversations,
    setupConversationsListener,
    setActive,
    createConversation,
    updateConversation,
    deleteConversation,
    isLoading: isLoading || rendererStore.isLoading,
    error: error || rendererStore.error
  };
}
