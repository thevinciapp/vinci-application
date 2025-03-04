'use client';

import React, { ReactNode, useCallback, useEffect, useState, useRef } from 'react';
import { CommandOption, useCommandCenter, useCommandRegistration } from '@/hooks/useCommandCenter';
import { MessageSquare, MessageSquareText, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSpaceStore } from '@/stores/space-store';
import { useShallow } from 'zustand/react/shallow';

// Define the SimilarMessage type
export interface SimilarMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: number;
  score: number;
  conversationId?: string;
  metadata?: Record<string, any>;
}

interface SimilarMessagesCommandProviderProps {
  children: ReactNode;
}

// Create a formatting function for the date
function formatDate(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Unknown date";
    }
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Unknown date";
  }
}

export function SimilarMessagesCommandProvider({ children }: SimilarMessagesCommandProviderProps) {
  const [similarMessages, setSimilarMessages] = useState<SimilarMessage[]>([]);
  const { 
    closeCommandCenter, 
    openCommandType, 
    activeCommandType,
    setActiveCommandType,
    registerSearchableCommand, 
    unregisterSearchableCommand
  } = useCommandCenter();
  const router = useRouter();
  
  const { selectConversation } = useSpaceStore();
  const registeredCommandsRef = useRef<CommandOption[]>([]);

  // Listen for command center closing or type change
  useEffect(() => {
    // When active command type changes from similarMessages to something else,
    // clear the similar messages to prevent them from appearing in other command types
    if (activeCommandType !== 'similarMessages' && similarMessages.length > 0) {
      setTimeout(() => {
        setSimilarMessages([]);
      }, 100); // Small delay to prevent UI flicker
    }
  }, [activeCommandType, similarMessages.length]);
  
  // We already get these from the hook at component level
  
  // Register the searchable command with the hideFromCommandList option
  useEffect(() => {
    // This will make sure the similar messages aren't shown in the main command list
    registerSearchableCommand('similarMessages', {
      minSearchLength: 0,
      hideFromCommandList: true
    });
    
    return () => {
      // Clean up on unmount
      unregisterSearchableCommand('similarMessages');
    };
  }, [registerSearchableCommand, unregisterSearchableCommand]);

  // Create a function that will be globally available
  const openSimilarMessages = useCallback((messages: SimilarMessage[]) => {
    if (messages && messages.length > 0) {
      setSimilarMessages(messages);
      openCommandType('similarMessages');
    }
  }, [openCommandType]);

  // Attach the function to the window for global access
  useEffect(() => {
    (window as any).openSimilarMessages = openSimilarMessages;
    
    return () => {
      delete (window as any).openSimilarMessages;
    };
  }, [openSimilarMessages]);

  // Get command options for similar messages
  const similarMessageCommands = useCallback((): CommandOption[] => {
    if (!similarMessages || similarMessages.length === 0) {
      return [{
        id: 'no-similar-messages',
        name: 'No similar messages found',
        value: 'No similar messages found',
        description: 'There are no similar messages to display',
        icon: <MessageSquare className="h-4 w-4" />,
        type: 'similarMessages',
        keywords: ['similar', 'message', 'none'],
        action: () => {},
      }];
    }

    return similarMessages.map((message) => {
      const isAssistant = message.role === 'assistant';
      const messageContent = message.content || "";
      
      // Create a display content that's truncated if too long
      let displayContent = messageContent;
      const maxLength = 100;
      if (displayContent.length > maxLength) {
        displayContent = displayContent.substring(0, maxLength) + '...';
      }
      
      const similarityPercentage = Math.round(message.score * 100);
      
      return {
        id: `similar-message-${message.id}`,
        name: displayContent,
        value: message.content,
        description: `${similarityPercentage}% similar - ${formatDate(message.createdAt)}`,
        icon: (
          <div className="flex items-center justify-center rounded-full bg-white/5 w-8 h-8">
            {isAssistant ? (
              <MessageSquareText className="h-5 w-5 text-cyan-400/70" />
            ) : (
              <MessageSquare className="h-5 w-5 text-white/70" />
            )}
          </div>
        ),
        type: 'similarMessages',
        keywords: ['similar', 'message', ...(messageContent.split(/\s+/).slice(0, 10))],
        action: () => {
          // Navigate to the conversation containing this message
          if (message.conversationId) {
            selectConversation(message.conversationId);
            closeCommandCenter();
          }
        },
        rightElement: (
          <div className={`
            px-1.5 py-0.5 text-xs font-medium rounded 
            ${isAssistant 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
              : 'bg-green-500/20 text-green-400 border border-green-500/30'}
          `}>
            {isAssistant ? "AI" : "You"}
          </div>
        ),
      };
    });
  }, [similarMessages, closeCommandCenter, selectConversation]);

  // Set up registration of commands
  const commands = similarMessageCommands();
  registeredCommandsRef.current = commands;
  
  // Only register commands when there are actually similar messages to show
  useCommandRegistration(similarMessages.length > 0 ? commands : []);

  return <>{children}</>;
}