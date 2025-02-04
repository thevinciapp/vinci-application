'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SpaceCommand } from '@/components/ui/space-command';
import { useCommandState } from '@/components/ui/command-state-provider';
import { Space } from '@/store/spaceStore';

interface SpaceCommandContextType {
  isOpen: boolean;
  spaces: Space[];
  currentSpace: Space | null;
  setCurrentSpace: (space: Space) => void;
  openSpaceCommand: () => void;
  closeSpaceCommand: () => void;
  isExecuting: boolean;
  handleGlobalCommand: (handler: () => void) => void;
  isLoading: boolean;
}

const SpaceCommandContext = createContext<SpaceCommandContextType | undefined>(undefined);

export function SpaceCommandProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { activeCommand, setActiveCommand } = useCommandState();

  const fetchSpaces = async () => {
    try {
      console.log('Starting to fetch spaces...');
      setIsLoading(true);
      const res = await fetch('/api/spaces');
      const data = await res.json();
      console.log('Spaces response:', data);
      
      if (!data.error) {
        setSpaces(data);
        
        if (data.length === 0) {
          console.log('No spaces found, creating default space...');
          const createRes = await fetch('/api/spaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Default Space',
              description: 'Your default chat space'
            })
          });
          const newSpace = await createRes.json();
          console.log('Created default space:', newSpace);
          if (!newSpace.error) {
            setSpaces([newSpace]);
            setCurrentSpace(newSpace);
          }
        } else if (!currentSpace) {
          console.log('Setting current space to first space:', data[0]);
          setCurrentSpace(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching spaces:', error);
    } finally {
      console.log('Finished loading spaces');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const openSpaceCommand = useCallback(() => {
    setActiveCommand('space');
    setIsOpen(true);
  }, [setActiveCommand]);

  const closeSpaceCommand = useCallback(() => {
    setActiveCommand(null);
    setIsOpen(false);
  }, [setActiveCommand]);

  const handleGlobalCommand = useCallback((handler: () => void) => {
    if (isExecuting) return;
    setIsExecuting(true);
    try {
      handler();
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!isExecuting) {
          openSpaceCommand();
        }
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExecuting, openSpaceCommand]);

  return (
    <SpaceCommandContext.Provider
      value={{
        isOpen,
        spaces,
        currentSpace,
        setCurrentSpace,
        openSpaceCommand,
        closeSpaceCommand,
        isExecuting,
        handleGlobalCommand,
        isLoading
      }}
    >
      {children}
      <SpaceCommand isOpen={isOpen} onClose={closeSpaceCommand} />
    </SpaceCommandContext.Provider>
  );
}

export const useSpaceCommand = () => {
  const context = useContext(SpaceCommandContext);
  if (context === undefined) {
    throw new Error('useSpaceCommand must be used within a SpaceCommandProvider');
  }
  return context;
};
