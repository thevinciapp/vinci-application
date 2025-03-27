import { useState } from 'react';
import { BaseTab } from '@/components/ui/base-tab';
import { MessageSquare, Edit, Trash, Share2, Plus, RefreshCw, Search } from 'lucide-react';
import { Conversation } from '@/types/conversation';
import { useRendererStore } from '@/store/renderer';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { DropdownList, DropdownSection, DropdownItem, DropdownFooterAction } from '@/components/shared/dropdown-list';

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
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  const handleConversationAction = async (action: string, conversationId?: string) => {
    // Find the conversation if an ID is provided
    const targetConversation = conversationId 
      ? conversations.find(c => c.id === conversationId) 
      : activeConversation;
      
    if (!targetConversation) return;
    
    try {
      // Here you would implement the actual action logic
      console.log(`${action} conversation: ${targetConversation.title} (${targetConversation.id})`);
      
      toast({
        title: 'Success',
        description: `Conversation "${targetConversation.title}" ${action.toLowerCase()}`,
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

  // Filter conversations based on search query
  const filterConversations = () => {
    let filtered = [...conversations];
    
    // Apply text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(conversation => 
        (conversation.title?.toLowerCase().includes(query)) || 
        (conversation.lastMessage && conversation.lastMessage.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  // Sort conversations by update time
  const sortedConversations = filterConversations().sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  // Build sections for dropdown
  const conversationSections: DropdownSection[] = [
    {
      title: `Conversations ${sortedConversations.length > 0 ? `(${sortedConversations.length})` : ''}`,
      items: sortedConversations.map((conversation): DropdownItem => ({
        id: conversation.id,
        isActive: activeConversation?.id === conversation.id,
        onSelect: () => handleSelectConversation(conversation),
        content: (
          <div className="flex w-full">
            <div className="flex-shrink-0 mr-2.5">
              <MessageSquare className="w-3.5 h-3.5 text-white/60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-white/90 truncate">{conversation.title}</span>
                {activeConversation?.id === conversation.id && (
                  <span className="text-xs bg-white/10 text-white/80 px-1.5 py-0.5 rounded-full">
                    Current
                  </span>
                )}
              </div>
              {conversation.lastMessage && (
                <span className="text-xs text-white/60 line-clamp-1 w-full">
                  {conversation.lastMessage}
                </span>
              )}
              <div className="flex items-center mt-1">
                <span className="text-xs text-white/40">
                  {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        )
      })),
      actionButton: {
        icon: isCreating ? 
          <RefreshCw className="w-3.5 h-3.5 text-white/70 animate-spin" /> : 
          <Plus className="w-3.5 h-3.5 text-white/70" />,
        onClick: handleClick,
        isLoading: isCreating,
        ariaLabel: "Create new conversation"
      }
    }
  ];

  // Dynamic footer actions 
  const footerActions: DropdownFooterAction[] = [
    {
      icon: <Edit className="w-3.5 h-3.5" />,
      label: "Rename",
      onClick: (conversationId) => handleConversationAction("Renamed", conversationId)
    },
    {
      icon: <Trash className="w-3.5 h-3.5" />,
      label: "Delete",
      onClick: (conversationId) => handleConversationAction("Deleted", conversationId),
      variant: "destructive"
    }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="p-0 h-auto hover:bg-white/[0.05] rounded-sm transition-all duration-200 group w-full"
          aria-label={activeConversation ? `Current conversation: ${activeConversation.title}` : "New conversation"}
        >
          <BaseTab
            icon={<MessageSquare className="w-3 h-3 group-hover:text-[#3ecfff]/80" />}
            label={activeConversation?.title || 'New Conversation'}
            isActive={!!activeConversation}
            className="w-full"
          />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownList 
        headerContent={
          <div className="px-2 pt-1.5 pb-2">
            {/* Search input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-white/40" />
              </div>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.05] rounded-md py-1.5 pl-8 pr-3 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/[0.07]"
                aria-label="Search conversations"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2 flex items-center text-white/40 hover:text-white/60"
                >
                  <span className="sr-only">Clear search</span>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Search feedback */}
            {searchQuery && (
              <div className="flex justify-between items-center text-xs text-white/50 mt-1.5 px-1">
                <span>
                  {sortedConversations.length === 0 
                    ? 'No matches found' 
                    : `Found ${sortedConversations.length} match${sortedConversations.length === 1 ? '' : 'es'}`}
                </span>
                <button 
                  className="hover:text-white/70 transition-colors text-xs"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        }
        sections={conversationSections}
        footerActions={footerActions}
        emptyState={
          <div className="text-sm text-white/50 flex flex-col items-center py-4">
            <MessageSquare className="w-10 h-10 text-white/20 mb-2" />
            {searchQuery ? (
              <>
                <p>No conversations match your search</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 text-xs" 
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
              </>
            ) : (
              <>
                <p>No conversations yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 text-xs" 
                  onClick={handleClick}
                >
                  Start a new conversation
                </Button>
              </>
            )}
          </div>
        }
      />
    </DropdownMenu>
  );
}