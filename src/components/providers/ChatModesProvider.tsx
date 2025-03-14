"use client";

import React from 'react';
import { MessageSquare, Plus, Settings, Check, Trash, PencilLine } from 'lucide-react';
import { Command } from 'cmdk';
import { Button } from "vinci-ui";
import { cn } from '@/src/types/utils';
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

  const filteredModes = chatModes.filter(mode => 
    mode.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mode.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (mode: ChatMode) => {
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
    <Command.List>
      <Command.Group heading="Chat Modes">
        {filteredModes.length === 0 ? (
          <Command.Empty>No chat modes found</Command.Empty>
        ) : (
          filteredModes.map(mode => (
            <Command.Item
              key={mode.id}
              value={mode.name}
              onSelect={() => handleSelect(mode)}
            >
              <MessageSquare size={16} className={mode.isActive ? undefined : "text-muted-foreground"} />
              <div>
                {mode.name}
                <span className="cmdk-meta">{mode.description}</span>
              </div>
              <div className="cmdk-actions">
                {mode.isActive && (
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
                {!mode.isActive && (
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
          ))
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
