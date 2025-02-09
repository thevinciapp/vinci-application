'use client';

import { CommandModal } from '@/components/ui/command-modal';
import { ArrowLeft, Plus } from 'lucide-react';
import { useQuickActionsCommand } from '@/components/ui/quick-actions-command-provider';
import { useSpaces } from '@/hooks/spaces-provider';
import { useChatState } from '@/hooks/chat-state-provider';
import { Command } from 'cmdk';
import { useState, useEffect } from 'react';
import { AVAILABLE_MODELS, DEFAULTS, PROVIDER_NAMES, type Provider } from '@/lib/constants';
import { QuickActionsList } from  '@/components/ui/quick-actions-list'
import { SpacesList } from '@/components/ui/spaces-list'
import { ModelsList } from '@/components/ui/models-list'
import { SpaceForm } from '@/components/ui/space-form'

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
          name: spaceForm.name || DEFAULTS.SPACE_NAME,
          description: spaceForm.description || DEFAULTS.SPACE_DESCRIPTION,
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
          spaceId: newSpace.id,
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
      footerElement={showSpaces && !showSpaceForm ? (
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
      ) : null}
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
          <SpaceForm
            spaceForm={spaceForm}
            onSpaceFormChange={setSpaceForm}
            onSubmit={handleCreateSpace}
          />
        ) : !showSpaces && !showModels ? (
          <QuickActionsList
            onShowSpaces={() => {
              setShowSpaces(true)
              setSearchValue('')
            }}
            onShowModels={() => {
              setShowModels(true)
              setSearchValue('')
            }}
            handleGlobalCommand={handleGlobalCommand}
          />
        ) : showSpaces ? (
          <SpacesList
            spaces={spaces}
            onSpaceSelect={handleSpaceSelect}
            onCreateSpace={() => {
              setShowSpaceForm(true)
              setSearchValue('')
            }}
          />
        ) : (
          <ModelsList
            selectedProvider={selectedProvider}
            onProviderSelect={(provider) => {
              setSelectedProvider(provider)
              setSearchValue('')
            }}
            onModelSelect={handleModelSelect}
            activeSpace={activeSpace}
          />
        )}
      </Command.List>
    </CommandModal>
  );
};
