"use client";

import React from 'react';
import { Play, Settings, Command, FileText, FolderOpen } from 'lucide-react';
import { CommandGroup, CommandItem, CommandList } from "vinci-ui";
import { ProviderComponentProps } from '../../types';

interface Action {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'system' | 'file' | 'navigation' | 'custom';
  shortcut?: string;
}

export function ActionsProvider({ searchQuery, onSelect }: ProviderComponentProps) {
  // Example actions - in real implementation, these would be dynamically registered
  const actions: Action[] = [
    {
      id: 'open-settings',
      name: 'Open Settings',
      description: 'Configure application settings',
      icon: <Settings className="h-4 w-4" />,
      category: 'system',
      shortcut: '⌘,'
    },
    {
      id: 'open-command-center',
      name: 'Command Center',
      description: 'Open the command center',
      icon: <Command className="h-4 w-4 text-primary" />,
      category: 'system',
      shortcut: '⌘K'
    },
    {
      id: 'new-file',
      name: 'New File',
      description: 'Create a new file',
      icon: <FileText className="h-4 w-4 text-green-500" />,
      category: 'file',
      shortcut: '⌘N'
    },
    {
      id: 'open-folder',
      name: 'Open Folder',
      description: 'Open a folder in the workspace',
      icon: <FolderOpen className="h-4 w-4 text-amber-500" />,
      category: 'navigation',
      shortcut: '⌘O'
    }
  ];

  // Filter actions based on search query
  const filteredActions = actions.filter(action => 
    action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group actions by category
  const groupedActions = filteredActions.reduce((acc, action) => {
    const category = action.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(action);
    return acc;
  }, {} as Record<string, Action[]>);

  // If no actions match the search query
  if (Object.keys(groupedActions).length === 0) {
    return (
      <CommandList>
        <CommandGroup>
          <p className="p-2 text-sm text-muted-foreground">No actions found</p>
        </CommandGroup>
      </CommandList>
    );
  }

  return (
    <CommandList>
      {Object.entries(groupedActions).map(([category, categoryActions]) => (
        <CommandGroup 
          key={category} 
          heading={category.charAt(0).toUpperCase() + category.slice(1)}
        >
          {categoryActions.map(action => (
            <CommandItem
              key={action.id}
              value={action.name}
              onSelect={() => onSelect?.({...action, closeOnSelect: true})}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-2">
                {action.icon}
                <div>
                  <p className="font-medium">{action.name}</p>
                  {action.description && (
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  )}
                </div>
              </div>
              {action.shortcut && (
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  {action.shortcut}
                </kbd>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      ))}
    </CommandList>
  );
}
