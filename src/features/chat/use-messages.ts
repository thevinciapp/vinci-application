import { useState, useCallback, useMemo } from 'react';
import { MessageEvents } from '@/core/ipc/constants';
import { useMainState } from '@/stores/MainStateContext';

export function useMessages() {
  const { state, isLoading: isGlobalLoading, error: globalError } = useMainState();
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const messages = useMemo(() => {
    return state.messages;
  }, [state.messages]);

  const sendMessage = useCallback(async (conversationId: string, content: string): Promise<boolean> => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await window.electron.invoke(MessageEvents.SEND_MESSAGE, {
        conversationId,
        content
      });
      if (!response.success) {
        setActionError(response.error || 'Failed to send message');
      }
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setActionError(errorMessage);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const deleteMessage = useCallback(async (conversationId: string, messageId: string): Promise<boolean> => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await window.electron.invoke(MessageEvents.DELETE_MESSAGE, {
        conversationId,
        messageId
      });
      if (!response.success) {
        setActionError(response.error || 'Failed to delete message');
      }
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete message';
      setActionError(errorMessage);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const updateMessage = useCallback(async (conversationId: string, messageId: string, content: string): Promise<boolean> => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await window.electron.invoke(MessageEvents.UPDATE_MESSAGE, {
        conversationId,
        messageId,
        content
      });
      if (!response.success) {
        setActionError(response.error || 'Failed to update message');
      }
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update message';
      setActionError(errorMessage);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, []);
  
  const fetchMessages = useCallback(async (convId: string): Promise<boolean> => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const response = await window.electron.invoke(MessageEvents.GET_CONVERSATION_MESSAGES, {
        conversationId: convId
      });
      if (!response.success) {
        setActionError(response.error || 'Failed to fetch messages');
      }
      return response.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
      setActionError(errorMessage);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  return {
    messages,
    isLoading: isGlobalLoading || isActionLoading,
    error: actionError || globalError,
    fetchMessages,
    sendMessage,
    deleteMessage,
    updateMessage
  };
}
