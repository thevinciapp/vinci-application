"use client";

import React from 'react';
import { Play, Settings, Command, FileText, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProviderComponentProps } from '../../types';

interface Action {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'system' | 'file' | 'navigation' | 'custom';
  shortcut?: string;
}

export function ActionsProvider({ searchQuery, onSelect, onAction }: ProviderComponentProps) {
  // Example actions - in real implementation, these would be dynamically registered
  const actions: Action[] = [
    {
      id: 'open-settings',
      name: 'Open Settings',
      description: 'Configure application settings',
      icon: <Settings className="h-4 w-4 text-gray-400" />,
      category: 'system',
      shortcut: '⌘,'
    },
    {
      id: 'open-command-center',
      name: 'Command Center',
      description: 'Open the command center',
      icon: <Command className="h-4 w-4 text-blue-400" />,
      category: 'system',
      shortcut: '⌘K'
    },
    {
      id: 'new-file',
      name: 'New File',
      description: 'Create a new file',
      icon: <FileText className="h-4 w-4 text-green-400" />,
      category: 'file',
      shortcut: '⌘N'
    },
    {
      id: 'open-folder',
      name: 'Open Folder',
      description: 'Open a folder in the workspace',
      icon: <FolderOpen className="h-4 w-4 text-amber-400" />,
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

  // Render empty state if no actions found
  if (!filteredActions.length) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-gray-500">
        <Play className="h-8 w-8 mb-2 text-gray-400" />
        <p>No actions found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-2">
      {Object.entries(groupedActions).map(([category, actions]) => (
        <div key={category} className="flex flex-col gap-2">
          {/* Category Header */}
          <div className="px-2 py-1">
            <span className="text-xs font-medium text-gray-500 uppercase">
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </span>
          </div>

          {/* Actions List */}
          {actions.map(action => (
            <div
              key={action.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg",
                "bg-white/[0.03] hover:bg-white/[0.06]",
                "border border-white/[0.05]",
                "transition-all duration-200 ease-in-out",
                "cursor-pointer"
              )}
              onClick={() => onSelect?.(action)}
            >
              <div className="flex items-center gap-3">
                {action.icon}
                <div className="flex flex-col">
                  <span className="text-sm">{action.name}</span>
                  <span className="text-xs text-gray-500">{action.description}</span>
                </div>
              </div>
              
              {action.shortcut && (
                <div className="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400 border border-gray-500/30">
                  {action.shortcut}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
