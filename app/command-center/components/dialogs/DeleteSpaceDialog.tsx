"use client";

import React, { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "vinci-ui";
import { DialogComponentProps } from "../../types";
import { useSpaceStore } from "@/stores/space-store";

export const DeleteSpaceDialog: React.FC<DialogComponentProps> = ({ data, onClose }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteSpace } = useSpaceStore();
  const space = data;

  const handleDelete = async () => {
    if (!space || !space.id) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteSpace(space.id);
      if (success) {
        // Refresh command center
        window.electronAPI?.refreshCommandCenter?.();
        onClose();
      }
    } catch (error) {
      console.error('Error deleting space:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Space</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{space?.name}</strong>? 
            This action cannot be undone and will delete all conversations within this space.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Space"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
