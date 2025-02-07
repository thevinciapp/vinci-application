'use client';

import { CommandModal } from '@/components/ui/command-modal';
import { Sparkles, Image, Link, FileText, Share2, Bookmark, Globe, Plus, Cpu, ArrowLeft } from 'lucide-react';
import { useQuickActionsCommand } from '@/components/ui/quick-actions-command-provider';
import { useSpaces } from '@/hooks/spaces-provider';
import { useChatState } from '@/hooks/chat-state-provider';
import { Command } from 'cmdk';
import { useState, useEffect } from 'react';
import { AVAILABLE_MODELS, PROVIDER_NAMES, type Provider } from '@/config/models';
import { ProviderIcon } from './provider-icon';

interface QuickActionsCommandProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionsCommand = ({ isOpen, onClose }: QuickActionsCommandProps) => {
  const { isExecuting, handleGlobalCommand, showSpaces, setShowSpaces, showModels, setShowModels } = useQuickActionsCommand();
  const { spaces, setActiveSpace, activeSpace } = useSpaces();
  const { batchUpdate } = useChatState();
  const [searchValue, setSearchValue] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  // Clear search and selected provider when switching views
  useEffect(() => {
    setSearchValue('');
    setSelectedProvider(null);
  }, [showSpaces, showModels]);

  const handleSpaceSelect = async (spaceId: string) => {
    console.log('Selecting space:', spaceId);
    batchUpdate({ isLoading: true });
    try {
      console.log('Making request to:', `/api/spaces/${spaceId}`);
      const response = await fetch(`/api/spaces/${spaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setActive: true })
      });
      
      if (!response.ok) {
        throw new Error('Failed to set active space');
      }
      
      const space = await response.json();
      console.log('Received space data:', space);
      setActiveSpace(space);
    } catch (error) {
      console.error('Error switching space:', error);
      batchUpdate({ error: 'Failed to switch space' });
    } finally {
      batchUpdate({ isLoading: false });
      onClose();
    }
  };

  const handleCreateSpace = async () => {
    batchUpdate({ isLoading: true });
    try {
      const response = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Space ${spaces.length + 1}`,
          description: 'New space',
          model: 'deepseek-r1-distill-llama-70b',
          provider: 'groq'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create space');
      }

      const newSpace = await response.json();
      setActiveSpace(newSpace);
    } catch (error) {
      console.error('Error creating space:', error);
      batchUpdate({ error: 'Failed to create space' });
    } finally {
      batchUpdate({ isLoading: false });
      onClose();
    }
  };

