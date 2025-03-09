"use client";

import React, { ReactNode, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { CommandOption, useCommandRegistration, CommandType, useCommandHeaderRegistration } from "@/hooks/useCommandCenter";
import { 
  Settings, 
  Search, 
  Plus, 
  MessageSquare, 
  Brain, 
  Command, 
  Trash, 
  PencilLine,
  Pencil,
  SwitchCamera,
  MessageCircle,
  Ban,
  Sparkles,
  Timer,
  Activity,
  Lightbulb,
  Check,
  X,
  Clock
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
} from "vinci-ui";
import { Button } from "vinci-ui";
import { Input } from "vinci-ui";
import { Label } from "vinci-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "vinci-ui";
import { Textarea } from "vinci-ui";
import { Checkbox } from "vinci-ui";
import { useCommandCenter } from "@/hooks/useCommandCenter";
import { useRouter } from "next/navigation";
import { getMostRecentConversation } from "@/app/actions/conversations";
import { cn } from "@/lib/utils";
import { useSpaceStore, Space as SpaceType, Conversation as ConversationType } from '@/stores/space-store';
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "vinci-ui";
import { ProviderIcon } from "@lobehub/icons";
import { createSpace as createSpaceAction, deleteSpace as deleteSpaceAction, updateSpace as updateSpaceAction } from "@/app/actions/spaces";
import { createConversation as createConversationAction, deleteConversation as deleteConversationAction, updateConversationTitle, searchMessages } from "@/app/actions/conversations";
import { Tabs, TabsList, TabsTrigger } from "vinci-ui";

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
                        <ProviderIcon type="color" provider={key} size={14} className="shrink-0" />
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
              className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/20 text-cyan-300 backdrop-blur-xs"
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
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-xs"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isSubmitting}
            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 text-red-400 backdrop-blur-xs"
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
                  <ProviderIcon type="color" provider={space.provider} size={14} className="shrink-0" />
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
              className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/20 text-cyan-300 backdrop-blur-xs"
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
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-xs"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isSubmitting}
            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 text-red-400 backdrop-blur-xs"
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

// Create a context for search scope management
const SearchScopeContext = React.createContext<{
  scope: "conversation" | "space" | "all";
  setScope: (scope: "conversation" | "space" | "all") => void;
}>({
  scope: "conversation",
  setScope: () => {},
});

/**
 * The SearchHeader component that consumes the scope context
 */
const SearchHeader = () => {
  const { scope, setScope } = React.useContext(SearchScopeContext);
  
  return (
    <div className="px-2 py-2">
      <Tabs 
        value={scope} 
        onValueChange={(value) => setScope(value as "conversation" | "space" | "all")}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-3 bg-zinc-900/40 border border-white/5 rounded-md">
          <TabsTrigger 
            value="conversation" 
            className="text-xs py-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
          >
            Conversation
          </TabsTrigger>
          <TabsTrigger 
            value="space" 
            className="text-xs py-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
          >
            Space
          </TabsTrigger>
          <TabsTrigger 
            value="all" 
            className="text-xs py-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
          >
            All Spaces
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

// Updated formatDate function with proper error handling
const formatDate = (dateString?: string): string => {
  if (!dateString) return "Unknown date";
  
  try {
    // First try parsing as ISO string
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Unknown date";
    }
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Unknown date";
  }
}

export function MessageSearchProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchScope, setSearchScope] = useState<"conversation" | "space" | "all">("conversation");
  
  const { 
    closeCommandCenter, 
    openCommandType, 
    setIsLoading, 
    setLoadingCommandType,
    registerSearchableCommand,
    unregisterSearchableCommand
  } = useCommandCenter();
  
  const {
    activeSpace,
    activeConversation,
  } = useSpaceStore(
    useShallow((state) => state.uiState)
  );
  
  const { selectConversation } = useSpaceStore();
  
  // Register this as a searchable command type
  useEffect(() => {
    const MIN_SEARCH_LENGTH = 3;
    
    // Register messages as a searchable command type
    registerSearchableCommand('messages', {
      minSearchLength: MIN_SEARCH_LENGTH,
      placeholderText: `Type at least ${MIN_SEARCH_LENGTH} characters to search messages...`
    });
    
    // Cleanup on unmount
    return () => {
      unregisterSearchableCommand('messages');
    };
  }, [registerSearchableCommand, unregisterSearchableCommand]);
  
  const handleSearch = useCallback(async () => {
    const MIN_SEARCH_LENGTH = 3;
    
    // Clear results and loading state if search term is too short
    if (!searchTerm || searchTerm.length < MIN_SEARCH_LENGTH) {
      setSearchResults([]);
      setIsLoading(false);
      setLoadingCommandType(null);
      return;
    }
    
    // Set local and global loading states immediately
    setIsSearching(true);
    setIsLoading(true);
    setLoadingCommandType('messages');
    
    try {
      const conversationId = searchScope === "conversation" ? activeConversation?.id : undefined;
      const spaceId = (searchScope === "space" || searchScope === "conversation") ? activeSpace?.id : undefined;
      
      const response = await searchMessages(
        searchTerm,
        searchScope,
        "exact",
        conversationId,
        spaceId
      );

      console.log("response", response);
      
      if (response && response.status === 'success' && response.data && response.data.results) {
        setSearchResults(response.data.results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching messages:", error);
      toast.error("Search Failed", {
        description: "Could not search messages. Please try again."
      });
      setSearchResults([]);
    } finally {
      // Clear both loading states
      setIsSearching(false);
      setIsLoading(false);
      setLoadingCommandType(null);
    }
  }, [searchTerm, searchScope, activeConversation, activeSpace, setIsLoading, setLoadingCommandType]);
  
  const toggleSearchScope = useCallback(() => {
    setSearchScope(current => {
      if (current === "conversation") return "space";
      if (current === "space") return "all";
      return "conversation";
    });
    
    setSearchResults(null);
  }, []);
  
  const getScopeName = useCallback(() => {
    switch (searchScope) {
      case "conversation":
        return activeConversation?.title || "Current Conversation";
      case "space":
        return activeSpace?.name || "Current Space";
      case "all":
        return "All Spaces";
      default:
        return "Messages";
    }
  }, [searchScope, activeConversation, activeSpace]);
  
  const searchCommands = useCallback((): CommandOption[] => {
    if (!searchTerm || searchTerm.length < 3) return []

    const commands: CommandOption[] = []
    
    // Check if we're in a special search mode that should bypass filtering
    const shouldBypassFilter = searchTerm.length >= 3 && !!searchResults && searchResults.length > 0;

    if (searchResults && searchResults.length > 0) {
      searchResults.forEach((result) => {
        const messageContent = result.content || ""
        const lowerContent = messageContent.toLowerCase()
        const lowerSearchTerm = searchTerm.toLowerCase()
        const matchIndex = lowerContent.indexOf(lowerSearchTerm)

        if (matchIndex === -1) return

        // Create a display content that includes context around the match
        let displayContent = messageContent
        const snippetLength = 60 // Characters to show around the match
        
        if (messageContent.length > (snippetLength * 2) + searchTerm.length) {
          // If the content is long, truncate it to show context around the match
          const startIndex = Math.max(0, matchIndex - snippetLength)
          const endIndex = Math.min(messageContent.length, matchIndex + searchTerm.length + snippetLength)
          
          displayContent = (startIndex > 0 ? '...' : '') + 
                          messageContent.substring(startIndex, endIndex) + 
                          (endIndex < messageContent.length ? '...' : '')
        }

        const isAssistant = result.role === "assistant"
        const conversationId = result.conversation_id

        commands.push({
          id: conversationId + result.id,
          name: displayContent,
          value: result.content,
          shortcut: [formatDate(result.created_at)],
          type: "messages",
          icon: (
            <div className="flex items-center justify-center rounded-full bg-white/5 w-8 h-8">
              <MessageCircle className="h-5 w-5 text-white/70" />
            </div>
          ),
          description: isAssistant ? "AI Message" : "Your Message",
          rightElement: (
            <div className={`
              px-1.5 py-0.5 text-xs font-medium rounded 
              ${isAssistant 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                : 'bg-green-500/20 text-green-400 border border-green-500/30'}
            `}>
              {isAssistant ? "AI" : "You"}
            </div>
          ),
          action: async () => {
            // Navigate to the conversation
            if (conversationId) {
              await selectConversation(conversationId);
              closeCommandCenter();
            }
          },
          bypassFilter: shouldBypassFilter,
        })
      })
    }

    return commands
  }, [searchResults, searchTerm, selectConversation, closeCommandCenter]);
  
  // Handle scope changes from the header
  const handleScopeChange = useCallback((scope: "conversation" | "space" | "all") => {
    setSearchScope(scope);
    setSearchResults(null); // Clear results when changing scope
  }, []);
  
  // Create the context value with the current scope
  const scopeContextValue = useMemo(() => ({
    scope: searchScope,
    setScope: handleScopeChange
  }), [searchScope, handleScopeChange]);
  
  // Create the header component with context - this will update when scopeContextValue changes
  const headerWithContext = useMemo(() => (
    <SearchScopeContext.Provider value={scopeContextValue}>
      <SearchHeader />
    </SearchScopeContext.Provider>
  ), [scopeContextValue]);
  
  // Register the header at the top level - this follows React hooks rules
  useCommandHeaderRegistration(headerWithContext, "messages");
  
  // Register search commands at the top level
  useCommandRegistration(searchCommands());
  
  // Effect to trigger search when search term or scope changes
  useEffect(() => {
    const MIN_SEARCH_LENGTH = 3; // Keep this in sync with the registered config
    
    // Clear any existing search timer
    const timer = setTimeout(() => {
      // If search is long enough, trigger search
      if (searchTerm && searchTerm.length >= MIN_SEARCH_LENGTH) {
        handleSearch();
      } 
      // If search is less than minimum but not empty, set appropriate loading state
      else if (searchTerm.length > 0 && searchTerm.length < MIN_SEARCH_LENGTH) {
        setSearchResults([]);
        setIsLoading(false);
        setLoadingCommandType(null);
      } 
      // If search is empty, clear all states
      else if (searchTerm.length === 0) {
        setSearchResults([]);
        setIsLoading(false);
        setLoadingCommandType(null);
      }
    }, 300); // Debounce search input
    
    // For immediate feedback while typing
    if (searchTerm && searchTerm.length >= MIN_SEARCH_LENGTH) {
      // Immediately set loading state for better UX
      setIsLoading(true);
      setLoadingCommandType('messages');
    }
    
    return () => clearTimeout(timer);
  }, [searchTerm, searchScope, handleSearch, setIsLoading, setLoadingCommandType]);
  
  // Set up a listener for the command center search query
  const { searchQuery } = useCommandCenter();
  
  useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery);
    } else {
      setSearchTerm("");
      setSearchResults(null);
    }
  }, [searchQuery]);
  
  return <>{children}</>;
}

