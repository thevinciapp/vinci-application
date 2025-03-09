"use client";

import React, { useState, useEffect } from "react";

type ProviderComponentProps = {
  searchQuery: string;
};

type DialogComponentProps = {
  data: any;
  onClose: () => void;
  onConfirm?: (data: any) => void;
};

interface ProviderRegistry {
  [key: string]: React.FC<ProviderComponentProps>;
}

interface DialogRegistry {
  [key: string]: React.FC<DialogComponentProps>;
}

const providers: ProviderRegistry = {
  spaces: ({ searchQuery }) => <div>Spaces UI - Search results for: {searchQuery}</div>,
  conversations: ({ searchQuery }) => <div>Conversations UI - Search results for: {searchQuery}</div>,
  models: ({ searchQuery }) => <div>Models UI - Search results for: {searchQuery}</div>,
  tasks: ({ searchQuery }) => <div>Tasks UI - Search results for: {searchQuery}</div>, // Example extension
};

// Dialog Components
const dialogs: DialogRegistry = {
  "delete-space": ({ data, onClose }) => (
    <div>
      <p>Are you sure you want to delete space {data.spaceId}?</p>
      <button onClick={onClose}>Cancel</button>
      <button onClick={onClose}>Confirm</button> {/* Add onConfirm logic if needed */}
    </div>
  ),
  edit: ({ data, onClose }) => (
    <div>
      <p>Edit dialog for {data.item}</p>
      <button onClick={onClose}>Cancel</button>
      <button onClick={onClose}>Save</button>
    </div>
  ),
  "create-space": ({ data, onClose }) => (
    <div>
      <p>Create a new space with name: {data.name || "Unnamed"}</p>
      <button onClick={onClose}>Cancel</button>
      <button onClick={onClose}>Create</button>
    </div>
  ), // Example extension
};

// Main CommandCenter Component
const CommandCenter = () => {
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

    // Attach IPC listeners
    window.electronAPI?.onSetCommandType?.(onSetCommandType);
    window.electronAPI?.onOpenDialog?.(onOpenDialog);
    window.electronAPI?.onSyncCommandCenterState?.(onSyncCommandCenterState);

    // Cleanup listeners on unmount
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
    // Add dynamic search logic here if needed
  };

  const renderProviderUI = () => {
    if (!currentProvider || !providers[currentProvider]) {
      return <div>Search results for: {searchQuery}</div>;
    }
    const ProviderComponent = providers[currentProvider];
    return <ProviderComponent searchQuery={searchQuery} />;
  };

  const renderDialog = () => {
    if (!currentDialog || !dialogs[currentDialog.type]) return null;
    const DialogComponent = dialogs[currentDialog.type];
    return <DialogComponent data={currentDialog.data} onClose={closeDialog} />;
  };

  return (
    <div style={styles.container}>
      <input
        type="text"
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search or type a command..."
        style={styles.searchInput}
      />
      {currentDialog ? (
        <div style={styles.dialogContainer}>{renderDialog()}</div>
      ) : (
        <div style={styles.resultsContainer}>{renderProviderUI()}</div>
      )}
    </div>
  );
};

// Inline styles (replace with CSS modules or styled-components in production)
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    padding: "20px",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(10px)",
    borderRadius: "10px",
  },
  searchInput: {
    padding: "10px",
    fontSize: "16px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    marginBottom: "20px",
  },
  resultsContainer: {
    flex: 1,
    overflowY: "auto",
  },
  dialogContainer: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};

export default CommandCenter;