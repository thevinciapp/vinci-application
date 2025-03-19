import { useState, useCallback } from 'react';
import { MessageEvents } from '@/core/ipc/constants';
import { useRendererStore } from '@/store/renderer';
import { Message as VinciCommonMessage } from 'vinci-common';

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export function useMessages(conversationId: string | undefined | null) {
  const rendererStore = useRendererStore();
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get messages from local state for this specific conversation
  // We use local state because the renderer store messages might contain messages from different conversations
  // but we filter by the conversationId here
  const messages = localMessages.length > 0 ? localMessages : rendererStore.messages
    .filter(msg => msg.conversationId === conversationId) as unknown as Message[];

  const fetchMessages = useCallback(async (id: string) => {
    if (!id) return null;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await window.electron.invoke(MessageEvents.GET_CONVERSATION_MESSAGES, id);
      
      if (response.success && response.data) {
        // Store messages in both local state and renderer store
        setLocalMessages(response.data);
        rendererStore.setMessages(response.data as unknown as VinciCommonMessage[]);
        return response.data;
      } else {
        const errorMsg = response.error || 'Failed to fetch messages';
        setError(errorMsg);
        rendererStore.setError(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred while fetching messages';
      setError(errorMsg);
      rendererStore.setError(errorMsg);
      console.error('Error fetching messages:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [rendererStore]);

  // Function to set up message update listener
  const setupMessagesListener = useCallback((id: string, callback?: (messages: Message[]) => void) => {
    if (!id) return () => {};
    
    // Define handler for message updates
    const handleMessagesUpdate = (event: any, data: { messages: Message[] }) => {
      // Only update if the messages are for the specified conversation
      if (data.messages.length > 0 && data.messages[0].conversationId === id) {
        setLocalMessages(data.messages);
        rendererStore.setMessages(data.messages as unknown as VinciCommonMessage[]);
        if (callback) callback(data.messages);
      }
    };

    // Add event listener
    window.electron.on(MessageEvents.GET_CONVERSATION_MESSAGES, handleMessagesUpdate);

    // Return cleanup function
    return () => {
      window.electron.off(MessageEvents.GET_CONVERSATION_MESSAGES, handleMessagesUpdate);
    };
  }, [rendererStore]);

  // Send a message
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

  // Delete a message
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

  // Update a message
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

  // Format messages for AI SDK's useChat
  const formatMessagesForChat = useCallback(() => {
    if (!messages) return [];
    
    return messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(msg.createdAt)
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
    setupMessagesListener,
    formatMessagesForChat
  };
}
