import { useState, useCallback } from 'react';
import { ConversationEvents } from '@/core/ipc/constants';
import { useRendererStore } from '@/store/renderer';
import { Conversation } from '@/types/conversation';

export function useConversations() {
  const rendererStore = useRendererStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await window.electron.invoke(ConversationEvents.GET_CONVERSATIONS);
      if (response && response.conversations) {
        rendererStore.setConversations(response.conversations);
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
      if (callback) callback(data.conversations);
    };

    window.electron.on(ConversationEvents.CONVERSATIONS_UPDATED, handleConversationsUpdate);
    
    return () => {
      window.electron.off(ConversationEvents.CONVERSATIONS_UPDATED, handleConversationsUpdate);
    };
  }, [rendererStore]);

  const setActiveConversation = useCallback(async (conversation: Conversation): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await window.electron.invoke(ConversationEvents.SET_ACTIVE_CONVERSATION, conversation.id);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to set active conversation');
      }

      if (conversation) {
        rendererStore.setConversations(
          rendererStore.conversations.map(c => ({
            ...c,
            active: c.id === conversation.id
          }))
        );
      }

      if (response.data) {
        rendererStore.setMessages(response.data.messages);
      } else {
        rendererStore.setMessages([]);
      }

      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to set active conversation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [rendererStore]);

  const createConversation = useCallback(async (spaceId: string, title: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await window.electron.invoke(ConversationEvents.CREATE_CONVERSATION, spaceId, title);
      return response.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create conversation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await window.electron.invoke(ConversationEvents.DELETE_CONVERSATION, conversationId);
      return response.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete conversation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConversation = useCallback(async (conversationId: string, data: Partial<Conversation>): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await window.electron.invoke(ConversationEvents.UPDATE_CONVERSATION, conversationId, data);
      return response.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update conversation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const conversations = rendererStore.conversations;
  const activeConversation = conversations[0] || null;

  return {
    conversations,
    activeConversation,
    isLoading: isLoading || rendererStore.isLoading,
    error: error || rendererStore.error,
    fetchConversations,
    setupConversationsListener,
    setActiveConversation,
    createConversation,
    deleteConversation,
    updateConversation
  };
}
