import { useState, useCallback, useEffect, useMemo } from 'react';
import { ConversationEvents, AppStateEvents } from '@/core/ipc/constants';
import { Conversation } from '@/types/conversation';
import { useMainState } from '@/context/MainStateContext';

export function useConversations() {
  const { state, isLoading: isGlobalLoading, error: globalError } = useMainState();
  
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const conversations = useMemo(() => state.conversations || [], [state.conversations]);
  const activeConversation = useMemo(() => state.activeConversation || null, [state.activeConversation]);

  const setActiveConversation = useCallback(async (conversation: Conversation): Promise<boolean> => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await window.electron.invoke(ConversationEvents.SET_ACTIVE_CONVERSATION, {
        conversationId: conversation.id,
        spaceId: conversation.space_id
      });

      if (!response.success) {
        setActionError(response.error || 'Failed to set active conversation');
      }
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set active conversation';
      setActionError(errorMessage);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (spaceId: string, title: string): Promise<{ success: boolean, data?: any, error?: string }> => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await window.electron.invoke(ConversationEvents.CREATE_CONVERSATION, {
        space_id: spaceId,
        title
      });

      if (!response.success) {
        setActionError(response.error || 'Failed to create conversation');
      }
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setActionError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const deleteConversation = useCallback(async (conversation: Conversation): Promise<boolean> => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await window.electron.invoke(ConversationEvents.DELETE_CONVERSATION, conversation);
      if (!response.success) {
        setActionError(response.error || 'Failed to delete conversation');
      }
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete conversation';
      setActionError(errorMessage);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const updateConversation = useCallback(async (conversation: Conversation): Promise<boolean> => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await window.electron.invoke(ConversationEvents.UPDATE_CONVERSATION, conversation);
      if (!response.success) {
        setActionError(response.error || 'Failed to update conversation');
      }
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update conversation';
      setActionError(errorMessage);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  return {
    conversations,
    activeConversation,
    isLoading: isGlobalLoading || isActionLoading,
    error: actionError || globalError,
    setActiveConversation,
    createConversation,
    deleteConversation,
    updateConversation
  };
}
