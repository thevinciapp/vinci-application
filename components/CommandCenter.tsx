"use client"

import React, { useEffect } from 'react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command';
import { CommandOption, CommandType, useCommandCenter } from '@/hooks/useCommandCenter';

/**
 * Main CommandCenter component that integrates with the CMDK library
 * and uses the CommandContext to show available commands
 */
export function CommandCenter() {
  const {
    isOpen,
    closeCommandCenter,
    filteredCommands,
    setSearchQuery,
    activeCommandType,
  } = useCommandCenter();

  // Group commands by type for organized display
  const groupedCommands = React.useMemo(() => {
    const grouped: Record<CommandType, CommandOption[]> = {
      application: [],
      spaces: [],
      conversations: [],
      models: [],
      actions: [],
    };

    filteredCommands.forEach((command) => {
      grouped[command.type].push(command);
    });

    return grouped;
  }, [filteredCommands]);

  // Get all available command types that have commands
  const availableTypes = React.useMemo(() => {
    return Object.entries(groupedCommands)
      .filter(([_, commands]) => commands.length > 0)
      .map(([type]) => type as CommandType);
  }, [groupedCommands]);

  const handleSelect = (command: CommandOption) => {
    closeCommandCenter();
    command.action();
  };

  const renderCommandGroups = () => {
    if (activeCommandType) {
      // Render only the active type
      const commands = groupedCommands[activeCommandType];
      if (commands.length === 0) {
        // Add a message when no commands are found for the active type
        return (
          <CommandEmpty>No {activeCommandType} found.</CommandEmpty>
        );
      }

      return (
        <CommandGroup heading={activeCommandType.charAt(0).toUpperCase() + activeCommandType.slice(1)}>
          {commands.map((command) => (
            <CommandItem
              key={command.id}
              onSelect={() => handleSelect(command)}
              value={command.id}
              className="group cursor-pointer relative overflow-hidden"
              role="button"
              onClick={() => handleSelect(command)}
            >
              {command.icon && (
                <span className="mr-3 text-white/70 group-hover:text-white/90 transition-colors duration-200 relative z-10">
                  {command.icon}
                </span>
              )}
              <div className="flex flex-col justify-center flex-1 overflow-hidden relative z-10">
                <span className="truncate text-white/90 font-medium group-hover:text-white transition-colors duration-200">{command.name}</span>
                {command.description && (
                  <span className="text-xs text-white/60 truncate mt-0.5 group-hover:text-white/80 transition-colors duration-200">
                    {command.description}
                  </span>
                )}
              </div>
              {command.shortcut && (
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
            </CommandItem>
          ))}
        </CommandGroup>
      );
    }

    // Render all groups
    return availableTypes.map((type, index) => {
      const commands = groupedCommands[type];
      if (commands.length === 0) return null;

      return (
        <React.Fragment key={type}>
          <CommandGroup heading={type.charAt(0).toUpperCase() + type.slice(1)}>
            {commands.map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => handleSelect(command)}
                value={command.id}
                className="group cursor-pointer relative overflow-hidden"
                role="button"
                onClick={() => handleSelect(command)}
              >
                {command.icon && (
                  <span className="mr-3 text-white/70 group-hover:text-white/90 transition-colors duration-200 relative z-10">
                    {command.icon}
                  </span>
                )}
                <div className="flex flex-col justify-center flex-1 overflow-hidden relative z-10">
                  <span className="truncate text-white/90 font-medium group-hover:text-white transition-colors duration-200">{command.name}</span>
                  {command.description && (
                    <span className="text-xs text-white/60 truncate mt-0.5 group-hover:text-white/80 transition-colors duration-200">
                      {command.description}
                    </span>
                  )}
                </div>
                {command.shortcut && (
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
              </CommandItem>
            ))}
          </CommandGroup>
          {index < availableTypes.length - 1 && <CommandSeparator />}
        </React.Fragment>
      );
    });
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={closeCommandCenter}>
      <CommandInput
        placeholder="Type a command or search..."
        onValueChange={setSearchQuery}
      />
      <CommandList className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <CommandEmpty className="py-6 text-center text-sm">
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="text-white/60">No commands found.</div>
            <div className="text-xs text-white/40">Try a different search term</div>
          </div>
        </CommandEmpty>
        {renderCommandGroups()}
      </CommandList>
    </CommandDialog>
  );
}

export default CommandCenter; 