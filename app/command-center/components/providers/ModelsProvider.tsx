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
    if (!activeSpace?.id) return;

    try {
      console.log('Updating model to:', model.name, 'provider:', provider);
      
      const result = await API.spaces.updateSpace(activeSpace.id, {
        model: model.name,
        provider: provider
      });
      
      if (result.success) {
        await refreshAppState();
        
        if (onSelect) onSelect({ ...model, provider, closeOnSelect: true });
        
        // Force a refresh of the page to ensure all components update
        window.location.reload();
      } else {
        console.error('Error updating space model:', result.error);
      }
    } catch (error) {
      console.error('Error updating space model:', error);
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
