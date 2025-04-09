import { useState, useEffect, useRef, useCallback } from "react";
import { Command } from 'cmdk';
import { providers } from "@/registry/providers";
import { dialogs } from "@/registry/dialogs";
import { useCommandCenter } from '@/features/command-center/use-command-center';
import { useParams } from 'react-router-dom';
import { CommandType } from '@/features/command-palette/model/types';
import '@/styles/cmdk.css';

type CommandCenterProps = Record<string, never>;

function useCommandCenterFocus(inputRef: React.RefObject<HTMLInputElement>, commandType: CommandType) {
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    focusInput();
  }, [commandType]);
}

function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onEscape]);
}

const CommandCenter: React.FC<CommandCenterProps> = () => {
  const { type = 'unified' } = useParams<{ type: CommandType }>();
  const {
    currentProvider,
    currentDialog,
    updateState,
    openDialog,
    closeDialog,
    close,
  } = useCommandCenter();
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const commandType = type as CommandType;

  useEscapeKey(close);
  useCommandCenterFocus(inputRef as React.RefObject<HTMLInputElement>, commandType);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleSelect = useCallback((item: { closeOnSelect?: boolean }) => {
    if (item?.closeOnSelect) {
      close();
    }
  }, [close]);

  const handleAction = useCallback(async (action: string, data: unknown) => {
    const dialogType = `${action}-${currentProvider?.slice(0, -1)}`;
    if (dialogs[dialogType as keyof typeof dialogs]) {
      await openDialog(dialogType, data);
    }
  }, [currentProvider, openDialog]);

  const renderProviderUI = useCallback(() => {
    if (!commandType || !providers[commandType as keyof typeof providers]) {
      return (
        <Command.List>
          <Command.Group heading="Select a category">
            {Object.entries(providers).map(([key]) => (
              <Command.Item 
                key={key}
                onSelect={() => updateState({ activeCommand: key as CommandType })}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      );
    }
    
    const ProviderComponent = providers[commandType as keyof typeof providers];
    return (
      <ProviderComponent 
        searchQuery={searchQuery} 
        onSelect={handleSelect}
        onAction={handleAction}
      />
    );
  }, [commandType, searchQuery, handleSelect, handleAction, updateState]);

  const renderDialog = useCallback(() => {
    if (!currentDialog?.type || !dialogs[currentDialog.type as keyof typeof dialogs]) return null;
    
    const DialogComponent = dialogs[currentDialog.type as keyof typeof dialogs];
    return (
      <div className="dialog">
        <DialogComponent onClose={closeDialog} />
      </div>
    );
  }, [currentDialog, closeDialog]);

  return (
    <div className="vinci">
      <Command shouldFilter={false} loop autoFocus>
        <Command.Input 
          ref={inputRef}
          value={searchQuery}
          onValueChange={handleSearchChange}
          placeholder={`Search ${commandType} commands...`}
          autoFocus={true}
        />
        
        <Command.Empty>No results found.</Command.Empty>
        
        {currentDialog ? (
          <div className="flex-1 flex justify-center items-start pt-5 overflow-y-auto">
            {renderDialog()}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {renderProviderUI()}
          </div>
        )}
      </Command>
    </div>
  );
};

export default CommandCenter;