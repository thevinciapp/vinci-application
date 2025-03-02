"use client";

import React, { ReactNode, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { CommandOption, useCommandRegistration, CommandType } from "@/hooks/useCommandCenter";
import { 
  Settings, 
  Search, 
  Plus, 
  MessageSquare, 
  Brain, 
  Command, 
  Trash, 
  PencilLine,
  Pencil
} from "lucide-react";
import { AVAILABLE_MODELS, PROVIDER_NAMES, PROVIDER_DESCRIPTIONS, Provider } from "@/config/models";
import { toast } from 'sonner'
import DotSphere from "@/components/ui/space/planet-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/common/dialog";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { Label } from "@/components/ui/common/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/common/select";
import { Textarea } from "@/components/ui/common/textarea";
import { useCommandCenter } from "@/hooks/useCommandCenter";
import { useRouter } from "next/navigation";
import { getMostRecentConversation } from "@/app/actions/conversations";
import { cn } from "@/lib/utils";
import { useSpaceStore, Space as SpaceType, Conversation as ConversationType } from '@/stores/space-store';
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/common/tooltip";
import { ProviderIcon } from "@lobehub/icons";

/**
 * Dialog for creating or editing a space
 */
export function SpaceDialogForm({
  open,
  onOpenChange,
  onCreateSuccess,
  onEditSuccess,
  editSpace = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSuccess: () => void;
  onEditSuccess: () => void;
  editSpace?: any; // The space to edit, null when creating a new space
}) {
  const [name, setName] = useState(editSpace?.name || "New Space");
  const [description, setDescription] = useState(editSpace?.description || "");
  const [provider, setProvider] = useState<Provider>(editSpace?.provider || "anthropic");
  const [model, setModel] = useState(editSpace?.model || "");
  const initialRenderRef = useRef(true);
  const router = useRouter();
  
  const { 
    createSpace, 
    updateSpace, 
    isLoading, 
    loadingSpaceId 
  } = useSpaceStore();

  useEffect(() => {
    if (open) {
      if (editSpace) {
        setName(editSpace.name || "Untitled Space");
        setDescription(editSpace.description || "");
        setProvider(editSpace.provider || "anthropic");
        setModel(editSpace.model || AVAILABLE_MODELS["anthropic"][0].id);
      } else {
        setName("New Space");
        setDescription("");
        setProvider("anthropic");
        setModel(AVAILABLE_MODELS["anthropic"][0].id);
      }
      initialRenderRef.current = false;
    }
  }, [open, editSpace]);

  useEffect(() => {
    if (provider && AVAILABLE_MODELS[provider]?.length > 0) {
      setModel(AVAILABLE_MODELS[provider][0].id);
    }
  }, [provider]);
  
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      let success = false;
      
      if (editSpace) {
        success = await updateSpace(editSpace.id, {
          name,
          description,
          model,
          provider
        });

        if (success) {
          onEditSuccess();
        }
      } else {
        const result = await createSpace(name, description, model, provider);
        success = !!result;
        
        if (success && result) {
          const newSpaceId = result.id;
          const conversation = await getMostRecentConversation(newSpaceId);

          router.replace(`/protected/spaces/${newSpaceId}/conversations/${conversation.data?.id}`);
          
          onCreateSuccess();
          return;
        }
      }
    },
    [name, description, model, provider, createSpace, updateSpace, onCreateSuccess, onEditSuccess, editSpace, router]
  );
    
  const isFormValid = name && provider && model;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editSpace ? "Edit Space" : "Create New Space"}</DialogTitle>
            <DialogDescription>
              {editSpace 
                ? "Update the settings for this workspace." 
                : "Create a new workspace for your conversations."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Space name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this space"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="provider">
                Provider
              </Label>
              <Select 
                value={provider} 
                onValueChange={(value) => setProvider(value as Provider)}
              >
                <SelectTrigger 
                  id="provider"
                >
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <ProviderIcon type="color" provider={key} size={14} className="flex-shrink-0" />
                        <span>{name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="model">
                Model
              </Label>
              <Select 
                value={model} 
                onValueChange={setModel}
              >
                <SelectTrigger 
                  id="model"
                >
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {provider &&
                    AVAILABLE_MODELS[provider]?.map((modelOption) => (
                      <SelectItem key={modelOption.id} value={modelOption.id}>
                        {modelOption.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isLoading || !isFormValid}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/20 text-cyan-300 backdrop-blur-sm"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-cyan-400/20 border-t-cyan-400/80 rounded-full" />
                  <span>{editSpace ? "Updating..." : "Creating..."}</span>
                </div>
              ) : (
                editSpace ? "Update Space" : "Create Space"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Dialog for confirming space deletion
 */
export function DeleteSpaceDialog({
  open,
  onOpenChange,
  space,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: any | null;
  onConfirm: () => void;
}) {
  // Use the space store
  const { loadingSpaceId } = useSpaceStore();

  const isSubmitting = space ? loadingSpaceId === space.id : false;

  const handleDelete = useCallback(async () => {
    if (isSubmitting) return;
    
    try {
      await onConfirm();
    } catch (error) {
      console.error("Error deleting space:", error);
    } finally {
      onOpenChange(false);
    }
  }, [isSubmitting, onConfirm, onOpenChange]);

  if (!space) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Space</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{space.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isSubmitting}
            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 text-red-400 backdrop-blur-sm"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-red-400/20 border-t-red-400/80 rounded-full" />
                <span>Deleting...</span>
              </div>
            ) : (
              "Delete Space"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Provider for application-wide commands
 */
export function ApplicationCommandProvider({ children }: { children: ReactNode }) {
  const applicationCommands = useCallback(
    (): CommandOption[] => [
      {
        id: "settings",
        name: "Open Settings",
        value: "Open Settings",
        description: "Open application settings",
        icon: <Settings className="h-4 w-4" />,
        shortcut: ["⌘", ","],
        type: "application",
        keywords: ["settings", "preferences", "config", "configuration"],
        action: () => {
          console.log("Opening settings");
        },
      },
      {
        id: "search",
        name: "Search Everything",
        value: "Search Everything",
        description: "Search across all content",
        icon: <Search className="h-4 w-4" />,
        shortcut: ["⌘", "F"],
        type: "application",
        keywords: ["search", "find", "filter", "query"],
        action: () => {
          console.log("Opening global search");
        },
      },
    ],
    []
  );

  useCommandRegistration(applicationCommands());

  return <>{children}</>;
}

/**
 * Provider for space-related commands
 */
export function SpacesCommandProvider({ 
  children, 
}: { 
  children: ReactNode, 
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<any>(null);
  const [spaceToDelete, setSpaceToDelete] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { closeCommandCenter, openCommandType, filteredCommands } = useCommandCenter();
  
  const storeSpaces = useSpaceStore(state => state.spaces);
  const storeActiveSpace = useSpaceStore(state => state.activeSpace);
  
  const { 
    deleteSpace,
    activeConversation,
    loadSpaceFullData
  } = useSpaceStore();

  const reopenSpacesCommandCenter = useCallback(() => {
    openCommandType('spaces');
  }, [openCommandType]);

  const baseCommands = useCallback(
    (): CommandOption[] => [
      {
        id: "create-space",
        name: "Create New Space",
        value: "Create New Space",
        description: "Create a new workspace",
        icon: <Plus className="h-4 w-4" />,
        shortcut: ["⌘", "N"],
        type: "spaces",
        keywords: ["create", "new", "space", "workspace", "add"],
        action: () => {
          closeCommandCenter();
          setSpaceToEdit(null);
          setShowCreateDialog(true);
        },
      },
    ],
    [closeCommandCenter]
  );

  const handleSelectSpace = useCallback(async (spaceId: string) => {
    await loadSpaceFullData(spaceId);
  }, [activeConversation]);

  const handleEditSpace = useCallback((space: any) => {
    closeCommandCenter();
    setSpaceToEdit(space);
    setShowCreateDialog(true);
  }, [closeCommandCenter]);

  const handleDeleteSpace = useCallback((space: any) => {
    closeCommandCenter();
    setSpaceToDelete(space);
    setShowDeleteDialog(true);
  }, [closeCommandCenter]);

  const confirmDeleteSpace = useCallback(async () => {
    if (spaceToDelete) {
      try {
        // Check if this is the active space before deletion
        const isActiveSpace = spaceToDelete.id === storeActiveSpace?.id;
        
        // Use the store's deleteSpace function directly
        const success = await deleteSpace(spaceToDelete.id);
        
        if (success) {
          // If we successfully deleted the active space, navigate to the new active space
          if (isActiveSpace) {
            // Check if there are any spaces left
            const remainingSpaces = storeSpaces?.filter(space => !space.is_deleted) || [];
            
            // After a short delay to ensure store updates are complete
            setTimeout(() => {
              if (remainingSpaces.length > 0) {
                // Use the navigation helper to go to the right space/conversation
                useSpaceStore.getState().navigateToActiveConversation(router);
              } else {
                // No spaces left, navigate to home page
                router.push('/protected');
              }
            }, 200);
          }
        } else {
          // Handle failure case explicitly
          console.error('Failed to delete space');
          toast.error('Deletion Failed', {
            description: 'Could not delete the space. Please try again.'
          });
        }
      } catch (error) {
        console.error('Error in space deletion process:', error);
        toast.error('Deletion Failed', {
          description: 'An error occurred while deleting the space.'
        });
      } finally {
        // Always close the dialog
        setShowDeleteDialog(false);
        setSpaceToDelete(null);
        
        // Reopen command center
        setTimeout(() => {
          reopenSpacesCommandCenter();
        }, 150);
      }
    }
  }, [router, reopenSpacesCommandCenter, spaceToDelete, storeActiveSpace?.id, storeSpaces, deleteSpace]);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setShowDeleteDialog(open);
    if (!open) {
      setTimeout(() => {
        reopenSpacesCommandCenter();
      }, 150);
    }
  }, [reopenSpacesCommandCenter]);

  const handleCreateDialogClose = useCallback((open: boolean) => {
    setShowCreateDialog(open);
    if (!open) {
      setTimeout(() => {
        reopenSpacesCommandCenter();
      }, 150);
    }
  }, [reopenSpacesCommandCenter]);

  const spaceCommands = useCallback((): CommandOption[] => {
    const filteredSpaceCommands =  storeSpaces
      ?.filter(space => !space.is_deleted)
      ?.sort((a: SpaceType, b: SpaceType) => new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime())
      .map((space) => {
        return {
          id: `space-${space.id}`,
          name: space.name,
          value: space.name,
          description: space.description || "Switch to this workspace",
 
          type: "spaces" as CommandType,
          keywords: [
            "space", 
            "workspace", 
            "switch", 
            ...(space.name ? space.name.split(/\s+/) : []),
            ...(space.description ? space.description.split(/\s+/).filter(word => word.length > 3) : [])
          ],
          action: async () => {
            await handleSelectSpace(space.id);
          },
          closeCommandOnSelect: false,
          rightElement: (
            <div className="flex items-center gap-1.5">
              <Tooltip>
              <TooltipTrigger asChild>
              {space.provider && (
                  <div
                  className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-md",
                    "transition-all duration-200 ease-in-out",
                    "bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05]",
                    "text-zinc-400 hover:text-zinc-200",
                    "cursor-default"
                  )}
                >
                  <ProviderIcon type="color" provider={space.provider} size={14} className="flex-shrink-0" />
                </div>
              )}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span className="capitalize">{space.provider}</span>
              </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={(e) => { 
                      e.stopPropagation();
                      e.preventDefault();
                      handleEditSpace(space);
                    }}
                    className={cn(
                      "flex items-center h-7 w-7 justify-center rounded-md p-1.5",
                      "transition-all duration-200 ease-in-out",
                      "bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05]",
                      "text-zinc-400 hover:text-zinc-200",
                      "cursor-pointer"
                    )}
                  >
                    <Pencil size={11} strokeWidth={1.5} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Edit Space
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={(e) => { 
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeleteSpace(space);
                    }}
                    className={cn(
                      "flex items-center h-7 w-7 justify-center rounded-md p-1.5",
                      "transition-all duration-200 ease-in-out",
                      "bg-white/[0.03] hover:bg-red-400/20 border border-white/[0.05]",
                      "text-red-400 hover:text-red-200",
                      "cursor-pointer"
                    )}
                  >
                    <Trash className="text-red-400" size={11} strokeWidth={1.5} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-red-500/20 border-red-500/30 text-red-300">
                  Delete Space
                </TooltipContent>
              </Tooltip>
            </div>
          )
        };
      }) ?? [];

    return filteredSpaceCommands;
  }, [storeSpaces]);

  useCommandRegistration([...baseCommands(), ...spaceCommands()]);

  const onCreateSuccess = useCallback(() => {
    setShowCreateDialog(false);
    closeCommandCenter();
  }, [closeCommandCenter]);

  const onEditSuccess = useCallback(() => {
    handleCreateDialogClose(false);
    reopenSpacesCommandCenter();
  }, [handleCreateDialogClose, reopenSpacesCommandCenter]);

  return (
    <TooltipProvider>
      <SpaceDialogForm
        open={showCreateDialog}
        onOpenChange={handleCreateDialogClose}
        onCreateSuccess={onCreateSuccess}
        onEditSuccess={onEditSuccess}
        editSpace={spaceToEdit}
      />
      <DeleteSpaceDialog 
        open={showDeleteDialog}
        onOpenChange={handleDeleteDialogClose}
        space={spaceToDelete}
        onConfirm={confirmDeleteSpace}
      />
      {children}
    </TooltipProvider>
  );
}

/**
 * Dialog for creating or editing a conversation
 */
export function ConversationDialogForm({
  open,
  onOpenChange,
  onEditSuccess,
  editConversation = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditSuccess: () => void;
  editConversation?: any; // The conversation to edit
}) {
  const [title, setTitle] = useState(editConversation?.title || "");
  const initialRenderRef = useRef(true);
  const router = useRouter();

  const { 
    updateConversation, 
    isLoading, 
    loadingConversationId 
  } = useSpaceStore();

  useEffect(() => {
    if (open) {
      if (editConversation) {
        setTitle(editConversation.title || "");
      } else {
        setTitle("");
      }
      initialRenderRef.current = false;
    }
  }, [open, editConversation]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (editConversation) {
        const success = await updateConversation(editConversation.id, title);

        if (success) {
          onEditSuccess();
        }
      }
    },
    [title, updateConversation, onEditSuccess, editConversation]
  );

  const isSubmitting = editConversation 
    ? loadingConversationId === editConversation.id 
    : isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Conversation</DialogTitle>
            <DialogDescription>
              Update the title for this conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Conversation title"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isSubmitting || !title}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/20 text-cyan-300 backdrop-blur-sm"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-cyan-400/20 border-t-cyan-400/80 rounded-full" />
                  <span>Updating...</span>
                </div>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Dialog for confirming conversation deletion
 */
export function DeleteConversationDialog({
  open,
  onOpenChange,
  conversation,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: any | null;
  onConfirm: () => void;
}) {
  // Use the space store
  const { loadingConversationId } = useSpaceStore();

  const isSubmitting = conversation ? loadingConversationId === conversation.id : false;

  const handleDelete = useCallback(async () => {
    if (isSubmitting) return;
    
    try {
      await onConfirm();
    } catch (error) {
      console.error("Error deleting conversation:", error);
    } finally {
      onOpenChange(false);
    }
  }, [isSubmitting, onConfirm, onOpenChange]);

  if (!conversation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Conversation</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{conversation.title || 'Untitled Conversation'}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isSubmitting}
            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 text-red-400 backdrop-blur-sm"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-red-400/20 border-t-red-400/80 rounded-full" />
                <span>Deleting...</span>
              </div>
            ) : (
              "Delete Conversation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Provider for conversation-related commands
 */
export function ConversationsCommandProvider({ 
  children, 
}: { 
  children: ReactNode, 
}) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [conversationToEdit, setConversationToEdit] = useState<any>(null);
  const [conversationToDelete, setConversationToDelete] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { closeCommandCenter, openCommandType } = useCommandCenter();
  
  const {
    activeSpace: storeActiveSpace,
    conversations: storeConversations,
    activeConversation: storeActiveConversation,
  } = useSpaceStore(
    useShallow((state) => state.uiState)
  );
  
  const { 
    createConversation, 
    selectConversation, 
    deleteConversation 
  } = useSpaceStore();

  const reopenConversationsCommandCenter = useCallback(() => {
    openCommandType('conversations');
  }, [openCommandType]);

  type Conversation = {
    id: string;
    title?: string;
    is_deleted?: boolean;
    updated_at?: string;
    [key: string]: any;
  };

  const handleEditConversation = useCallback((conversation: any) => {
    closeCommandCenter();
    setConversationToEdit(conversation);
    setShowEditDialog(true);
  }, [closeCommandCenter]);

  const handleDeleteConversation = useCallback((conversation: any) => {
    closeCommandCenter();
    setConversationToDelete(conversation);
    setShowDeleteDialog(true);
  }, [closeCommandCenter]);

  const confirmDeleteConversation = useCallback(async () => {
    if (conversationToDelete) {
      try {
        const success = await deleteConversation(conversationToDelete.id);
        
        if (success) {
          if (conversationToDelete.id === storeActiveConversation?.id) {
            const remainingConversations = storeConversations?.filter(
              conv => !conv.is_deleted && conv.id !== conversationToDelete.id
            ) || [];
            
            if (remainingConversations.length > 0) {
              await selectConversation(remainingConversations[0].id);
            } else {
              await createConversation();
            }
          }
        } else {
          toast.error('Deletion Failed', {
            description: 'Could not delete the conversation. Please try again.'
          });
        }
      } catch (error) {
        console.error('Error in conversation deletion process:', error);
        toast.error('Deletion Failed', {
          description: 'An error occurred while deleting the conversation.'
        });
      }
    }
  }, [
    conversationToDelete, 
    storeActiveConversation?.id, 
    storeConversations
  ]);

  const handleEditDialogClose = useCallback((open: boolean) => {
    setShowEditDialog(open);
    if (!open) {
      setTimeout(() => {
        reopenConversationsCommandCenter();
      }, 150);
    }
  }, [reopenConversationsCommandCenter]);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setShowDeleteDialog(open);
    if (!open) {
      setTimeout(() => {
        reopenConversationsCommandCenter();
      }, 150);
    }
  }, [reopenConversationsCommandCenter]);

  const onEditSuccess = useCallback(() => {
    handleEditDialogClose(false);
    reopenConversationsCommandCenter();
  }, [handleEditDialogClose, reopenConversationsCommandCenter]);

  const conversationOptionsList = useMemo(() => {
    const conversationsToUse = storeConversations;
    
    return conversationsToUse
      ?.filter((conv) => !conv.is_deleted)
      .sort((a, b) => {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return dateB - dateA;
      })
      .map((conversation: Conversation) => ({
        id: `conversation-${conversation.id}`,
        name: conversation.title || "Untitled Conversation",
        value: conversation.title || "Untitled Conversation",
        description: storeActiveSpace
          ? `Open conversation in ${storeActiveSpace.name}: ${conversation.title || "Untitled"}`
          : `Open conversation: ${conversation.title || "Untitled"}`,
        icon: (
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {conversation.id === storeActiveConversation?.id && (
              <span className="text-[10px] font-medium bg-cyan-500/20 text-cyan-500 rounded-full px-2 py-0.5">
                Active
              </span>
            )}
          </div>
        ),
        type: "conversations" as CommandType,
        keywords: [
          "conversation", 
          "chat", 
          "open",
          ...(conversation.title ? conversation.title.split(/\s+/) : []),
          conversation.title || "untitled",
          ...(conversation.updated_at ? [
            new Date(conversation.updated_at).toLocaleDateString(),
            new Date(conversation.updated_at).toLocaleString()
          ] : [])
        ],
        action: async () => {
          await selectConversation(conversation.id);
          closeCommandCenter();
        },
        closeCommandOnSelect: false,
        rightElement: (
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={(e) => { 
                    e.stopPropagation();
                    e.preventDefault();
                    handleEditConversation(conversation);
                  }}
                  className={cn(
                    "flex items-center h-7 w-7 justify-center rounded-md p-1.5",
                    "transition-all duration-200 ease-in-out",
                    "bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05]",
                    "text-zinc-400 hover:text-zinc-200",
                    "cursor-pointer"
                  )}
                >
                  <Pencil size={11} strokeWidth={1.5} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Edit Conversation
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={(e) => { 
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteConversation(conversation);
                  }}
                  className={cn(
                    "flex items-center h-7 w-7 justify-center rounded-md p-1.5",
                    "transition-all duration-200 ease-in-out",
                    "bg-white/[0.03] hover:bg-red-400/20 border border-white/[0.05]",
                    "text-red-400 hover:text-red-200",
                    "cursor-pointer"
                  )}
                >
                  <Trash className="text-red-400" size={11} strokeWidth={1.5} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-red-500/20 border-red-500/30 text-red-300">
                Delete Conversation
              </TooltipContent>
            </Tooltip>
          </div>
        )
      })) ?? [];
  }, [
    storeConversations,
    storeActiveConversation
  ]);

  const conversationCommands = useCallback((): CommandOption[] => {
    return [
      {
        id: "new-conversation",
        name: "Start New Conversation",
        value: "Start New Conversation",
        description: storeActiveSpace
          ? `Begin a new chat in ${storeActiveSpace.name}`
          : "Begin a new chat conversation",
        icon: <MessageSquare className="h-4 w-4" />,
        shortcut: ["⌘", "T"],
        type: "conversations",
        keywords: ["conversation", "chat", "new", "start", "begin"],
        action: async () => {
          await createConversation();
          closeCommandCenter();
        },
      },
      ...conversationOptionsList,
    ];
  }, [conversationOptionsList]);

  useCommandRegistration(conversationCommands());

  return (
    <TooltipProvider>
      <ConversationDialogForm
        open={showEditDialog}
        onOpenChange={handleEditDialogClose}
        onEditSuccess={onEditSuccess}
        editConversation={conversationToEdit}
      />
      <DeleteConversationDialog 
        open={showDeleteDialog}
        onOpenChange={handleDeleteDialogClose}
        conversation={conversationToDelete}
        onConfirm={confirmDeleteConversation}
      />
      {children}
    </TooltipProvider>
  );
}

/**
 * Provider for model-related commands
 */
export function ModelsCommandProvider({ children, activeSpace = null }: { children: ReactNode, activeSpace?: any }) {
  const { closeCommandCenter } = useCommandCenter();

  const {
    activeSpace: storeActiveSpace,
  } = useSpaceStore(
    useShallow((state) => state.uiState)
  );
  const { 
    updateSpace
  } = useSpaceStore();  
  
  const handleModelSelect = useCallback(async (modelId: string, provider: Provider) => {
    console.log('Updating space:', storeActiveSpace);
    if (storeActiveSpace?.id) {
      await updateSpace(storeActiveSpace.id, {
        model: modelId,
        provider: provider
      });
    } else {
      console.error('Cannot update space: No active space ID');
    }
  }, [storeActiveSpace, updateSpace]);

  const modelCommands = useCallback((): CommandOption[] => {
    const commands: CommandOption[] = [];
    const providerGroups: Record<string, CommandOption[]> = {};
    
    // Import the ProviderIcon component
    const { ProviderIcon } = require('@/components/ui/chat/provider-icon');

    Object.entries(AVAILABLE_MODELS).forEach(([providerKey, models]) => {
      const provider = providerKey as Provider;
      const providerName = PROVIDER_NAMES[provider];
      const providerDescription = PROVIDER_DESCRIPTIONS?.[provider] || `Models from ${providerName}`;
      
      const groupId = `provider-group-${provider}`;
      commands.push({
        id: groupId,
        name: providerName,
        value: providerName,
        description: providerDescription,
        icon: <ProviderIcon provider={provider} size={18} />,
        type: "models",
        keywords: ["provider", providerName.toLowerCase(), "model"],
        action: () => {
          console.log(`Provider group: ${providerName}`);
        },
      });

      models.forEach((model) => {
        const isCurrentModel = storeActiveSpace && 
                              storeActiveSpace.provider === provider && 
                              storeActiveSpace.model === model.id;
        
        commands.push({
          id: `model-${provider}-${model.id}`,
          name: model.name,
          value: model.name,
          description: model.description || `${providerName} model`,
          icon: (
            <div className="flex items-center opacity-60 pl-3">
              <ProviderIcon provider={provider} size={14} className="opacity-80" />
              {isCurrentModel && (
                <span className="ml-2 text-[10px] font-medium bg-cyan-500/20 text-cyan-500 rounded-full px-2 py-0.5">
                  Active
                </span>
              )}
            </div>
          ),
          type: "models",
          keywords: [
            "model", 
            model.name.toLowerCase(), 
            providerName.toLowerCase(),
            ...(model.description ? model.description.split(' ') : [])
          ],
          action: async () => {
            await handleModelSelect(model.id, provider);
          },
        });
      });
      
      commands.push({
        id: `separator-${provider}`,
        name: "",
        value: "",
        type: "models",
        icon: <></>,
        action: () => {},
      });
    });

    if (commands.length > 0) {
      commands.pop();
    }

    return commands;
  }, [storeActiveSpace, handleModelSelect]);

  useCommandRegistration([...modelCommands()]);

  return <>{children}</>;
}

/**
 * Provider for general actions commands
 */
export function ActionsCommandProvider({ children }: { children: ReactNode }) {
  const actionCommands = useCallback(
    (): CommandOption[] => [
      {
        id: "keyboard-shortcuts",
        name: "View Keyboard Shortcuts",
        value: "View Keyboard Shortcuts",
        description: "Show all available keyboard shortcuts",
        icon: <Command className="h-4 w-4" />,
        type: "actions",
        keywords: ["keyboard", "shortcuts", "keys", "bindings", "help"],
        action: () => {
          console.log("Viewing keyboard shortcuts");
        },
      },
    ],
    []
  );

  useCommandRegistration(actionCommands());

  return <>{children}</>;
}

/**
 * Combined provider for all command types
 */
export function AllCommandProviders({ 
  children,
  spaces = [],
  activeSpace = null,
  conversations = [],
  activeConversation = null,
  user = null,
  messages = [],
}: { 
  children: ReactNode;
  spaces?: any[];
  activeSpace?: any;
  conversations?: any[];
  activeConversation?: any;
  user?: any;
  messages?: any[];
}) {
  const { initializeState } = useSpaceStore();
  
  useEffect(() => {
    initializeState({
      spaces,
      activeSpace,
      conversations,
      activeConversation,
      messages,
      isLoading: false,
      loadingType: null
    });
  }, []);
  
  return (
    <ApplicationCommandProvider>
      <SpacesCommandProvider>
        <ConversationsCommandProvider>
          <ModelsCommandProvider>
            <ActionsCommandProvider>{children}</ActionsCommandProvider>
          </ModelsCommandProvider>
        </ConversationsCommandProvider>
      </SpacesCommandProvider>
    </ApplicationCommandProvider>
  );
}