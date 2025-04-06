import { ChatContainer } from '@/components/chat/chat-container';
import { useEffect, forwardRef, useRef, memo, useMemo } from 'react';
import { VinciUIMessage } from '@/types/message';
import { JSONValue } from '@ai-sdk/ui-utils';
import { MemoizedMessage } from './memoized-message';
import { PlaceholderMessage } from './placeholder-message';
import { useAutoScroll } from '@/hooks/use-auto-scroll';

interface ChatMessagesProps {
  messages: VinciUIMessage[];
  streamingMessage: VinciUIMessage | null;
  onStickToBottomChange?: (isStickToBottom: boolean) => void;
  onScrollToBottom?: (callback: () => void) => void;
  isLoading?: boolean;
  streamData?: JSONValue[] | undefined;
  spaceId?: string;
}

const ChatMessagesComponent = forwardRef<HTMLDivElement, ChatMessagesProps>(
  ({ messages, streamingMessage, onStickToBottomChange, onScrollToBottom, isLoading, streamData, spaceId }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const actualRef = (ref as React.RefObject<HTMLDivElement>) || containerRef;
    const prevMessagesLengthRef = useRef(messages.length);
    
    const { 
      autoScrollEnabled, 
      scrollToBottom 
    } = useAutoScroll(actualRef, true);
    
    useEffect(() => {
      if (onStickToBottomChange) {
        onStickToBottomChange(autoScrollEnabled);
      }
    }, [autoScrollEnabled, onStickToBottomChange]);
    
    useEffect(() => {
      if (onScrollToBottom && scrollToBottom) {
        const handleScrollToBottom = () => scrollToBottom("smooth");
        onScrollToBottom(handleScrollToBottom);
      }
    }, [onScrollToBottom, scrollToBottom]);
    
    useEffect(() => {
      if (prevMessagesLengthRef.current !== messages.length) {
        prevMessagesLengthRef.current = messages.length;
        console.log('[CLIENT] Chat messages count changed:', { 
          count: messages.length
        });
      }
    }, [messages.length]);

    const streamingMessageExists = useMemo(() => {
      if (!streamingMessage) return false;
      
      return messages.some(
        msg => (msg.id === streamingMessage.id || msg.content === streamingMessage.content) && 
               msg.role === 'assistant'
      );
    }, [messages, streamingMessage]);
    
    const shouldShowStreamingMessage = streamingMessage && !streamingMessageExists;

    const shouldShowPlaceholder = Boolean(
      messages.length > 0 && 
      messages[messages.length - 1].role === 'user' && 
      isLoading && 
      !streamingMessage
    );

    const messageSeparatorMap = useMemo(() => {
      const separators: Record<string, boolean> = {};
      
      messages.forEach((message, index) => {
        if (index < messages.length - 1) {
          separators[message.id] = message.role !== messages[index + 1].role;
        } else {
          if (message.role === 'user') {
            separators[message.id] = Boolean(shouldShowStreamingMessage || shouldShowPlaceholder);
          } else if (message.role === 'assistant') {
            separators[message.id] = false;
          } else {
            separators[message.id] = shouldShowStreamingMessage 
              ? message.role !== streamingMessage.role 
              : false;
          }
        }
      });
      
      return separators;
    }, [messages, streamingMessage, shouldShowStreamingMessage, shouldShowPlaceholder]);

    return (
        <ChatContainer
          ref={actualRef}
          className="absolute inset-0 py-12 px-4 pb-52 h-full"
          autoScroll={true}
        >
          <div className="max-w-[85%] w-full mx-auto">
            <div className="space-y-12">
              {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;
                const isAssistant = message.role === 'assistant';
                const messageStreamData = isLastMessage && isAssistant ? streamData : undefined;
                const messageIsLoading = isLastMessage && isAssistant && (isLoading ?? false);

                return (
                  <MemoizedMessage
                    key={message.id}
                    message={message}
                    index={index}
                    isLoading={messageIsLoading}
                    streamData={messageStreamData}
                    messagesLength={messages.length}
                    shouldAddSeparator={messageSeparatorMap[message.id]}
                    spaceId={spaceId}
                  />
                );
              })}
              
              {shouldShowStreamingMessage && (
                <MemoizedMessage
                  key={streamingMessage.id}
                  message={streamingMessage}
                  index={messages.length}
                  isLoading={true}
                  streamData={streamData}
                  messagesLength={messages.length + 1}
                  shouldAddSeparator={false}
                  spaceId={spaceId}
                />
              )}
              
              {shouldShowPlaceholder && (
                <PlaceholderMessage 
                  needsSeparator={false}
                  streamData={streamData}
                  spaceId={spaceId}
                />
              )}
            </div>
          </div>
        </ChatContainer>
    );
  }
);

ChatMessagesComponent.displayName = 'ChatMessagesComponent';
export const ChatMessages = memo(ChatMessagesComponent);
ChatMessages.displayName = 'ChatMessages';