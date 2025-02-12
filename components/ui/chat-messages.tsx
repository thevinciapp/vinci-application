'use client';

import { useStickToBottom } from '@/hooks/use-stick-to-bottom';
import { FC, useEffect, useState, forwardRef } from 'react';
import { ChatMessage } from './chat-message';
import { Message } from 'ai';

interface ChatMessagesProps {
  messages: Message[];
  onStickToBottomChange?: (isStickToBottom: boolean) => void;
  onScrollToBottom?: () => void;
}

export const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  ({ messages, onStickToBottomChange, onScrollToBottom }, ref) => {
    const { containerRef, isStickToBottom } = useStickToBottom();
    const [isMessagesReady, setIsMessagesReady] = useState(false);

    useEffect(() => {
      if (messages.length > 0) {
        setIsMessagesReady(true);
      }
    }, [messages]);

    useEffect(() => {
      if (messages.length === 0) {
        setIsMessagesReady(false);
      }
    }, [messages.length]);

    useEffect(() => {
      onStickToBottomChange?.(isStickToBottom);
    }, [isStickToBottom, onStickToBottomChange]);

    // Expose scrollToBottom method through ref
    useEffect(() => {
      if (containerRef.current && onScrollToBottom) {
        onScrollToBottom();
      }
    }, [onScrollToBottom]);

    const scrollToBottom = () => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    };

    return (
      <div className="relative flex-1 flex flex-col">
        <div
          ref={containerRef}
          className={`messages-container absolute inset-0 ${
            isMessagesReady ? 'overflow-y-auto' : 'overflow-hidden'
          } py-12 px-4 pb-52 transition-opacity duration-200 ${
            isMessagesReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="max-w-[85%] mx-auto">
            <div className="space-y-12 min-h-full">
              {isMessagesReady && messages.map((message, index) => (
                <div key={message.id}>
                  <ChatMessage message={message} />
                  {index < messages.length - 1 && messages[index].role !== messages[index + 1].role && (
                    <div className="w-full flex justify-center my-8">
                      <div className="w-1/3 h-px bg-white/[0.05]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ChatMessages.displayName = 'ChatMessages';