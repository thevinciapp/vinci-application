'use client';

import { useStickToBottom } from '@/hooks/use-stick-to-bottom';
import { useEffect, forwardRef, useMemo } from 'react';
import { ChatMessage } from './chat-message';
import { JSONValue, Message } from 'ai';

interface ChatMessagesProps {
  messages: Message[];
  onStickToBottomChange?: (isStickToBottom: boolean) => void;
  onScrollToBottom?: () => void;
  isLoading?: boolean;
  streamData?: JSONValue[] | undefined;
}

export const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  ({ messages, onStickToBottomChange, onScrollToBottom, isLoading, streamData }, ref) => {
    const { containerRef, isStickToBottom } = useStickToBottom();

    useEffect(() => {
      onStickToBottomChange?.(isStickToBottom);
    }, [isStickToBottom, onStickToBottomChange]);

    useEffect(() => {
      if (containerRef.current && onScrollToBottom) {
        onScrollToBottom();
      }
    }, [onScrollToBottom]);

    // Create a placeholder assistant message when streaming
    const displayMessages = useMemo(() => {
      if (!isLoading) return messages;
      
      // Check if the last message is from the user
      const lastMessage = messages[messages.length - 1];
      const isLastMessageFromUser = lastMessage && lastMessage.role === 'user';
      
      if (isLastMessageFromUser) {
        // Add a placeholder assistant message for streaming
        return [
          ...messages,
          {
            id: 'streaming-message',
            role: 'assistant',
            content: '',
          } as Message
        ];
      }
      
      return messages;
    }, [messages, isLoading]);

    return (
      <div className="relative flex-1 flex flex-col h-full">
        <div
          ref={containerRef}
          className="messages-container absolute inset-0 overflow-y-auto py-12 px-4 pb-52"
        >
          <div className="max-w-[85%] w-full mx-auto">
            <div className="space-y-12">
              {displayMessages.map((message, index) => (
                <div key={message.id}>
                  <ChatMessage 
                    message={message} 
                    isLoading={isLoading}
                    streamData={streamData}
                  />
                  {index < displayMessages.length - 1 && displayMessages[index].role !== displayMessages[index + 1].role && (
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