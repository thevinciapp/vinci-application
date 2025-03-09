"use client";

import React, { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Textarea } from "vinci-ui";
import { DialogComponentProps } from "../../types";
import { API } from "@/lib/api-client";
import { Space } from "@/types";

export const EditSpaceDialog: React.FC<DialogComponentProps> = ({ data, onClose }) => {
  const space = data as Space;
  const [name, setName] = useState(space?.name || "");
  const [description, setDescription] = useState(space?.description || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!space || !space.id) return;
    
    setIsLoading(true);
    try {
      const result = await API.spaces.updateSpace(space.id, {
        name,
        description
      });
      
      if (result.success) {
        // Refresh command center
        window.electronAPI?.refreshCommandCenter?.();
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating space:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
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
