"use client";

import React from 'react';
import { MessageSquare, Plus, Settings } from 'lucide-react';
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

  // Render empty state if no modes found
  if (!filteredModes.length) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-gray-500">
        <MessageSquare className="h-8 w-8 mb-2 text-gray-400" />
        <p>No chat modes found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {/* Create New Mode Button */}
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg",
          "bg-white/[0.03] hover:bg-white/[0.06]",
          "border border-white/[0.05]",
          "transition-all duration-200 ease-in-out",
          "cursor-pointer"
        )}
        onClick={() => onAction?.('create', null)}
      >
        <Plus className="h-4 w-4 text-green-400" />
        <span className="text-sm">Create New Chat Mode</span>
      </div>

      {/* Mode List */}
      {filteredModes.map(mode => (
        <div
          key={mode.id}
          className={cn(
            "flex items-center justify-between p-3 rounded-lg",
            "bg-white/[0.03] hover:bg-white/[0.06]",
            "border border-white/[0.05]",
            "transition-all duration-200 ease-in-out",
            "cursor-pointer",
            mode.isActive && "border-blue-500/30"
          )}
          onClick={() => onSelect?.(mode)}
        >
          <div className="flex items-center gap-3">
            <MessageSquare className={cn(
              "h-4 w-4",
              mode.isActive ? "text-blue-400" : "text-gray-400"
            )} />
            <div className="flex flex-col">
              <span className="text-sm">{mode.name}</span>
              <span className="text-xs text-gray-500">{mode.description}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {mode.isActive && (
              <div className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Active
              </div>
            )}
            <button
              onClick={(e) => { 
                e.stopPropagation();
                e.preventDefault();
                onAction?.('settings', mode);
              }}
              className={cn(
                "flex items-center h-7 w-7 justify-center rounded-md p-1.5",
                "transition-all duration-200 ease-in-out",
                "bg-white/[0.03] hover:bg-gray-400/20 border border-white/[0.05]",
                "text-gray-400 hover:text-gray-200",
                "cursor-pointer"
              )}
              title="Mode Settings"
            >
              <Settings className="text-gray-400" size={11} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
