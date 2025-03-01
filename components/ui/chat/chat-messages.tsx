'use client';

import { ChatContainer, useAutoScroll } from '@/components/ui/chat-container';
import { useEffect, forwardRef, useRef, useState, useCallback } from 'react';
import { ChatMessage } from './chat-message';
import { JSONValue, Message } from 'ai';
import { useSearchParams, useRouter } from 'next/navigation';

interface ChatMessagesProps {
  messages: Message[];
  onStickToBottomChange?: (isStickToBottom: boolean) => void;
  onScrollToBottom?: (callback: () => void) => void;
  isLoading?: boolean;
  streamData?: JSONValue[] | undefined;
}

export const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  ({ messages, onStickToBottomChange, onScrollToBottom, isLoading, streamData }, ref) => {
    const [highlightedElement, setHighlightedElement] = useState<HTMLDivElement | null>(null);
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const actualRef = (ref as React.RefObject<HTMLDivElement>) || containerRef;
    
    const { 
      autoScrollEnabled, 
      scrollToBottom 
    } = useAutoScroll(actualRef, true);
    
    useEffect(() => {
      if (onStickToBottomChange) {
        onStickToBottomChange(autoScrollEnabled);
      }
    }, [autoScrollEnabled, onStickToBottomChange]);
    
    // Expose scrollToBottom to parent
    useEffect(() => {
      if (onScrollToBottom && scrollToBottom) {
        // Create a function that parent can call
        const handleScrollToBottom = () => scrollToBottom("smooth");
        // Provide the callback to the parent
        onScrollToBottom(handleScrollToBottom);
      }
    }, [onScrollToBottom, scrollToBottom]);

    return (
      <div className="relative flex-1 flex flex-col h-full">
        <ChatContainer
          ref={actualRef}
          className="absolute inset-0 py-12 px-4 pb-52"
          autoScroll={true}
        >
          <div className="max-w-[85%] w-full mx-auto">
            <div className="space-y-12">
              {messages.map((message, index) => (
                <div 
                  key={message.id} 
                  ref={(el) => {
                    if (el && message.id !== 'streaming-message') {
                      messageRefs.current.set(message.id, el);
                    }
                  }}
                  className={`transition-all ${
                    highlightedElement === messageRefs.current.get(message.id) && !hasUserInteracted
                      ? 'bg-cyan-950/20 -mx-6 px-6 py-4 rounded-lg border-2 border-cyan-500/50 animate-highlight-glow relative z-10 shadow-xl' 
                      : ''
                  }`}
                >
                  {highlightedElement === messageRefs.current.get(message.id) && !hasUserInteracted && (
                    <div className="absolute top-2 right-3 text-xs text-cyan-400 animate-pulse-fast">
                      Click anywhere to dismiss
                    </div>
                  )}
                  <ChatMessage 
                    message={message} 
                    isLoading={isLoading}
                    streamData={streamData}
                  />
                  {index < messages.length - 1 && messages[index].role !== messages[index + 1].role && (
                    <div className="w-full flex justify-center my-8">
                      <div className="w-1/3 h-px bg-white/[0.05]" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Add placeholder assistant message when last message is from user and we're loading */}
              {messages.length > 0 && 
               messages[messages.length - 1].role === 'user' && 
               isLoading && (
                <div key="placeholder-assistant" className="space-y-2">
                  {messages.length > 1 && messages[messages.length - 1].role !== messages[messages.length - 2].role && (
                    <div className="w-full flex justify-center my-8">
                      <div className="w-1/3 h-px bg-white/[0.05]" />
                    </div>
                  )}
                  <ChatMessage 
                    message={{
                      id: 'placeholder-assistant',
                      role: 'assistant',
                      content: '',
                    }}
                    isLoading={true}
                    streamData={[{ status: 'Processing...' }]}
                  />
                </div>
              )}
            </div>
          </div>
        </ChatContainer>
      </div>
    );
  }
);

ChatMessages.displayName = 'ChatMessages';