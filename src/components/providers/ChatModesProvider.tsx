import React from 'react';
import { Settings, PencilLine, Trash, Plus } from 'lucide-react';
import { Command } from 'cmdk';
import { Button } from "@/components/ui/button";
import { ProviderComponentProps } from '@/types/provider';
import { getAllChatModes, ChatModeConfig } from '@/config/chat-modes';
import { useSpaces } from '@/hooks/use-spaces';

export function ChatModesProvider({ searchQuery = '', onSelect, onAction }: ProviderComponentProps) {
  const { activeSpace, updateSpace } = useSpaces();
  const chatModes = getAllChatModes();
  const currentMode = activeSpace?.chat_mode || 'ask';

  const filteredModes = chatModes.filter(mode => 
    mode.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mode.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (mode: ChatModeConfig) => {
    if (!activeSpace) return;
    
    try {
      await updateSpace(activeSpace.id, {
        chat_mode: mode.id
      });
      
      if (onSelect) onSelect({
        id: mode.id,
        name: mode.name,
        description: mode.description,
        closeOnSelect: true
      });
    } catch (error) {
      console.error('Failed to update chat mode:', error);
    }
  };

  const handleSettings = (e: React.MouseEvent, mode: ChatModeConfig) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('settings', mode);
  };
  
  const handleEdit = (e: React.MouseEvent, mode: ChatModeConfig) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('edit', mode);
  };
  
  const handleDelete = (e: React.MouseEvent, mode: ChatModeConfig) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('delete', mode);
  };

  const handleCreate = () => {
    if (onAction) onAction('create', {});
  };

  return (
    <Command.List>
      <Command.Group heading="Chat Modes">
        {filteredModes.length === 0 ? (
          <Command.Empty>No chat modes found</Command.Empty>
        ) : (
          filteredModes.map(mode => {
            const Icon = mode.icon;
            const isActive = mode.id === currentMode;
            
            return (
              <Command.Item
                key={mode.id}
                value={mode.name}
                onSelect={() => handleSelect(mode)}
              >
                <Icon className={isActive ? undefined : "text-muted-foreground w-4 h-4"} />
                <div>
                  {mode.name}
                  <span className="cmdk-meta">{mode.description}</span>
                </div>
                <div className="cmdk-actions">
                  {isActive && (
                    <span className="text-primary">Active</span>
                  )}
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleSettings(e, mode)}
                  >
                    <Settings size={14} />
                  </Button>
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleEdit(e, mode)}
                  >
                    <PencilLine size={14} />
                  </Button>
                  {!isActive && (
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(e, mode)}
                    >
                      <Trash size={14} />
                    </Button>
                  )}
                </div>
              </Command.Item>
            );
          })
        )}
      </Command.Group>
      <Command.Separator />
      <Command.Group>
        <Command.Item onSelect={handleCreate}>
          <Plus size={16} />
          Create new chat mode
        </Command.Item>
      </Command.Group>
    </Command.List>
  );
}
