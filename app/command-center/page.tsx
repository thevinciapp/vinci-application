"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "vinci-ui";
import { getMostRecentConversation } from "@/app/actions/conversations";
import { providers } from "./registry/providers";
import { dialogs } from "./registry/dialogs";
import styles from "./styles/CommandCenter.module.css";

const CommandCenter = () => {
  const router = useRouter();
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
      }
    };

    window.electronAPI?.onSetCommandType?.(onSetCommandType);
    window.electronAPI?.onOpenDialog?.(onOpenDialog);
    window.electronAPI?.onSyncCommandCenterState?.(onSyncCommandCenterState);
    return () => {
      // Cleanup not implemented; add if supported by electronAPI
    };
  }, []);

  const closeDialog = () => {
    setCurrentDialog(null);
    window.electronAPI?.notifyDialogClosed?.();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelect = async (item: any) => {
    try {
      if (currentProvider === 'spaces') {
        const conversationResponse = await getMostRecentConversation(item.id);
        if (conversationResponse.data) {
          router.push(`/protected/spaces/${item.id}/conversations/${conversationResponse.data.id}`);
        }
      } else if (currentProvider === 'conversations') {
        router.push(`/protected/spaces/${item.spaceId}/conversations/${item.id}`);
      }
      (window as any).electronAPI?.closeCommandCenter?.();
    } catch (error) {
      console.error('Error handling selection:', error);
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
      return <div>Search results for: {searchQuery}</div>;
    }
    const ProviderComponent = providers[currentProvider];
    return <ProviderComponent 
      searchQuery={searchQuery} 
      onSelect={handleSelect}
      onAction={handleAction}
    />;
  };

  const renderDialog = () => {
    if (!currentDialog || !dialogs[currentDialog.type]) return null;
    const DialogComponent = dialogs[currentDialog.type];
    return <DialogComponent data={currentDialog.data} onClose={closeDialog} />;
  };

  return (
    <div className={styles.container}>
      <Input
        type="text"
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search or type a command..."
        className={styles.searchInput}
      />
      {currentDialog ? (
        <div className={styles.dialogContainer}>{renderDialog()}</div>
      ) : (
        <div className={styles.resultsContainer}>{renderProviderUI()}</div>
      )}
    </div>
  );
};



export default CommandCenter;