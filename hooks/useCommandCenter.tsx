'use client'
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

// Helper to check if we're running in Electron
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

// Type-safe way to access the Electron API with proper TypeScript types
const getElectronAPI = (): ElectronAPI | undefined => {
  if (typeof window !== 'undefined' && 'electronAPI' in window) {
    return window.electronAPI;
  }
  return undefined;
};

// Command types
export type CommandType = 'application' | 'spaces' | 'conversations' | 'models' | 'actions' | 'messages' | 'chat-modes' | 'similarMessages' | 'background-tasks' | 'suggestions';

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
  /**
   * When set to true, this command will always be included in filteredCommands
   * regardless of search query or active command type.
   * Useful for special scenarios like search results that need to override
   * the default filtering behavior.
   */
  bypassFilter?: boolean;
}

// Define an interface for searchable command configuration
export interface SearchableCommandConfig {
  minSearchLength: number;
  placeholderText?: string;
  hideFromCommandList?: boolean; // If true, will not be shown in the main command list
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
  headers: Record<CommandType, ReactNode>;
  registerHeader: (header: ReactNode, type: CommandType) => void;
  unregisterHeader: (type: CommandType) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  loadingCommandType: CommandType | null;
  setLoadingCommandType: (type: CommandType | null) => void;
  searchableCommands: Record<CommandType, SearchableCommandConfig>;
  registerSearchableCommand: (type: CommandType, config: SearchableCommandConfig) => void;
  unregisterSearchableCommand: (type: CommandType) => void;
}

const CommandContext = createContext<CommandContextType | undefined>(undefined);

