"use client";

import React, { useEffect, useState } from 'react';
import { Search, MessageSquare, Calendar } from 'lucide-react';
import { Command } from 'cmdk';
import { ProviderComponentProps } from '../../types';
import { API } from '@/src/types/api-client';
import { Message, Conversation } from '@/src/types';

interface MessageWithConversation extends Message {
  timestamp: number;
  conversationName: string;
  conversation?: Conversation;
}

export function MessageSearchProvider({ searchQuery, onSelect }: ProviderComponentProps) {
  const [messages, setMessages] = useState<MessageWithConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!searchQuery) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      try {
        const result = await API.messages.getMessages(searchQuery);
        if (result.success) {
          const messagesWithConversations: MessageWithConversation[] = (result.data || []).map(msg => ({
            ...msg,
            timestamp: new Date(msg.created_at).getTime(),
            conversationName: msg.conversation?.title || 'Untitled'
          })) || [];
          setMessages(messagesWithConversations);
        } else {
          console.error('Error fetching messages:', result.error);
        }
      } catch (error) {
        console.error('Error searching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    fetchMessages();
  }, [searchQuery]);

  const filteredMessages = messages.filter(message => 
    message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.conversationName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }
    return date.toLocaleDateString();
  };

  return (
    <Command.List>
      <Command.Group heading="Message Search">
        {isLoading ? (
          <Command.Loading>Searching messages...</Command.Loading>
        ) : filteredMessages.length === 0 ? (
          <Command.Empty>No messages found</Command.Empty>
        ) : (
          filteredMessages.map(message => (
            <Command.Item
              key={message.id}
              value={message.content}
              onSelect={() => onSelect?.({...message, closeOnSelect: true})}
            >
              <MessageSquare size={16} />
              <div>
                {message.content}
                <span className="cmdk-meta">
                  {message.conversationName} • {formatTimestamp(message.timestamp)}
                </span>
              </div>
            </Command.Item>
          ))
        )}
      </Command.Group>
    </Command.List>
  );
}
