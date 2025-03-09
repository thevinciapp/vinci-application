"use client"

import React, { useEffect } from 'react';
import { Command, CommandDialog, CommandDialog as CommandDialogBase, CommandEmpty, CommandGroup, CommandInput, CommandInput as CommandInputBase, CommandItem, CommandList, CommandSeparator, CommandShortcut } from 'vinci-ui';
import { CommandOption, CommandType, useCommandCenter } from '@/hooks/useCommandCenter';
import { Loader2 } from 'lucide-react';


/**
 * Main CommandCenter component that integrates with the CMDK library
 * and uses the CommandContext to show available commands
 */

const HighlightMatches = ({ text, searchQuery }: { text: string, searchQuery: string }) => {
  if (!searchQuery || searchQuery.length < 2) return <>{text}</>;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = searchQuery.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  
  if (matchIndex === -1) return <>{text}</>;
  
  return (
    <>
      {text.substring(0, matchIndex)}
      <span className="font-semibold text-white/95 underline decoration-1 underline-offset-2">
        {text.substring(matchIndex, matchIndex + searchQuery.length)}
      </span>
      {text.substring(matchIndex + searchQuery.length)}
    </>
  );
};

export function CommandCenter({ standaloneMode = false }: { standaloneMode?: boolean } = {}) {
  const {
    isOpen,
    closeCommandCenter,
    filteredCommands,
    setSearchQuery,
    activeCommandType,
    headers,
    searchQuery,
    registerHeader,
    unregisterHeader,
    isLoading,
    loadingCommandType,
    searchableCommands,
  } = useCommandCenter();

  const groupedCommands = React.useMemo(() => {
    const grouped: Record<CommandType, CommandOption[]> = {
      application: [],
      spaces: [],
      conversations: [],
      models: [],
      actions: [],
      messages: [],
      'chat-modes': [],
      'similarMessages': [],
      'background-tasks': [],
      'suggestions': [],
    };

    filteredCommands.forEach((command) => {
      grouped[command.type].push(command);
    });

    return grouped;
  }, [filteredCommands]);

  const availableTypes = React.useMemo(() => {
    return Object.entries(groupedCommands)
      .filter(([_, commands]) => commands.length > 0)
      .map(([type]) => type as CommandType);
  }, [groupedCommands]);

  const handleSelect = async (commandId: string) => {
    const command = filteredCommands.find(cmd => cmd.id === commandId);
    if (command) {
      // Execute the command action
      command.action();
      
      // Only close the command center if closeCommandOnSelect is not explicitly set to false
      // This allows commands to keep the command center open when needed
      if (command.closeCommandOnSelect !== false) {
        closeCommandCenter();
      }
    }
  };

  const renderCommandGroups = () => {
    if (activeCommandType) {
      console.log("filteredCommands", filteredCommands);
      
      const commands = groupedCommands[activeCommandType];
      const isSearchable = activeCommandType in searchableCommands && searchableCommands[activeCommandType].minSearchLength > 0;
      const searchConfig = isSearchable ? searchableCommands[activeCommandType] : null;
      
      // Handle searchable command types
      if (isSearchable && searchConfig) {
        const { minSearchLength, placeholderText } = searchConfig;
        
        // Case 1: Empty search or search term too short - prompt user to type more
        if (searchQuery.length === 0 || searchQuery.length < minSearchLength) {
          return (
            <CommandEmpty className="text-center py-6 text-sm text-white/70">
              {placeholderText || `Type at least ${minSearchLength} characters to search ${activeCommandType}...`}
            </CommandEmpty>
          );
        }
        
        // Case 2: Search term is long enough but we're loading
        if (searchQuery.length >= minSearchLength && isLoading && loadingCommandType === activeCommandType) {
          return (
            <CommandEmpty className="flex flex-col items-center justify-center py-6">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching {activeCommandType}...</span>
              </div>
            </CommandEmpty>
          );
        }
        
        if (searchQuery.length >= minSearchLength && !isLoading && commands.length === 0) {
          console.log("commands", commands);
          return (
            <CommandEmpty className="text-center py-6 text-sm text-white/70">
              No {activeCommandType} found matching "{searchQuery}".
            </CommandEmpty>
          );
        }
      } 
      // Handle regular command types (non-searchable or default behavior)
      else {
        // General loading state for any command type
        if (isLoading && loadingCommandType === activeCommandType) {
          return (
            <CommandEmpty className="flex flex-col items-center justify-center py-6">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading {activeCommandType}...</span>
              </div>
            </CommandEmpty>
          );
        }

        // Empty state with no search
        if (searchQuery.length === 0 && commands.length === 0) {
          return (
            <CommandEmpty className="text-center py-6 text-sm text-white/70">
              Type a command or search...
            </CommandEmpty>
          );
        }

        // Empty search results
        if (commands.length === 0) {
          return (
            <CommandEmpty className="text-center py-6 text-sm text-white/70">
              No {activeCommandType} found.
            </CommandEmpty>
          );
        }
      }

      return (
        <>
        <CommandGroup heading={activeCommandType.charAt(0).toUpperCase() + activeCommandType.slice(1)}>
          {commands.map((command) => (
            <CommandItem
              key={command.id}
              onSelect={() => handleSelect(command.id)}
              value={command.id}
              className="group cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center w-full pointer-events-auto">
                {command.icon && (
                  <span className="mr-3 text-white/70 group-hover:text-white/90 transition-colors duration-200">
                    {command.icon}
                  </span>
                )}
                <div className="flex flex-col justify-center flex-1 overflow-hidden">
                  <span className="truncate text-white/90 font-medium group-hover:text-white transition-colors duration-200">
                    <HighlightMatches text={command.name} searchQuery={searchQuery} />
                  </span>
                  {command.description && (
                    <span className="text-xs text-white/60 truncate mt-0.5 group-hover:text-white/80 transition-colors duration-200">
                      <HighlightMatches text={command.description} searchQuery={searchQuery} />
                    </span>
                  )}
                </div>
                {command.shortcut && !command.rightElement && (
                  <CommandShortcut>
                    {command.shortcut.map((key, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="mx-0.5">+</span>}
                        <kbd className="px-1.5 py-0.5 text-[10px] bg-white/[0.02] border border-white/[0.05] rounded group-hover:border-white/[0.1] transition-all duration-200">
                          {key}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </CommandShortcut>
                )}
                {command.rightElement && (
                  <div className="flex items-center ml-auto">
                    {command.rightElement}
                  </div>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
        </>
      );
    }

    return availableTypes.map((type, index) => {
      const commands = groupedCommands[type];
      if (commands.length === 0) return null;

      return (
        <React.Fragment key={type}>
          <CommandGroup heading={type.charAt(0).toUpperCase() + type.slice(1)}>
            {commands.map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => handleSelect(command.id)}
                value={command.id}
                className="group cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-center w-full pointer-events-auto">
                  {command.icon && (
                    <span className="mr-3 text-white/70 group-hover:text-white/90 transition-colors duration-200">
                      {command.icon}
                    </span>
                  )}
                  <div className="flex flex-col justify-center flex-1 overflow-hidden">
                    <span className="truncate text-white/90 font-medium group-hover:text-white transition-colors duration-200">
                      <HighlightMatches text={command.name} searchQuery={searchQuery} />
                    </span>
                    {command.description && (
                      <span className="text-xs text-white/60 truncate mt-0.5 group-hover:text-white/80 transition-colors duration-200">
                        <HighlightMatches text={command.description} searchQuery={searchQuery} />
                      </span>
                    )}
                  </div>
                  {command.shortcut && !command.rightElement && (
                    <CommandShortcut>
                      {command.shortcut.map((key, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="mx-0.5">+</span>}
                          <kbd className="px-1.5 py-0.5 text-[10px] bg-white/[0.02] border border-white/[0.05] rounded group-hover:border-white/[0.1] transition-all duration-200">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </CommandShortcut>
                  )}
                  {command.rightElement && (
                    <div className="flex items-center ml-auto">
                      {command.rightElement}
                    </div>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          {index < availableTypes.length - 1 && <CommandSeparator />}
        </React.Fragment>
      );
    });
  };
  
  // Add blur event handling to sync isOpen state with window visibility
  useEffect(() => {
    // This only applies in non-standalone mode (dialog mode)
    if (!standaloneMode) {
      // Track the previous document active state to detect actual focus changes
      let wasDocumentActive = document.hasFocus();
      
      const handleBlur = () => {
        // When window loses focus, ensure command center state reflects actual visibility
        if (isOpen && wasDocumentActive) {
          // Remember the command center was visible when losing focus
          // This helps implement Raycast's behavior where pressing a key reopens
          // the command center if it was previously open before losing focus
          console.log('Window blurred - storing command center state');
          wasDocumentActive = false;
          
          // We don't actually close on blur, just track the state change
          // This prevents inconsistency between the UI state and the React state
        }
      };

      const handleFocus = () => {
        // When window regains focus and command center was previously open,
        // we make it easier to reopen with a single keystroke - matching Raycast's behavior
        if (!wasDocumentActive) {
          console.log('Window focused - preparing for single-key reopen');
          wasDocumentActive = true;
        }
      };

      // These event listeners ensure our state stays synced with window visibility
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);

      return () => {
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [isOpen, standaloneMode, closeCommandCenter]);

  // Add support for window resize handling
  const [dimensions, setDimensions] = React.useState<{width: number, height: number} | null>(null);
  const isSmallWindow = dimensions && (dimensions.width < 680 || dimensions.height < 500);
  const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
  
  // Listen for window resize events from Electron
  React.useEffect(() => {
    if (isElectron) {
      const handleResize = (event: any, newDimensions: {width: number, height: number}) => {
        console.log('Window resized:', newDimensions);
        setDimensions(newDimensions);
      };
      
      // Add listener for window resize events
      const removeListener = window.electronAPI.onWindowResize(handleResize);
      
      // Check if the current command type matches when requested
      const checkCommandTypeListener = window.electronAPI.onCheckCommandType((event, commandTypeToCheck) => {
        console.log(`Checking if ${commandTypeToCheck} matches current ${activeCommandType}`);
        // If it matches, tell the main process we should close
        if (activeCommandType === commandTypeToCheck) {
          window.electronAPI.closeCommandCenter();
        }
      });
      
      // Clean up listeners when component unmounts
      return () => {
        removeListener();
        checkCommandTypeListener();
        window.electronAPI.removeWindowResizeListener();
      };
    }
  }, [activeCommandType]);
  
  return (
    <>
      {isOpen && (
        <CommandDialog 
          open={isOpen} 
          onOpenChange={(open) => {
            if (!open) {
              closeCommandCenter();
            }
          }}
        >
          <Command shouldFilter={false} loop>
            <CommandInput
              placeholder="Type a command or search..."
              onValueChange={(value) => setSearchQuery(value)}
              // Add onBlur handler to sync state when input loses focus
              onBlur={() => {
                console.log('Command input blurred - preserving state for quick reopening');
                // We don't close on input blur, but we do track it for Raycast-like behavior
                // This allows for quick reopening with a single keystroke
              }}
              // Ensure focus on open
              autoFocus={true}
            />
            {activeCommandType && headers[activeCommandType] && (
              <>{headers[activeCommandType]}</>
            )}
            <CommandList 
              className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
              style={{
                maxHeight: dimensions ? `${Math.min(dimensions.height - 160, 500)}px` : '500px'
              }}
            >
              {renderCommandGroups()}
            </CommandList>
          </Command>
        </CommandDialog>
      )}
    </>
  );
}

export default CommandCenter; 