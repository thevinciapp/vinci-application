import { useState, useMemo, useEffect, useCallback } from 'react';
import { BaseTab } from 'shared/components/base-tab';
import { MessageSquare, Edit, Trash, Plus, RefreshCw, Search } from 'lucide-react';
import { Conversation } from '@/entities/conversation/model/types';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from 'shared/components/dropdown-menu';
import { Button } from 'shared/components/button';
import { toast } from 'sonner';
import { DropdownList, DropdownSection, DropdownItem, DropdownFooterAction } from 'shared/components/dropdown-list';
import { EditConversationDialog } from '@/widgets/dialogs/EditConversationDialog';
import { DeleteConversationDialog } from '@/widgets/dialogs/DeleteConversationDialog';
import { useConversations } from '@/features/chat/use-conversations';
import { useSpaces } from '@/features/spaces/use-spaces';

export function ConversationTab() {
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { conversations, activeConversation, setActiveConversation, createConversation, deleteConversation } = useConversations();
  const { activeSpace } = useSpaces();

  const [conversationToEdit, setConversationToEdit] = useState<Conversation | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  const handleCreateNewConversation = async () => {
    if (!activeSpace) {
      toast.error("Please select a space first.");
      return;
    }

    setIsCreating(true);
    try {
      const success = await createConversation(activeSpace.id, 'New Conversation');
      if (!success) {
        toast.error('Failed to create conversation');
      } else {
        toast.success('Conversation created successfully');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    if (activeConversation?.id === conversation.id) return;
    
    try {
      const success = await setActiveConversation(conversation);
      if (!success) {
        toast.error("Failed to switch conversation");
      }
    } catch (error) {
      console.error('Error selecting conversation:', error);
      toast.error('Failed to switch conversation');
    }
  };

  const handleEditConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setConversationToEdit(conversation);
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setConversationToDelete(conversation);
    }
  };

  const handleConfirmDelete = useCallback(async (conversation: Conversation) => {
    if (!conversation) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteConversation(conversation);
      if (success) {
        toast.success('Conversation deleted successfully');
      } else {
        toast.error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    } finally {
      setIsDeleting(false);
      setConversationToDelete(null);
    }
  }, [deleteConversation]);

  const handleCloseEditDialog = () => {
    setConversationToEdit(null);
  };

  const handleCloseDeleteDialog = () => {
    setConversationToDelete(null);
  };

  const sortedConversations = [...conversations].sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const filteredConversations = searchQuery
    ? sortedConversations.filter(c => {
        const title = c.title || ''; 
        const lastMessage = c.lastMessage || '';
        return title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : sortedConversations;

  const conversationSections: DropdownSection[] = useMemo(() => [
    {
      title: `Conversations ${filteredConversations.length > 0 ? `(${filteredConversations.length})` : ''}`,
      items: filteredConversations.map((conversation): DropdownItem => ({
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
                <span className="text-sm font-medium text-white/90 truncate">{conversation.title || 'Untitled'}</span>
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
        onClick: handleCreateNewConversation,
        isLoading: isCreating,
        ariaLabel: "Create new conversation"
      }
    }
  ], [filteredConversations, activeConversation, handleSelectConversation, isCreating, handleCreateNewConversation]);

  const footerActions: DropdownFooterAction[] = [
    {
      icon: <Edit className="w-3.5 h-3.5" />,
      label: "Rename",
      onClick: () => activeConversation && handleEditConversation(activeConversation.id),
      isDisabled: !activeConversation
    },
    {
      icon: <Trash className="w-3.5 h-3.5" />,
      label: "Delete",
      onClick: () => activeConversation && handleDeleteConversation(activeConversation.id),
      variant: "destructive",
      isDisabled: !activeConversation || isDeleting
    }
  ];

  return (
    <>
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
              
              {searchQuery && (
                <div className="flex justify-between items-center text-xs text-white/50 mt-1.5 px-1">
                  <span>
                    {filteredConversations.length === 0 
                      ? 'No matches found' 
                      : `Found ${filteredConversations.length} match${filteredConversations.length === 1 ? '' : 'es'}`}
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
                    onClick={handleCreateNewConversation}
                  >
                    Start a new conversation
                  </Button>
                </>
              )}
            </div>
          }
        />
      </DropdownMenu>

      <EditConversationDialog
        onClose={handleCloseEditDialog}
        data={conversationToEdit}
      />

      <DeleteConversationDialog
        onClose={handleCloseDeleteDialog}
        data={conversationToDelete}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}