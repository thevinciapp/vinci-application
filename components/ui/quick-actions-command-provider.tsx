'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { QuickActionsCommand } from '@/components/ui/quick-actions-command';
import { useCommandState } from '@/components/ui/command-state-provider';

interface QuickActionsCommandContextType {
  isOpen: boolean;
  openQuickActionsCommand: () => void;
  closeQuickActionsCommand: () => void;
  toggleQuickActionsCommand: () => void;
  isExecuting: boolean;
  handleGlobalCommand: (handler: () => void) => void;
}

const QuickActionsCommandContext = createContext<QuickActionsCommandContextType>({
  isOpen: false,
  openQuickActionsCommand: () => {},
  closeQuickActionsCommand: () => {},
  toggleQuickActionsCommand: () => {},
  isExecuting: false,
  handleGlobalCommand: () => {},
});

export const useQuickActionsCommand = () => {
  const context = useContext(QuickActionsCommandContext);
  if (!context) {
    throw new Error('useQuickActionsCommand must be used within a QuickActionsCommandProvider');
  }
  return context;
};

export const QuickActionsCommandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const { activeCommand, setActiveCommand } = useCommandState();
  const isOpen = activeCommand === 'quick-actions';

  const openQuickActionsCommand = () => {
    setActiveCommand('quick-actions');
  };

  const closeQuickActionsCommand = () => setActiveCommand(null);
  
  const toggleQuickActionsCommand = () => {
    setActiveCommand(isOpen ? null : 'quick-actions');
  };

  const handleGlobalCommand = (handler: () => void) => {
    if (isExecuting) return;
    setIsExecuting(true);
    try {
      handler();
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!isExecuting) {
          toggleQuickActionsCommand();
        }
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExecuting, toggleQuickActionsCommand]);

  return (
    <QuickActionsCommandContext.Provider
      value={{
        isOpen,
        openQuickActionsCommand,
        closeQuickActionsCommand,
        toggleQuickActionsCommand,
        isExecuting,
        handleGlobalCommand,
      }}
    >
      {children}
      <QuickActionsCommand isOpen={isOpen} onClose={closeQuickActionsCommand} />
    </QuickActionsCommandContext.Provider>
  );
};
