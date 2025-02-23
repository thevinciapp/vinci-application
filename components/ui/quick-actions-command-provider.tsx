'use client';

import React, { createContext, useContext } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { QuickActionsCommand } from '@/components/ui/quick-actions-command';
import { useCommandWindow } from '@/lib/hooks/use-command-window';

interface QuickActionsCommandContextType {
  isOpen: boolean;
  openQuickActionsCommand: (options?: { withSpaces?: boolean; withModels?: boolean; withConversations?: boolean }) => void;
  closeQuickActionsCommand: () => void;
  toggleQuickActionsCommand: (options?: { withSpaces?: boolean; withModels?: boolean; withConversations?: boolean }) => void;
  showSpaces: boolean;
  setShowSpaces: (show: boolean) => void;
  showModels: boolean;
  setShowModels: (show: boolean) => void;
  showConversations: boolean;
  setShowConversations: (show: boolean) => void;
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
    openCommandWindow: openQuickActionsCommand,
    closeCommandWindow: closeQuickActionsCommand,
    toggleCommandWindow: toggleQuickActionsCommand
  } = useCommandWindow();

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

  useHotkeys('meta+d, ctrl+d', (e) => {
    e.preventDefault();
    openQuickActionsCommand({ withConversations: true });
  }, { enableOnFormTags: true });

  return (
    <QuickActionsCommandContext.Provider
      value={{
        isOpen,
        openQuickActionsCommand,
        closeQuickActionsCommand,
        toggleQuickActionsCommand,
        showSpaces,
        setShowSpaces,
        showModels,
        setShowModels,
        showConversations,
        setShowConversations
      }}
    >
      {children}
      <QuickActionsCommand isOpen={isOpen} onClose={closeQuickActionsCommand} />
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