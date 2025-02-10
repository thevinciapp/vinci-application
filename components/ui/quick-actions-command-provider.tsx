// components/ui/quick-actions-command-provider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { QuickActionsCommand } from '@/components/ui/quick-actions-command';
// Removed: import { useCommandState } from '@/components/ui/command-state-provider';
// No longer needed

interface QuickActionsCommandContextType {
  isOpen: boolean;
  openQuickActionsCommand: (withSpaces?: boolean) => void;
  closeQuickActionsCommand: () => void;
  toggleQuickActionsCommand: (withSpaces?: boolean, withModels?: boolean) => void;
  // Removed: isExecuting, handleGlobalCommand  (No longer needed)
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
  // Removed: isExecuting: false,
  // Removed: handleGlobalCommand: () => {},
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
  // const [isExecuting, setIsExecuting] = useState(false); // Removed
  const [showSpaces, setShowSpaces] = useState(false);
  const [showModels, setShowModels] = useState(false);
  // Removed: const { activeCommand, setActiveCommand } = useCommandState();
  const [isOpen, setIsOpen] = useState(false); // Directly manage isOpen here

  const openQuickActionsCommand = useCallback((withSpaces = false) => {
    setIsOpen(true);
    setShowSpaces(withSpaces);
    setShowModels(false);
  }, []); // Added useCallback

  const closeQuickActionsCommand = useCallback(() => {
    setIsOpen(false);
    setShowSpaces(false);
    setShowModels(false);
  }, []); // Added useCallback

  const toggleQuickActionsCommand = useCallback((withSpaces = false, withModels = false) => {
      setIsOpen((prevIsOpen) => {
          const nextIsOpen = !prevIsOpen;
          setShowSpaces(nextIsOpen && withSpaces); // Only show if opening AND withSpaces is true
          setShowModels(nextIsOpen && withModels);  // Only show if opening AND withModels is true
          return nextIsOpen;
      });
  }, []); // Added useCallback

  // const handleGlobalCommand = (handler: () => void) => { // Removed

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleQuickActionsCommand(); // Just toggle, don't pass booleans
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toggleQuickActionsCommand(true, false); // Open with spaces
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
          e.preventDefault();
          toggleQuickActionsCommand(false, true); // Open with models
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleQuickActionsCommand]); //  Dependency array now includes toggleQuickActionsCommand

  return (
    <QuickActionsCommandContext.Provider
      value={{
        isOpen,
        openQuickActionsCommand,
        closeQuickActionsCommand,
        toggleQuickActionsCommand,
        // Removed: isExecuting,
        // Removed: handleGlobalCommand,
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