"use client";

import React from 'react';
import { MessageSquare, Sparkles, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProviderComponentProps } from '../../types';

interface SimilarMessage {
  id: string;
  content: string;
  timestamp: number;
  conversationId: string;
  conversationName: string;
  similarity: number;
}

export function SimilarMessagesProvider({ searchQuery, onSelect, onAction }: ProviderComponentProps) {
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

  // Render empty state if no similar messages found
  if (!filteredMessages.length) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-gray-500">
        <Sparkles className="h-8 w-8 mb-2 text-gray-400" />
        <p>No similar messages found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {filteredMessages.map(message => (
        <div
          key={message.id}
          className={cn(
            "flex items-center justify-between p-3 rounded-lg",
            "bg-white/[0.03] hover:bg-white/[0.06]",
            "border border-white/[0.05]",
            "transition-all duration-200 ease-in-out",
            "cursor-pointer"
          )}
          onClick={() => onSelect?.(message)}
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="h-4 w-4 text-purple-400" />
            <div className="flex flex-col">
              <span className="text-sm">{message.content}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{message.conversationName}</span>
                <span className="text-xs text-gray-500">•</span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
            {Math.round(message.similarity * 100)}% similar
          </div>
        </div>
      ))}
    </div>
  );
}