/**
 * Combined provider for all command types
 */
/**
 * Dialog for creating or editing a chat mode
 */
export function ChatModeDialogForm({
  open,
  onOpenChange,
  onCreateSuccess,
  editMode = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSuccess: (modeId: string) => void;
  editMode?: any; // The chat mode to edit, null when creating a new mode
}) {
  const [name, setName] = useState(editMode?.name || "Custom Mode");
  const [description, setDescription] = useState(editMode?.description || "");
  const [selectedTools, setSelectedTools] = useState<string[]>(
    editMode?.tools?.map((t: any) => t.id) || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customInstructions, setCustomInstructions] = useState(editMode?.customInstructions || "");
  
  const [availableTools, setAvailableTools] = useState<Record<string, any>>({});
  const router = useRouter();
  
  // Get the space store
  const { activeSpace, updateSpace } = useSpaceStore(
    useShallow(state => ({
      activeSpace: state.activeSpace,
      updateSpace: state.updateSpace
    }))
  );
  
  // Load available tools on mount
  useEffect(() => {
    const loadTools = async () => {
      try {
        const { AVAILABLE_TOOLS } = await import('@/config/chat-modes');
        setAvailableTools(AVAILABLE_TOOLS);
      } catch (error) {
        console.error("Error loading tools:", error);
      }
    };
    
    loadTools();
  }, []);
  
  useEffect(() => {
    if (open) {
      if (editMode) {
        setName(editMode.name || "Custom Mode");
        setDescription(editMode.description || "");
        setSelectedTools(editMode.tools?.map((t: any) => t.id) || []);
        setCustomInstructions(editMode.customInstructions || "");
      } else {
        setName("Custom Mode");
        setDescription("");
        setSelectedTools([]);
        setCustomInstructions("");
      }
    }
  }, [open, editMode]);
  
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      try {
        // Import the createCustomChatMode function
        const { createCustomChatMode } = await import('@/config/chat-modes');
        
        // Create the custom mode config
        const customMode = createCustomChatMode(
          name, 
          description, 
          selectedTools
        );
        
        // Save any custom instructions in the chat_mode_config
        const modeConfig = {
          tools: selectedTools,
          custom_instructions: customInstructions || undefined,
          mcp_servers: customMode.mcp_servers || []
        };
        
        // Update the space with the new mode
        if (activeSpace?.id) {
          const success = await updateSpace(activeSpace.id, {
            chat_mode: customMode.id,
            chat_mode_config: modeConfig
          });
          
          if (success) {
            toast.success('Mode Created', {
              description: `Custom mode "${name}" created and activated`
            });
            onCreateSuccess(customMode.id);
            router.refresh();
          } else {
            toast.error('Failed to create mode', {
              description: 'Could not update space settings'
            });
          }
        }
      } catch (error) {
        console.error("Error creating custom mode:", error);
        toast.error('Failed to create mode', {
          description: 'An unexpected error occurred'
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, description, selectedTools, customInstructions, activeSpace, updateSpace, onCreateSuccess, router]
  );
  
  const isFormValid = name && name.trim().length > 0 && selectedTools.length > 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Custom Chat Mode</DialogTitle>
            <DialogDescription>
              Configure a custom chat mode with specific tools and behavior
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mode name"
                required
                className="bg-zinc-900/50 border-white/10"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this mode is best for"
                rows={2}
                className="bg-zinc-900/50 border-white/10 min-h-[80px]"
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Select Tools</Label>
              <div className="space-y-2 bg-zinc-900/30 rounded-md p-3 border border-white/5">
                {Object.values(availableTools).map((tool: any) => (
                  <div key={tool.id} className="flex items-start space-x-2 py-1.5 border-b border-white/5 last:border-b-0">
                    <Checkbox
                      id={`tool-${tool.id}`}
                      checked={selectedTools.includes(tool.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTools([...selectedTools, tool.id]);
                        } else {
                          setSelectedTools(selectedTools.filter(id => id !== tool.id));
                        }
                      }}
                      className="mt-1"
                    />
                    <div>
                      <Label
                        htmlFor={`tool-${tool.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {tool.name}
                      </Label>
                      <p className="text-xs text-white/60">{tool.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedTools.length === 0 && (
                <p className="text-xs text-amber-400">Select at least one tool</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="customInstructions">Custom Instructions (Optional)</Label>
              <Textarea
                id="customInstructions"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Add custom instructions for the AI in this mode..."
                rows={4}
                className="bg-zinc-900/50 border-white/10 min-h-[100px]"
              />
              <p className="text-xs text-white/60">
                These instructions will be added to the system prompt when this mode is active
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 bg-zinc-900/50 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !isFormValid}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/20 text-cyan-300 backdrop-blur-xs"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-cyan-400/20 border-t-cyan-400/80 rounded-full" />
                  <span>Creating...</span>
                </div>
              ) : (
                "Create Mode"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Provider for chat modes (different AI assistance modes)
 */
export function ChatModesCommandProvider({ children }: { children: ReactNode }) {
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [editModeData, setEditModeData] = useState<any>(null);
  const { closeCommandCenter, openCommandType } = useCommandCenter();
  const router = useRouter();
  
  const {
    activeSpace,
    updateSpace,
  } = useSpaceStore(useShallow(state => ({
    activeSpace: state.activeSpace,
    updateSpace: state.updateSpace,
  })));
  
  const reopenChatModesCommandCenter = useCallback(() => {
    openCommandType('chat-modes');
  }, [openCommandType]);
  
  const handleModeSelect = useCallback(async (modeId: string) => {
    if (!activeSpace) return;
    
    try {
      // Get the mode configuration from the CHAT_MODES constant
      const { CHAT_MODES } = await import('@/config/chat-modes');
      const modeConfig = CHAT_MODES[modeId];
      
      if (!modeConfig) return;
      
      // Extract tool IDs for storage
      const toolIds = modeConfig.tools.map(tool => tool.id);
      
      // Update the space with the new chat mode
      await updateSpace(activeSpace.id, {
        chat_mode: modeId,
        chat_mode_config: { 
          tools: toolIds,
          mcp_servers: modeConfig.mcp_servers || []
        }
      });
      
      toast.success(`Mode Changed`, {
        description: `Changed to ${modeConfig.name} mode`
      });
      
      closeCommandCenter();
      router.refresh();
    } catch (error) {
      console.error('Failed to change chat mode:', error);
      toast.error('Failed to change mode', {
        description: 'Please try again later'
      });
    }
  }, [activeSpace, updateSpace, closeCommandCenter, router]);

  const handleCreateCustomMode = useCallback(() => {
    closeCommandCenter();
    setEditModeData(null);
    setShowModeDialog(true);
  }, [closeCommandCenter]);
  
  const handleCreateDialogClose = useCallback((open: boolean) => {
    setShowModeDialog(open);
    if (!open) {
      setTimeout(() => {
        reopenChatModesCommandCenter();
      }, 150);
    }
  }, [reopenChatModesCommandCenter]);
  
  const onCreateSuccess = useCallback((modeId: string) => {
    setShowModeDialog(false);
    // The mode is already active, just close the dialog
  }, []);
  
  const baseModeCommands = useCallback(
    (): CommandOption[] => [
      {
        id: "create-custom-mode",
        name: "Create Custom Mode",
        value: "Create Custom Mode",
        description: "Create a new custom chat mode with specific tools",
        icon: <Plus className="h-4 w-4" />,
        type: "chat-modes",
        keywords: ["create", "custom", "mode", "new", "add"],
        action: handleCreateCustomMode,
      },
    ],
    [handleCreateCustomMode]
  );
  
  const chatModeCommands = useCallback(async (): Promise<CommandOption[]> => {
    try {
      // Dynamically import the CHAT_MODES to avoid circular dependencies
      const { CHAT_MODE_LIST } = await import('@/config/chat-modes');
      
      // Start with built-in modes
      const modeCommands = CHAT_MODE_LIST.map(mode => {
        const Icon = mode.icon;
        
        return {
          id: `mode-${mode.id}`,
          name: mode.name,
          value: mode.name,
          description: mode.description,
          icon: <Icon className="h-4 w-4" />,
          type: "chat-modes",
          keywords: mode.keywords || [],
          action: () => handleModeSelect(mode.id),
          rightElement: (
            <>
              {activeSpace?.chat_mode === mode.id && (
                <div className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-md text-xs">
                  Active
                </div>
              )}
            </>
          )
        };
      });
      
      // Check if current space has a custom mode
      if (activeSpace?.chat_mode && activeSpace.chat_mode.startsWith('custom-')) {
        // This is a custom mode - create a command for it
        const customModeId = activeSpace.chat_mode;
        const toolCount = activeSpace.chat_mode_config?.tools?.length || 0;
        const hasCustomInstructions = !!activeSpace.chat_mode_config?.custom_instructions;
        
        // Extract custom mode name from ID (fallback to "Custom Mode" if not found)
        // Format is typically custom-timestamp-name
        const customModeName = customModeId.split('-').slice(2).join(' ') || "Custom Mode";
        
        modeCommands.push({
          id: `mode-${customModeId}`,
          name: customModeName,
          value: customModeName,
          description: `Custom mode with ${toolCount} tools${hasCustomInstructions ? ' and custom instructions' : ''}`,
          icon: <Sparkles className="h-4 w-4" />,
          type: "chat-modes",
          keywords: ["custom", "mode", "personal", ...customModeName.split(' ')],
          action: () => handleModeSelect(customModeId),
          rightElement: (
            <div className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-md text-xs">
              Active
            </div>
          )
        });
      }
      
      return modeCommands;
    } catch (error) {
      console.error('Error loading chat mode commands:', error);
      return [];
    }
  }, [activeSpace, handleModeSelect]);

  // Register commands - we need to handle the async loading of commands
  const [commands, setCommands] = useState<CommandOption[]>([]);
  
  useEffect(() => {
    const loadCommands = async () => {
      try {
        const baseCommands = baseModeCommands();
        const modeCommands = await chatModeCommands();
        setCommands([...baseCommands, ...modeCommands]);
      } catch (error) {
        console.error('Error loading chat mode commands:', error);
        setCommands(baseModeCommands());
      }
    };
    
    loadCommands();
  }, [baseModeCommands, chatModeCommands]);
  
  useCommandRegistration(commands);
  
  return (
    <>
      <ChatModeDialogForm
        open={showModeDialog}
        onOpenChange={handleCreateDialogClose}
        onCreateSuccess={onCreateSuccess}
        editMode={editModeData}
      />
      {children}
    </>
  );
}

/**
 * Provider for background tasks commands
 */
export function BackgroundTasksCommandProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const { closeCommandCenter } = useCommandCenter();
  
  // Interface for a background task
  interface BackgroundTask {
    id: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    createdAt: number;
    completedAt?: number;
    progress?: number;
  }
  
  // Example function to create a new background task
  const createBackgroundTask = useCallback((description: string) => {
    const newTask: BackgroundTask = {
      id: `task-${Date.now()}`,
      description,
      status: 'pending',
      createdAt: Date.now(),
    };
    
    setTasks(prevTasks => [...prevTasks, newTask]);
    
    // This would be replaced with actual task creation logic
    toast.success('Task Created', {
      description: `New background task: ${description}`
    });
    
    return newTask.id;
  }, []);

  // Example function to update a task's status
  const updateTaskStatus = useCallback((taskId: string, status: 'pending' | 'in-progress' | 'completed' | 'failed', progress?: number) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status, 
              progress, 
              ...(status === 'completed' ? { completedAt: Date.now() } : {})
            } 
          : task
      )
    );
  }, []);
  
  // Example function to remove a task
  const removeTask = useCallback((taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  }, []);
  
  // Natural language parser for creating tasks (placeholder)
  const parseTaskFromNaturalLanguage = useCallback((input: string) => {
    // This is a placeholder - in a real implementation, you would use NLP
    // to extract task details from natural language
    
    const description = input.trim();
    
    if (description.length < 5) {
      return null;
    }
    
    // Create the task
    return createBackgroundTask(description);
  }, [createBackgroundTask]);
  
  // Create task command
  const createTaskCommand = useCallback((): CommandOption => {
    return {
      id: "create-background-task",
      name: "Create Background Task",
      value: "Create Background Task",
      description: "Start a new background task with natural language",
      icon: <Plus className="h-4 w-4" />,
      type: "background-tasks",
      keywords: ["task", "background", "create", "new", "schedule", "run"],
      action: () => {
        // You could show a dialog here, but for now we'll just use prompt
        const description = prompt("Describe the task you want to run in the background:");
        if (description) {
          parseTaskFromNaturalLanguage(description);
        }
      },
    };
  }, [parseTaskFromNaturalLanguage]);
  
  // Generate commands for each task
  const taskCommands = useCallback((): CommandOption[] => {
    const getStatusElementAndIcon = (task: any): { icon: React.ReactNode, statusElement: React.ReactNode } => {
      let icon;
      let statusElement;
      
      switch (task.status) {
        case 'pending':
          icon = <Clock className="h-4 w-4 text-yellow-400" />;
          statusElement = (
            <div className="px-1.5 py-0.5 text-xs font-medium rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              Pending
            </div>
          );
          break;
        case 'in-progress':
          icon = <Activity className="h-4 w-4 text-blue-400" />;
          statusElement = (
            <div className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {task.progress ? `${task.progress}%` : 'Running'}
            </div>
          );
          break;
        case 'completed':
          icon = <Check className="h-4 w-4 text-green-400" />;
          statusElement = (
            <div className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-500/20 text-green-400 border border-green-500/30">
              Completed
            </div>
          );
          break;
        case 'failed':
          icon = <X className="h-4 w-4 text-red-400" />;
          statusElement = (
            <div className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-500/20 text-red-400 border border-red-500/30">
              Failed
            </div>
          );
          break;
        default:
          icon = <Clock className="h-4 w-4 text-white/70" />;
          statusElement = (
            <div className="px-1.5 py-0.5 text-xs font-medium rounded bg-white/10 text-white/70 border border-white/10">
              Unknown
            </div>
          );
      }
      
      return { icon, statusElement };
    };
    
    return tasks.map(task => {
      // Get the icon and status element
      const { icon, statusElement } = getStatusElementAndIcon(task);
      
      // Generate unique ID for the task to use in the command
      const taskCommandId = `task-${task.id}`;
      
      // Create the task command
      return {
        id: taskCommandId,
        name: task.description,
        value: task.description,
        description: `Task created ${new Date(task.createdAt).toLocaleString()}`,
        icon,
        type: "background-tasks" as CommandType,
        keywords: ["task", "background", ...task.description.split(/\s+/)],
        action: () => {
          // Here you would show task details, but for now just log
          console.log("Task selected:", task.id);
        },
        rightElement: (
          <div className="flex items-center gap-1.5">
            {statusElement}
            <button
              onClick={(e) => { 
                e.stopPropagation();
                e.preventDefault();
                // Use the task.id directly rather than capturing it from closure
                removeTask(task.id);
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
            </button>
          </div>
        )
      };
    });
  }, [tasks, removeTask]);
  
  // Register all commands
  useCommandRegistration([createTaskCommand(), ...taskCommands()]);
  
  return <>{children}</>;
}

/**
 * Provider for AI generated suggestions
 */
export function SuggestionsCommandProvider({ children }: { children: ReactNode }) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const { closeCommandCenter } = useCommandCenter();
  
  // Interface for a suggestion
  interface Suggestion {
    id: string;
    description: string;
    source: string;
    confidence: number;
    createdAt: number;
    accepted?: boolean;
  }
  
  // Example function to add a new suggestion
  const addSuggestion = useCallback((description: string, source: string, confidence: number = 0.8) => {
    const newSuggestion: Suggestion = {
      id: `suggestion-${Date.now()}`,
      description,
      source,
      confidence,
      createdAt: Date.now(),
    };
    
    setSuggestions(prevSuggestions => [...prevSuggestions, newSuggestion]);
    
    return newSuggestion.id;
  }, []);
  
  // Example function to accept a suggestion
  const acceptSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prevSuggestions => {
      // Find the suggestion within the callback to avoid dependency on suggestions array
      const suggestion = prevSuggestions.find(s => s.id === suggestionId);
      
      // Show toast here to avoid dependency on suggestions
      if (suggestion) {
        toast.success('Suggestion Accepted', {
          description: `Now executing: ${suggestion.description}`
        });
      }
      
      return prevSuggestions.map(suggestion => 
        suggestion.id === suggestionId 
          ? { ...suggestion, accepted: true } 
          : suggestion
      );
    });
  }, []);
  
  // Example function to reject a suggestion
  const rejectSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prevSuggestions => prevSuggestions.filter(s => s.id !== suggestionId));
    
    toast.info('Suggestion Dismissed');
  }, []);
  
  // Track whether examples have been added already
  const hasAddedExamplesRef = useRef(false);
  
  // Add example suggestions on first render
  useEffect(() => {
    // This would be replaced with actual suggestions from the AI
    // Using a ref to prevent this effect from running more than once
    if (!hasAddedExamplesRef.current) {
      // Using function callbacks directly here to avoid dependency on addSuggestion
      setSuggestions(prev => [
        ...prev,
        {
          id: `suggestion-${Date.now()}`,
          description: "Create a space to organize your machine learning resources",
          source: "Based on your recent conversations about ML",
          confidence: 0.8,
          createdAt: Date.now(),
        },
        {
          id: `suggestion-${Date.now() + 1}`,
          description: "Summarize yesterday's conversation about React performance",
          source: "You seemed interested in this topic",
          confidence: 0.7,
          createdAt: Date.now(),
        }
      ]);
      
      hasAddedExamplesRef.current = true;
    }
  }, []); // Empty dependency array
  
  // Generate commands for each suggestion
  const suggestionCommands = useCallback((): CommandOption[] => {
    return suggestions.map(suggestion => {
      // Generate unique IDs to avoid stale closures
      const suggestionId = suggestion.id;
      
      return {
        id: `suggestion-${suggestionId}`,
        name: suggestion.description,
        value: suggestion.description,
        description: `${suggestion.source} • ${Math.round(suggestion.confidence * 100)}% confidence`,
        icon: <Lightbulb className="h-4 w-4 text-amber-400" />,
        type: "suggestions" as CommandType,
        keywords: ["suggestion", "recommend", ...suggestion.description.split(/\s+/)],
        action: () => {
          acceptSuggestion(suggestionId);
          closeCommandCenter();
        },
        rightElement: (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { 
                e.stopPropagation();
                e.preventDefault();
                acceptSuggestion(suggestionId);
                closeCommandCenter();
              }}
              className={cn(
                "flex items-center h-7 w-7 justify-center rounded-md p-1.5",
                "transition-all duration-200 ease-in-out",
                "bg-white/[0.03] hover:bg-green-400/20 border border-white/[0.05]",
                "text-green-400 hover:text-green-200",
                "cursor-pointer"
              )}
              title="Accept Suggestion"
            >
              <Check className="text-green-400" size={11} strokeWidth={1.5} />
            </button>
            <button
              onClick={(e) => { 
                e.stopPropagation();
                e.preventDefault();
                rejectSuggestion(suggestionId);
              }}
              className={cn(
                "flex items-center h-7 w-7 justify-center rounded-md p-1.5",
                "transition-all duration-200 ease-in-out",
                "bg-white/[0.03] hover:bg-red-400/20 border border-white/[0.05]",
                "text-red-400 hover:text-red-200",
                "cursor-pointer"
              )}
              title="Dismiss"
            >
              <X className="text-red-400" size={11} strokeWidth={1.5} />
            </button>
          </div>
        )
      };
    });
  }, [suggestions, acceptSuggestion, rejectSuggestion, closeCommandCenter]);
  
  // Register all commands
  useCommandRegistration(suggestionCommands());
  
  return <>{children}</>;
}

{/* AllCommandProviders is now moved to its own file */}