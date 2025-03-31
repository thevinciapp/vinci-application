import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";  
import { toast } from 'sonner';
import { useConversations } from "@/hooks/use-conversations";
import { useCommandCenter } from "@/hooks/use-command-center";
import { DialogComponentProps } from "@/types/dialog";

export const EditConversationDialog: React.FC<DialogComponentProps> = ({ data, onClose, onConfirm }) => {
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
      const success = await updateConversation({ id: data.id, title: trimmedTitle, space_id: data.space_id });
      
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
