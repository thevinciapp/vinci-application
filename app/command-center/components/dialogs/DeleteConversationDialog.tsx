"use client";

import React, { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "vinci-ui";
import { toast } from 'sonner';
import { DialogComponentProps } from "../../types";
import { deleteConversation } from "@/app/actions/conversations";
import { ActionResponse } from "@/app/types/action-response";

export const DeleteConversationDialog: React.FC<DialogComponentProps> = ({ data, onClose, onConfirm }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      const response = await deleteConversation(data.id) as ActionResponse<void>;
      if (response.status === 'success') {
        toast.success('Conversation deleted successfully');
        onConfirm?.(data);
        onClose();
      } else {
        toast.error(response.error || 'Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Conversation</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this conversation? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
