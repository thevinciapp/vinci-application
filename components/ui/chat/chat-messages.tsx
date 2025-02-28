'use client';

import { useStickToBottom } from '@/hooks/use-stick-to-bottom';
import { useEffect, forwardRef, useMemo, useRef, useState, useCallback } from 'react';
import { ChatMessage } from './chat-message';
import { JSONValue, Message } from 'ai';
import { useSearchParams, useRouter } from 'next/navigation';

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
    const searchParams = useSearchParams();
    const router = useRouter();
    const highlightedMessageId = searchParams.get('highlight');
    const [highlightedElement, setHighlightedElement] = useState<HTMLDivElement | null>(null);
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [hasUserInteracted, setHasUserInteracted] = useState(false);

    useEffect(() => {
      onStickToBottomChange?.(isStickToBottom);
    }, [isStickToBottom, onStickToBottomChange]);

    useEffect(() => {
      if (containerRef.current && onScrollToBottom) {
        onScrollToBottom();
      }
    }, [onScrollToBottom]);

    // Reset interaction state when a new message is highlighted
    useEffect(() => {
      if (highlightedMessageId) {
        setHasUserInteracted(false);
      }
    }, [highlightedMessageId]);

    // Handle user interaction to dismiss highlight
    const handleUserInteraction = useCallback(() => {
      if (highlightedMessageId && !hasUserInteracted) {
        setHasUserInteracted(true);
        
        // Create a new URLSearchParams without the highlight parameter
        const params = new URLSearchParams(searchParams);
        params.delete('highlight');
        
        // Update the URL without the highlight parameter (to make it cleaner)
        // Using replace to avoid adding to browser history
        router.replace(`?${params.toString()}`);
      }
    }, [highlightedMessageId, hasUserInteracted, searchParams, router]);

    // Attach event listeners for user interaction
    useEffect(() => {
      if (highlightedMessageId && containerRef.current) {
        const container = containerRef.current;
        
        // Only add these listeners if we have a highlighted message
        container.addEventListener('click', handleUserInteraction);
        container.addEventListener('scroll', handleUserInteraction);
        
        return () => {
          container.removeEventListener('click', handleUserInteraction);
          container.removeEventListener('scroll', handleUserInteraction);
        };
      }
    }, [highlightedMessageId, handleUserInteraction]);

    // Handle scrolling to highlighted message when navigating from similar messages
    useEffect(() => {
      if (highlightedMessageId && messageRefs.current.has(highlightedMessageId)) {
        const messageElement = messageRefs.current.get(highlightedMessageId);
        if (messageElement && containerRef.current) {
          // Scroll to the message with offset from the top
          containerRef.current.scrollTo({
            top: messageElement.offsetTop - 100, // 100px offset from top
            behavior: 'smooth'
          });
          
          // Highlight the message
          setHighlightedElement(messageElement);
          
          // The highlight remains until user interaction
          // No timeout to automatically remove it
        }
      }
    }, [highlightedMessageId]);

    return (
      <div className="relative flex-1 flex flex-col h-full">
        <div
          ref={ref}
          className="messages-container absolute inset-0 overflow-y-auto py-12 px-4 pb-52"
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
        </div>
      </div>
    );
  }
);

ChatMessages.displayName = 'ChatMessages';