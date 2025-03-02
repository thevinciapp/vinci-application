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
      const commands = groupedCommands[activeCommandType];
      if (commands.length === 0) {
        return (
          <CommandEmpty>No {activeCommandType} found.</CommandEmpty>
        );
      }

      return (
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
                  <span className="truncate text-white/90 font-medium group-hover:text-white transition-colors duration-200">{command.name}</span>
                  {command.description && (
                    <span className="text-xs text-white/60 truncate mt-0.5 group-hover:text-white/80 transition-colors duration-200">
                      {command.description}
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
                  <div className="flex items-center ml-auto pointer-events-auto">
                    {command.rightElement}
                  </div>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
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
                    <span className="truncate text-white/90 font-medium group-hover:text-white transition-colors duration-200">{command.name}</span>
                    {command.description && (
                      <span className="text-xs text-white/60 truncate mt-0.5 group-hover:text-white/80 transition-colors duration-200">
                        {command.description}
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
                    <div className="flex items-center ml-auto pointer-events-auto">
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