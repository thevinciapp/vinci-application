"use client"

import React, { useEffect } from 'react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from 'vinci-ui';
import { CommandOption, CommandType, useCommandCenter } from '@/hooks/useCommandCenter';
import { Loader2 } from 'lucide-react';

/**
 * Main CommandCenter component that integrates with the CMDK library
 * and uses the CommandContext to show available commands
 */

// Helper function to highlight search terms in text
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

export function CommandCenter() {
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
      command?.action();
      closeCommandCenter();
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

  return (
    <>
      {isOpen && (
        <CommandDialog open={isOpen} onOpenChange={closeCommandCenter}>
          <Command shouldFilter={false} loop>
            <CommandInput
              placeholder="Type a command or search..."
              onValueChange={setSearchQuery}
            />
        {activeCommandType && headers[activeCommandType] && (
          <>
            {headers[activeCommandType]}
          </>
        )}
        <CommandList className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {renderCommandGroups()}
        </CommandList>
      </Command>
      </CommandDialog> 
      )}
    </>
  );
}

export default CommandCenter; 