"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Trash, MessageSquare, Plus } from "lucide-react";
import { CommandGroup, CommandItem, CommandList, CommandSeparator, Button } from "vinci-ui";
import { useSpaceStore } from '@/stores/space-store';
import { switchConversation } from "@/app/actions/conversations";
import { ProviderComponentProps } from "../../types";

export const ConversationsProvider: React.FC<ProviderComponentProps> = ({ searchQuery, onSelect, onAction }) => {
  const router = useRouter();
  const { activeSpace, conversations, isLoading, loadingSpaceId } = useSpaceStore();
  const filteredConversations = (conversations ?? [])
    .filter(conv => conv.space_id === activeSpace?.id)
    .filter(conv =>
      (conv.title || 'Untitled').toLowerCase().includes(searchQuery.toLowerCase())
    );
    
  // Check if this provider is in a loading state
  const isProviderLoading = isLoading || (loadingSpaceId === activeSpace?.id);

  const handleSelect = async (conversation: any) => {
    try {
      // Use the switchConversation server action
      const response = await switchConversation(conversation.id);
      
      if (response.status === 'success') {
        // Let the parent know something was selected to close the command center
        if (onSelect) onSelect(conversation);
      }
    } catch (error) {
      console.error('Error handling conversation selection:', error);
    }
  };

  const handleEdit = (e: React.MouseEvent, conversation: any) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('edit', conversation);
  };

  const handleDelete = (e: React.MouseEvent, conversation: any) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('delete', conversation);
  };

  const handleCreate = () => {
    if (onAction) onAction('create', {});
  };

  if (!activeSpace) {
    return (
      <CommandList>
        <CommandGroup>
          <p className="p-2 text-sm text-muted-foreground">No active space selected</p>
        </CommandGroup>
      </CommandList>
    );
  }

  return (
    <CommandList>
      <CommandGroup heading={`Conversations in ${activeSpace.name}`}>
        {isProviderLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading conversations...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">No conversations found</p>
        ) : (
          filteredConversations.map(conv => (
            <CommandItem
              key={conv.id}
              value={conv.title || 'Untitled'}
              onSelect={() => handleSelect(conv)}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-primary" />
                <p className="font-medium">{conv.title || 'Untitled'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7" 
                  onClick={(e) => handleEdit(e, conv)}
                >
                  <PencilLine size={14} />
                </Button>
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/20" 
                  onClick={(e) => handleDelete(e, conv)}
                >
                  <Trash size={14} />
                </Button>
              </div>
            </CommandItem>
          ))
        )}
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup>
        <CommandItem 
          onSelect={handleCreate}
          className="text-primary"
          disabled={isProviderLoading}
        >
          <Plus size={16} className="mr-2" />
          Create new conversation
        </CommandItem>
      </CommandGroup>
    </CommandList>
  );
};
