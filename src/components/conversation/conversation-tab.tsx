import { useState } from 'react';
import { BaseTab } from 'vinci-ui';
import { toast } from '@/components/chat/ui/toast';
import { MessageSquare } from 'lucide-react';
import { Conversation } from '@/types';

interface ConversationTabProps {
  onCreateConversation?: () => Promise<void>;
  activeConversation: Conversation | null;
}

export function ConversationTab({
  onCreateConversation,
  activeConversation
}: ConversationTabProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleNewConversation = async () => {
    if (!onCreateConversation) return;

    setIsCreating(true);
    try {
      await onCreateConversation();
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <BaseTab
      icon={<MessageSquare className="w-3 h-3" />}
      label={activeConversation?.title || 'New Chat'}
      shortcut="C"
      onClick={handleNewConversation}
    />
  );
}