'use client';

import React, { createContext, useContext, useEffect } from 'react';
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleQuickActionsCommand();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toggleQuickActionsCommand({ withSpaces: true });
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleQuickActionsCommand({ withModels: true });
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        openQuickActionsCommand({ withConversations: true });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openQuickActionsCommand, toggleQuickActionsCommand]);

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