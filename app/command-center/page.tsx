"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from "vinci-ui";
import { useSpaceStore } from "@/stores/space-store";
import { providers } from "./registry/providers";
import { dialogs } from "./registry/dialogs";
import styles from "./styles/CommandCenter.module.css";

const CommandCenter = () => {
  const router = useRouter();
  const { 
    spaces, 
    activeSpace, 
    conversations, 
    initializeState, 
    fetchSpaces, 
    fetchSpaceData 
  } = useSpaceStore();
  
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [currentDialog, setCurrentDialog] = useState<{ type: string; data: any } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const onSetCommandType = (event: any, commandType: string) => {
      if (providers[commandType]) {
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
        if (activeSpace?.id) {
          fetchSpaceData(activeSpace.id).catch(console.error);
        }
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
      // Cleanup not implemented; add if supported by electronAPI
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
    (window as any).electronAPI?.closeCommandCenter?.();
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