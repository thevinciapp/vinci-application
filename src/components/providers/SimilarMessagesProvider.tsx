

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Command } from 'cmdk';
import { ProviderComponentProps } from '@/types';

interface SimilarMessage {
  id: string;
  content: string;
  timestamp: number;
  conversationId: string;
  conversationName: string;
  similarity: number;
}

export function SimilarMessagesProvider({ searchQuery, onSelect }: ProviderComponentProps) {
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

  const filteredMessages = similarMessages.filter(message => 
    message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.conversationName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <Command.List>
      <Command.Group heading="Similar Messages">
        {filteredMessages.length === 0 ? (
          <Command.Empty>No similar messages found</Command.Empty>
        ) : (
          filteredMessages.map(message => (
            <Command.Item
              key={message.id}
              value={message.content}
              onSelect={() => onSelect?.({...message, closeOnSelect: true})}
            >
              <MessageSquare size={16} className="text-purple-500" />
              <div>
                {message.content}
                <span className="cmdk-meta">
                  {message.conversationName} • {formatTimestamp(message.timestamp)} • {Math.round(message.similarity * 100)}% similar
                </span>
              </div>
            </Command.Item>
          ))
        )}
      </Command.Group>
    </Command.List>
  );
}
