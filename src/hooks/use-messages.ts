import { useState, useCallback, useMemo } from 'react';
import { MessageEvents } from '@/core/ipc/constants';
import { useMainState } from '@/context/MainStateContext';

export function useMessages() {
  const { state, isLoading: isGlobalLoading, error: globalError } = useMainState();

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const messages = useMemo(() => state.messages || [], [state.messages]);

  console.log('messages', messages);

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
  
  return {
    messages,
    isLoading: isGlobalLoading || isActionLoading,
    error: actionError || globalError,
    sendMessage,
    deleteMessage,
    updateMessage
  };
}
