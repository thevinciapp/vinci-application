"use client"

import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { CommandOption, useCommandRegistration, CommandType } from '@/hooks/useCommandCenter';
import { Settings, Search, Plus, Users, MessageSquare, Brain, Command } from 'lucide-react';
import { useSpacesStore } from '@/store/useSpacesStore';
import { useSpaceStore } from '@/stores/space-store';
import { useRouter } from 'next/navigation';
import { AVAILABLE_MODELS, PROVIDER_NAMES, Provider } from '@/config/models';

/**
 * Provider for application-wide commands
 */
export function ApplicationCommandProvider({ children }: { children: ReactNode }) {
  const applicationCommands: CommandOption[] = [
    {
      id: 'settings',
      name: 'Open Settings',
      description: 'Open application settings',
      icon: <Settings className="h-4 w-4" />,
      shortcut: ['⌘', ','],
      type: 'application',
      keywords: ['settings', 'preferences', 'config', 'configuration'],
      action: () => {
        // Implement settings opening logic
        console.log('Opening settings');
      },
    },
    {
      id: 'search',
      name: 'Search Everything',
      description: 'Search across all content',
      icon: <Search className="h-4 w-4" />,
      shortcut: ['⌘', 'F'],
      type: 'application',
      keywords: ['search', 'find', 'filter', 'query'],
      action: () => {
        // Implement global search logic
        console.log('Opening global search');
      },
    },
  ];

  useCommandRegistration(applicationCommands);

  return <>{children}</>;
}

/**
 * Provider for space-related commands
 */
export function SpacesCommandProvider({ children }: { children: ReactNode }) {
  const { spaces, setActive } = useSpacesStore();
  const spaceStore = useSpaceStore();
  const router = useRouter();

  // Memoize base commands (static)
  const baseCommands = useMemo<CommandOption[]>(() => [
    {
      id: 'create-space',
      name: 'Create New Space',
      description: 'Create a new workspace',
      icon: <Plus className="h-4 w-4" />,
      shortcut: ['⌘', 'N'],
      type: 'spaces',
      keywords: ['create', 'new', 'space', 'workspace', 'add'],
      action: () => {
        console.log('Opening space creation form');
      },
    }
  ], []);

  // Memoize space-specific commands with proper dependency array
  const spaceCommands = useMemo<CommandOption[]>(() => 
    spaces.map(space => ({
      id: `space-${space.id}`,
      name: space.name,
      description: space.description || 'Switch to this workspace',
      icon: <Users className="h-4 w-4" />,
      type: 'spaces' as CommandType,
      keywords: ['space', 'workspace', 'switch', space.name],
      action: () => {
        setActive(space.id).then(() => {
          spaceStore.setActiveSpace(space.id);
          router.push(`/spaces/${space.id}`);
        });
      },
    }))
  , [spaces, setActive, spaceStore, router]);

  // Combine into all commands
  const allSpaceCommands = useMemo<CommandOption[]>(() => 
    [...baseCommands, ...spaceCommands]
  , [baseCommands, spaceCommands]);

  // Log when commands change to help with debugging
  useEffect(() => {
    console.log(`Registering ${allSpaceCommands.length} space commands, including ${spaceCommands.length} spaces`);
  }, [allSpaceCommands.length, spaceCommands.length]);

  useCommandRegistration(allSpaceCommands);

  return <>{children}</>;
}

/**
 * Provider for conversation-related commands
 */
export function ConversationsCommandProvider({ children }: { children: ReactNode }) {
  const conversationCommands: CommandOption[] = [
    {
      id: 'new-conversation',
      name: 'Start New Conversation',
      description: 'Begin a new chat conversation',
      icon: <MessageSquare className="h-4 w-4" />,
      shortcut: ['⌘', 'T'],
      type: 'conversations',
      keywords: ['conversation', 'chat', 'new', 'start', 'begin'],
      action: () => {
        // Implement new conversation logic
        console.log('Starting new conversation');
      },
    },
  ];

  useCommandRegistration(conversationCommands);

  return <>{children}</>;
}

/**
 * Provider for model-related commands
 */
export function ModelsCommandProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  
  // Create a base command for model selection
  const baseModelCommands: CommandOption[] = [
    {
      id: 'select-model',
      name: 'Select AI Model',
      description: 'Choose a different AI model',
      icon: <Brain className="h-4 w-4" />,
      type: 'models',
      keywords: ['model', 'ai', 'select', 'change', 'choose'],
      action: () => {
        // Navigate to model selection page or open a modal
        console.log('Opening model selection');
        // Example: router.push('/settings/models');
      },
    },
  ];
  
  // Create commands for each provider and their models
  const modelCommands: CommandOption[] = [];
  
  // Add commands for each provider
  Object.entries(AVAILABLE_MODELS).forEach(([providerKey, models]) => {
    const provider = providerKey as Provider;
    const providerName = PROVIDER_NAMES[provider];
    
    // Add a command for the provider itself
    modelCommands.push({
      id: `provider-${provider}`,
      name: providerName,
      description: `Select a model from ${providerName}`,
      icon: <Brain className="h-4 w-4" />,
      type: 'models',
      keywords: ['provider', providerName.toLowerCase(), 'model'],
      action: () => {
        console.log(`Selecting provider: ${providerName}`);
        // This could open a sub-menu of models for this provider
      },
    });
    
    // Add commands for each model from this provider
    models.forEach((model) => {
      modelCommands.push({
        id: `model-${provider}-${model.id}`,
        name: model.name,
        description: model.description || `${providerName} model`,
        icon: <Brain className="h-4 w-4" />,
        type: 'models',
        keywords: ['model', model.name.toLowerCase(), providerName.toLowerCase()],
        action: () => {
          console.log(`Selecting model: ${model.name} from ${providerName}`);
          // Set this model as active
          // This could update the active model in a store
        },
      });
    });
  });
  
  // Combine base commands with dynamic model commands
  const allModelCommands = [...baseModelCommands, ...modelCommands];

  useCommandRegistration(allModelCommands);

  return <>{children}</>;
}

/**
 * Provider for general actions commands
 */
export function ActionsCommandProvider({ children }: { children: ReactNode }) {
  const actionCommands: CommandOption[] = [
    {
      id: 'keyboard-shortcuts',
      name: 'View Keyboard Shortcuts',
      description: 'Show all available keyboard shortcuts',
      icon: <Command className="h-4 w-4" />,
      type: 'actions',
      keywords: ['keyboard', 'shortcuts', 'keys', 'bindings', 'help'],
      action: () => {
        // Implement shortcuts display logic
        console.log('Viewing keyboard shortcuts');
      },
    },
  ];

  useCommandRegistration(actionCommands);

  return <>{children}</>;
}

/**
 * Combined provider for all command types
 */
export function AllCommandProviders({ children }: { children: ReactNode }) {
  return (
    <ApplicationCommandProvider>
      <SpacesCommandProvider>
        <ConversationsCommandProvider>
          <ModelsCommandProvider>
            <ActionsCommandProvider>
              {children}
            </ActionsCommandProvider>
          </ModelsCommandProvider>
        </ConversationsCommandProvider>
      </SpacesCommandProvider>
    </ApplicationCommandProvider>
  );
} 