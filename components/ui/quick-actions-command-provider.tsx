'use client';

import React, { createContext, useContext, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { QuickActionsCommand } from '@/components/ui/quick-actions-command';
import { useCommandWindow } from '@/lib/hooks/use-command-window';
import { useModalNavigationStore } from '@/lib/stores/modal-navigation-store';

// Define the SimilarMessage type
interface SimilarMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: number;
  score: number;
  metadata?: Record<string, any>;
}

interface QuickActionsCommandContextType {
  isOpen: boolean;
  openQuickActionsCommand: (options?: { 
    withSpaces?: boolean; 
    withModels?: boolean; 
    withConversations?: boolean;
    withSimilarMessages?: boolean;
    withMessagesSearch?: boolean;
    similarMessages?: SimilarMessage[];
  }) => void;
  closeQuickActionsCommand: () => void;
  toggleQuickActionsCommand: (options?: { 
    withSpaces?: boolean; 
    withModels?: boolean; 
    withConversations?: boolean;
    withSimilarMessages?: boolean;
    withMessagesSearch?: boolean;
    similarMessages?: SimilarMessage[];
  }) => void;
  showSpaces: boolean;
  setShowSpaces: (show: boolean) => void;
  showModels: boolean;
  setShowModels: (show: boolean) => void;
  showConversations: boolean;
  setShowConversations: (show: boolean) => void;
  showSimilarMessages: boolean;
  setShowSimilarMessages: (show: boolean) => void;
  showMessagesSearch: boolean;
  setShowMessagesSearch: (show: boolean) => void;
  similarMessages: SimilarMessage[];
  setSimilarMessages: (messages: SimilarMessage[]) => void;
}

const QuickActionsCommandContext = createContext<QuickActionsCommandContextType | undefined>(undefined);

export function QuickActionsCommandProvider({ children }: { children: React.ReactNode }) {
  const {
    isOpen,
    showSpaces,
    showModels,
    showConversations,
    setShowSpaces,
    setShowModels,
    setShowConversations,
    openCommandWindow: openQuickActionsCommandBase,
    closeCommandWindow: closeQuickActionsCommand,
    toggleCommandWindow: toggleQuickActionsCommandBase
  } = useCommandWindow();

  const [showSimilarMessages, setShowSimilarMessages] = useState(false);
  const [showMessagesSearch, setShowMessagesSearch] = useState(false);
  const [similarMessages, setSimilarMessages] = useState<SimilarMessage[]>([]);
  const { setDirectOpen, addToHistory, resetHistory } = useModalNavigationStore();

  // Wrap the openCommandWindow function to handle similarMessages
  const openQuickActionsCommand = (options?: { 
    withSpaces?: boolean; 
    withModels?: boolean; 
    withConversations?: boolean;
    withSimilarMessages?: boolean;
    withMessagesSearch?: boolean;
    similarMessages?: SimilarMessage[];
  }) => {
    if (options?.withSimilarMessages) {
      setShowSimilarMessages(true);
      if (options.similarMessages) {
        setSimilarMessages(options.similarMessages);
      }
      // Record direct open via API
      setDirectOpen('similarMessages');
    }
    if (options?.withMessagesSearch) {
      setShowMessagesSearch(true);
    }
    openQuickActionsCommandBase(options);
  };

  // Wrap the toggleCommandWindow function to handle similarMessages
  const toggleQuickActionsCommand = (options?: { 
    withSpaces?: boolean; 
    withModels?: boolean; 
    withConversations?: boolean;
    withSimilarMessages?: boolean;
    withMessagesSearch?: boolean;
    similarMessages?: SimilarMessage[];
  }) => {
    if (options?.withSimilarMessages) {
      setShowSimilarMessages(true);
      if (options.similarMessages) {
        setSimilarMessages(options.similarMessages);
      }
      // Record direct open via hotkey
      setDirectOpen('similarMessages');
    }
    if (options?.withMessagesSearch) {
      setShowMessagesSearch(true);
    }
    toggleQuickActionsCommandBase(options);
  };

  // Wrap the existing closeCommandWindow function
  const closeQuickActionsCommandUpdated = () => {
    // Reset all state when closing
    setShowSimilarMessages(false);
    setShowMessagesSearch(false);
    setSimilarMessages([]);
    
    // Reset navigation history
    resetHistory();
    
    // Close the command window
    closeQuickActionsCommand();
  };

  useHotkeys('meta+k, ctrl+k', (e) => {
    e.preventDefault();
    toggleQuickActionsCommand();
  }, { enableOnFormTags: true });

  useHotkeys('meta+s, ctrl+s', (e) => {
    e.preventDefault();
    toggleQuickActionsCommand({ withSpaces: true });
  }, { enableOnFormTags: true });

  useHotkeys('meta+m, ctrl+m', (e) => {
    e.preventDefault();
    toggleQuickActionsCommand({ withModels: true });
  }, { enableOnFormTags: true });

  useHotkeys('meta+c, ctrl+c', (e) => {
    e.preventDefault();
    toggleQuickActionsCommand({ withConversations: true });
  }, { enableOnFormTags: true });

  useHotkeys('meta+f, ctrl+f', (e) => {
    e.preventDefault();
    toggleQuickActionsCommand({ withMessagesSearch: true });
    
    // Record direct open
    setDirectOpen('messagesSearch');
  }, { enableOnFormTags: true });

  return (
    <QuickActionsCommandContext.Provider
      value={{
        isOpen,
        openQuickActionsCommand,
        closeQuickActionsCommand: closeQuickActionsCommandUpdated,
        toggleQuickActionsCommand,
        showSpaces,
        setShowSpaces,
        showModels,
        setShowModels,
        showConversations,
        setShowConversations,
        showSimilarMessages,
        setShowSimilarMessages,
        showMessagesSearch,
        setShowMessagesSearch,
        similarMessages,
        setSimilarMessages
      }}
    >
      {children}
      <QuickActionsCommand isOpen={isOpen} onClose={closeQuickActionsCommandUpdated} />
    </QuickActionsCommandContext.Provider>
  );
}

export function useQuickActionsCommand() {
  const context = useContext(QuickActionsCommandContext);
  if (context === undefined) {
    throw new Error('useQuickActionsCommand must be used within a QuickActionsCommandProvider');
  }
  return context;
}