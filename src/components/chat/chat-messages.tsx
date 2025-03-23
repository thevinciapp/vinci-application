

import { ChatContainer, useAutoScroll } from '@/components/chat/chat-container';
import { useEffect, forwardRef, useRef, memo, useMemo } from 'react';
import { ChatMessage } from './chat-message';
import { JSONValue, Message } from 'ai';

interface ChatMessagesProps {
  messages: Message[];
  onStickToBottomChange?: (isStickToBottom: boolean) => void;
  onScrollToBottom?: (callback: () => void) => void;
  isLoading?: boolean;
  streamData?: JSONValue[] | undefined;
  spaceId?: string;
}

const MemoizedMessage = memo(({ 
  message, 
  index, 
  isLoading, 
  streamData, 
  messagesLength, 
  nextMessageRole, 
  shouldAddSeparator,
  spaceId 
}: { 
  message: Message; 
  index: number; 
  isLoading: boolean; 
  streamData?: JSONValue[];
  messagesLength: number;
  nextMessageRole?: string;
  shouldAddSeparator: boolean;
  spaceId?: string;
}) => {
  const messageRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div 
        key={message.id} 
        ref={messageRef}
        className="transition-all"
      >
        <ChatMessage 
          message={message} 
          isLoading={isLoading}
          streamData={streamData}
          spaceId={spaceId}
        />
      </div>
      {shouldAddSeparator && (
        <div className="w-full flex justify-center my-8">
          <div className="w-1/3 h-px bg-white/[0.05]" />
        </div>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.content !== nextProps.message.content) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  
  if (prevProps.message.role === 'assistant' && prevProps.isLoading && nextProps.isLoading) {
    const prevStreamLength = prevProps.streamData?.length || 0;
    const nextStreamLength = nextProps.streamData?.length || 0;
    return (nextStreamLength - prevStreamLength < 5);
  }
  
  return true;
});

MemoizedMessage.displayName = 'MemoizedMessage';

const PlaceholderMessage = memo(({ 
  needsSeparator,
  streamData,
  spaceId
}: { 
  needsSeparator: boolean;
  streamData?: JSONValue[];
  spaceId?: string;
}) => {
  return (
    <div key="placeholder-assistant" className="space-y-2">
      {needsSeparator && (
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
        streamData={streamData || [{ status: 'Processing...' }]}
        spaceId={spaceId}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  const prevStreamLength = prevProps.streamData?.length || 0;
  const nextStreamLength = nextProps.streamData?.length || 0;
  return (nextStreamLength - prevStreamLength < 5);
});

PlaceholderMessage.displayName = 'PlaceholderMessage';

const ChatMessagesComponent = forwardRef<HTMLDivElement, ChatMessagesProps>(
  ({ messages, onStickToBottomChange, onScrollToBottom, isLoading, streamData, spaceId }, ref) => {
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

    const messageSeparatorMap = useMemo(() => {
      const separators: Record<string, boolean> = {};
      
      messages.forEach((message, index) => {
        if (index < messages.length - 1) {
          separators[message.id] = message.role !== messages[index + 1].role;
        } else {
          separators[message.id] = false;
        }
      });
      
      return separators;
    }, [messages]);

    const needsPlaceholderSeparator = useMemo(() => {
      return messages.length > 1 && 
        messages[messages.length - 1].role !== 'assistant';
    }, [messages]);
    
    const shouldShowPlaceholder = messages.length > 0 && 
      messages[messages.length - 1].role === 'user' && 
      isLoading;

    return (
        <ChatContainer
          ref={actualRef}
          className="absolute inset-0 py-12 px-4 pb-52 h-full"
          autoScroll={true}
        >
          <div className="max-w-[85%] w-full mx-auto">
            <div className="space-y-12">
              {messages.map((message, index) => (
                <MemoizedMessage
                  key={message.id}
                  message={message}
                  index={index}
                  isLoading={isLoading}
                  streamData={index === messages.length - 1 && message.role === 'assistant' ? streamData : undefined}
                  messagesLength={messages.length}
                  nextMessageRole={index < messages.length - 1 ? messages[index + 1].role : undefined}
                  shouldAddSeparator={messageSeparatorMap[message.id]}
                  spaceId={spaceId}
                />
              ))}
              
              {shouldShowPlaceholder && (
                <PlaceholderMessage 
                  needsSeparator={needsPlaceholderSeparator}
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