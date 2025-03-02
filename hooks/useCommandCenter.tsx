'use client'
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

// Command types
export type CommandType = 'application' | 'spaces' | 'conversations' | 'models' | 'actions';

export interface CommandOption {
  id: string;
  name: string;
  value?: string;
  description?: string;
  icon?: ReactNode;
  rightElement?: ReactNode;
  shortcut?: string[];
  type: CommandType;
  keywords?: string[];
  action: () => void;
  closeCommandOnSelect?: boolean;
}

interface CommandContextType {
  isOpen: boolean;
  openCommandCenter: () => void;
  closeCommandCenter: () => void;
  toggleCommandCenter: () => void;
  openCommandType: (type: CommandType) => void;
  closeCommandType: (type: CommandType) => void;
  registerCommand: (command: CommandOption) => void;
  unregisterCommand: (commandId: string) => void;
  commands: CommandOption[];
  filteredCommands: CommandOption[];
  setSearchQuery: (query: string) => void;
  searchQuery: string;
  activeCommandType: CommandType | null;
  setActiveCommandType: (type: CommandType | null) => void;
}

const CommandContext = createContext<CommandContextType | undefined>(undefined);

export function CommandProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [commands, setCommands] = useState<CommandOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCommandType, setActiveCommandType] = useState<CommandType | null>(null);
  
  // Use a ref to track mounted state to avoid state updates after unmount
  const isMounted = useRef(true);
  
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const openCommandCenter = useCallback(() => {
    console.log('openCommandCenter called');
    setIsOpen(true);
  }, []);
  const closeCommandCenter = useCallback(() => {
    console.log('closeCommandCenter called');
    setIsOpen(false);
    setSearchQuery('');
    setActiveCommandType(null);
  }, []);
  
  const toggleCommandCenter = useCallback(() => {
    console.log('toggleCommandCenter called');
    if (isOpen) {
      if (activeCommandType !== null) {
        console.log('Switching from specific command type to main command center');
        setActiveCommandType(null);
      } else {
        setIsOpen(false);
        setSearchQuery('');
        setActiveCommandType(null);
      }
    } else {
      setIsOpen(true);
      setActiveCommandType(null);
    }
  }, [isOpen, activeCommandType]);
  
  const closeCommandType = useCallback((type: CommandType) => {
    console.log('closeCommandType called with:', type);
    if (isOpen && activeCommandType === type) {
      setIsOpen(false);
      setActiveCommandType(null);
      setSearchQuery('');
    }
  }, [isOpen, activeCommandType]);
  
  const openCommandType = useCallback((type: CommandType) => {
    console.log('openCommandType called with:', type);
    if (isOpen && activeCommandType === type) {
      closeCommandType(type);
    } else {
      setActiveCommandType(type);
      if (!isOpen) {
        setIsOpen(true);
      }
    }
  }, [isOpen, activeCommandType, closeCommandType]);

  useHotkeys('esc', () => {
    console.log('esc key pressed');
    if (isOpen) {
      closeCommandCenter();
    }
  });

  const registerCommand = useCallback((command: CommandOption) => {
    if (!isMounted.current) return;
    
    setCommands(prev => {
      const exists = prev.some(cmd => cmd.id === command.id);
      if (exists) {
        const isEqual = prev.some(cmd => 
          cmd.id === command.id && 
          cmd.name === command.name && 
          cmd.description === command.description
        );
        if (isEqual) return prev; // No change needed
        
        return prev.map(cmd => cmd.id === command.id ? command : cmd);
      }
      return [...prev, command];
    });
  }, []);

  const unregisterCommand = useCallback((commandId: string) => {
    if (!isMounted.current) return;
    
    setCommands(prev => {
      const commandExists = prev.some(cmd => cmd.id === commandId);
      if (!commandExists) return prev;
      return prev.filter(cmd => cmd.id !== commandId);
    });
  }, []);

  const filteredCommands = useMemo(() => {
    const filteredCommands = commands.filter(command => {
      if (activeCommandType && command.type !== activeCommandType) {
        return false;
      }

      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase().trim();
      
      const nameWords = command.name.toLowerCase().split(/\s+/);
      const keywordMatches = command.keywords?.some(keyword => 
        keyword.toLowerCase().startsWith(query) || 
        keyword.toLowerCase().includes(` ${query}`) || 
        keyword.toLowerCase() === query
      );
      
      const nameStartsWithQuery = command.name.toLowerCase().startsWith(query);
      const nameContainsWordStartingWithQuery = nameWords.some(word => word.startsWith(query));
      const descriptionContainsQuery = command.description?.toLowerCase().includes(query);

      return nameStartsWithQuery || 
             nameContainsWordStartingWithQuery || 
             keywordMatches || 
             descriptionContainsQuery;
    });

    return filteredCommands;
  }, [commands, searchQuery, activeCommandType]);

  const value = useMemo(() => ({
    isOpen,
    openCommandCenter,
    closeCommandCenter,
    toggleCommandCenter,
    openCommandType,
    closeCommandType,
    registerCommand,
    unregisterCommand,
    commands,
    filteredCommands,
    searchQuery,
    setSearchQuery,
    activeCommandType,
    setActiveCommandType,
  }), [
    isOpen, 
    openCommandCenter, 
    closeCommandCenter, 
    toggleCommandCenter, 
    openCommandType,
    closeCommandType,
    registerCommand, 
    unregisterCommand, 
    commands, 
    filteredCommands, 
    searchQuery, 
    activeCommandType
  ]);

  return (
    <CommandContext.Provider value={value}>
      {children}
    </CommandContext.Provider>
  );
}

export function useCommandCenter() {
  const context = useContext(CommandContext);
  if (context === undefined) {
    throw new Error('useCommandCenter must be used within a CommandProvider');
  }
  return context;
}

export function useCommandRegistration(commands: CommandOption[]) {
  const { registerCommand, unregisterCommand } = useCommandCenter();
  
  const commandsRef = useRef<CommandOption[]>([]);
  
  useEffect(() => {
    const currentCommands = [...commands];
    
    const removedCommands = commandsRef.current.filter(
      prevCmd => !currentCommands.some(cmd => cmd.id === prevCmd.id)
    );
    
    removedCommands.forEach(command => {
      unregisterCommand(command.id);
    });
    
    const newCommands = currentCommands.filter(
      cmd => !commandsRef.current.some(prevCmd => prevCmd.id === cmd.id)
    );
    
    newCommands.forEach(command => {
      registerCommand(command);
    });
    
    // Also update any commands that might have changed but kept the same ID
    const updatedCommands = currentCommands.filter(
      cmd => commandsRef.current.some(prevCmd => 
        prevCmd.id === cmd.id && 
        (prevCmd.name !== cmd.name || 
         prevCmd.description !== cmd.description ||
         JSON.stringify(prevCmd.keywords) !== JSON.stringify(cmd.keywords))
      )
    );
    
    updatedCommands.forEach(command => {
      registerCommand(command);
    });
    
    // Update our ref to the current commands array
    commandsRef.current = currentCommands;
    
  }, [commands, registerCommand, unregisterCommand]);
}

export function useModalHotkey(type: CommandType, hotkey: string) {
  const { openCommandType } = useCommandCenter();
  
  useHotkeys(hotkey, (event) => {
    event.preventDefault();
    openCommandType(type);
  }, { 
    enableOnFormTags: true,
    enableOnContentEditable: true
  });
} 