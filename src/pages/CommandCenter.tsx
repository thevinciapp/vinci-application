import { useState, useEffect, useRef } from "react";
import { Command } from 'cmdk';
import { providers } from "@/registry/providers";
import { dialogs } from "@/registry/dialogs";
import { useCommandCenter } from '@/hooks/use-command-center';
import { useAuth } from '@/hooks/use-auth';
import { useParams } from 'react-router-dom';
import { CommandType } from '@/types';
import '@/styles/cmdk.css';

const CommandCenter = () => {
  const { type = 'unified' } = useParams<{ type: CommandType }>();
  const {
    state,
    currentProvider,
    currentDialog,
    updateState,
    openDialog,
    closeDialog,
    close,
    refreshCommandCenter
  } = useCommandCenter();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const commandType = type as CommandType;

  // Set the active command type based on the URL parameter
  useEffect(() => {
    if (isAuthenticated) {
      console.log(`[COMMAND] Setting active command to: ${commandType}`);
      updateState({ activeCommand: commandType });
    }
  }, [commandType, updateState, isAuthenticated]);

  // Handle escape key to close the command center
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [close]);

  // Focus the search input when component mounts or command type changes
  useEffect(() => {
    // Use multiple focus attempts with increasing delays to ensure focus works
    const focusInput = () => {
      if (inputRef.current) {
        inputRef.current.focus();
        console.log('[COMMAND] Input focused');
      }
    };
    
    // Try focusing immediately
    focusInput();
    
    // And also after small delays with multiple attempts
    const timers = [
      setTimeout(focusInput, 50),
      setTimeout(focusInput, 100),
      setTimeout(focusInput, 200),
      setTimeout(focusInput, 500)
    ];
    
    return () => timers.forEach(timer => clearTimeout(timer));
  }, [commandType]);

  // Refresh data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log(`[COMMAND] Refreshing command center data for type: ${commandType}`);
      refreshCommandCenter();
    }
  }, [isAuthenticated, refreshCommandCenter, commandType]);
  
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSelect = (item: any) => {
    if (item?.closeOnSelect === true) {
      close();
    }
  };

  const handleAction = async (action: string, data: any) => {
    try {
      const dialogType = `${action}-${currentProvider?.slice(0, -1)}`;
      if (dialogs[dialogType]) {
        await openDialog(dialogType, data);
      } else {
        console.warn(`Unknown dialog type: ${dialogType}`);
      }
    } catch (error) {
      console.error('Error handling action:', error);
    }
  };

  const renderProviderUI = () => {
    // Always use the commandType (derived from URL) as the provider key
    if (!commandType || !providers[commandType]) {
      return (
        <Command.List>
          <Command.Group heading="Select a category">
            {Object.entries(providers).map(([key, Provider]) => (
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
    
    const ProviderComponent = providers[commandType];
    return (
      <ProviderComponent 
        searchQuery={searchQuery} 
        onSelect={handleSelect}
        onAction={handleAction}
      />
    );
  };

  const renderDialog = () => {
    if (!currentDialog || !dialogs[currentDialog.type]) return null;
    const DialogComponent = dialogs[currentDialog.type];
    return (
      <div className="dialog">
        <DialogComponent data={currentDialog.data} onClose={closeDialog} />
      </div>
    );
  };

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