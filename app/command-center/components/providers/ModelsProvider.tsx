"use client";

import React from "react";
import { Command } from 'cmdk';
import { AVAILABLE_MODELS } from "@/config/models";
import { ProviderIcon } from "@lobehub/icons";
import { API } from '@/lib/api-client';
import { useAppState } from '@/lib/app-state-context';
import { ProviderComponentProps } from "../../types";

export const ModelsProvider: React.FC<ProviderComponentProps> = ({ searchQuery, onSelect }) => {
  const { appState, refreshAppState } = useAppState();
  
  console.log('[ModelsProvider] Initial render with activeSpace:', appState.activeSpace);
  
  const activeSpace = appState.activeSpace;
  const modelsByProvider = Object.entries(AVAILABLE_MODELS).reduce((acc, [provider, models]) => {
    const filteredModels = models.filter(model =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filteredModels.length > 0) {
      acc[provider] = filteredModels.map(model => ({ ...model, provider }));
    }
    
    return acc;
  }, {} as Record<string, any[]>);

  const handleModelSelect = async (model: any, provider: string) => {
    if (!activeSpace?.id) {
      console.error('[ModelsProvider] Cannot update model: No active space');
      return;
    }

    try {
      console.log('[ModelsProvider] Updating model to:', model.name, 'provider:', provider, 'for space:', activeSpace.id);
      
      // Check if the function exists before calling it
      if (window.electronAPI?.updateSpaceModel) {
        const result = await window.electronAPI.updateSpaceModel(activeSpace.id, model.name, provider);
        
        if (result.success) {
          // No need to call refreshAppState() since the main process already updates and broadcasts the state
          if (onSelect) {
            console.log('[ModelsProvider] Calling onSelect with model data');
            onSelect({ ...model, provider, closeOnSelect: true });
          }
        } else {
          console.error('[ModelsProvider] Error updating space model:', result.error);
        }
      } else {
        // Fallback to direct API call if electron API is not available
        console.error('[ModelsProvider] updateSpaceModel function not available in electronAPI');
        const result = await API.spaces.updateSpaceModel(activeSpace.id, model.name, provider);
        if (result.success) {
          await refreshAppState(); // Still need to refresh when using direct API
          if (onSelect) {
            console.log('[ModelsProvider] Calling onSelect with model data');
            onSelect({ ...model, provider, closeOnSelect: true });
          }
        } else {
          console.error('[ModelsProvider] Error updating space model via API:', result.error);
        }
      }
    } catch (error) {
      console.error('[ModelsProvider] Error updating space model:', error);
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
                value={model.name}
                onSelect={() => handleModelSelect(model, provider)}
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
