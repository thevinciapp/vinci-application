"use client";

import React from 'react';
import { Play, Settings, Command, FileText, FolderOpen } from 'lucide-react';
import { Command as Cmdk } from 'cmdk';
import { ProviderComponentProps } from '@/src/types';

interface Action {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'system' | 'file' | 'navigation' | 'custom';
  shortcut?: string;
}

export function ActionsProvider({ searchQuery, onSelect }: ProviderComponentProps) {
  const actions: Action[] = [
    {
      id: 'open-settings',
      name: 'Open Settings',
      description: 'Configure application settings',
      icon: <Settings size={16} />,
      category: 'system',
      shortcut: '⌘,'
    },
    {
      id: 'open-command-center',
      name: 'Command Center',
      description: 'Open the command center',
      icon: <Command size={16} />,
      category: 'system',
      shortcut: '⌘K'
    },
    {
      id: 'new-file',
      name: 'New File',
      description: 'Create a new file',
      icon: <FileText size={16} className="text-green-500" />,
      category: 'file',
      shortcut: '⌘N'
    },
    {
      id: 'open-folder',
      name: 'Open Folder',
      description: 'Open a folder in the workspace',
      icon: <FolderOpen size={16} className="text-amber-500" />,
      category: 'navigation',
      shortcut: '⌘O'
    }
  ];

  const filteredActions = actions.filter(action => 
    action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedActions = filteredActions.reduce((acc, action) => {
    const category = action.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(action);
    return acc;
  }, {} as Record<string, Action[]>);

  if (Object.keys(groupedActions).length === 0) {
    return (
      <Cmdk.List>
        <Cmdk.Empty>No actions found</Cmdk.Empty>
      </Cmdk.List>
    );
  }

  return (
    <Cmdk.List>
      {Object.entries(groupedActions).map(([category, categoryActions]) => (
        <Cmdk.Group 
          key={category} 
          heading={category.charAt(0).toUpperCase() + category.slice(1)}
        >
          {categoryActions.map(action => (
            <Cmdk.Item
              key={action.id}
              value={action.name}
              onSelect={() => onSelect?.({...action, closeOnSelect: true})}
            >
              {action.icon}
              <div>
                {action.name}
                <span className="cmdk-meta">{action.description}</span>
              </div>
              {action.shortcut && (
                <kbd className="cmdk-meta">{action.shortcut}</kbd>
              )}
            </Cmdk.Item>
          ))}
        </Cmdk.Group>
      ))}
    </Cmdk.List>
  );
}
