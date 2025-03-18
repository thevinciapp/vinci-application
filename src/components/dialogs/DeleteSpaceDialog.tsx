

import React from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, toast } from "vinci-ui";
import { DialogComponentProps, Space } from "@/types";
import { useSpaces } from "@/hooks/use-spaces";
import { useCommandCenter } from "@/hooks/use-command-center";

export const DeleteSpaceDialog: React.FC<DialogComponentProps> = ({ data, onClose }) => {
  const space = data as Space;
  const { deleteSpace, isLoading: isDeleting } = useSpaces();
  const { refreshCommandCenter } = useCommandCenter();

  const handleDelete = async () => {
    if (!space || !space.id) return;
    
    try {
      const success = await deleteSpace(space.id);
      
      if (success) {
        // Refresh command center
        refreshCommandCenter();
        
        // Show success toast
        toast({
          title: "Success",
          description: "Space deleted successfully",
          variant: "success",
        });
        
        onClose();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete space",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting space:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Don't render if no space data provided
  if (!space || !space.id) {
    return null;
  }

  return (
    <Dialog open={!!space.id} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Space</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{space.name}</strong>? 
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
