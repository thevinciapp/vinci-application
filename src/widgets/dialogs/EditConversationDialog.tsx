import React, { useState, useEffect } from "react";
import { Button } from "@/shared/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/dialog";
import { Input } from "@/shared/components/input";
import { Label } from "@/shared/components/label";
import { toast } from 'sonner';
import { useConversations } from "@/features/chat/use-conversations";
import { useCommandCenter } from "@/features/command-center/use-command-center";
import { DialogComponentProps } from "@/shared/types/ui";
import { Conversation } from '@/entities/conversation/model/types';

export const EditConversationDialog: React.FC<DialogComponentProps<Conversation>> = ({ data, onClose, onConfirm }) => {
  const [title, setTitle] = useState(data?.title || "");
  const { updateConversation, isLoading: isSubmitting } = useConversations();
  const { refreshCommandCenter } = useCommandCenter();

  useEffect(() => {
    if (data) {
      setTitle(data.title || "");
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !data) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('Please enter a valid title');
      return;
    }

    try {
      const updatedConversation: Conversation = {
        ...data, // Include all existing properties from data
        title: trimmedTitle, // Override the title with the updated one
      };
      const success = await updateConversation(updatedConversation);
      
      if (success) {
        toast.success('Conversation updated successfully');
        
        refreshCommandCenter();
        
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

  return (
    <Dialog open={!!data?.id} onOpenChange={onClose}>
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
