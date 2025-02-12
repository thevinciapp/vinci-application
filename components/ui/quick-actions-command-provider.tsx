'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { QuickActionsCommand } from '@/components/ui/quick-actions-command';

interface QuickActionsCommandContextType {
  isOpen: boolean;
  openQuickActionsCommand: (withSpaces?: boolean) => void;
  closeQuickActionsCommand: () => void;
  toggleQuickActionsCommand: (withSpaces?: boolean, withModels?: boolean) => void;
  showSpaces: boolean;
  setShowSpaces: (show: boolean) => void;
  showModels: boolean;
  setShowModels: (show: boolean) => void;
  showConversations: boolean;
  setShowConversations: (show: boolean) => void;
}

const QuickActionsCommandContext = createContext<QuickActionsCommandContextType | undefined>(undefined);

export function QuickActionsCommandProvider({ children }: { children: React.ReactNode }) {
  const [showSpaces, setShowSpaces] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
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
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setIsOpen(true);
        setShowConversations(true);
        setShowSpaces(false);
        setShowModels(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleQuickActionsCommand, setShowConversations, setShowSpaces, setShowModels]); //  Dependency array now includes toggleQuickActionsCommand

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