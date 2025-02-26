'use client';

import { CommandModal } from '@/components/ui/command-modal';
import { ArrowLeft, Plus, Search, Sparkles, MessageSquare } from 'lucide-react';
import { useQuickActionsCommand } from '@/components/ui/quick-actions-command-provider';
import { Command } from 'cmdk';
import { useState, useEffect } from 'react';
import { AVAILABLE_MODELS, PROVIDER_NAMES, type Provider } from '@/config/models';
import { QuickActionsList } from '@/components/ui/quick-actions-list'
import { SpacesList } from '@/components/ui/spaces-list'
import { ModelsList } from '@/components/ui/models-list'
import { ConversationsList } from '@/components/ui/conversations-list'
import { createSpace, getSpaces, setActiveSpace, updateSpace, getConversations, createConversation, createMessage, createSpaceHistory, setActiveConversation as setActiveConversationDB } from '@/app/actions';
import { useSpaceStore } from '@/lib/stores/space-store';
import { SpaceForm } from './space-form';
import { Conversation, Space } from '@/types';
import { useConversationStore } from '@/lib/stores/conversation-store'
import { ConversationTab } from '@/components/ui/conversation-tab'
import { BaseTab } from '@/components/ui/base-tab'
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { commandItemClass } from './command-item';
import { useRouter } from 'next/navigation';
import { useQuickActionsCommandStore } from '@/lib/stores/quick-actions-command-store';
import { useModalNavigationStore } from '@/lib/stores/modal-navigation-store';
import { MessagesSearchModal } from '@/components/ui/messages-search-modal';

// Define the SimilarMessage type
interface SimilarMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: number;
  score: number;
  conversationId?: string;
  metadata?: Record<string, any>;
}

