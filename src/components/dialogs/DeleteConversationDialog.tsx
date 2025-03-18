

import React from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "vinci-ui";
import { toast } from 'sonner';
import { useConversations } from "@/hooks/use-conversations";
import { useCommandCenter } from "@/hooks/use-command-center";
import { DialogComponentProps } from "@/types";

export const DeleteConversationDialog: React.FC<DialogComponentProps> = ({ data, onClose, onConfirm }) => {
  const { deleteConversation, isLoading: isDeleting } = useConversations();
  const { refreshCommandCenter } = useCommandCenter();

  const handleDelete = async () => {
    if (isDeleting) return;
    
    try {
      const success = await deleteConversation(data.spaceId, data.id);
      
      if (success) {
        // Refresh command center
        refreshCommandCenter();
        
        toast.success('Conversation deleted successfully');
        onConfirm?.(data);
        onClose();
      } else {
        toast.error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  // Don't show the dialog if there's no data or ID
  if (!data || !data.id) {
    return null;
  }

  return (
    <Dialog open={!!data.id} onOpenChange={onClose}>
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
