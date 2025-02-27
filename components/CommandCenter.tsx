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
              className="group cursor-pointer"
              role="button"
              onClick={() => handleSelect(command)}
            >
              {command.icon && (
                <span className="mr-3 text-white group-aria-selected:text-[#3ecfff] group-hover:text-[#3ecfff]">
                  {command.icon}
                </span>
              )}
              <div className="flex flex-col justify-center flex-1 overflow-hidden">
                <span className="truncate text-white font-medium group-hover:text-[#3ecfff]/90">{command.name}</span>
                {command.description && (
                  <span className="text-xs text-white/90 truncate mt-0.5 group-aria-selected:text-white group-hover:text-white">
                    {command.description}
                  </span>
                )}
              </div>
              {command.shortcut && (
                <CommandShortcut>
                  {command.shortcut.map((key, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="mx-0.5">+</span>}
                      <kbd className="px-1.5 py-0.5 text-[10px] bg-black/50 border border-[#3ecfff]/30 rounded group-aria-selected:border-[#3ecfff]/60 group-aria-selected:bg-[#3ecfff]/10 group-hover:border-[#3ecfff]/60 group-hover:bg-[#3ecfff]/10">
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
                className="group cursor-pointer"
                role="button"
                onClick={() => handleSelect(command)}
              >
                {command.icon && (
                  <span className="mr-3 text-white group-aria-selected:text-[#3ecfff] group-hover:text-[#3ecfff]">
                    {command.icon}
                  </span>
                )}
                <div className="flex flex-col justify-center flex-1 overflow-hidden">
                  <span className="truncate text-white font-medium group-hover:text-[#3ecfff]/90">{command.name}</span>
                  {command.description && (
                    <span className="text-xs text-white/90 truncate mt-0.5 group-aria-selected:text-white group-hover:text-white">
                      {command.description}
                    </span>
                  )}
                </div>
                {command.shortcut && (
                  <CommandShortcut>
                    {command.shortcut.map((key, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="mx-0.5">+</span>}
                        <kbd className="px-1.5 py-0.5 text-[10px] bg-black/50 border border-[#3ecfff]/30 rounded group-aria-selected:border-[#3ecfff]/60 group-aria-selected:bg-[#3ecfff]/10 group-hover:border-[#3ecfff]/60 group-hover:bg-[#3ecfff]/10">
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
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        {renderCommandGroups()}
      </CommandList>
    </CommandDialog>
  );
}

export default CommandCenter; 