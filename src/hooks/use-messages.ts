import { useState, useEffect, useCallback } from 'react';
import { MessageEvents } from '@/core/ipc/constants';

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export function useMessages(conversationId: string | undefined | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch messages for a conversation
  const fetchMessages = useCallback(async (id: string) => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await window.electron.invoke(MessageEvents.GET_CONVERSATION_MESSAGES, id);
      
      if (response.success && response.data) {
        setMessages(response.data);
        return response.data;
      } else {
        setError(response.error || 'Failed to fetch messages');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching messages');
      console.error('Error fetching messages:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!conversationId) return false;
    
    try {
      const response = await window.electron.invoke(MessageEvents.SEND_MESSAGE, {
        conversationId,
        content
      });
      
      return response.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message');
      return false;
    }
  }, [conversationId]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!conversationId) return false;
    
    try {
      const response = await window.electron.invoke(MessageEvents.DELETE_MESSAGE, {
        conversationId,
        messageId
      });
      
      return response.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete message');
      return false;
    }
  }, [conversationId]);

  // Update a message
  const updateMessage = useCallback(async (messageId: string, content: string): Promise<boolean> => {
    if (!conversationId) return false;
    
    try {
      const response = await window.electron.invoke(MessageEvents.UPDATE_MESSAGE, {
        conversationId,
        messageId,
        content
      });
      
      return response.success;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update message');
      return false;
    }
  }, [conversationId]);

  // Set up listener for message updates
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    // Define handler for message updates
    const handleMessagesUpdate = (event: any, data: { messages: Message[] }) => {
      // Only update if the messages are for the current conversation
      if (data.messages.length > 0 && data.messages[0].conversationId === conversationId) {
        setMessages(data.messages);
      }
    };

    // Add event listener
    window.electron.on(MessageEvents.GET_CONVERSATION_MESSAGES, handleMessagesUpdate);

    // Fetch initial messages
    fetchMessages(conversationId);

    // Cleanup event listener on unmount or when conversationId changes
    return () => {
      window.electron.off(MessageEvents.GET_CONVERSATION_MESSAGES, handleMessagesUpdate);
    };
  }, [conversationId, fetchMessages]);

  // Format messages for AI SDK's useChat
  const formatMessagesForChat = useCallback(() => {
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
    sendMessage,
    deleteMessage,
    updateMessage,
    formatMessagesForChat,
    fetchMessages
  };
}
