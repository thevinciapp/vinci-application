

import { BaseTab } from 'vinci-ui';
import { MessageSquare } from 'lucide-react';

interface ChatModeTabProps {
  chatMode?: string;
}

export function ChatModeTab({ chatMode }: ChatModeTabProps) {
  return (
    <BaseTab
      icon={<MessageSquare className="w-3 h-3" />}
      label={chatMode || 'Chat Mode'}
      isActive={!!chatMode}
    />
  );
}
