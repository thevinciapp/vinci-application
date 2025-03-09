"use client";

import React from 'react';
import { Search, MessageSquare, Calendar } from 'lucide-react';
import { CommandGroup, CommandItem, CommandList } from "vinci-ui";
import { ProviderComponentProps } from '../../types';

interface Message {
  id: string;
  content: string;
  timestamp: number;
  conversationId: string;
  conversationName: string;
}

export function MessageSearchProvider({ searchQuery, onSelect }: ProviderComponentProps) {
  // Example messages - in real implementation, this would be fetched based on search
  const messages: Message[] = [
    {
      id: '1',
      content: 'Let\'s discuss the new React architecture',
      timestamp: Date.now() - 3600000, // 1 hour ago
      conversationId: 'conv1',
      conversationName: 'Project Planning'
    },
    {
      id: '2',
      content: 'Here\'s the implementation for the command center',
      timestamp: Date.now() - 7200000, // 2 hours ago
      conversationId: 'conv2',
      conversationName: 'Development'
    }
  ];

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
        {filteredMessages.length === 0 ? (
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