export function CommandProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [commands, setCommands] = useState<CommandOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCommandType, setActiveCommandType] = useState<CommandType | null>(null);
  const [headers, setHeaders] = useState<Record<CommandType, ReactNode>>({
    application: null,
    spaces: null,
    conversations: null,
    models: null,
    actions: null,
    messages: null,
    'chat-modes': null,
    'similarMessages': null,
    'background-tasks': null,
    'suggestions': null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCommandType, setLoadingCommandType] = useState<CommandType | null>(null);
  const [searchableCommands, setSearchableCommands] = useState<Record<CommandType, SearchableCommandConfig>>({
    application: { minSearchLength: 0 },
    spaces: { minSearchLength: 0 },
    conversations: { minSearchLength: 0 },
    models: { minSearchLength: 0 },
    actions: { minSearchLength: 0 },
    messages: { minSearchLength: 0 },
    'chat-modes': { minSearchLength: 0 },
    'similarMessages': { minSearchLength: 0 },
    'background-tasks': { minSearchLength: 0 },
    'suggestions': { minSearchLength: 0 }
  });

  
  // Enhanced command center open/close functions that work with Electron
  const openCommandCenter = useCallback(() => {
    console.log('openCommandCenter called');
    // Update React state
    setIsOpen(true);
    
    // If Electron is available, also tell the main process to show the command center window
    if (isElectron) {
      console.log('Calling Electron show-command-center');
      getElectronAPI()?.toggleCommandCenter();
    }
  }, []);
  
  const closeCommandCenter = useCallback(() => {
    console.log('closeCommandCenter called');
    // Update React state
    setIsOpen(false);
    setSearchQuery('');
    setActiveCommandType(null);
    
    // If Electron is available, also tell the main process to hide the command center window
    if (isElectron) {
      console.log('Calling Electron close-command-center');
      const api = getElectronAPI();
      // If closeCommandCenter is not available, fall back to toggleCommandCenter when open
      if (api && 'closeCommandCenter' in api && typeof api.closeCommandCenter === 'function') {
        api.closeCommandCenter();
      } else if (api && api.toggleCommandCenter) {
        api.toggleCommandCenter(); // This will toggle off if command center is already open
      }
    }
  }, []);
  
  const toggleCommandCenter = useCallback(() => {
    console.log('toggleCommandCenter called');
    
    if (isOpen) {
      if (activeCommandType !== null) {
        console.log('Switching from specific command type to main command center');
        setActiveCommandType(null);
      } else {
        // Close the command center
        setIsOpen(false);
        setSearchQuery('');
        setActiveCommandType(null);
        
        // If Electron is available, also tell the main process
        if (isElectron) {
          console.log('Calling Electron close-command-center');
          const api = getElectronAPI();
          // If closeCommandCenter is not available, fall back to toggleCommandCenter when open
          if (api && 'closeCommandCenter' in api && typeof api.closeCommandCenter === 'function') {
            api.closeCommandCenter();
          } else if (api && api.toggleCommandCenter) {
            api.toggleCommandCenter(); // This will toggle off if command center is already open
          }
        }
      }
    } else {
      // Open the command center
      setIsOpen(true);
      setActiveCommandType(null);
      
      // If Electron is available, also tell the main process
      if (isElectron) {
        console.log('Calling Electron toggle-command-center');
        getElectronAPI()?.toggleCommandCenter();
      }
    }
  }, [isOpen, activeCommandType]);
  
  const closeCommandType = useCallback((type: CommandType) => {
    console.log('closeCommandType called with:', type);
    if (isOpen && activeCommandType === type) {
      setIsOpen(false);
      setActiveCommandType(null);
      setSearchQuery('');
      
      // If Electron is available, also tell the main process
      if (isElectron && typeof window !== 'undefined') {
        console.log('Calling Electron close-command-center');
        const api = getElectronAPI();
        if (api && 'closeCommandCenter' in api) {
          (api as any).closeCommandCenter();
        } else if (api && api.toggleCommandCenter) {
          // Fallback to toggle if command center is currently open
          api.toggleCommandCenter();
        }
      }
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
      
      // If Electron is available, also tell the main process to set the command type
      if (isElectron) {
        console.log('Calling Electron openCommandType with:', type);
        getElectronAPI()?.openCommandType(type);
      }
    }
  }, [isOpen, activeCommandType, closeCommandType]);
  
  // Listen for Electron IPC events when available
  useEffect(() => {
    if (!isElectron) return;
    
    console.log('Setting up Electron IPC listeners for command center');
    const api = getElectronAPI();
    if (!api) return;
    
    // Listen for toggle command center events from Electron
    const removeToggleListener = api.onToggleCommandCenter(() => {
      console.log('Received toggle-command-center from Electron');
      if (isOpen) {
        if (activeCommandType !== null) {
          // Just switch back to main command list if a specific type is open
          setActiveCommandType(null);
        } else {
          // Close it entirely if already at main command list
          setIsOpen(false);
          setSearchQuery('');
        }
      } else {
        // Open it if closed
        setIsOpen(true);
      }
    });
    
    // Listen for command type setting from Electron
    const removeCommandTypeListener = api.onSetCommandType((event, commandType) => {
      console.log('Received set-command-type from Electron:', commandType);
      setActiveCommandType(commandType as CommandType);
      if (!isOpen) {
        setIsOpen(true);
      }
    });
    
    // Check if refresh listener is available - handling potential missing API method
    let removeRefreshListener = () => {};
    if ('onRefreshCommandCenter' in api) {
      removeRefreshListener = (api as any).onRefreshCommandCenter(() => {
        console.log('Received refresh-command-center from Electron');
        // Implement any refresh logic here
      });
    } else {
      console.log('onRefreshCommandCenter not available in Electron API');
    }
    
    // Check if sync state listener is available - handling potential missing API method
    let removeSyncListener = () => {};
    if ('onSyncCommandCenterState' in api) {
      removeSyncListener = (api as any).onSyncCommandCenterState((event: any, action: string, data?: any) => {
        console.log('Received sync-command-center-state from Electron:', action, data);
        
        switch (action) {
          case 'open': 
            setIsOpen(true);
            if (data) {
              setActiveCommandType(data as CommandType);
            }
            break;
          case 'close': 
            setIsOpen(false);
            setSearchQuery('');
            setActiveCommandType(null);
            break;
          case 'toggle':
            if (isOpen) {
              if (activeCommandType !== null) {
                setActiveCommandType(null);
              } else {
                setIsOpen(false);
                setSearchQuery('');
              }
            } else {
              setIsOpen(true);
            }
            break;
          case 'refresh':
            // Handle refresh logic if needed
            break;
        }
      });
    } else {
      console.log('onSyncCommandCenterState not available in Electron API');
    }
    
    // Clean up listeners when component unmounts
    return () => {
      removeToggleListener();
      removeCommandTypeListener();
      removeRefreshListener();
      removeSyncListener();
    };
  }, [isOpen, activeCommandType]);
  
  useHotkeys('esc', () => {
    console.log('esc key pressed');
    if (isOpen) {
      closeCommandCenter();
    }
  });

  const registerCommand = useCallback((command: CommandOption) => {
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
    setCommands(prev => {
      const commandExists = prev.some(cmd => cmd.id === commandId);
      if (!commandExists) return prev;
      return prev.filter(cmd => cmd.id !== commandId);
    });
  }, []);

  const registerHeader = useCallback((header: ReactNode, type: CommandType) => {
    setHeaders(prev => ({ ...prev, [type]: header }));
  }, []); 

  const unregisterHeader = useCallback((type: CommandType) => {
    setHeaders(prev => {
      const newHeaders = { ...prev };
      delete newHeaders[type];  
      return newHeaders;
    });
  }, []);

  const filteredCommands = useMemo(() => {
    const filteredCommands = commands.filter(command => {
      // Check if this command type should be hidden from the main command list
      const isHiddenType = searchableCommands[command.type]?.hideFromCommandList === true;
      
      // When no command type is active (i.e., we're showing the main command list),
      // hide commands whose type is configured to be hidden
      if (!activeCommandType && isHiddenType) {
        return false;
      }
      
      // If command has bypassFilter set to true, always include it
      // This allows specialized providers like MessageSearchProvider to
      // override the default filtering behavior when needed
      if (command.bypassFilter === true) {
        return true;
      }
      
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
  }, [commands, searchQuery, activeCommandType, searchableCommands]);

  const registerSearchableCommand = useCallback((type: CommandType, config: SearchableCommandConfig) => {
    setSearchableCommands(prev => ({ ...prev, [type]: config }));
  }, []);

  const unregisterSearchableCommand = useCallback((type: CommandType) => {
    setSearchableCommands(prev => {
      const newSearchableCommands = { ...prev };
      delete newSearchableCommands[type];  
      return newSearchableCommands;
    });
  }, []);

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
    headers,
    registerHeader,
    unregisterHeader,
    isLoading,
    setIsLoading,
    loadingCommandType,
    setLoadingCommandType,
    searchableCommands,
    registerSearchableCommand,
    unregisterSearchableCommand,
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
    activeCommandType,
    headers,
    registerHeader,
    unregisterHeader,
    isLoading,
    setIsLoading,
    loadingCommandType,
    setLoadingCommandType,
    searchableCommands,
    registerSearchableCommand,
    unregisterSearchableCommand,
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

export function useCommandHeaderRegistration(header: ReactNode, type: CommandType) {
  const { registerHeader, unregisterHeader } = useCommandCenter();

  useEffect(() => {
    registerHeader(header, type);
  }, [header, registerHeader, type]);

  useEffect(() => {
    return () => {
      unregisterHeader(type);
    };
  }, [unregisterHeader, type]);
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