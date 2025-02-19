'use client';

import { useStickToBottom } from '@/hooks/use-stick-to-bottom';
import { FC, useEffect, useState, forwardRef } from 'react';
import { ChatMessage } from './chat-message';
import { LoadingMessage } from './loading-message';
import { Message } from 'ai';

interface ChatMessagesProps {
  messages: Message[];
  onStickToBottomChange?: (isStickToBottom: boolean) => void;
  onScrollToBottom?: () => void;
  isLoading?: boolean;
}

export const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  ({ messages, onStickToBottomChange, onScrollToBottom, isLoading }, ref) => {
    const { containerRef, isStickToBottom } = useStickToBottom();

    useEffect(() => {
      onStickToBottomChange?.(isStickToBottom);
    }, [isStickToBottom, onStickToBottomChange]);

    useEffect(() => {
      if (containerRef.current && onScrollToBottom) {
        onScrollToBottom();
      }
    }, [onScrollToBottom]);

    return (
      <div className="relative flex-1 flex flex-col">
        <div
          ref={containerRef}
          className="messages-container absolute inset-0 overflow-y-auto py-12 px-4 pb-52"
        >
          <div className="max-w-[85%] mx-auto">
            <div className="space-y-12 min-h-full">
              {messages.map((message, index) => (
                <div key={message.id}>
                  <ChatMessage message={message} />
                  {index < messages.length - 1 && messages[index].role !== messages[index + 1].role && (
                    <div className="w-full flex justify-center my-8">
                      <div className="w-1/3 h-px bg-white/[0.05]" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <>
                  {messages.length > 0 && (
                    <div className="w-full flex justify-center my-8">
                      <div className="w-1/3 h-px bg-white/[0.05]" />
                    </div>
                  )}
                  <LoadingMessage />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ChatMessages.displayName = 'ChatMessages';