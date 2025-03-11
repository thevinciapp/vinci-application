"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from "vinci-ui";
import { API } from '@/lib/api-client';
import { Space } from '@/types';
import { providers } from "./registry/providers";
import { dialogs } from "./registry/dialogs";
import styles from "./styles/CommandCenter.module.css";

const CommandCenter = () => {
  const router = useRouter();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [currentDialog, setCurrentDialog] = useState<{ type: string; data: any } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize and update window.currentCommandType
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize the window property if it doesn't exist
      if (!(window as any).currentCommandType) {
        (window as any).currentCommandType = null;
      }
      // Update when provider changes
      if (currentProvider) {
        (window as any).currentCommandType = currentProvider;
      }
    }
  }, [currentProvider]);

  const fetchSpaces = async () => {
    try {
      const result = await API.spaces.getSpaces();
      if (result.success && result.data) {
        setSpaces(result.data);
      }
    } catch (error) {
      console.error('Error fetching spaces:', error);
    }
  };

  const fetchActiveSpace = async () => {
    try {
      const result = await API.activeSpace.getActiveSpace();
      if (result.success && result.data?.activeSpace) {
        setActiveSpace(result.data.activeSpace);
      }
    } catch (error) {
      console.error('Error fetching active space:', error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      
      // First check if we can get data from Electron
      if (typeof window !== 'undefined' && window.electronAPI) {
        try {
          const appState = await window.electronAPI.getAppState();
          if (appState && appState.spaces && appState.activeSpace) {
            console.log('Using cached app state from Electron');
            setSpaces(appState.spaces || []);
            setActiveSpace(appState.activeSpace || null);
            setIsLoading(false);
            return; // Exit early if we have data
          }
        } catch (error) {
          console.log('No cached app state available, fetching fresh data');
        }
      }
      
      // Fallback to API calls if needed
      await Promise.all([fetchSpaces(), fetchActiveSpace()]);
      setIsLoading(false);
    };

    initializeData();
  }, []);


  useEffect(() => {
    const onSetCommandType = (event: any, commandType: string) => {
      if (providers[commandType]) {
        // Update provider state which will trigger the effect to update window.currentCommandType
        setCurrentProvider(commandType);
        setCurrentDialog(null); // Close any dialog when switching providers
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
      } else if (action === "refresh") {
        // Trigger a refresh of spaces data
        fetchSpaces().catch(console.error);
        
        // If there's an active space, refresh its data too
        fetchActiveSpace().catch(console.error);
      }
    };

    window.electronAPI?.onSetCommandType?.(onSetCommandType);
    window.electronAPI?.onOpenDialog?.(onOpenDialog);
    window.electronAPI?.onSyncCommandCenterState?.(onSyncCommandCenterState);
    
    // Set default provider if none selected and data is loaded
    if (!currentProvider && !isLoading && spaces?.length > 0) {
      setCurrentProvider('spaces');
    }
    
    return () => {
      // Reset command type when component unmounts
      if (typeof window !== 'undefined') {
        (window as any).currentCommandType = null;
      }
      // Additional cleanup if needed
    };
  }, [spaces, isLoading, activeSpace]);

  const closeDialog = () => {
    setCurrentDialog(null);
    window.electronAPI?.notifyDialogClosed?.();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSelect = (item: any) => {
    // Only close the command center if it's a specific action that requires closing
    // For regular provider items, we'll keep the command center open
    if (item?.closeOnSelect === true) {
      // Reset command type before closing
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
        <CommandList>
          <CommandGroup heading="Select a category">
            {Object.keys(providers).map((key) => (
              <CommandItem 
                key={key}
                onSelect={() => setCurrentProvider(key)}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
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
    return <DialogComponent data={currentDialog.data} onClose={closeDialog} />;
  };

  return (
    <div className={styles.container}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput
          value={searchQuery}
          onValueChange={handleSearchChange}
          placeholder="Search or type a command..."
          className={styles.searchInput}
          disabled={isLoading}
        />

        
        <CommandEmpty>No results found.</CommandEmpty>
        
        {currentDialog ? (
          <div className={styles.dialogContainer}>{renderDialog()}</div>
        ) : (
          <div className={styles.resultsContainer}>{renderProviderUI()}</div>
        )}
      </Command>
    </div>
  );
};

export default CommandCenter;