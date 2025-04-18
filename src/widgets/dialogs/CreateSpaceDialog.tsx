import React, { useState, useEffect } from "react";
import { Button } from "@/shared/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/dialog";
import { Input } from "@/shared/components/input";
import { Label } from "@/shared/components/label";
import { Textarea } from "@/shared/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/shared/components/select";
import { useToast } from "@/shared/hooks/use-toast";
import { useSpaces } from "@/features/spaces/use-spaces";
import { useCommandCenter } from "@/features/command-center/use-command-center";
import { DialogComponentProps } from "@/shared/types/ui";
import { Space } from "@/entities/space/model/types";
import { Provider, Model } from "@/entities/model/model/types";
import { AVAILABLE_MODELS } from "@/entities";
import { getAllChatModes, ChatMode } from "@/configs/chat-modes";
import { ProviderIcon } from '@lobehub/icons'; 

const availableProviders = Object.keys(AVAILABLE_MODELS).map(key => ({
  id: key as Provider,
  name: key.charAt(0).toUpperCase() + key.slice(1) 
}));

const availableChatModes = getAllChatModes();

export const CreateSpaceDialog: React.FC<DialogComponentProps & { open: boolean }> = ({ onClose, onConfirm, open }) => {
  const initialProvider = availableProviders[0]?.id || 'anthropic';
  const initialModels = AVAILABLE_MODELS[initialProvider] || [];
  const initialModel = initialModels[0]?.id || '';
  const initialChatMode = availableChatModes[0]?.id || 'ask';

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [model, setModel] = useState<string>(initialModel);
  const [chatMode, setChatMode] = useState<ChatMode>(initialChatMode);
  
  const { createSpace, isLoading } = useSpaces();
  const { refreshCommandCenter } = useCommandCenter();
  const { toast } = useToast();

  const availableModelsForProvider = AVAILABLE_MODELS[provider] || [];

  useEffect(() => {
    if (provider && availableModelsForProvider.length > 0) {
      const currentModelAvailable = availableModelsForProvider.some(m => m.id === model);
      if (!currentModelAvailable) {
        setModel(availableModelsForProvider[0].id);
      }
    } else {
      setModel('');
    }
  }, [provider]); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const spaceData: Partial<Space> = {
        name,
        description,
        model, 
        provider, 
        chat_mode: chatMode,
        color: "#3ecfff"
      };
      
      const newSpace = await createSpace(spaceData);
      
      if (newSpace) {
        onClose();
        refreshCommandCenter();

        toast({
          title: "Success",
          description: "Space created successfully",
          variant: "success",
        });

        if (onConfirm) {
          onConfirm(newSpace); 
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background/80 backdrop-blur-sm border border-white/10 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create New Space</DialogTitle>
          <DialogDescription>
            Configure the details for your new collaborative space.
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
                placeholder="Enter space name (e.g., Project Phoenix)"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this space"
                rows={2}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="provider">Provider</Label>
              <Select 
                value={provider}
                onValueChange={(value) => setProvider(value as Provider)}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select AI provider" />
                </SelectTrigger>
                <SelectContent>
                  {/* Directly map providers as linter knows it's not empty */}
                  {availableProviders.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <ProviderIcon provider={p.id} size={16} />
                        <span>{p.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="model">Model</Label>
              <Select 
                value={model}
                onValueChange={(value) => setModel(value)}
                disabled={!provider || !availableModelsForProvider.length}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModelsForProvider && availableModelsForProvider.length > 0 ? (
                    availableModelsForProvider.map((m: Model) => ( 
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {!provider ? "Select a provider first." : `No models available for ${provider}.`}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="chatMode">Chat Mode</Label>
              <Select 
                value={chatMode}
                onValueChange={(value) => setChatMode(value as ChatMode)}
              >
                <SelectTrigger id="chatMode">
                  <SelectValue placeholder="Select chat mode" />
                </SelectTrigger>
                <SelectContent>
                  {/* Directly map chat modes as linter knows it's not empty */}
                  {availableChatModes.map(cm => {
                    const IconComponent = cm.icon;
                    return (
                      <SelectItem key={cm.id} value={cm.id}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-white/70" />
                          <span>{cm.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name || !provider || !model || !chatMode}>
              {isLoading ? "Creating..." : "Create Space"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
