import { useState, useEffect } from 'react';
import { ConversationEvents } from '@/src/core/ipc/constants';
import { isElectronAvailable, requireElectron } from '@/src/lib/utils/utils';

interface Conversation {
  id: string;
  title: string;
  spaceId: string;
  createdAt: string;
  updatedAt: string;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip if Electron is not available (e.g., in SSR or non-Electron environment)
    if (!isElectronAvailable()) {
      setIsLoading(false);
      return;
    }

    const handleConversationsUpdate = (event: any, data: { conversations: Conversation[] }) => {
      setConversations(data.conversations);
      setActiveConversation(data.conversations[0] || null);
      setIsLoading(false);
    };

    window.electron.on(ConversationEvents.CONVERSATIONS_UPDATED, handleConversationsUpdate);

    window.electron.invoke(ConversationEvents.GET_CONVERSATIONS)
      .then((data: { conversations: Conversation[] }) => {
        setConversations(data.conversations);
        setActiveConversation(data.conversations[0] || null);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setIsLoading(false);
      });

    return () => {
      if (isElectronAvailable()) {
        window.electron.off(ConversationEvents.CONVERSATIONS_UPDATED, handleConversationsUpdate);
      }
    };
  }, []);

  const createConversation = async (spaceId: string, title: string): Promise<boolean> => {
    try {
      requireElectron();
      const result = await window.electron.invoke(ConversationEvents.CREATE_CONVERSATION, { spaceId, title });
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create conversation');
      return false;
    }
  };

  const updateConversation = async (spaceId: string, conversationId: string, title: string): Promise<boolean> => {
    try {
      requireElectron();
      const result = await window.electron.invoke(ConversationEvents.UPDATE_CONVERSATION, { 
        spaceId, 
        id: conversationId, 
        title 
      });
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update conversation');
      return false;
    }
  };

  const deleteConversation = async (spaceId: string, conversationId: string): Promise<boolean> => {
    try {
      requireElectron();
      const result = await window.electron.invoke(ConversationEvents.DELETE_CONVERSATION, { spaceId, conversationId });
      return result.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete conversation');
      return false;
    }
  };

  return {
    conversations,
    activeConversation,
    createConversation,
    updateConversation,
    deleteConversation,
    isLoading,
    error
  };
}
