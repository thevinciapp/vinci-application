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
import { DialogComponentProps } from "@/shared/types/ui";
import { Space } from "@/entities/space/model/types";
import { useSpaces } from "@/features/spaces/use-spaces";
import { useCommandCenter } from "@/features/command-center/use-command-center";
import { Provider, Model } from "../../entities/model/model/types.ts";
import { AVAILABLE_MODELS } from "../../entities/model/config/models.ts";
import { getAllChatModes } from "@/configs/chat-modes"; 
import { ProviderIcon } from '@lobehub/icons'; 

const availableProviders = Object.keys(AVAILABLE_MODELS).map(key => ({
  id: key as Provider,
  name: key.charAt(0).toUpperCase() + key.slice(1) 
}));

const availableChatModes = getAllChatModes();

export const EditSpaceDialog: React.FC<DialogComponentProps> = ({ data, onClose }) => {
  const space = data as Space;
  
  const [name, setName] = useState(space?.name || "");
  const [description, setDescription] = useState(space?.description || "");
  const [provider, setProvider] = useState<Provider>(space?.provider || availableProviders[0]?.id || 'anthropic');
  const [model, setModel] = useState<string>(space?.model || '');
  const [chatMode, setChatMode] = useState<string>(space?.chat_mode || availableChatModes[0]?.id || 'ask');

  const { updateSpace, isLoading } = useSpaces();
  const { refreshCommandCenter } = useCommandCenter();
  const { toast } = useToast();
  
  const availableModelsForProvider = AVAILABLE_MODELS[provider] || [];

  useEffect(() => {
    if (space) {
      setName(space.name || "");
      setDescription(space.description || "");
      setProvider(space.provider || availableProviders[0]?.id || 'anthropic');
      setModel(space.model || '');
      setChatMode(space.chat_mode || availableChatModes[0]?.id || 'ask');
    }
  }, [space]);

  useEffect(() => {
    if (provider && availableModelsForProvider.length > 0) {
      const currentModelAvailable = availableModelsForProvider.some(m => m.id === model);
      if (!currentModelAvailable || !model) { 
        setModel(availableModelsForProvider[0].id);
      }
    } else {
      setModel('');
    }
  }, [provider, availableModelsForProvider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!space || !space.id) return;
    
    try {
      const success = await updateSpace(space.id, {
        name,
        description,
        provider,
        model,
        chat_mode: chatMode
      });
      
      if (success) {
        refreshCommandCenter();
        
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

  if (!space || !space.id) {
    return null;
  }

  return (
    <Dialog open={!!data} onOpenChange={onClose}> 
      <DialogContent className="bg-background/80 backdrop-blur-sm border border-white/10 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Space</DialogTitle>
          <DialogDescription>
            Update the details of your space.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name Input */}
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
                onValueChange={(value) => setChatMode(value)}
              >
                <SelectTrigger id="chatMode">
                  <SelectValue placeholder="Select chat mode" />
                </SelectTrigger>
                <SelectContent>
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
              disabled={isLoading || !name || !provider || !model || !chatMode}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
