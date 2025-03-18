

import React, { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Textarea, toast } from "vinci-ui";
import { DialogComponentProps, Space } from "@/types";
import { useSpaces } from "@/hooks/use-spaces";
import { useCommandCenter } from "@/hooks/use-command-center";

export const EditSpaceDialog: React.FC<DialogComponentProps> = ({ data, onClose }) => {
  const space = data as Space;
  const [name, setName] = useState(space?.name || "");
  const [description, setDescription] = useState(space?.description || "");
  const { updateSpace, isLoading } = useSpaces();
  const { refreshCommandCenter } = useCommandCenter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!space || !space.id) return;
    
    try {
      const success = await updateSpace(space.id, {
        name,
        description
      });
      
      if (success) {
        // Refresh command center
        refreshCommandCenter();
        
        // Show success toast
        toast({
          title: "Success",
          description: "Space updated successfully",
          variant: "success",
        });
        
        onClose();
      } else {
        toast({
          title: "Error",
          description: "Failed to update space",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating space:', error);
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
          <DialogTitle>Edit Space</DialogTitle>
          <DialogDescription>
            Update the details of your space.
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
                placeholder="Space name"
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
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
