import React from "react";
import { Button } from "@/shared/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/dialog";
import { toast } from 'sonner';
import { useConversations } from "features/chat/use-conversations";
import { useCommandCenter } from "features/command-center/use-command-center";
import { DialogComponentProps } from "shared/types/ui";

export const DeleteConversationDialog: React.FC<DialogComponentProps> = ({ data, onClose, onConfirm }) => {
  const { deleteConversation, isLoading: isDeleting } = useConversations();
  const { refreshCommandCenter } = useCommandCenter();

  const handleDelete = async () => {
    if (isDeleting || !data?.id) return;
    
    try {
      const success = await deleteConversation({ id: data.id, space_id: data.space_id });
      
      if (success) {
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

  if (!data || !data.id) {
    return null;
  }

  return (
    <Dialog open={!!data?.id} onOpenChange={onClose}>
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
