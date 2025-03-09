"use client";

import React from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "vinci-ui";
import { DialogComponentProps } from "../../types";

export const DeleteSpaceDialog: React.FC<DialogComponentProps> = ({ data, onClose, onConfirm }) => {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Space</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this space? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => onConfirm?.(data)}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