// Add a SimilarMessagesList component
const SimilarMessagesList = ({ messages }: { messages: SimilarMessage[] }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'user' | 'assistant'>('all');
  const { closeQuickActionsCommand } = useQuickActionsCommand();
  const { activeSpace } = useSpaceStore();
  const { conversations, setActiveConversation } = useConversationStore();
  const router = useRouter();
  const { commandSearchValue } = useQuickActionsCommandStore();
  
  // Function to navigate to a specific message in its conversation
  const navigateToMessage = async (message: SimilarMessage) => {
    closeQuickActionsCommand();
    
    // First try to get the conversationId directly from the message object
    // Only fall back to metadata if not found directly
    const conversationId = message.conversationId || message.metadata?.conversationId;
    if (!conversationId) {
      toast({
        title: 'Navigation Error',
        description: 'Could not find the conversation for this message.',
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Find the conversation in the current space
    const conversation = conversations?.find(c => c.id === conversationId && !c.is_deleted);
    if (!conversation) {
      toast({
        title: 'Conversation Not Found',
        description: 'The conversation may have been deleted.',
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Set the active conversation
    await setActiveConversation(conversation);
    
    // We need to set the active conversation in the database too
    await setActiveConversationDB(conversationId);
    
    // Show success toast with instructions
    toast({
      title: 'Navigating to message',
      description: 'The message will be highlighted. Click anywhere to dismiss the highlight.',
      variant: "default",
      duration: 4000,
    });
    
    // Navigate to the conversation and include a highlight parameter for the message
    router.push(`/protected?highlight=${message.id}`);
  };
  
  if (!messages || messages.length === 0) {
    return (
      <div className="py-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gray-800/70 flex items-center justify-center mb-4">
          <Search className="w-8 h-8 text-gray-500" />
        </div>
        <p className="text-lg text-white/60 font-medium">No matching messages found</p>
        <p className="text-sm text-white/40 mt-2 max-w-md mx-auto">
          {commandSearchValue 
            ? `We couldn't find any ${activeFilter !== 'all' ? activeFilter + ' ' : ''}messages containing "${commandSearchValue}"`
            : `No ${activeFilter !== 'all' ? activeFilter + ' ' : ''}messages are available`}
        </p>
        {commandSearchValue && (
          <p className="text-sm text-cyan-400/70 mt-4">
            Try a different search term or filter
          </p>
        )}
      </div>
    );
  }
  
  // First filter by role
  const roleFilteredMessages = messages.filter(message => {
    if (activeFilter === 'all') return true;
    return message.role === activeFilter;
  });
  
  // Then apply search filter if search term exists
  const filteredMessages = commandSearchValue 
    ? roleFilteredMessages.filter(message => 
        message.content.toLowerCase().includes(commandSearchValue.toLowerCase()) ||
        (message.metadata?.conversationTitle || '').toLowerCase().includes(commandSearchValue.toLowerCase())
      )
    : roleFilteredMessages;

  // Helper function to format relative time
  const formatRelativeTime = (timestamp: number) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const now = Date.now();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);
    
    if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second');
    if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    if (diffInSeconds < 2592000) return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    if (diffInSeconds < 31536000) return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
  };

  // Get conversation titles for the messages
  const getConversationTitle = (message: SimilarMessage) => {
    // First try to get the conversationId directly from the message
    const conversationId = message.conversationId || message.metadata?.conversationId;
    if (!conversationId) return 'Unknown Conversation';
    
    const conversation = conversations?.find(c => c.id === conversationId && !c.is_deleted);
    return conversation?.title || 'Untitled Conversation';
  };
  
  // Highlight the matching text in content
  const highlightMatchingText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() 
        ? <span key={i} className="bg-cyan-500/30 text-cyan-200">{part}</span> 
        : part
    );
  };

  return (
    <div className="space-y-4">
      <div className="px-3 py-2 flex justify-between items-center border-b border-white/[0.08] pb-3">
        <div className="text-sm text-white/80 font-medium">
          Similar Messages
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-black/40 border border-white/10">
          <button 
            className={`px-3 py-1 text-xs rounded-md transition-all ${activeFilter === 'all' 
              ? 'bg-white/10 text-white shadow-sm' 
              : 'text-white/60 hover:text-white/80'}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button 
            className={`px-3 py-1 text-xs rounded-md transition-all ${activeFilter === 'user' 
              ? 'bg-white/10 text-white shadow-sm' 
              : 'text-white/60 hover:text-white/80'}`}
            onClick={() => setActiveFilter('user')}
          >
            User
          </button>
          <button 
            className={`px-3 py-1 text-xs rounded-md transition-all ${activeFilter === 'assistant' 
              ? 'bg-white/10 text-white shadow-sm' 
              : 'text-white/60 hover:text-white/80'}`}
            onClick={() => setActiveFilter('assistant')}
          >
            Assistant
          </button>
        </div>
      </div>
      
      {filteredMessages.length === 0 ? (
        <div className="py-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gray-800/70 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-lg text-white/60 font-medium">No matching messages found</p>
          <p className="text-sm text-white/40 mt-2 max-w-md mx-auto">
            {commandSearchValue 
              ? `We couldn't find any ${activeFilter !== 'all' ? activeFilter + ' ' : ''}messages containing "${commandSearchValue}"`
              : `No ${activeFilter !== 'all' ? activeFilter + ' ' : ''}messages are available`}
          </p>
          {commandSearchValue && (
            <p className="text-sm text-cyan-400/70 mt-4">
              Try a different search term or filter
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 px-2">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03] transition-all cursor-pointer group ${message.id === 'selected' ? 'bg-white/[0.05] border-white/20' : ''}`}
              onClick={() => navigateToMessage(message)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`flex-shrink-0 w-10 h-10 rounded-md ${message.role === 'user' 
                  ? 'bg-cyan-500/10 text-cyan-400' 
                  : 'bg-indigo-500/10 text-indigo-400'} flex items-center justify-center`}>
                  {message.role === 'user' 
                    ? <MessageSquare className="w-5 h-5" /> 
                    : <Sparkles className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm text-white/90">
                      {message.role === 'user' ? 'User' : 'Assistant'}
                    </div>
                    <div className="text-white/40 text-xs">
                      {getConversationTitle(message)} · {formatRelativeTime(message.createdAt)}
                    </div>
                    <div className="ml-auto flex-shrink-0 text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-medium">
                      {Math.round(message.score * 100)}% match
                    </div>
                  </div>
                  <div className="text-sm text-white/80 mt-2 line-clamp-2 break-words group-hover:line-clamp-none transition-all duration-300">
                    {commandSearchValue 
                      ? highlightMatchingText(message.content, commandSearchValue)
                      : message.content}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface QuickActionsListProps {
  onShowSpaces: () => void;
  onShowModels: () => void;
  onShowConversations: () => void;
  onCreateConversation: () => void;
  onShowMessagesSearch: () => void;
}

function QuickActionsList({
  onShowSpaces,
  onShowModels,
  onShowConversations,
  onCreateConversation,
  onShowMessagesSearch
}: QuickActionsListProps) {
  return (
    <div className="space-y-3">
      <Command.Item
        onSelect={onShowSpaces}
        className="text-sm font-medium flex gap-2 items-center text-white/70 hover:bg-white/[0.06] data-[selected]:bg-white/[0.06] cursor-pointer transition-colors
          px-3 py-3 rounded-md hover:text-white data-[selected]:text-white"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-white">Spaces</div>
          <p className="text-sm font-normal text-white/60">
            View and manage your spaces
          </p>
        </div>
        <kbd className="ml-4 bg-white/[0.05] py-1 px-2 rounded text-xs text-white/50 font-mono flex-shrink-0">⌘ S</kbd>
      </Command.Item>
      <Command.Item
        onSelect={onShowModels}
        className="text-sm font-medium flex gap-2 items-center text-white/70 hover:bg-white/[0.06] data-[selected]:bg-white/[0.06] cursor-pointer transition-colors
          px-3 py-3 rounded-md hover:text-white data-[selected]:text-white"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-white">Models</div>
          <p className="text-sm font-normal text-white/60">
            View and manage your models
          </p>
        </div>
        <kbd className="ml-4 bg-white/[0.05] py-1 px-2 rounded text-xs text-white/50 font-mono flex-shrink-0">⌘ M</kbd>
      </Command.Item>
      <Command.Item
        onSelect={onShowConversations}
        className="text-sm font-medium flex gap-2 items-center text-white/70 hover:bg-white/[0.06] data-[selected]:bg-white/[0.06] cursor-pointer transition-colors
          px-3 py-3 rounded-md hover:text-white data-[selected]:text-white"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-white">Conversations</div>
          <p className="text-sm font-normal text-white/60">
            View and manage your conversations
          </p>
        </div>
        <kbd className="ml-4 bg-white/[0.05] py-1 px-2 rounded text-xs text-white/50 font-mono flex-shrink-0">⌘ C</kbd>
      </Command.Item>
      <Command.Item
        onSelect={onCreateConversation}
        className="text-sm font-medium flex gap-2 items-center text-white/70 hover:bg-white/[0.06] data-[selected]:bg-white/[0.06] cursor-pointer transition-colors
          px-3 py-3 rounded-md hover:text-white data-[selected]:text-white"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
          <Plus className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-white">New Conversation</div>
          <p className="text-sm font-normal text-white/60">
            Start a new conversation
          </p>
        </div>
        <kbd className="ml-4 bg-white/[0.05] py-1 px-2 rounded text-xs text-white/50 font-mono flex-shrink-0">⌘ N</kbd>
      </Command.Item>
      <Command.Item
        onSelect={onShowMessagesSearch}
        className="text-sm font-medium flex gap-2 items-center text-white/70 hover:bg-white/[0.06] data-[selected]:bg-white/[0.06] cursor-pointer transition-colors
          px-3 py-3 rounded-md hover:text-white data-[selected]:text-white"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
          <Search className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-white">Search Messages</div>
          <p className="text-sm font-normal text-white/60">
            Find messages by keyword or semantic search
          </p>
        </div>
        <kbd className="ml-4 bg-white/[0.05] py-1 px-2 rounded text-xs text-white/50 font-mono flex-shrink-0">⌘ F</kbd>
      </Command.Item>
    </div>
  );
};

interface QuickActionsCommandProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionsCommand = ({ isOpen, onClose }: QuickActionsCommandProps) => {
  const { 
    showSpaces, setShowSpaces, 
    showModels, setShowModels, 
    showConversations, setShowConversations,
    showSimilarMessages, setShowSimilarMessages,
    showMessagesSearch, setShowMessagesSearch,
    similarMessages
  } = useQuickActionsCommand();
  const router = useRouter();
  const { commandSearchValue, setCommandSearchValue } = useQuickActionsCommandStore();
  const { spaces, setSpaces, activeSpace, setActiveSpace } = useSpaceStore();
  const { activeConversation, setActiveConversation } = useConversationStore();
  const [searchValue, setSearchValue] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showSpaceForm, setShowSpaceForm] = useState(false);
  const [isEditingSpace, setIsEditingSpace] = useState(false);
  const [spaceBeingEdited, setSpaceBeingEdited] = useState<Space | null>(null);
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const { isNavigatedFromMain, addToHistory, goBack, setDirectOpen } = useModalNavigationStore();
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
  
  // Navigation between modals
  const navigateToModal = (modalType: 'spaces' | 'models' | 'conversations' | 'spaceForm') => {
    // Add current modal to history first
    if (showSpaces) {
      addToHistory('spaces');
    } else if (showModels) {
      addToHistory('models');
    } else if (showConversations) {
      addToHistory('conversations');
    } else if (showSimilarMessages) {
      addToHistory('similarMessages');
    } else if (showSpaceForm) {
      addToHistory('spaceForm');
    } else {
      // We're in the main modal
      addToHistory('main');
    }
    
    // Now navigate to the new modal
    setShowSpaces(modalType === 'spaces');
    setShowModels(modalType === 'models');
    setShowConversations(modalType === 'conversations');
    setShowSpaceForm(modalType === 'spaceForm');
    setShowSimilarMessages(false);
    setShowMessagesSearch(false);
    
    // Reset search when changing modals
    setSearchValue('');
  };

  useEffect(() => {
    setSearchValue('');
    setSelectedProvider(null);
  }, [showSpaces, showModels, showConversations]);

  useEffect(() => {
    if (!isOpen) {
      setShowSpaceForm(false);
      setIsEditingSpace(false);
      setSpaceBeingEdited(null);
      setSpaceForm({
        name: '',
        description: '',
        provider: 'groq',
        model: AVAILABLE_MODELS['groq'][0]?.id || '',
        color: ''
      });
    }
  }, [isOpen]);

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

  const handleCreateConversation = async () => {
    onClose();

    if (!activeSpace) return;

    const { conversations, setConversations } = useConversationStore.getState();
    
    const newConversation = await createConversation(activeSpace.id, 'New Conversation');
    if (newConversation) {
      setActiveConversation(newConversation);
      setConversations([...(conversations || []), newConversation]);
    }

    toast({
      title: 'New Conversation Created',
      description: 'You can start chatting right away.',
      variant: "success",
      duration: 2000,
    });
  }

  const handleConversationSelect = async (conversationId: string) => {
    setSearchValue('');
    onClose();
    
    const { conversations } = useConversationStore.getState()
    const conversation = conversations?.find(c => c.id === conversationId)
    if (conversation) {
      await setActiveConversation(conversation)
    }
  };

  const handleCreateSpace = async () => {
    if (!spaceForm.name) return;
    setIsCreatingSpace(true);

    const newSpace = await createSpace(
      spaceForm.name,
      spaceForm.description,
      spaceForm.model,
      spaceForm.provider,
      true,
      spaceForm.color
    );
    
    if (newSpace) {
      const conversation = await createConversation(newSpace.id, "Welcome to Your Space");
      if (conversation) {
        await createMessage({
          content: `Welcome to your new space, ${spaceForm.name}! 

          This space is designed to be your personalized AI assistant environment. Here's what makes it special:

          • Context Awareness: All conversations in this space share context, helping me understand your preferences and history better.

          • Persistent Memory: I'll remember important details from our conversations, making future interactions more efficient.

          • Customized Model: This space uses ${PROVIDER_NAMES[spaceForm.provider]} with the ${spaceForm.model} model, optimized for your needs.

          Feel free to start a conversation or ask any questions. I'm here to help!`,
          role: 'assistant'
        }, conversation.id);

        setActiveConversation(conversation);
      }
      
      const allSpaces = await getSpaces();
      if (allSpaces) setSpaces(allSpaces);
      
      setActiveSpace(newSpace);
      
      // Record in space history
      await createSpaceHistory({
        spaceId: newSpace.id,
        actionType: 'created',
        title: 'Space Created',
        description: `${spaceForm.name} has been created.`,
        metadata: { 
          spaceName: spaceForm.name,
          model: spaceForm.model,
          provider: spaceForm.provider
        }
      });
    }
    setIsCreatingSpace(false);

    // Show toast and create notification
    toast({
      title: 'Space Created',
      description: `${spaceForm.name} has been created.`,
      variant: "success",
      duration: 3000,
    });

    onClose();
  };

  const handleEditSpace = (space: Space) => {
    setSpaceBeingEdited(space);
    setIsEditingSpace(true);
    
    const provider = (space.provider || 'groq') as Provider;
    const availableModels = AVAILABLE_MODELS[provider];
    const defaultModel = availableModels && availableModels.length > 0 ? availableModels[0].id : '';
    
    setSpaceForm({
      name: space.name,
      description: space.description || '',
      provider: provider,
      model: space.model || defaultModel,
      color: space.color || ''
    });
    
    setShowSpaceForm(true);
    setSearchValue('');
  };

  const handleUpdateSpace = async () => {
    if (!spaceBeingEdited || !spaceForm.name) return;
    
    setIsCreatingSpace(true);
    
    try {
      const updatedSpace = await updateSpace(spaceBeingEdited.id, {
        name: spaceForm.name.trim(),
        description: spaceForm.description.trim(),
        provider: spaceForm.provider,
        model: spaceForm.model,
        color: spaceForm.color
      });
      
      if (updatedSpace) {
        // Update the spaces list with the updated space
        const updatedSpaces = spaces?.map(s => 
          s.id === updatedSpace.id ? updatedSpace : s
        );
        
        if (updatedSpaces) {
          setSpaces(updatedSpaces);
        }
        
        // If this is the active space, update that too
        if (activeSpace?.id === updatedSpace.id) {
          setActiveSpace(updatedSpace);
        }
        
        toast({
          title: 'Space Updated',
          description: `"${updatedSpace.name}" has been updated successfully.`,
          variant: "success",
          duration: 3000,
        });
        
        // Record in space history
        await createSpaceHistory({
          spaceId: updatedSpace.id,
          actionType: 'updated',
          title: 'Space Updated',
          description: `"${updatedSpace.name}" has been updated.`,
          metadata: { 
            spaceName: updatedSpace.name,
            model: updatedSpace.model,
            provider: updatedSpace.provider
          }
        });
      }
    } catch (error) {
      console.error('Error updating space:', error);
      toast({
        title: 'Error',
        description: 'Failed to update space. Please try again.',
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsCreatingSpace(false);
      onClose();
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
    const previousModal = goBack();
    
    if (!previousModal) {
      // If there's no history, just close the modal
      onClose();
      return;
    }
    
    // Navigate based on previous modal
    switch (previousModal) {
      case 'main':
        setShowSpaces(false);
        setShowModels(false);
        setShowConversations(false);
        setShowSimilarMessages(false);
        setShowSpaceForm(false);
        setShowMessagesSearch(false);
        break;
      case 'spaces':
        setShowSpaces(true);
        setShowModels(false);
        setShowConversations(false);
        setShowSimilarMessages(false);
        setShowSpaceForm(false);
        setShowMessagesSearch(false);
        break;
      case 'models':
        setShowSpaces(false);
        setShowModels(true);
        setShowConversations(false);
        setShowSimilarMessages(false);
        setShowSpaceForm(false);
        setShowMessagesSearch(false);
        break;
      case 'conversations':
        setShowSpaces(false);
        setShowModels(false);
        setShowConversations(true);
        setShowSimilarMessages(false);
        setShowSpaceForm(false);
        setShowMessagesSearch(false);
        break;
      case 'similarMessages':
        setShowSpaces(false);
        setShowModels(false);
        setShowConversations(false);
        setShowSimilarMessages(true);
        setShowSpaceForm(false);
        setShowMessagesSearch(false);
        break;
      case 'spaceForm':
        setShowSpaces(false);
        setShowModels(false);
        setShowConversations(false);
        setShowSimilarMessages(false);
        setShowSpaceForm(true);
        setShowMessagesSearch(false);
        break;
      case 'messagesSearch':
        setShowSpaces(false);
        setShowModels(false);
        setShowConversations(false);
        setShowSimilarMessages(false);
        setShowSpaceForm(false);
        setShowMessagesSearch(true);
        break;
    }
    
    // Reset search when going back
    setSearchValue('');
  };

  useEffect(() => {
    if (!isOpen) {
      setShowSpaces(false);
      setShowModels(false);
      setShowConversations(false);
      setShowSimilarMessages(false);
      setShowMessagesSearch(false);
      setSearchValue('');
      setSelectedProvider(null);
      setShowSpaceForm(false);
      setIsEditingSpace(false);
      setSpaceBeingEdited(null);
      
      // Clear any search value
      setCommandSearchValue('');
    }
  }, [isOpen, setCommandSearchValue]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    
    // If we're showing a specific modal, add it to history if we're not already there
    if (showSpaces && !showModels && !showConversations && !showSimilarMessages && !showSpaceForm && !showMessagesSearch) {
      // Check if coming from main to spaces
      if (!isNavigatedFromMain) {
        setDirectOpen('spaces');
      }
    } else if (showModels && !showSpaces && !showConversations && !showSimilarMessages && !showSpaceForm && !showMessagesSearch) {
      // Check if coming from main to models
      if (!isNavigatedFromMain) {
        setDirectOpen('models');
      }
    } else if (showConversations && !showSpaces && !showModels && !showSimilarMessages && !showSpaceForm && !showMessagesSearch) {
      // Check if coming from main to conversations
      if (!isNavigatedFromMain) {
        setDirectOpen('conversations');
      }
    } else if (showSimilarMessages && !showSpaces && !showModels && !showConversations && !showSpaceForm && !showMessagesSearch) {
      // Similar messages is handled in the provider
    } else if (showSpaceForm && !showSpaces && !showModels && !showConversations && !showSimilarMessages && !showMessagesSearch) {
      // Check if we navigated to space form
      addToHistory('spaceForm');
    } else if (showMessagesSearch && !showSpaces && !showModels && !showConversations && !showSimilarMessages && !showSpaceForm) {
      // Check if we navigated to messages search
      addToHistory('messagesSearch');
    }
  }, [isOpen, showSpaces, showModels, showConversations, showSimilarMessages, showSpaceForm, showMessagesSearch, isNavigatedFromMain, addToHistory, setDirectOpen]);

  const handleGoToSpacesList = () => {
    addToHistory('main');
    setShowSpaces(true);
    setSearchValue('');
  };
  
  const handleGoToModelsList = () => {
    addToHistory('main');
    setShowModels(true);
    setSearchValue('');
  };
  
  const handleGoToConversationsList = () => {
    addToHistory('main');
    setShowConversations(true);
    setSearchValue('');
  };
  
  const handleGoToSpaceForm = () => {
    addToHistory('main');
    setShowSpaceForm(true);
    setIsEditingSpace(false);
    setSpaceBeingEdited(null);
    setSearchValue('');
  };

  const handleGoToMessagesSearch = () => {
    addToHistory('main');
    setShowMessagesSearch(true);
    setSearchValue('');
  };

  return (
    <CommandModal
      isOpen={isOpen}
      onClose={() => {
        // Make sure to reset navigation history when closing
        onClose();
      }}
      placeholder={showSpaceForm ? isEditingSpace ? "Edit your space..." : "Configure your new space..." :
        showSpaces ? "Search spaces..." :
        showModels ? (selectedProvider ? `Search ${PROVIDER_NAMES[selectedProvider]} models...` : "Select a provider...") :
        showConversations ? "Search conversations..." : 
        showSimilarMessages ? "Search similar messages..." :
        showMessagesSearch ? "Search messages..." :
        "Search quick actions..."}
      searchValue={showSpaceForm ? '' : searchValue}
      onSearchChange={showSpaceForm ? undefined : setSearchValue}
      hideSearch={showSpaceForm}
      leftElement={(showSpaces || showModels || showConversations || showSpaceForm || showSimilarMessages || showMessagesSearch) ? (
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
      isCreatingSpace={isCreatingSpace}
      setShowSpaceForm={setShowSpaceForm}
      showSpaces={showSpaces}
      setShowSpaces={setShowSpaces}
      showModels={showModels}
      setShowModels={setShowModels}
      selectedProvider={selectedProvider}
      setSelectedProvider={setSelectedProvider}
      showConversations={showConversations}
      setShowConversations={setShowConversations}
      showSimilarMessages={showSimilarMessages}
      setShowSimilarMessages={setShowSimilarMessages}
      showMessagesSearch={showMessagesSearch}
      setShowMessagesSearch={setShowMessagesSearch}
      similarMessages={similarMessages}
      isNavigatedFromMain={isNavigatedFromMain}
    >
      <Command.List>
        {showSpaceForm ? (
          <SpaceForm
            spaceForm={spaceForm}
            onSpaceFormChange={setSpaceForm}
            onSubmit={isEditingSpace ? handleUpdateSpace : handleCreateSpace}
            isCreating={isCreatingSpace}
            isEditing={isEditingSpace}
          />
        ) : !showSpaces && !showModels && !showConversations && !showSimilarMessages && !showMessagesSearch ? (
          <QuickActionsList
            onShowSpaces={handleGoToSpacesList}
            onShowModels={handleGoToModelsList}
            onShowConversations={handleGoToConversationsList}
            onCreateSpace={handleGoToSpaceForm}
            onCreateConversation={() => {
              handleCreateConversation()
            }}
            onShowMessagesSearch={handleGoToMessagesSearch}
          />
        ) : showSpaces ? (
          <SpacesList
            spaces={spaces}
            onSpaceSelect={handleSpaceSelect}
            activeSpaceId={activeSpace?.id}
            onCreateSpace={() => {
              setShowSpaceForm(true)
              setIsEditingSpace(false)
              setSpaceBeingEdited(null)
              setSpaceForm({
                name: '',
                description: '',
                provider: 'groq',
                model: AVAILABLE_MODELS['groq'][0]?.id || '',
                color: ''
              })
              setSearchValue('')
            }}
            onEditSpace={handleEditSpace}
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
          <ConversationsList
            spaceId={activeSpace.id}
            onConversationSelect={handleConversationSelect}
          />
        ) : showSimilarMessages ? (
          <SimilarMessagesList messages={similarMessages} />
        ) : showMessagesSearch ? (
          <MessagesSearchModal
            isOpen={isOpen}
            onClose={onClose}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />
        ) : null}
      </Command.List>
    </CommandModal>
  )
};