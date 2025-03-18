"use client";

import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Command } from 'cmdk';
import { Message, Conversation, ProviderComponentProps } from '@/src/types';
import { MessageEvents } from '@/src/core/ipc/constants';

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
      if (!searchQuery || searchQuery.length < 2) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await window.electron.invoke(MessageEvents.SEARCH_MESSAGES, searchQuery);
        
        if (result.success) {
          const messagesWithConversations: MessageWithConversation[] = (result.data || []).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.createdAt).getTime(),
            conversationName: msg.conversationTitle || 'Untitled'
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

    const timer = setTimeout(() => {
      fetchMessages();
    }, 300); // Debounce search

    return () => clearTimeout(timer);
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
              <MessageSquare size={16} className={message.role === 'assistant' ? 'text-cyan-400' : 'text-white/60'} />
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
