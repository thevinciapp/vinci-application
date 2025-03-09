"use client";

import React, { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from "vinci-ui";
import { toast } from 'sonner';
import { DialogComponentProps } from "../../types";
import { API } from '@/lib/api-client';

export const EditConversationDialog: React.FC<DialogComponentProps> = ({ data, onClose, onConfirm }) => {
  const [title, setTitle] = useState(data.title || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('Please enter a valid title');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await API.conversations.updateConversation(data.id, trimmedTitle);
      if (result.success) {
        toast.success('Conversation updated successfully');
        // Pass updated data with new title
        onConfirm?.({ ...data, title: trimmedTitle });
        onClose();
      } else {
        toast.error(result.error || 'Failed to update conversation');
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
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
