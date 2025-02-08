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
  const { spaces, setActiveSpace, activeSpace, setSpaces } = useSpaces();
  const { batchUpdate } = useChatState();
  const [searchValue, setSearchValue] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showSpaceForm, setShowSpaceForm] = useState(false);
  const [spaceForm, setSpaceForm] = useState<{
    name: string;
    description: string;
    provider: Provider;
    model: string;
  }>({
    name: '',
    description: '',
    provider: 'groq',
    model: AVAILABLE_MODELS['groq'][0]?.id || ''
  });

  // Clear search and selected provider when switching views
  useEffect(() => {
    setSearchValue('');
    setSelectedProvider(null);
  }, [showSpaces, showModels]);

  // Reset form when closing modal
  useEffect(() => {
    if (!isOpen) {
      setShowSpaceForm(false);
      setSpaceForm({
        name: '',
        description: '',
        provider: 'groq',
        model: AVAILABLE_MODELS['groq'][0]?.id || ''
      });
    }
  }, [isOpen]);

  // Add this effect to handle focus when switching views
  useEffect(() => {
    if (showSpaces || showModels || (showModels && selectedProvider)) {
      // Small delay to ensure the list is rendered
      const timeoutId = setTimeout(() => {
        const firstItem = document.querySelector('[cmdk-item]') as HTMLElement;
        if (firstItem) {
          firstItem.dataset.selected = 'true';
          firstItem.focus();
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [showSpaces, showModels, selectedProvider]);

  const handleSpaceSelect = async (spaceId: string) => {
    console.log('Selecting space:', spaceId);
    setSearchValue('');
    onClose();
    
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
      
      // Update the spaces list with the new active space
      const updatedSpaces = spaces.map(s => ({
        ...s,
        isActive: s.id === spaceId
      }));
      
      // Ensure active space is first in the list
      const activeSpace = updatedSpaces.find(s => s.id === spaceId);
      const otherSpaces = updatedSpaces.filter(s => s.id !== spaceId);
      const reorderedSpaces = activeSpace ? [activeSpace, ...otherSpaces] : updatedSpaces;
      
      setSpaces(reorderedSpaces);
      setActiveSpace(space);
    } catch (error) {
      console.error('Error switching space:', error);
    }
  };

  const handleCreateSpace = async () => {
    if (!spaceForm.name) return;
    
    // Close modal immediately for better UX
    onClose();
    
    try {
      // Create space and set as active
      const response = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: spaceForm.name,
          description: spaceForm.description,
          model: spaceForm.model || AVAILABLE_MODELS[spaceForm.provider][0]?.id,
          provider: spaceForm.provider,
          setActive: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create space');
      }

      const newSpace = await response.json();
      
      // Create initial conversation synchronously
      const convResponse = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          space_id: newSpace.id,
          title: 'Getting Started'
        })
      });

      if (!convResponse.ok) {
        throw new Error('Failed to create conversation');
      }

      const newConversation = await convResponse.json();

      // Create welcome message synchronously
      const messageResponse = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: newConversation.id,
          role: 'assistant',
          content: 'Welcome to your new space! I\'m here to help you explore and create. What would you like to do?',
          model_used: newSpace.model,
          provider: newSpace.provider
        })
      });

      if (!messageResponse.ok) {
        throw new Error('Failed to create welcome message');
      }

      const welcomeMessage = await messageResponse.json();
      
      // Update local state with all the new data
      const updatedSpaces = spaces.map(space => ({
        ...space,
        isActive: false
      }));
      
      const newSpaces = [
        { ...newSpace, isActive: true },
        ...updatedSpaces
      ];
      
      setSpaces(newSpaces);
      setActiveSpace({ 
        ...newSpace, 
        isActive: true,
        default_conversation: newConversation,
        welcome_message: welcomeMessage
      });

    } catch (error) {
      console.error('Error creating space:', error);
    }
  };

  const handleModelSelect = async (modelId: string, provider: Provider) => {
    if (!activeSpace) return;
    setSearchValue('');
    onClose();
    
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
    }
  };

  const quickActions = [
    { 
      id: 'spaces',
      name: 'Spaces',
      icon: <Globe className="w-4 h-4" />,
      shortcut: ['⌘', 'S'],
      callback: () => {
        setShowSpaces(true)
        setSearchValue('')
      }
    },
    {
      id: 'models',
      name: 'Models',
      icon: <Cpu className="w-4 h-4" />,
      shortcut: ['⌘', 'M'],
      callback: () => {
        setShowModels(true)
        setSearchValue('')
      }
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

  const commandItemBaseClass = `group relative flex items-center gap-3 mx-2 my-1 px-4 py-3 text-sm text-white/90 outline-none
    transition-all duration-200 rounded-lg backdrop-blur-sm border border-transparent
    data-[selected=true]:bg-white/[0.08] data-[selected=true]:border-white/20 data-[selected=true]:text-white
    hover:bg-white/[0.08] hover:border-white/20`;

  const createSpaceButton = (
    <Command.Item
      value="new-space create-space"
      onSelect={() => {
        setShowSpaceForm(true)
        setSearchValue('')
      }}
      className="flex items-center gap-2 px-4 py-2 text-sm text-white/90 bg-[#5E6AD2] hover:bg-[#4F5ABF] rounded-md transition-colors
        border border-white/10 backdrop-blur-xl w-full max-w-[200px] justify-center font-medium"
    >
      <Plus className="w-4 h-4" />
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
        setShowSpaceForm(false);
      }}
      placeholder={
        showSpaceForm
          ? "Configure your new space..."
          : showSpaces 
            ? "Search spaces..." 
            : showModels 
              ? selectedProvider 
                ? `Search ${PROVIDER_NAMES[selectedProvider]} models...`
                : "Select a provider..."
              : "Search quick actions..."
      }
      searchValue={showSpaceForm ? '' : searchValue}
      onSearchChange={showSpaceForm ? undefined : setSearchValue}
      hideSearch={showSpaceForm}
      leftElement={
        (showSpaces || showModels || showSpaceForm) ? (
          <button
            onClick={() => {
              if (showSpaceForm) {
                setShowSpaceForm(false);
              } else if (showSpaces) {
                setShowSpaces(false);
              } else if (showModels) {
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
      footerElement={showSpaces && !showSpaceForm ? createSpaceButton : null}
      showSpaceForm={showSpaceForm}
      setShowSpaceForm={setShowSpaceForm}
      showSpaces={showSpaces}
      setShowSpaces={setShowSpaces}
      showModels={showModels}
      setShowModels={setShowModels}
      selectedProvider={selectedProvider}
      setSelectedProvider={setSelectedProvider}
    >
      <Command.List>
        {showSpaceForm ? (
          <Command.Group>
            <div className="flex flex-col">
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Name</label>
                  <input
                    type="text"
                    value={spaceForm.name}
                    onChange={(e) => setSpaceForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white/90 text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/50"
                    placeholder="Enter space name"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={spaceForm.description}
                    onChange={(e) => setSpaceForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white/90 text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/50"
                    placeholder="Enter space description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Provider</label>
                  <select
                    value={spaceForm.provider}
                    onChange={(e) => {
                      const provider = e.target.value as Provider;
                      setSpaceForm(prev => ({ 
                        ...prev, 
                        provider,
                        model: AVAILABLE_MODELS[provider][0]?.id || ''
                      }));
                    }}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white/90 text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/50"
                  >
                    {Object.entries(PROVIDER_NAMES).map(([provider, name]) => (
                      <option key={provider} value={provider}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Model</label>
                  <select
                    value={spaceForm.model}
                    onChange={(e) => setSpaceForm(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white/90 text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/50"
                  >
                    {AVAILABLE_MODELS[spaceForm.provider].map((model) => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={handleCreateSpace}
                    disabled={!spaceForm.name}
                    className="px-8 py-1.5 bg-[#5E6AD2] text-white/90 rounded-md text-xs font-medium
                      hover:bg-[#4F5ABF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                      border border-white/10 backdrop-blur-xl"
                  >
                    Create Space
                  </button>
                </div>
              </div>
            </div>
          </Command.Group>
        ) : !showSpaces && !showModels ? (
          <Command.Group>
            {quickActions.map((item, index) => (
              <Command.Item
                key={item.id}
                value={`${item.id} ${item.name}`}
                onSelect={() => {
                  item.callback?.();
                }}
                data-selected={index === 0 ? 'true' : undefined}
                className={commandItemBaseClass}
              >
                <span className="flex-shrink-0 opacity-70 group-hover:opacity-100 group-data-[selected=true]:opacity-100 transition-opacity">
                  {item.icon}
                </span>
                <span className="flex-1 transition-colors duration-200 group-hover:text-white">
                  {item.name}
                </span>
                {item.shortcut?.length && (
                  <span className="flex items-center gap-1">
                    {item.shortcut.map((key, index) => (
                      <kbd
                        key={`${item.id}-shortcut-${index}`}
                        className="flex items-center justify-center w-6 h-6 rounded bg-white/5 text-[10px] font-medium text-white/40 border border-white/10 transition-colors group-hover:bg-white/10 group-data-[selected=true]:bg-white/10"
                      >
                        {key}
                      </kbd>
                    ))}
                  </span>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        ) : showSpaces ? (
          <Command.Group>
            {spaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/40">
                <p className="text-sm mb-4">No spaces found</p>
              </div>
            ) : (
              <>
                {spaces.map((space, index) => (
                  <Command.Item
                    key={space.id}
                    value={`space ${space.id} ${space.name}`}
                    onSelect={() => handleSpaceSelect(space.id)}
                    data-selected={index === 0 ? 'true' : undefined}
                    className={`group relative flex items-center gap-3 mx-2 my-1 px-4 py-3 text-sm outline-none
                      transition-all duration-200 rounded-lg backdrop-blur-sm
                      data-[selected=true]:bg-white/[0.08] data-[selected=true]:border-white/20 data-[selected=true]:text-white
                      hover:bg-white/[0.08] hover:border-white/20
                      ${space.isActive 
                        ? 'bg-white/[0.05] border border-white/10 shadow-[0_0_1px_rgba(255,255,255,0.1)]' 
                        : 'text-white/90 border border-transparent'}`}
                  >
                    <div className={`w-2 h-2 rounded-full transition-all duration-200 
                      ${space.isActive 
                        ? 'bg-blue-500 ring-2 ring-blue-500/20' 
                        : 'bg-white/20 group-hover:bg-white/40 group-data-[selected=true]:bg-white/40'}`} />
                    <span className={`transition-all duration-200 
                      ${space.isActive 
                        ? 'text-white font-medium' 
                        : 'text-white/90 group-hover:text-white group-data-[selected=true]:text-white'}`}>
                      {space.name}
                    </span>
                    {space.isActive && (
                      <span className="ml-auto text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded-md">
                        Active
                      </span>
                    )}
                  </Command.Item>
                ))}
              </>
            )}
          </Command.Group>
        ) : (
          <>
            {!selectedProvider ? (
              <Command.Group>
                {Object.entries(PROVIDER_NAMES).map(([provider, name], index) => (
                  <Command.Item
                    key={provider}
                    value={`provider ${provider} ${name}`}
                    onSelect={() => {
                      setSelectedProvider(provider as Provider)
                      setSearchValue('')
                    }}
                    data-selected={index === 0 ? 'true' : undefined}
                    className={`group relative flex items-center gap-3 mx-2 my-1 px-4 py-3 text-sm outline-none
                      transition-all duration-200 rounded-lg backdrop-blur-sm
                      data-[selected=true]:bg-white/[0.08] data-[selected=true]:border-white/20 data-[selected=true]:text-white
                      hover:bg-white/[0.08] hover:border-white/20
                      ${activeSpace?.provider === provider 
                        ? 'bg-white/[0.05] border border-white/10 shadow-[0_0_1px_rgba(255,255,255,0.1)]' 
                        : 'text-white/90 border border-transparent'}`}
                  >
                    <ProviderIcon 
                      provider={provider as Provider} 
                      size={16} 
                      className={`transition-opacity duration-200 
                        ${activeSpace?.provider === provider 
                          ? 'opacity-100' 
                          : 'opacity-75 group-hover:opacity-100 group-data-[selected=true]:opacity-100'}`} 
                    />
                    <span className={`transition-all duration-200 
                      ${activeSpace?.provider === provider 
                        ? 'text-white font-medium' 
                        : 'text-white/90 group-hover:text-white group-data-[selected=true]:text-white'}`}>
                      {name}
                    </span>
                    {activeSpace?.provider === provider && (
                      <span className="ml-auto text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded-md">
                        Active
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : (
              <Command.Group>
                {AVAILABLE_MODELS[selectedProvider].map((model, index) => (
                  <Command.Item
                    key={model.id}
                    value={`model ${model.id} ${model.name}`}
                    onSelect={() => handleModelSelect(model.id, selectedProvider)}
                    data-selected={index === 0 ? 'true' : undefined}
                    className={`group relative flex items-center gap-3 mx-2 my-1 px-4 py-3 text-sm outline-none
                      transition-all duration-200 rounded-lg backdrop-blur-sm
                      data-[selected=true]:bg-white/[0.08] data-[selected=true]:border-white/20 data-[selected=true]:text-white
                      hover:bg-white/[0.08] hover:border-white/20
                      ${activeSpace?.model === model.id 
                        ? 'bg-white/[0.05] border border-white/10 shadow-[0_0_1px_rgba(255,255,255,0.1)]' 
                        : 'text-white/90 border border-transparent'}`}
                  >
                    <ProviderIcon 
                      provider={selectedProvider} 
                      size={16} 
                      className={`transition-opacity duration-200 
                        ${activeSpace?.model === model.id 
                          ? 'opacity-100' 
                          : 'opacity-75 group-hover:opacity-100 group-data-[selected=true]:opacity-100'}`} 
                    />
                    <span className={`transition-all duration-200 
                      ${activeSpace?.model === model.id 
                        ? 'text-white font-medium' 
                        : 'text-white/90 group-hover:text-white group-data-[selected=true]:text-white'}`}>
                      {model.name}
                    </span>
                    {activeSpace?.model === model.id && (
                      <span className="ml-auto text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded-md">
                        Active
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </>
        )}
      </Command.List>
    </CommandModal>
  );
};
