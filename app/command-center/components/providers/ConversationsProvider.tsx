"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Trash, MessageSquare, Plus } from "lucide-react";
import { Command } from 'cmdk';
import { Button } from "vinci-ui";

import { API } from '@/lib/api-client';
import { Space, Conversation } from '@/types';
import { useAppState } from '@/lib/app-state-context';
import { ProviderComponentProps } from "../../types";

export const ConversationsProvider: React.FC<ProviderComponentProps> = ({ searchQuery, onSelect, onAction }) => {
  const router = useRouter();
  const { appState, refreshAppState } = useAppState();
  
  const activeSpace = appState.activeSpace;
  const conversations = appState.conversations || [];
  const isLoading = false;

  const filteredConversations = conversations
    .filter(conv => conv.space_id === activeSpace?.id)
    .filter(conv =>
      (conv.title || 'Untitled').toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleSelect = async (conversation: Conversation) => {
    try {
      // First set the active space
      const spaceResult = await window.electronAPI.setActiveSpace(conversation.space_id);
      
      if (spaceResult.success) {
        // Then get the conversation messages
        const messagesResult = await window.electronAPI.getConversationMessages(conversation.id);
        
        if (messagesResult.success) {
          if (onSelect) onSelect({...conversation, closeOnSelect: true});
        } else {
          console.error('Error getting conversation messages:', messagesResult.error);
        }
      } else {
        console.error('Error setting active space:', spaceResult.error);
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
      <Command.List>
        <Command.Empty>No active space selected</Command.Empty>
      </Command.List>
    );
  }

  return (
    <Command.List>
      <Command.Group heading={`Conversations in ${activeSpace?.name || 'Current Space'}`}>
        {filteredConversations.length === 0 ? (
          <Command.Empty>No conversations found</Command.Empty>
        ) : (
          filteredConversations.map(conv => (
            <Command.Item
              key={conv.id}
              value={conv.title || 'Untitled'}
              onSelect={() => handleSelect(conv)}
            >
              <MessageSquare size={16} />
              <div>
                {conv.title || 'Untitled'}
              </div>
              <div className="cmdk-actions">
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleEdit(e, conv)}
                >
                  <PencilLine size={14} />
                </Button>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDelete(e, conv)}
                >
                  <Trash size={14} />
                </Button>
              </div>
            </Command.Item>
          ))
        )}
      </Command.Group>
      <Command.Separator />
      <Command.Group>
        <Command.Item onSelect={handleCreate}>
          <Plus size={16} />
          Create new conversation
        </Command.Item>
      </Command.Group>
    </Command.List>
  );
};
