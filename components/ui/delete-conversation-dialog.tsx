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
import { deleteConversation, createSpaceHistory, setActiveConversation as setActiveConversationDB } from '@/app/actions';
import { useConversationStore } from '@/lib/stores/conversation-store';
import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DeleteConversationDialogProps {
  conversationId: string;
  conversationTitle: string;
  spaceId: string;
  onConversationSelect?: (conversationId: string) => Promise<void>;
}

export function DeleteConversationDialog({ 
  conversationId, 
  conversationTitle, 
  spaceId,
}: DeleteConversationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { conversations, setConversations, activeConversation, setActiveConversation } = useConversationStore();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!conversationId) return;
    
    setIsDeleting(true);
    
    try {
      // Perform soft delete
      await deleteConversation(conversationId);
      
      // Get updated conversations after deletion (excluding the deleted one)
      const updatedConversations = (useConversationStore.getState().conversations || [])
        .filter(c => c.id !== conversationId && !c.is_deleted);
      
      // Update the store with filtered conversations
      setConversations(updatedConversations);
      
      // If the deleted conversation was active, select a new one
      if (activeConversation?.id === conversationId) {
        // Filter conversations to only include those from the same space
        const sameSpaceConversations = updatedConversations.filter(
          c => c.space_id === activeConversation.space_id
        );
        
        // First try to select a conversation from the same space
        if (sameSpaceConversations.length > 0) {
          const newActiveConversation = sameSpaceConversations[0];
          setActiveConversation(newActiveConversation);
          await setActiveConversationDB(newActiveConversation.id);
        } 
        else if (updatedConversations.length > 0) {
          const newActiveConversation = updatedConversations[0];
          setActiveConversation(newActiveConversation);
          await setActiveConversationDB(newActiveConversation.id);
        } 
        else {
          setActiveConversation(null);
        }
      }
      
      setIsOpen(false);

      toast({
        title: 'Conversation Deleted',
        description: `"${conversationTitle}" has been deleted.`,
        variant: "default",
        duration: 3000,
      });

      await createSpaceHistory({
        spaceId,
        actionType: 'conversation_deleted',
        title: 'Conversation Deleted',
        description: `"${conversationTitle}" has been deleted.`,
        metadata: { conversationId, conversationTitle }
      });
    } catch (e) {
      console.error('Error deleting conversation:', e);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation. Please try again.',
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
          <DialogTitle>Delete Conversation</DialogTitle>
          <DialogDescription className="text-white/60">
            Are you sure you want to delete &quot;{conversationTitle}&quot;? This action cannot be undone.
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
            {isDeleting ? 'Deleting...' : 'Delete Conversation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 