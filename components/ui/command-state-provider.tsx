'use client';

import React, { createContext, useContext, useState } from 'react';

type CommandType = 'quick-actions' | 'space' | null;

interface CommandStateContextType {
  activeCommand: CommandType;
  setActiveCommand: (command: CommandType) => void;
}

const CommandStateContext = createContext<CommandStateContextType>({
  activeCommand: null,
  setActiveCommand: () => {},
});

export const useCommandState = () => {
  const context = useContext(CommandStateContext);
  if (!context) {
    throw new Error('useCommandState must be used within a CommandStateProvider');
  }
  return context;
};

export const CommandStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCommand, setActiveCommand] = useState<CommandType>(null);

  return (
    <CommandStateContext.Provider value={{ activeCommand, setActiveCommand }}>
      {children}
    </CommandStateContext.Provider>
  );
};
