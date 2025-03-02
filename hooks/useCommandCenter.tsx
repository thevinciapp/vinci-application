'use client'
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

// Command types
export type CommandType = 'application' | 'spaces' | 'conversations' | 'models' | 'actions';

export interface CommandOption {
  id: string;
  name: string;
  description?: string;
  icon?: ReactNode;
  rightElement?: ReactNode;
  shortcut?: string[];
  type: CommandType;
  keywords?: string[];
  action: () => void;
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

  // Command center controls
  const openCommandCenter = useCallback(() => setIsOpen(true), []);
  const closeCommandCenter = useCallback(() => {
    console.log('closeCommandCenter called');
    setIsOpen(false);
    setSearchQuery('');
    setActiveCommandType(null);
  }, []);
  
  const toggleCommandCenter = useCallback(() => {
    console.log('toggleCommandCenter called');
    console.log('Current state:', { isOpen, activeCommandType });
    
    if (isOpen) {
      if (activeCommandType !== null) {
        console.log('Switching from specific command type to main command center');
        setActiveCommandType(null);
      } else {
        console.log('Closing main command center');
        setIsOpen(false);
        setSearchQuery('');
        setActiveCommandType(null);
      }
    } else {
      console.log('Opening main command center');
      setIsOpen(true);
      setActiveCommandType(null);
    }
  }, [isOpen, activeCommandType]);
  
  // Function to close a specific command type
  const closeCommandType = useCallback((type: CommandType) => {
    console.log('closeCommandType called with:', type);
    if (isOpen && activeCommandType === type) {
      setIsOpen(false);
      setSearchQuery('');
    }
  }, [isOpen, activeCommandType]);
  
  // New function to open command center with a specific type
  const openCommandType = useCallback((type: CommandType) => {
    console.log('openCommandType called with:', type);
    if (isOpen && activeCommandType === type) {
      console.log('Closing the currently open type');
      closeCommandType(type);
    } else {
      console.log('Switching to command type:', type);
      setActiveCommandType(type);
      if (!isOpen) {
        setIsOpen(true);
        console.log('Opening command center');
      }
    }
  }, [isOpen, activeCommandType, closeCommandType]);

  // Register keyboard shortcuts
  // meta+k is now handled in CommandShortcuts component
  useHotkeys('esc', () => {
    if (isOpen) {
      closeCommandCenter();
    }
  });

  // Command registration - properly memoized to prevent infinite loops
  const registerCommand = useCallback((command: CommandOption) => {
    console.log('registerCommand called with:', command);

    if (!isMounted.current) return;
    
    setCommands(prev => {
      // Check if this exact command already exists to avoid unnecessary updates
      const exists = prev.some(cmd => cmd.id === command.id);
      if (exists) {
        // Only update if there are actual changes
        const isEqual = prev.some(cmd => 
          cmd.id === command.id && 
          cmd.name === command.name && 
          cmd.description === command.description
        );
        if (isEqual) return prev; // No change needed
        
        // Replace the existing command
        return prev.map(cmd => cmd.id === command.id ? command : cmd);
      }
      // Add new command
      return [...prev, command];
    });
  }, []);

  const unregisterCommand = useCallback((commandId: string) => {
    console.log('unregisterCommand called with:', commandId);

    if (!isMounted.current) return;
    
    setCommands(prev => {
      // Only update if the command exists
      const commandExists = prev.some(cmd => cmd.id === commandId);
      if (!commandExists) return prev;
      return prev.filter(cmd => cmd.id !== commandId);
    });
  }, []);

  // Filter commands based on search query and active type - memoize to avoid recalculation
  const filteredCommands = useMemo(() => {
    return commands.filter(command => {
      // Filter by type if active type is set
      if (activeCommandType && command.type !== activeCommandType) {
        return false;
      }

      // If no search query, return all commands of the active type (or all commands if no active type)
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase().trim();
      const queryParts = query.split(/\s+/);
      
      // For multi-word search, check if all parts match somewhere in the command
      if (queryParts.length > 1) {
        return queryParts.every(part => 
          command.name.toLowerCase().includes(part) ||
          (command.description?.toLowerCase().includes(part)) ||
          command.keywords?.some(keyword => keyword.toLowerCase().includes(part))
        );
      }
      
      // For single word search, try to match at the beginning of words
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
  }, [commands, searchQuery, activeCommandType]);

  // Context value - memoize to prevent unnecessary re-renders
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
    console.log(`useCommandRegistration - commands changed, count: ${commands.length}`);
    
    // Make a deep copy of incoming commands to prevent reference issues
    const currentCommands = [...commands];
    
    // Find commands that were previously registered but are no longer in the current list
    const removedCommands = commandsRef.current.filter(
      prevCmd => !currentCommands.some(cmd => cmd.id === prevCmd.id)
    );
    
    // Unregister removed commands
    removedCommands.forEach(command => {
      console.log(`Unregistering command: ${command.id}`);
      unregisterCommand(command.id);
    });
    
    // Find new commands that weren't previously registered
    const newCommands = currentCommands.filter(
      cmd => !commandsRef.current.some(prevCmd => prevCmd.id === cmd.id)
    );
    
    // Register new commands
    newCommands.forEach(command => {
      console.log(`Registering new command: ${command.id}`);
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
    
    // Re-register updated commands
    updatedCommands.forEach(command => {
      console.log(`Updating command: ${command.id}`);
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
    console.log('Hotkey pressed:', hotkey);
    openCommandType(type);
  }, { 
    enableOnFormTags: true,
    enableOnContentEditable: true
  });
} 