import { useState } from 'react';
import { BaseTab } from 'vinci-ui';
import { toast } from '@/components/chat/ui/toast';
import { MessageSquare, Edit, Trash, Archive, Share2 } from 'lucide-react';
import { Conversation } from '@/types/conversation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button
} from 'vinci-ui';

export interface ConversationTabProps {
  activeConversation: Conversation | null;
  onCreateConversation?: (title: string) => Promise<void>;
  onClick?: () => void;
}

export function ConversationTab({ activeConversation, onCreateConversation, onClick }: ConversationTabProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleClick = async () => {
    if (onClick) {
      onClick();
    } else if (onCreateConversation && !activeConversation) {
      setIsCreating(true);
      try {
        await onCreateConversation('New Conversation');
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
    }
  };

  const handleConversationAction = async (action: string) => {
    try {
      toast({
        title: 'Success',
        description: `Conversation ${action}`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action.toLowerCase()} conversation`,
        variant: 'destructive',
      });
    }
  };

  const recentConversations = [
    {
      id: 'conv-1',
      title: 'Project Setup',
      preview: 'Last message about setup instructions...',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'conv-2',
      title: 'API Integration',
      preview: 'We need to connect to the database first...',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'conv-3',
      title: 'UI Design Discussion',
      preview: 'What do you think about using dark mode as default?',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
          <BaseTab
            icon={<MessageSquare className="w-3 h-3" />}
            label={activeConversation?.title || 'New Conversation'}
            isActive={!!activeConversation}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-[280px] max-h-[400px] mb-1.5 overflow-y-auto">
        <DropdownMenuLabel>Conversation</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {activeConversation && (
          <>
            <DropdownMenuItem
              onSelect={() => handleConversationAction('Renamed')}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              <span>Rename Conversation</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => handleConversationAction('Shared')}
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Conversation</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => handleConversationAction('Archived')}
              className="flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              <span>Archive Conversation</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => handleConversationAction('Deleted')}
              className="flex items-center gap-2 text-red-500"
            >
              <Trash className="w-4 h-4" />
              <span>Delete Conversation</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem
          onSelect={handleClick}
          className="flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          <span>New Conversation</span>
        </DropdownMenuItem>
        
        {recentConversations.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Recent Conversations</DropdownMenuLabel>
            {recentConversations.map((conversation) => (
              <DropdownMenuItem
                key={conversation.id}
                className="flex flex-col items-start px-2 py-2"
              >
                <span className="text-sm font-medium">{conversation.title}</span>
                <span className="text-xs text-muted-foreground line-clamp-1">{conversation.preview}</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {new Date(conversation.timestamp).toLocaleString()}
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}