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
      if (response?.success && response.conversations?.items) {
        rendererStore.setConversations(response.conversations.items);
        return response.conversations.items;
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

  const setupConversationsListener = useCallback((spaceId: string) => {
    const handleConversationsUpdate = (event: any, data: { conversations: Conversation[] }) => {
      rendererStore.setConversations(data.conversations);
    };

    window.electron.on(ConversationEvents.CONVERSATIONS_UPDATED, handleConversationsUpdate);
    
    window.electron.invoke(ConversationEvents.GET_CONVERSATIONS, { spaceId });
    
    return () => {
      window.electron.off(ConversationEvents.CONVERSATIONS_UPDATED, handleConversationsUpdate);
    };
  }, [rendererStore]);

  const setActiveConversation = useCallback(async (conversation: Conversation): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await window.electron.invoke(ConversationEvents.SET_ACTIVE_CONVERSATION, {
        conversationId: conversation.id,
        spaceId: conversation.space_id
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to set active conversation');
      }

      // Update active conversation in the store
      rendererStore.setActiveConversation(conversation);

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
      const response = await window.electron.invoke(ConversationEvents.CREATE_CONVERSATION, {
        space_id: spaceId,
        title
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create conversation');
      }

      rendererStore.setActiveConversation(response.data);
      rendererStore.setConversations([...rendererStore.conversations, response.data]);

      return response.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create conversation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [rendererStore]);

  const deleteConversation = useCallback(async (conversation: Conversation): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await window.electron.invoke(ConversationEvents.DELETE_CONVERSATION, conversation);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete conversation');
      }

      // If we're deleting the active conversation, set active to null
      if (rendererStore.activeConversation?.id === conversation.id) {
        rendererStore.setActiveConversation(null);
      }

      rendererStore.setConversations(rendererStore.conversations.filter(c => c.id !== conversation.id));

      return response.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete conversation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [rendererStore]);

  const updateConversation = useCallback(async (conversation: Conversation): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await window.electron.invoke(ConversationEvents.UPDATE_CONVERSATION, conversation);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update conversation');
      }

      const updatedConversations = rendererStore.conversations.map(c => 
        c.id === conversation.id ? { ...c, title: conversation.title } : c
      );
      
      rendererStore.setConversations(updatedConversations);

      // If we're updating the active conversation, update it in the store
      if (rendererStore.activeConversation?.id === conversation.id) {
        const updatedActiveConversation = updatedConversations.find(c => c.id === conversation.id);
        if (updatedActiveConversation) {
          rendererStore.setActiveConversation(updatedActiveConversation);
        }
      }

      return response.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update conversation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [rendererStore]);

  const conversations = rendererStore.conversations;
  const activeConversation = rendererStore.activeConversation;

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
