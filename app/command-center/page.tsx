"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from 'cmdk';
import { useAppState } from '@/lib/app-state-context';
import { providers } from "./registry/providers";
import { dialogs } from "./registry/dialogs";
import './styles/cmdk.css';

const CommandCenter = () => {
  const router = useRouter();
  const { appState } = useAppState();
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [currentDialog, setCurrentDialog] = useState<{ type: string; data: any } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!(window as any).currentCommandType) {
        (window as any).currentCommandType = null;
      }
      if (currentProvider) {
        (window as any).currentCommandType = currentProvider;
      }
    }
  }, [currentProvider]);

  useEffect(() => {
    const onSetCommandType = (event: any, commandType: string) => {
      if (providers[commandType]) {
        setCurrentProvider(commandType);
        setCurrentDialog(null);
      } else {
        console.warn(`Unknown provider: ${commandType}`);
      }
    };

    const onOpenDialog = (event: any, dialogType: string, data: any) => {
      if (dialogs[dialogType]) {
        setCurrentDialog({ type: dialogType, data });
        window.electronAPI?.notifyDialogOpened?.();
      } else {
        console.warn(`Unknown dialog type: ${dialogType}`);
      }
    };

    const onSyncCommandCenterState = (event: any, action: string, data: any) => {
      if (action === "close") {
        setCurrentProvider(null);
        setCurrentDialog(null);
      } else if (action === "open" && data && providers[data]) {
        setCurrentProvider(data);
      }
    };

    window.electronAPI?.onSetCommandType?.(onSetCommandType);
    window.electronAPI?.onOpenDialog?.(onOpenDialog);
    window.electronAPI?.onSyncCommandCenterState?.(onSyncCommandCenterState);
    
    if (!currentProvider) {
      setCurrentProvider('spaces');
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        (window as any).currentCommandType = null;
      }
    };
  }, [currentProvider, appState.spaces, appState.isLoading]);

  const closeDialog = () => {
    setCurrentDialog(null);
    window.electronAPI?.notifyDialogClosed?.();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSelect = (item: any) => {
    if (item?.closeOnSelect === true) {
      if (typeof window !== 'undefined') {
        (window as any).currentCommandType = null;
      }
      (window as any).electronAPI?.closeCommandCenter?.();
    }
  };

  const handleAction = async (action: string, data: any) => {
    try {
      const dialogType = `${action}-${currentProvider?.slice(0, -1)}`;
      if (dialogs[dialogType]) {
        (window as any).electronAPI?.openDialog?.(dialogType, data);
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
                onSelect={() => setCurrentProvider(key)}
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