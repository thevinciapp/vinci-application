"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CommandGroup, CommandItem, CommandList, CommandSeparator } from "vinci-ui";
import { AVAILABLE_MODELS } from "@/config/models";
import { ProviderIcon } from "@lobehub/icons";
import { API } from '@/lib/api-client';
import { Space } from '@/types';
import { ProviderComponentProps } from "../../types";

export const ModelsProvider: React.FC<ProviderComponentProps> = ({ searchQuery, onSelect }) => {
  const router = useRouter();
  const [activeSpace, setActiveSpace] = React.useState<Space | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadActiveSpace = async () => {
      try {
        // First try to get active space from Electron app state
        if (typeof window !== 'undefined' && window.electronAPI) {
          try {
            const appState = await window.electronAPI.getAppState();
            if (appState && appState.activeSpace) {
              console.log('ModelsProvider: Using cached active space from Electron');
              setActiveSpace(appState.activeSpace);
              setIsLoading(false);
              return; // Exit early if we have data
            }
          } catch (error) {
            console.log('ModelsProvider: No cached data available');
          }
        }
        
        // Fallback to API call if needed
        const result = await API.activeSpace.getActiveSpace();
        if (result.success && result.data?.activeSpace) {
          setActiveSpace(result.data.activeSpace);
        } else {
          console.error('Error fetching active space:', result.error);
          setActiveSpace(null);
        }
      } catch (error) {
        console.error('Error fetching active space:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActiveSpace();
  }, []);
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

  if (isLoading) {
    return (
      <CommandList>
        <CommandGroup>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading models...</span>
          </div>
        </CommandGroup>
      </CommandList>
    );
  }
  
  if (Object.keys(modelsByProvider).length === 0) {
    return (
      <CommandList>
        <CommandGroup>
          <p className="p-2 text-sm text-muted-foreground">No models found</p>
        </CommandGroup>
      </CommandList>
    );
  }

  return (
    <CommandList>
      {Object.entries(modelsByProvider).map(([provider, models], index, array) => (
        <React.Fragment key={provider}>
          <CommandGroup heading={provider.charAt(0).toUpperCase() + provider.slice(1)}>
            {models.map((model, idx) => (
              <CommandItem
                key={`${provider}-${idx}`}
                value={model.name}
                onSelect={async () => {
                  // Handle model selection by updating the active space's model
                  if (activeSpace?.id) {
                    try {
                      // Update the space with the new model and provider
                      const result = await API.spaces.updateSpace(activeSpace.id, {
                        model: model.name,
                        provider: provider
                      });
                      
                      if (result.success && result.data) {
                        setActiveSpace(result.data);
                        // Let the parent know something was selected to close the command center
                        if (onSelect) onSelect({ ...model, provider });
                      }
                    } catch (error) {
                      console.error('Error updating space model:', error);
                    }
                  }
                }}
                className="flex items-center justify-between py-3"
              >
                {/* @ts-ignore - Known issue with CommandItem children prop */}
                <div className="flex items-center gap-2">
                  <ProviderIcon type="color" provider={model.provider} size={18} />
                  <div className="flex flex-col">
                    <p className="font-medium">{model.name}</p>
                    {model.description && (
                      <p className="text-xs text-muted-foreground">{model.description}</p>
                    )}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          {index < array.length - 1 && <CommandSeparator />}
        </React.Fragment>
      ))}
    </CommandList>
  );
};
