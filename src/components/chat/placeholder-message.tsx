import { memo } from 'react';
import { ChatMessage } from './chat-message';
import { JSONValue } from '@ai-sdk/ui-utils';

interface PlaceholderMessageProps {
  needsSeparator: boolean;
  streamData?: JSONValue[];
  spaceId?: string;
}

export const PlaceholderMessage = memo(({ 
  needsSeparator,
  streamData,
  spaceId
}: PlaceholderMessageProps) => {
  return (
    <div className="space-y-2">
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
          user_id: 'assistant_placeholder_id',
          conversation_id: 'placeholder_conv_id',
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          annotations: [],
        }}
        isLoading={true}
        streamData={streamData || [{ status: 'Processing...' }]}
        spaceId={spaceId}
      />
    </div>
  );
});

PlaceholderMessage.displayName = 'PlaceholderMessage'; 