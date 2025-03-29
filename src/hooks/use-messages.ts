import { useState, useCallback, useMemo } from 'react';
import { MessageEvents } from '@/core/ipc/constants';
import { useRendererStore } from '@/store/renderer';
import { Message } from '@/types/message';

export function useMessages(conversationId: string | undefined | null) {
  const rendererStore = useRendererStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const messages = useMemo(() => 
    rendererStore.messages
      .filter(msg => msg.conversation_id === conversationId) as Message[],
    [rendererStore.messages, conversationId]
  );

  const fetchMessages = useCallback(async (id: string) => {
    if (!id || hasFetched) return null;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await window.electron.invoke(MessageEvents.GET_CONVERSATION_MESSAGES, id);
      
      if (response.success && response.messages?.items) {
        rendererStore.setMessages(response.messages.items as Message[]);
        setHasFetched(true);
        return response.messages.items;
      } else {
        let errorMsg = response.error || 'Failed to fetch messages';
        if (errorMsg.includes('[object Object]')) {
          errorMsg = 'Failed to fetch messages due to a serialization error';
        }
        setError(errorMsg);
        rendererStore.setError(errorMsg);
        console.warn(`Message fetch failed for conversation ${id}: ${errorMsg}`);
        return null;
      }
    } catch (err) {
      let errorMsg = '';
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === 'object' && err !== null) {
        try {
          errorMsg = JSON.stringify(err);
        } catch (e) {
          errorMsg = 'An error occurred but could not be serialized';
        }
      } else {
        errorMsg = String(err) || 'An unknown error occurred while fetching messages';
      }
      
      if (errorMsg.includes('[object Object]')) {
        errorMsg = 'Failed to fetch messages due to a serialization error';
      }
      
      setError(errorMsg);
      rendererStore.setError(errorMsg);
      console.error(`Error fetching messages for conversation ${id}:`, err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [rendererStore, hasFetched]);


  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!conversationId) return false;
    
    try {
      setIsLoading(true);
      const response = await window.electron.invoke(MessageEvents.SEND_MESSAGE, {
        conversationId,
        content
      });
      
      return response.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!conversationId) return false;
    
    try {
      setIsLoading(true);
      const response = await window.electron.invoke(MessageEvents.DELETE_MESSAGE, {
        conversationId,
        messageId
      });
      
      return response.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete message');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  const updateMessage = useCallback(async (messageId: string, content: string): Promise<boolean> => {
    if (!conversationId) return false;
    
    try {
      setIsLoading(true);
      const response = await window.electron.invoke(MessageEvents.UPDATE_MESSAGE, {
        conversationId,
        messageId,
        content
      });
      
      return response.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update message');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);
  
  const formatMessagesForChat = useCallback(() => {
    if (!messages) return [];
    
    return messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(msg.created_at)
    }));
  }, [messages]);

  return {
    messages,
    isLoading,
    error,
    fetchMessages,
    sendMessage,
    deleteMessage,
    updateMessage,
    formatMessagesForChat
  };
}
