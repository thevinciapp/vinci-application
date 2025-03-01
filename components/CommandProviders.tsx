"use client";

import React, { ReactNode, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { CommandOption, useCommandRegistration, CommandType } from "@/hooks/useCommandCenter";
import { Settings, Search, Plus, MessageSquare, Brain, Command } from "lucide-react";
import { AVAILABLE_MODELS, PROVIDER_NAMES, Provider } from "@/config/models";
import { Command as CdkCommand } from "cmdk";
import { toast } from 'sonner'
import Link from "next/link";
import DotSphere from "@/components/ui/space/planet-icon";
import { useConversationActions } from "@/hooks/useConversationActions";
import { useSpaceActions } from "@/hooks/useSpaceActions";
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

/**
 * Dialog for creating a new space
 */
export function CreateSpaceDialog({
  open,
  onOpenChange,
  onSuccess,
  reopenCommandCenter,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  reopenCommandCenter?: () => void;
}) {
  const [name, setName] = useState("New Space");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [model, setModel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialRenderRef = useRef(true);

  const { createSpace } = useSpaceActions({
    showToasts: true
  });

  // Reset form when dialog opens and handle reopen logic
  useEffect(() => {
    if (open) {
      setName("New Space");
      setDescription("");
      setProvider("anthropic");
      setModel(AVAILABLE_MODELS["anthropic"][0].id);
      initialRenderRef.current = false;
    } else if (!open && !isSubmitting && reopenCommandCenter && !initialRenderRef.current) {
      reopenCommandCenter();
    }
  }, [open, reopenCommandCenter, isSubmitting]);

  // Set default model when provider changes
  useEffect(() => {
    if (provider && AVAILABLE_MODELS[provider]?.length > 0) {
      setModel(AVAILABLE_MODELS[provider][0].id);
    }
  }, [provider]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      setIsSubmitting(true);
      try {
        const result = await createSpace(name, description, model, provider);
        if (result) {
          onSuccess?.();
          onOpenChange(false);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, name, description, model, provider, createSpace, onSuccess, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Space</DialogTitle>
            <DialogDescription>Create a new workspace for your conversations.</DialogDescription>
          </DialogHeader>

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
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={(value) => setProvider(value as Provider)}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="model">Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model">
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
            <Button type="submit" disabled={isSubmitting || !name || !model || !provider}>
              {isSubmitting ? "Creating..." : "Create Space"}
            </Button>
          </DialogFooter>
        </form>
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
export function SpacesCommandProvider({ children, spaces = [], activeSpace = null, conversations = [] }: { children: ReactNode, spaces?: any[], activeSpace?: any, conversations?: any[] }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const router = useRouter();
  const { openCommandCenter, closeCommandCenter } = useCommandCenter();

  const baseCommands = useCallback(
    (): CommandOption[] => [
      {
        id: "create-space",
        name: "Create New Space",
        description: "Create a new workspace",
        icon: <Plus className="h-4 w-4" />,
        shortcut: ["⌘", "N"],
        type: "spaces",
        keywords: ["create", "new", "space", "workspace", "add"],
        action: () => {
          closeCommandCenter();
          setShowCreateDialog(true);
        },
      },
    ],
    [closeCommandCenter]
  );

  type Space = {
    id: string;
    name: string;
    description?: string;
    updated_at: string;
    active_conversation_id?: string;
  };

  const handleSelectSpace = useCallback(async (spaceId: string) => {
    const { data: conversation } = await getMostRecentConversation(spaceId)
    if (!conversation) {
      router.push(`/protected/spaces/${spaceId}/conversations`);
    } else {
      router.push(`/protected/spaces/${spaceId}/conversations/${conversation.id}`);
    }
  }, []);

  const spaceCommands = useCallback((): CommandOption[] => {
    const commands = [] as CommandOption[];

    const spaceOptions = spaces
      ?.sort((a: Space, b: Space) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .map((space) => ({
        id: `space-${space.id}`,
        name: space.name,
        description: space.description || "Switch to this workspace",
        icon: (
          <div className="flex items-center gap-2">
              <DotSphere 
                size={22} 
                seed={space.id} 
                dotCount={60} 
                dotSize={0.7} 
                expandFactor={1.15} 
                transitionSpeed={400}
                highPerformance={true}
              />
          </div>
        ),
        type: "spaces" as CommandType,
        keywords: ["space", "workspace", "switch", space.name],
        action: () => {
          handleSelectSpace(space.id);
        },
      })) ?? [];
      
    return [...commands, ...spaceOptions];
  }, [spaces, activeSpace, handleSelectSpace, closeCommandCenter]);

  useCommandRegistration([...baseCommands(), ...spaceCommands()]);

  return (
    <>
      <CreateSpaceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        reopenCommandCenter={openCommandCenter}
      />
      {children}
    </>
  );
}

/**
 * Provider for conversation-related commands
 */
export function ConversationsCommandProvider({ children, conversations = [], activeConversation = null, activeSpace = null }: { children: ReactNode, conversations?: any[], activeConversation?: any, activeSpace?: any }) {
  const { closeCommandCenter } = useCommandCenter();
  const { createConversation, selectConversation } = useConversationActions({
    showToasts: true,
  });

  type Conversation = {
    id: string;
    title?: string;
    is_deleted?: boolean;
    updated_at?: string;
    [key: string]: any;
  };

  const conversationCommands = useCallback((): CommandOption[] => {
    const sortedConversations = conversations
      ?.filter((conv) => !conv.is_deleted)
      .sort((a, b) => {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return dateB - dateA;
      });

    return [
      {
        id: "new-conversation",
        name: "Start New Conversation",
        description: activeSpace
          ? `Begin a new chat in ${activeSpace.name}`
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
      ...(sortedConversations?.map((conversation: Conversation) => ({
        id: `conversation-${conversation.id}`,
        name: conversation.title || "Untitled Conversation",
        description: activeSpace
          ? `Open conversation in ${activeSpace.name}: ${conversation.title || "Untitled"}`
          : `Open conversation: ${conversation.title || "Untitled"}`,
        icon: (
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {conversation.id === activeSpace?.id && (
              <span className="text-[10px] font-medium bg-cyan-500/20 text-cyan-500 rounded-full px-2 py-0.5">
                Active
              </span>
            )}
          </div>
        ),
        type: "conversations" as CommandType,
        keywords: ["conversation", "chat", "open", conversation.title || ""],
        action: async () => {
          await selectConversation(conversation.id);
          closeCommandCenter();
        },
      })) ?? []),
    ];
  }, [activeSpace, conversations, createConversation, selectConversation, closeCommandCenter]);

  useCommandRegistration(conversationCommands());

  return <>{children}</>;
}

/**
 * Provider for model-related commands
 */
export function ModelsCommandProvider({ children, activeSpace = null }: { children: ReactNode, activeSpace?: any }) {
  const baseModelCommands = useCallback(
    (): CommandOption[] => [
      {
        id: "select-model",
        name: "Select AI Model",
        description: "Choose a different AI model",
        icon: <Brain className="h-4 w-4" />,
        type: "models",
        keywords: ["model", "ai", "select", "change", "choose"],
        action: () => {
          console.log("Opening model selection");
        },
      },
    ],
    []
  );

  const modelCommands = useCallback((): CommandOption[] => {
    const commands: CommandOption[] = [];

    Object.entries(AVAILABLE_MODELS).forEach(([providerKey, models]) => {
      const provider = providerKey as Provider;
      const providerName = PROVIDER_NAMES[provider];

      commands.push({
        id: `provider-${provider}`,
        name: providerName,
        description: `Select a model from ${providerName}`,
        icon: <Brain className="h-4 w-4" />,
        type: "models",
        keywords: ["provider", providerName.toLowerCase(), "model"],
        action: () => {
          console.log(`Selecting provider: ${providerName}`);
        },
      });

      models.forEach((model) => {
        commands.push({
          id: `model-${provider}-${model.id}`,
          name: model.name,
          description: model.description || `${providerName} model`,
          icon: <Brain className="h-4 w-4" />,
          type: "models",
          keywords: ["model", model.name.toLowerCase(), providerName.toLowerCase()],
          action: () => {
            console.log(`Selecting model: ${model.name} from ${providerName}`);
          },
        });
      });
    });

    return commands;
  }, []);

  useCommandRegistration([...baseModelCommands(), ...modelCommands()]);

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
  return (
    <ApplicationCommandProvider>
      <SpacesCommandProvider spaces={spaces} activeSpace={activeSpace}>
        <ConversationsCommandProvider 
          conversations={conversations} 
          activeConversation={activeConversation}
          activeSpace={activeSpace}
        >
          <ModelsCommandProvider activeSpace={activeSpace}>
            <ActionsCommandProvider>{children}</ActionsCommandProvider>
          </ModelsCommandProvider>
        </ConversationsCommandProvider>
      </SpacesCommandProvider>
    </ApplicationCommandProvider>
  );
}