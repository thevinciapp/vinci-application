// components/ui/quick-actions-command.tsx
'use client';

import { CommandModal } from '@/components/ui/command-modal';
import { ArrowLeft, Plus, Search, Sparkles } from 'lucide-react';
import { useQuickActionsCommand } from '@/components/ui/quick-actions-command-provider';
import { Command } from 'cmdk';
import { useState, useEffect } from 'react';
import { AVAILABLE_MODELS, PROVIDER_NAMES, type Provider } from '@/config/models';
import { QuickActionsList } from '@/components/ui/quick-actions-list'
import { SpacesList } from '@/components/ui/spaces-list'
import { ModelsList } from '@/components/ui/models-list'
import { ConversationsList } from '@/components/ui/conversations-list'
import { createSpace, getSpaces, setActiveSpace, updateSpace, getConversations, createConversation } from '@/app/actions';
import { useSpaceStore } from '@/lib/stores/space-store';
import { SpaceForm } from './space-form';
import { Conversation } from '@/types';
import { useConversationStore } from '@/lib/stores/conversation-store'
import { ConversationTab } from '@/components/ui/conversation-tab'
import { BaseTab } from '@/components/ui/base-tab'

interface QuickActionsCommandProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionsCommand = ({ isOpen, onClose }: QuickActionsCommandProps) => {
  const { showSpaces, setShowSpaces, showModels, setShowModels, showConversations, setShowConversations } = useQuickActionsCommand();
  const { spaces, setSpaces, activeSpace, setActiveSpace } = useSpaceStore();
  const { activeConversation, setActiveConversation } = useConversationStore();
  const [searchValue, setSearchValue] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showSpaceForm, setShowSpaceForm] = useState(false);
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [spaceForm, setSpaceForm] = useState<{
    name: string;
    description: string;
    provider: Provider;
    model: string;
    color: string;
  }>({
    name: '',
    description: '',
    provider: 'groq',
    model: AVAILABLE_MODELS['groq'][0]?.id || '',
    color: ''
  });

  useEffect(() => {
    setSearchValue('');
    setSelectedProvider(null);
  }, [showSpaces, showModels, showConversations]);

  useEffect(() => {
    if (!isOpen) {
      setShowSpaceForm(false);
      setSpaceForm({
        name: '',
        description: '',
        provider: 'groq',
        model: AVAILABLE_MODELS['groq'][0]?.id || '',
        color: ''
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const loadConversations = async () => {
      if (activeSpace?.id) {
        const conversationsData = await getConversations(activeSpace.id);
        setConversations(conversationsData);
      }
    };

    if (showConversations) {
      loadConversations();
    }
  }, [activeSpace?.id, showConversations]);

  const handleSpaceSelect = async (spaceId: string) => {
    setSearchValue('');
    onClose();

    await setActiveSpace(spaceId);

    const updatedSpaces = await getSpaces();
    if (updatedSpaces) {
      setSpaces(updatedSpaces);
      const newActiveSpace = updatedSpaces.find((s) => s.id === spaceId);
      if (newActiveSpace) {
        setActiveSpace(newActiveSpace);
      }
    }
  };

  const handleConversationSelect = async (conversationId: string) => {
    setSearchValue('');
    onClose();
    
    const conversation = conversations?.find(c => c.id === conversationId)
    if (conversation) {
      setActiveConversation(conversation)
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
      true,
      spaceForm.color
    );
    
    if (newSpace) {
      const conversation = await createConversation(newSpace.id, "New Conversation");
      if (conversation) {
        setActiveConversation(conversation);
      }
      
      const allSpaces = await getSpaces();
      if (allSpaces) setSpaces(allSpaces);
      
      setActiveSpace(newSpace);
    }
  };

  const handleModelSelect = async (modelId: string, provider: Provider) => {
    if (!activeSpace) return;
    setSearchValue('');
    onClose();

    const updatedSpace = await updateSpace(activeSpace.id, { model: modelId, provider: provider });
    if (updatedSpace) {
      setActiveSpace(updatedSpace);
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
    } else if (showConversations) {
      setShowConversations(false);
    }
    setSearchValue('');
  };

  return (
    <CommandModal
      isOpen={isOpen}
      onClose={() => {
        onClose()
        setShowSpaces(false)
        setShowModels(false)
        setShowConversations(false)
        setSearchValue('')
        setSelectedProvider(null)
        setShowSpaceForm(false)
      }}
      placeholder={showSpaceForm ? "Configure your new space..." :
        showSpaces ? "Search spaces..." :
        showModels ? (selectedProvider ? `Search ${PROVIDER_NAMES[selectedProvider]} models...` : "Select a provider...") :
        showConversations ? "Search conversations..." : "Search quick actions..."}
      searchValue={showSpaceForm ? '' : searchValue}
      onSearchChange={showSpaceForm ? undefined : setSearchValue}
      hideSearch={showSpaceForm}
      leftElement={(showSpaces || showModels || showConversations || showSpaceForm) ? (
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors px-2 py-1 rounded-md
            border border-white/10 bg-white/5 hover:bg-white/10 mr-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
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
        ) : !showSpaces && !showModels && !showConversations ? (
          <QuickActionsList
            onShowSpaces={() => {
              setShowSpaces(true)
              setSearchValue('')
            }}
            onShowModels={() => {
              setShowModels(true)
              setSearchValue('')
            }}
            onShowConversations={() => {
              setShowConversations(true)
              setSearchValue('')
            }}
            onCreateSpace={() => {
              setShowSpaceForm(true)
              setSearchValue('')
            }}
          />
        ) : showSpaces ? (
          <SpacesList
            spaces={spaces}
            onSpaceSelect={handleSpaceSelect}
            activeSpaceId={activeSpace?.id}
            onCreateSpace={() => {
              setShowSpaceForm(true)
              setSearchValue('')
            }}
          />
        ) : showModels ? (
          <ModelsList
            selectedProvider={selectedProvider}
            onProviderSelect={(provider) => {
              setSelectedProvider(provider)
              setSearchValue('')
            }}
            onModelSelect={handleModelSelect}
            activeSpace={activeSpace}
          />
        ) : showConversations && activeSpace ? (
          <div className="px-1 first:pl-2 last:pr-2 py-1 flex-1">
            <BaseTab
              icon={<Search className="w-3 h-3" />}
              label="Messages"
              shortcut="F"
            />
          </div>
        ) : null}
      </Command.List>
    </CommandModal>
  )
};