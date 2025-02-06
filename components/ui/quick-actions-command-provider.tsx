'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { QuickActionsCommand } from '@/components/ui/quick-actions-command';
import { useCommandState } from '@/components/ui/command-state-provider';

interface QuickActionsCommandContextType {
  isOpen: boolean;
  openQuickActionsCommand: (withSpaces?: boolean) => void;
  closeQuickActionsCommand: () => void;
  toggleQuickActionsCommand: (withSpaces?: boolean, withModels?: boolean) => void;
  isExecuting: boolean;
  handleGlobalCommand: (handler: () => void) => void;
  showSpaces: boolean;
  setShowSpaces: (show: boolean) => void;
  showModels: boolean;
  setShowModels: (show: boolean) => void;
}

const QuickActionsCommandContext = createContext<QuickActionsCommandContextType>({
  isOpen: false,
  openQuickActionsCommand: () => {},
  closeQuickActionsCommand: () => {},
  toggleQuickActionsCommand: () => {},
  isExecuting: false,
  handleGlobalCommand: () => {},
  showSpaces: false,
  setShowSpaces: () => {},
  showModels: false,
  setShowModels: () => {},
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
  const [showSpaces, setShowSpaces] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const { activeCommand, setActiveCommand } = useCommandState();
  const isOpen = activeCommand === 'quick-actions';

  const openQuickActionsCommand = (withSpaces = false) => {
    setActiveCommand('quick-actions');
    setShowSpaces(withSpaces);
    setShowModels(false);
  };

  const closeQuickActionsCommand = () => {
    setActiveCommand(null);
    setShowSpaces(false);
    setShowModels(false);
  };
  
  const toggleQuickActionsCommand = (withSpaces = false, withModels = false) => {
    if (isOpen) {
      closeQuickActionsCommand();
    } else {
      setActiveCommand('quick-actions');
      setShowSpaces(withSpaces);
      setShowModels(withModels);
    }
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
      if (e.metaKey || e.ctrlKey) {
        // Handle Command/Ctrl + K
        if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if (!isExecuting) {
            toggleQuickActionsCommand(false, false);
          }
        }
        // Handle Command/Ctrl + S
        else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          if (!isExecuting) {
            toggleQuickActionsCommand(true, false);
          }
        }
        // Handle Command/Ctrl + M
        else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          if (!isExecuting) {
            toggleQuickActionsCommand(false, true);
          }
        }
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExecuting, isOpen]);

  return (
    <QuickActionsCommandContext.Provider
      value={{
        isOpen,
        openQuickActionsCommand,
        closeQuickActionsCommand,
        toggleQuickActionsCommand,
        isExecuting,
        handleGlobalCommand,
        showSpaces,
        setShowSpaces,
        showModels,
        setShowModels,
      }}
    >
      {children}
      <QuickActionsCommand isOpen={isOpen} onClose={closeQuickActionsCommand} />
    </QuickActionsCommandContext.Provider>
  );
};
