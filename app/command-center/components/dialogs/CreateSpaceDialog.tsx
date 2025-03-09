"use client";

import React, { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Textarea } from "vinci-ui";
import { DialogComponentProps } from "../../types";
import { useSpaceStore } from "@/stores/space-store";
import { useRouter } from "next/navigation";

export const CreateSpaceDialog: React.FC<DialogComponentProps> = ({ data, onClose, onConfirm }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { createSpace } = useSpaceStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Using the default Claude model and provider for simplicity
      const space = await createSpace(
        name,
        description, 
        "claude-3-haiku-20240307", // Default model
        "anthropic", // Default provider
        "#3ecfff" // Default color
      );
      
      if (space) {
        // Close dialog
        onClose();
        
        // Refresh command center
        window.electronAPI?.refreshCommandCenter?.();
        
        // Navigate to the new space if user clicks
        if (onConfirm) {
          onConfirm(space);
        }
      } else {
        console.error('Space creation returned null');
      }
    } catch (error) {
      console.error('Error creating space:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Space</DialogTitle>
          <DialogDescription>
            Create a new space to organize your conversations.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter space name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this space"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Space"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
