import { useState } from 'react';
import { BaseTab } from '@/components/ui/base-tab';
import { MessageSquare, Edit, Trash, Archive, Share2 } from 'lucide-react';
import { Conversation } from '@/types/conversation';
import { useRendererStore } from '@/store/renderer';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export interface ConversationTabProps {
  activeConversation: Conversation | null;
  onCreateConversation?: (title: string) => Promise<void>;
  onSelectConversation?: (conversation: Conversation) => void;
  onClick?: () => void;
}

export function ConversationTab({ 
  activeConversation, 
  onCreateConversation, 
  onSelectConversation,
  onClick 
}: ConversationTabProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { conversations } = useRendererStore();

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

  const handleSelectConversation = (conversation: Conversation) => {
    if (onSelectConversation) {
      onSelectConversation(conversation);
    }
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

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
        
        {sortedConversations.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Recent Conversations</DropdownMenuLabel>
            {sortedConversations.map((conversation) => (
              <DropdownMenuItem
                key={conversation.id}
                className="flex flex-col items-start px-2 py-2 cursor-pointer"
                onSelect={() => handleSelectConversation(conversation)}
              >
                <span className="text-sm font-medium">{conversation.title}</span>
                {conversation.lastMessage && (
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {conversation.lastMessage}
                  </span>
                )}
                <span className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}