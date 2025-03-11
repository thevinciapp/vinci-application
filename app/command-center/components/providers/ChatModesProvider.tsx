"use client";

import React from 'react';
import { MessageSquare, Plus, Settings, Check, Trash, PencilLine } from 'lucide-react';
import { CommandGroup, CommandItem, CommandList, CommandSeparator, Button } from "vinci-ui";
import { cn } from '@/lib/utils';
import { ProviderComponentProps } from '../../types';

interface ChatMode {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: number;
  settings?: Record<string, any>;
}

export function ChatModesProvider({ searchQuery, onSelect, onAction }: ProviderComponentProps) {
  const chatModes: ChatMode[] = [
    {
      id: 'default',
      name: 'Default Mode',
      description: 'Standard chat interaction mode',
      isActive: true,
      createdAt: Date.now(),
    },
    {
      id: 'code-review',
      name: 'Code Review',
      description: 'Focused on reviewing and improving code',
      isActive: false,
      createdAt: Date.now(),
    },
    {
      id: 'brainstorm',
      name: 'Brainstorm',
      description: 'Creative ideation and problem-solving mode',
      isActive: false,
      createdAt: Date.now(),
    }
  ];

  // Filter modes based on search query
  const filteredModes = chatModes.filter(mode => 
    mode.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mode.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (mode: ChatMode) => {
    // Add closeOnSelect property to close the command center after selecting a chat mode
    if (onSelect) onSelect({...mode, closeOnSelect: true});
  };

  const handleSettings = (e: React.MouseEvent, mode: ChatMode) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('settings', mode);
  };
  
  const handleEdit = (e: React.MouseEvent, mode: ChatMode) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('edit', mode);
  };
  
  const handleDelete = (e: React.MouseEvent, mode: ChatMode) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('delete', mode);
  };

  const handleCreate = () => {
    if (onAction) onAction('create', {});
  };

  return (
    <CommandList>
      <CommandGroup heading="Chat Modes">
        {filteredModes.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">No chat modes found</p>
        ) : (
          filteredModes.map(mode => (
            <CommandItem
              key={mode.id}
              value={mode.name}
              onSelect={() => handleSelect(mode)}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className={cn(
                  mode.isActive ? "text-primary" : "text-muted-foreground"
                )} />
                <div>
                  <p className="font-medium">{mode.name}</p>
                  <p className="text-xs text-muted-foreground">{mode.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mode.isActive && (
                  <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-primary/20 text-primary border border-primary/30">
                    <Check size={12} className="inline-block mr-1" />
                    Active
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7" 
                    onClick={(e) => handleSettings(e, mode)}
                  >
                    <Settings size={14} />
                  </Button>
                  <Button 
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7" 
                    onClick={(e) => handleEdit(e, mode)}
                  >
                    <PencilLine size={14} />
                  </Button>
                  {!mode.isActive && (
                    <Button 
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/20" 
                      onClick={(e) => handleDelete(e, mode)}
                    >
                      <Trash size={14} />
                    </Button>
                  )}
                </div>
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
        >
          <Plus size={16} className="mr-2" />
          Create new chat mode
        </CommandItem>
      </CommandGroup>
    </CommandList>
  );
}
