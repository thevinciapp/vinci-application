"use client";

import React, { useState, useEffect } from "react";
import { Command } from 'cmdk';
import { providers } from "@/src/registry/providers";
import { dialogs } from "@/src/registry/dialogs";
import { useCommandCenter } from '@/src/hooks/use-command-center';
import '@/src/styles/cmdk.css';

const CommandCenter = () => {
  const {
    currentProvider,
    currentDialog,
    updateState,
    openDialog,
    closeDialog,
    close
  } = useCommandCenter();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!currentProvider) {
      updateState({ activeCommand: 'spaces' });
    }
  }, [currentProvider, updateState]);

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
    if (!currentProvider || !providers[currentProvider]) {
      return (
        <Command.List>
          <Command.Group heading="Select a category">
            {Object.keys(providers).map((key) => (
              <Command.Item 
                key={key}
                onSelect={() => updateState({ activeCommand: key })}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      );
    }
    
    const ProviderComponent = providers[currentProvider];
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
          value={searchQuery}
          onValueChange={handleSearchChange}
          placeholder="Search or type a command..."
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