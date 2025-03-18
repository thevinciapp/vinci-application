"use client";

import React, { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Textarea, toast } from "vinci-ui";
import { useSpaces } from "@/src/hooks/use-spaces";
import { useCommandCenter } from "@/src/hooks/use-command-center";
import { DialogComponentProps } from "@/src/types";

export const CreateSpaceDialog: React.FC<DialogComponentProps> = ({ data, onClose, onConfirm }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { createSpace, isLoading } = useSpaces();
  const { refreshCommandCenter } = useCommandCenter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Using the default model and provider for simplicity
      const spaceData = {
        name,
        description,
        model: "claude-3-haiku-20240307", // Default model
        provider: "anthropic", // Default provider
        color: "#3ecfff" // Default color
      };
      
      const success = await createSpace(spaceData);
      
      if (success) {
        // Close dialog
        onClose();
        
        // Refresh command center
        refreshCommandCenter();
        
        // Show success toast
        toast({
          title: "Success",
          description: "Space created successfully",
          variant: "success",
        });
        
        // Navigate to the new space if user clicks
        if (onConfirm) {
          onConfirm(spaceData);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to create space",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating space:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
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
