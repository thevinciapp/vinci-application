import React from "react";
import { Command } from 'cmdk';
import { ProviderIcon } from "@lobehub/icons";
import { useSpaces } from "features/spaces/use-spaces";
import { toast } from "shared/hooks/use-toast";
import { ProviderComponentProps, Model, Provider, AvailableModel } from "entities/model/model/types";
import { AVAILABLE_MODELS } from "entities/model/config/models";

export const ModelsProvider: React.FC<ProviderComponentProps> = ({ searchQuery = '', onSelect }) => {
  const { activeSpace, updateSpaceModel } = useSpaces();
  
  const modelsByProvider = Object.entries(AVAILABLE_MODELS).reduce<Record<string, Model[]>>((acc, [providerName, models]) => {
    const provider = providerName as Provider;
    const filteredModels = (models as ReadonlyArray<AvailableModel>).filter(model =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filteredModels.length > 0) {
      acc[provider] = filteredModels.map(model => ({ ...model, provider }));
    }
    
    return acc;
  }, {});

  const handleModelSelect = async (model: Model, provider: Provider) => {
    if (!activeSpace?.id) {
      console.error('[ModelsProvider] Cannot update model: No active space');
      toast({
        title: "Error",
        description: "No active space selected",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('[ModelsProvider] Updating model to:', model.id, 'provider:', provider, 'for space:', activeSpace.id);
      
      const success = await updateSpaceModel(activeSpace.id, model.id, provider);
      
      if (success) {
        toast({
          title: "Success",
          description: `Model updated to ${model.name}`,
          variant: "default",
        });
        
        if (onSelect) {
          onSelect({ ...model, provider, closeOnSelect: true });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to update model",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[ModelsProvider] Error updating space model:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  if (Object.keys(modelsByProvider).length === 0) {
    return (
      <Command.List>
        <Command.Empty>No models found</Command.Empty>
      </Command.List>
    );
  }

  return (
    <Command.List>
      {Object.entries(modelsByProvider).map(([provider, models], index, array) => (
        <React.Fragment key={provider}>
          <Command.Group heading={provider.charAt(0).toUpperCase() + provider.slice(1)}>
            {models.map((model, idx) => (
              <Command.Item
                key={`${provider}-${idx}`}
                value={model.id}
                onSelect={() => handleModelSelect(model, provider as Provider)}
              >
                <ProviderIcon type="color" provider={model.provider} size={18} />
                <div>
                  {model.name}
                  {model.description && (
                    <span className="cmdk-meta">{model.description}</span>
                  )}
                </div>
              </Command.Item>
            ))}
          </Command.Group>
          {index < array.length - 1 && <Command.Separator />}
        </React.Fragment>
      ))}
    </Command.List>
  );
};
