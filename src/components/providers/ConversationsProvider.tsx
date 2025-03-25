import React from "react";
import { PencilLine, Trash, MessageSquare, Plus } from "lucide-react";
import { Command } from 'cmdk';
import { Button } from "@/components/ui/button";
import { Conversation } from '@/types/conversation';
import { ProviderComponentProps } from "@/types/provider";
import { useSpaces } from '@/hooks/use-spaces';
import { useConversations } from '@/hooks/use-conversations';
import { useMessages } from '@/hooks/use-messages';

export const ConversationsProvider: React.FC<ProviderComponentProps> = ({ searchQuery, onSelect, onAction }) => {
  const { activeSpace, setActiveSpaceById } = useSpaces();
  const { conversations, isLoading } = useConversations();
  const { fetchMessages } = useMessages(null);

  const filteredConversations = conversations
    .filter(conv => conv.space_id === activeSpace?.id)
    .filter(conv =>
      (conv.title || 'Untitled').toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleSelect = async (conversation: Conversation) => {
    try {
      if (!conversation || !conversation.space_id) {
        console.error('[ConversationsProvider] Cannot select conversation: Invalid spaceId', conversation);
        return;
      }

      console.log('[ConversationsProvider] Selecting conversation:', conversation.id, 'in space:', conversation.space_id);
      
      const spaceSuccess = await setActiveSpaceById(conversation.space_id);
      if (spaceSuccess) {
        await fetchMessages(conversation.id);
        
        if (onSelect) {
          onSelect({...conversation, closeOnSelect: true});
        }
      } else {
        console.error('[ConversationsProvider] Error setting active space');
      }
    } catch (error) {
      console.error('[ConversationsProvider] Error handling conversation selection:', error);
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
              onSelect={() => handleSelect({...conv, title: conv.title || 'Untitled'})}
            >
              <MessageSquare size={16} />
              <div>
                {conv.title || 'Untitled'}
              </div>
              <div className="cmdk-actions">
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleEdit(e, {...conv, title: conv.title || 'Untitled'})}
                >
                  <PencilLine size={14} />
                </Button>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDelete(e, {...conv, title: conv.title || 'Untitled'})}
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
