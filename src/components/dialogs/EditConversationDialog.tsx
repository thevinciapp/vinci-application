

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast } from "@/components/ui/toast";
import { useConversations } from "@/hooks/use-conversations";
import { useCommandCenter } from "@/hooks/use-command-center";
import { DialogComponentProps } from "@/types/dialog";

export const EditConversationDialog: React.FC<DialogComponentProps> = ({ data, onClose, onConfirm }) => {
  const [title, setTitle] = useState(data.title || "");
  const { updateConversation, isLoading: isSubmitting } = useConversations();
  const { refreshCommandCenter } = useCommandCenter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('Please enter a valid title');
      return;
    }

    try {
      const success = await updateConversation(data.spaceId, data.id, trimmedTitle);
      
      if (success) {
        toast.success('Conversation updated successfully');
        
        // Refresh command center
        refreshCommandCenter();
        
        // Pass updated data with new title
        onConfirm?.({ ...data, title: trimmedTitle });
        onClose();
      } else {
        toast.error('Failed to update conversation');
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  // Don't render if no data or ID provided
  if (!data || !data.id) {
    return null;
  }

  return (
    <Dialog open={!!data.id} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Conversation</DialogTitle>
          <DialogDescription>
            Give your conversation a meaningful title to help you find it later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter conversation title"
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
