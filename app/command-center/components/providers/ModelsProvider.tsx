"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Command } from 'cmdk';
import { AVAILABLE_MODELS } from "@/config/models";
import { ProviderIcon } from "@lobehub/icons";
import { API } from '@/lib/api-client';
import { Space } from '@/types';
import { useAppState } from '@/lib/app-state-context';
import { ProviderComponentProps } from "../../types";

export const ModelsProvider: React.FC<ProviderComponentProps> = ({ searchQuery, onSelect }) => {
  const router = useRouter();
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
      
      const result = await API.spaces.updateSpace(activeSpace.id, {
        model: model.name,
        provider: provider
      });
      
      console.log('[ModelsProvider] API update result:', result);
      
      if (result.success) {
        console.log('[ModelsProvider] Model updated successfully, refreshing app state...');
        await refreshAppState();
        console.log('[ModelsProvider] App state refreshed after model update');
        
        if (onSelect) {
          console.log('[ModelsProvider] Calling onSelect with model data');
          onSelect({ ...model, provider, closeOnSelect: true });
        }
        
        // Force a UI update by dispatching a custom event
        console.log('[ModelsProvider] Dispatching modelUpdated event');
        window.dispatchEvent(new CustomEvent('modelUpdated', { 
          detail: { model: model.name, provider, spaceId: activeSpace.id }
        }));
      } else {
        console.error('[ModelsProvider] Error updating space model:', result.error);
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
