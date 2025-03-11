"use client";

import React from 'react';
import { MessageSquare, Sparkles, Calendar } from 'lucide-react';
import { CommandGroup, CommandItem, CommandList } from "vinci-ui";
import { ProviderComponentProps } from '../../types';

interface SimilarMessage {
  id: string;
  content: string;
  timestamp: number;
  conversationId: string;
  conversationName: string;
  similarity: number;
}

export function SimilarMessagesProvider({ searchQuery, onSelect }: ProviderComponentProps) {
  // Example similar messages - in real implementation, this would be fetched based on current context
  const similarMessages: SimilarMessage[] = [
    {
      id: '1',
      content: 'Here\'s how we implemented the command center pattern',
      timestamp: Date.now() - 86400000, // 1 day ago
      conversationId: 'conv1',
      conversationName: 'Architecture Discussion',
      similarity: 0.85
    },
    {
      id: '2',
      content: 'The command center should handle all user interactions',
      timestamp: Date.now() - 172800000, // 2 days ago
      conversationId: 'conv2',
      conversationName: 'Design Review',
      similarity: 0.75
    }
  ];

  // Filter messages based on search query
  const filteredMessages = similarMessages.filter(message => 
    message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.conversationName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 1) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    }
    return date.toLocaleDateString();
  };

  return (
    <CommandList>
      <CommandGroup heading="Similar Messages">
        {filteredMessages.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">No similar messages found</p>
        ) : (
          filteredMessages.map(message => (
            <CommandItem
              key={message.id}
              value={message.content}
              onSelect={() => onSelect?.({...message, closeOnSelect: true})}
              className="flex items-start justify-between py-3"
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-purple-500 mt-0.5" />
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
              
              <div className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-500/20 text-purple-500 border border-purple-500/30">
                {Math.round(message.similarity * 100)}% similar
              </div>
            </CommandItem>
          ))
        )}
      </CommandGroup>
    </CommandList>
  );
}
