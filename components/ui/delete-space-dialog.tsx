'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
import { deleteSpace, createSpaceHistory } from '@/app/actions';
import { useSpaceStore } from '@/lib/stores/space-store';
import React, { useState } from 'react';
import { toast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";

interface DeleteSpaceDialogProps {
  spaceId: string;
  spaceName: string;
}

export function DeleteSpaceDialog({ spaceId, spaceName }: DeleteSpaceDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { setSpaces, spaces, setActiveSpace } = useSpaceStore();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteSpace(spaceId);
      
      // Update local state
      if (spaces) {
        const updatedSpaces = spaces.filter(space => space.id !== spaceId);
        setSpaces(updatedSpaces);
        
        // Set the most recent space as active
        if (updatedSpaces.length > 0) {
          const mostRecentSpace = updatedSpaces[0];
          await setActiveSpace(mostRecentSpace.id);
        }
      }
      
      // Close both dialogs
      setIsOpen(false);

      // Show toast notification
      toast({
        title: 'Space Deleted',
        description: `${spaceName} has been deleted.`,
        variant: "default",
        duration: 3000,
      });

      // Record in space history
      await createSpaceHistory({
        spaceId,
        actionType: 'deleted',
        title: 'Space Deleted',
        description: `${spaceName} has been deleted.`,
        metadata: { spaceName }
      });
      const commandDialog = document.querySelector('[cmdk-dialog]');
      if (commandDialog instanceof HTMLElement) {
        commandDialog.style.display = 'none';
      }
    } catch (error) {
      console.error('Error deleting space:', error);
      
      // Add error toast notification
      toast({
        title: 'Error',
        description: 'Failed to delete space. Please try again.',
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon"
          className="flex-shrink-0 w-6 h-6 p-1 rounded-md flex items-center justify-center group"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-lg overflow-hidden bg-black/80 border border-white/[0.1] shadow-[0_0_30px_rgba(62,207,255,0.1)] rounded-xl p-6 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Delete Space</DialogTitle>
          <DialogDescription className="text-white/60">
            Are you sure you want to delete &quot;{spaceName}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="text-white/60 hover:text-white/90 hover:bg-white/10 rounded-xl h-8"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-xl h-8"
          >
            {isDeleting ? 'Deleting...' : 'Delete Space'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
