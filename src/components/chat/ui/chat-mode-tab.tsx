import { BaseTab } from 'vinci-ui';
import { MessageSquare } from 'lucide-react';
import { Space } from '@/types';

interface ChatModeTabProps {
  space: Space | null;
}

export function ChatModeTab({ space }: ChatModeTabProps) {
  return (
    <BaseTab
      icon={<MessageSquare className="w-3 h-3" />}
      label={space?.chat_mode || 'Chat Mode'}
      isActive={!!space?.chat_mode}
    />
  );
}
