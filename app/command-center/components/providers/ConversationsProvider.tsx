"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Trash, MessageSquare, Plus } from "lucide-react";
import { CommandGroup, CommandItem, CommandList, CommandSeparator, Button } from "vinci-ui";

import { API } from '@/lib/api-client';
import { Space, Conversation } from '@/types';
import { ProviderComponentProps } from "../../types";

export const ConversationsProvider: React.FC<ProviderComponentProps> = ({ searchQuery, onSelect, onAction }) => {
  const router = useRouter();
  const [activeSpace, setActiveSpace] = React.useState<Space | null>(null);
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeConversation, setActiveConversation] = React.useState<Conversation | null>(null);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        // First try to get data from Electron app state
        if (typeof window !== 'undefined' && window.electronAPI) {
          try {
            const appState = await window.electronAPI.getAppState();
            if (appState && appState.activeSpace && appState.conversations) {
              console.log('ConversationsProvider: Using cached data from Electron');
              setActiveSpace(appState.activeSpace);
              setConversations(appState.conversations || []);
              setIsLoading(false);
              return; // Exit early if we have data
            }
          } catch (error) {
            console.log('ConversationsProvider: No cached data available');
          }
        }
        
        // Fallback to API calls if needed
        const activeSpaceResult = await API.activeSpace.getActiveSpace();
        if (activeSpaceResult.success && activeSpaceResult.data?.activeSpace) {
          const space = activeSpaceResult.data.activeSpace;
          setActiveSpace(space);
          setActiveConversation(null);
          
          const conversationsResult = await API.conversations.getConversations(space.id);
          if (conversationsResult.success) {
            setConversations(conversationsResult.data || []);
          } else {
            console.error('Error fetching conversations:', conversationsResult.error);
          }
        } else {
          console.error('Error fetching active space:', activeSpaceResult.error);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredConversations = conversations
    .filter(conv => conv.space_id === activeSpace?.id)
    .filter(conv =>
      (conv.title || 'Untitled').toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleSelect = async (conversation: Conversation) => {
    try {
      const result = await API.activeSpace.setActiveSpace(conversation.space_id);
      if (result.success) {
        setActiveConversation(conversation);
        // Add closeOnSelect: true to indicate we want to close the command center after selecting
        if (onSelect) onSelect({...conversation, closeOnSelect: true});
      } else {
        console.error('Error setting active conversation:', result.error);
      }
    } catch (error) {
      console.error('Error handling conversation selection:', error);
    }
  };

  const handleEdit = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('edit', conversation);
  };

  const handleDelete = (e: React.MouseEvent, conversation: Conversation) => {
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
        {isLoading ? (
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
          disabled={isLoading}
        >
          <Plus size={16} className="mr-2" />
          Create new conversation
        </CommandItem>
      </CommandGroup>
    </CommandList>
  );
};
