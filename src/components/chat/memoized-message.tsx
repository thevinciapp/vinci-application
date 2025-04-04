import { memo, useRef } from 'react';
import { ChatMessage } from './chat-message';
import { Message } from '../../types/message';
import { JSONValue } from '@ai-sdk/ui-utils';

// Define props for MemoizedMessage
interface MemoizedMessageProps {
  message: Message;
  index: number; // Keep for key/debugging if needed
  isLoading: boolean; // Directly use the passed prop
  streamData?: JSONValue[]; // Directly use the passed prop
  messagesLength: number; // Keep for key/debugging if needed
  shouldAddSeparator: boolean;
  spaceId?: string;
}

export const MemoizedMessage = memo(({ 
  message, 
  isLoading,
  streamData, 
  shouldAddSeparator,
  spaceId,
}: MemoizedMessageProps) => {
  const messageRef = useRef<HTMLDivElement>(null);
  
  return (
    <>
      <div 
        ref={messageRef}
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
});

MemoizedMessage.displayName = 'MemoizedMessage'; 