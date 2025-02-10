// components/ui/quick-actions-command.tsx
'use client';

import { CommandModal } from '@/components/ui/command-modal';
import { ArrowLeft, Plus } from 'lucide-react';
import { useQuickActionsCommand } from '@/components/ui/quick-actions-command-provider';
import { Command } from 'cmdk';
import { useState, useEffect } from 'react';
import { AVAILABLE_MODELS, PROVIDER_NAMES, type Provider } from '@/config/models';
import { QuickActionsList } from '@/components/ui/quick-actions-list'
import { SpacesList } from '@/components/ui/spaces-list'
import { ModelsList } from '@/components/ui/models-list'
import { createSpace, getSpaces, setActiveSpace, updateSpace } from '@/app/actions';
import { useSpaceStore } from '@/lib/stores/space-store';
import { SpaceForm } from './space-form';

interface QuickActionsCommandProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionsCommand = ({ isOpen, onClose }: QuickActionsCommandProps) => {
  const { showSpaces, setShowSpaces, showModels, setShowModels } = useQuickActionsCommand();
  const { spaces, setSpaces, activeSpace, setActiveSpace } = useSpaceStore();
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

  const loadSpaces = async () => {
    const fetchedSpaces = await getSpaces();
    setSpaces(fetchedSpaces);
    if (fetchedSpaces && fetchedSpaces.length > 0) {
      const active = fetchedSpaces.find(space => space.isActive);
      if (active) {
        setActiveSpace(active);
      }
    }
  }

  // Clear search and selected provider when switching views
  useEffect(() => {
    setSearchValue('');
    setSelectedProvider(null);
  }, [showSpaces, showModels]);

  useEffect(() => {
    if (isOpen) {
      loadSpaces();
    }
  }, [isOpen]);

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

  const handleSpaceSelect = async (spaceId: string) => {
    setSearchValue('');
    onClose();

    // Call the server action to set the active space
    await setActiveSpace(spaceId);

    // Refetch spaces to update the isActive flag
    const updatedSpaces = await getSpaces();
    if (updatedSpaces) {
      setSpaces(updatedSpaces);
      // Find the newly active space in the updated list
      const newActiveSpace = updatedSpaces.find((s) => s.id === spaceId);
      if (newActiveSpace) {
        setActiveSpace(newActiveSpace);
      }
    }
  };

  const handleCreateSpace = async () => {
    if (!spaceForm.name) return;
    onClose();

    const newSpace = await createSpace(
      spaceForm.name,
      spaceForm.description,
      spaceForm.model,
        spaceForm.provider,
      true
    );
      if(newSpace) {
        const allSpaces = await getSpaces();
          if(allSpaces) setSpaces(allSpaces);
          setActiveSpace(newSpace);
      }
  };

  const handleModelSelect = async (modelId: string, provider: Provider) => {
    if (!activeSpace) return;
    setSearchValue('');
    onClose();

    const updatedSpace = await updateSpace(activeSpace.id, { model: modelId, provider: provider });
        if (updatedSpace) {
          setActiveSpace(updatedSpace); // Update the active space
        }

  };

    const handleGoBack = () => {
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
    }


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
            onClick={handleGoBack}
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
            setShowSpaces(true);
            setSearchValue('');
           }}
          onShowModels={() => {
              setShowModels(true);
              setSearchValue('');
          }}
        />
        ) : showSpaces ? (
          <SpacesList
              spaces={spaces}
            onSpaceSelect={handleSpaceSelect}
          />
        ) : ( // showModels is true
          <ModelsList
            selectedProvider={selectedProvider}
            onProviderSelect={(provider) => {
              setSelectedProvider(provider);
              setSearchValue('');
            }}
            onModelSelect={handleModelSelect}
            activeSpace={activeSpace}
          />
        )}
      </Command.List>
    </CommandModal>
  );
};