  const handleModelSelect = async (modelId: string, provider: Provider) => {
    if (!activeSpace) return;
    batchUpdate({ isLoading: true });

    try {
      const response = await fetch(`/api/spaces/${activeSpace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          provider: provider
        })
      });

      const updatedSpace = await response.json();
      if (!updatedSpace.error) {
        setActiveSpace(updatedSpace);
      }
    } catch (error) {
      console.error('Error updating model:', error);
      batchUpdate({ error: 'Failed to update model' });
    } finally {
      batchUpdate({ isLoading: false });
      onClose();
    }
  };

  const quickActions = [
    { 
      id: 'spaces',
      name: 'Switch Space',
      icon: <Globe className="w-4 h-4" />,
      shortcut: ['⌘', 'S'],
      callback: () => setShowSpaces(true)
    },
    {
      id: 'models',
      name: 'Switch Model',
      icon: <Cpu className="w-4 h-4" />,
      shortcut: ['⌘', 'M'],
      callback: () => setShowModels(true)
    },
    { 
      id: 'generate',
      name: 'Generate Content',
      icon: <Sparkles className="w-4 h-4" />,
      callback: () => handleGlobalCommand(() => console.log('Generate'))
    },
    { 
      id: 'image',
      name: 'Create Image',
      icon: <Image className="w-4 h-4" />,
      callback: () => handleGlobalCommand(() => console.log('Image'))
    },
    { 
      id: 'link',
      name: 'Add Link',
      icon: <Link className="w-4 h-4" />,
      callback: () => handleGlobalCommand(() => console.log('Link'))
    },
    { 
      id: 'document',
      name: 'New Document',
      icon: <FileText className="w-4 h-4" />,
      callback: () => handleGlobalCommand(() => console.log('Doc'))
    },
    { 
      id: 'share',
      name: 'Share',
      icon: <Share2 className="w-4 h-4" />,
      callback: () => handleGlobalCommand(() => console.log('Share'))
    },
    { 
      id: 'bookmark',
      name: 'Bookmark',
      icon: <Bookmark className="w-4 h-4" />,
      callback: () => handleGlobalCommand(() => console.log('Bookmark'))
    },
  ];

  const createSpaceButton = (
    <Command.Item
      value="new-space create-space"
      onSelect={handleCreateSpace}
      className="group relative flex items-center gap-3 rounded-none px-4 py-3 text-sm text-white/90 outline-none
        transition-all duration-200 hover:bg-white/[0.08] aria-selected:bg-white/[0.12]"
    >
      <Plus className="w-4 h-4 text-white/70" />
      <span>Create New Space</span>
    </Command.Item>
  );

  return (
    <CommandModal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setShowSpaces(false);
        setShowModels(false);
        setSearchValue('');
        setSelectedProvider(null);
      }}
      placeholder={
        showSpaces 
          ? "Search spaces..." 
          : showModels 
            ? selectedProvider 
              ? `Search ${PROVIDER_NAMES[selectedProvider]} models...`
              : "Select a provider..."
            : "Search quick actions..."
      }
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      leftElement={
        (showSpaces || (showModels && selectedProvider)) ? (
          <button
            onClick={() => {
              if (showSpaces) setShowSpaces(false);
              if (showModels) {
                if (selectedProvider) {
                  setSelectedProvider(null);
                } else {
                  setShowModels(false);
                }
              }
              setSearchValue('');
            }}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors px-2 py-1 rounded-md
              border border-white/10 bg-white/5 hover:bg-white/10 mr-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        ) : null
      }
      footerElement={showSpaces ? createSpaceButton : null}
    >
      <Command.List>
        {!showSpaces && !showModels ? (
          <>
            {quickActions.map((item) => (
              <Command.Item
                key={item.id}
                value={`${item.id} ${item.name}`}
                onSelect={() => {
                  item.callback?.();
                }}
                className="group relative flex items-center gap-3 rounded-md px-4 py-3 text-sm text-white/90 outline-none
                  transition-all duration-200 hover:bg-white/[0.08] aria-selected:bg-white/[0.12]"
              >
                <span className="flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                  {item.icon}
                </span>
                <span className="flex-1">
                  {item.name}
                </span>
                {item.shortcut?.length && (
                  <span className="flex items-center gap-1">
                    {item.shortcut.map((key, index) => (
                      <kbd
                        key={`${item.id}-shortcut-${index}`}
                        className="rounded bg-white/5 px-2 py-1 text-[10px] font-medium text-white/40 border border-white/10 transition-colors group-hover:bg-white/10"
                      >
                        {key}
                      </kbd>
                    ))}
                  </span>
                )}
              </Command.Item>
            ))}
          </>
        ) : showSpaces ? (
          <>
            {spaces.map((space) => (
              <Command.Item
                key={space.id}
                value={`space ${space.id} ${space.name}`}
                onSelect={() => handleSpaceSelect(space.id)}
                className="group relative flex items-center gap-3 rounded-md px-4 py-3 text-sm text-white/90 outline-none
                  transition-all duration-200 hover:bg-white/[0.08] aria-selected:bg-white/[0.12]"
              >
                <div className={`w-2 h-2 rounded-full ${space.id === activeSpace?.id ? 'bg-blue-500' : 'bg-white/20'}`} />
                <span>{space.name}</span>
              </Command.Item>
            ))}
          </>
        ) : (
          <>
            {!selectedProvider ? (
              // Show provider selection
              Object.entries(PROVIDER_NAMES).map(([provider, name]) => (
                <Command.Item
                  key={provider}
                  value={`provider ${provider} ${name}`}
                  onSelect={() => setSelectedProvider(provider as Provider)}
                  className="group relative flex items-center gap-3 rounded-md px-4 py-3 text-sm text-white/90 outline-none
                    transition-all duration-200 hover:bg-white/[0.08] aria-selected:bg-white/[0.12]"
                >
                  <ProviderIcon provider={provider as Provider} size={16} className="opacity-75" />
                  <span>{name}</span>
                </Command.Item>
              ))
            ) : (
              // Show models for selected provider
              AVAILABLE_MODELS[selectedProvider].map((model) => (
                <Command.Item
                  key={model.id}
                  value={`model ${model.id} ${model.name}`}
                  onSelect={() => handleModelSelect(model.id, selectedProvider)}
                  className="group relative flex items-center gap-3 rounded-md px-4 py-3 text-sm text-white/90 outline-none
                    transition-all duration-200 hover:bg-white/[0.08] aria-selected:bg-white/[0.12]"
                >
                  <ProviderIcon provider={selectedProvider} size={16} className="opacity-75" />
                  <span>{model.name}</span>
                </Command.Item>
              ))
            )}
          </>
        )}
      </Command.List>
    </CommandModal>
  );
};
