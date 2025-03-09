"use client";

import React, { useEffect, useState } from 'react';
import { Search, MessageSquare, Calendar } from 'lucide-react';
import { CommandGroup, CommandItem, CommandList } from "vinci-ui";
import { ProviderComponentProps } from '../../types';
import { API } from '@/lib/api-client';
import { Message, Conversation } from '@/types';

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

  // Filter messages based on search query
  const filteredMessages = messages.filter(message => 
    message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.conversationName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format timestamp
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
    <CommandList>
      <CommandGroup heading="Message Search">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Searching messages...</span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">No messages found</p>
        ) : (
          filteredMessages.map(message => (
            <CommandItem
              key={message.id}
              value={message.content}
              onSelect={() => onSelect?.(message)}
              className="flex items-start py-3"
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex flex-col">
                  <p className="font-medium">{message.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{message.conversationName}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            </CommandItem>
          ))
        )}
      </CommandGroup>
    </CommandList>
  );
}
