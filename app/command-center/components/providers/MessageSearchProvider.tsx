"use client";

import React from 'react';
import { Search, MessageSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProviderComponentProps } from '../../types';

interface Message {
  id: string;
  content: string;
  timestamp: number;
  conversationId: string;
  conversationName: string;
}

export function MessageSearchProvider({ searchQuery, onSelect, onAction }: ProviderComponentProps) {
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

  // Render empty state if no messages found
  if (!filteredMessages.length) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-gray-500">
        <Search className="h-8 w-8 mb-2 text-gray-400" />
        <p>No messages found</p>
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
            <MessageSquare className="h-4 w-4 text-blue-400" />
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
        </div>
      ))}
    </div>
  );
}
