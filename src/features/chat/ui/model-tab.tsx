import { useState } from 'react';
import { Space } from '@/entities/space/model/types';
import { BaseTab } from '@/shared/components/base-tab';
import { ProviderIcon } from '@lobehub/icons';
import { getModelDisplayInfo } from '@/entities/model/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu';
import { Button } from '@/shared/components/button';
import { Model, Provider } from '@/entities/model/model/types';
import { AVAILABLE_MODELS } from '@/entities/model/config/models';
import { useSpaces } from '@/features/spaces/use-spaces';
import { toast } from '@/shared/hooks/use-toast';
import { Settings, Info, Search } from 'lucide-react';
import { DropdownList, DropdownSection, DropdownFooterAction } from '@/shared/components/dropdown-list';

export interface ModelTabProps {
  space: Space | null;
}

export function ModelTab({ space }: ModelTabProps) {
  const { updateSpaceModel } = useSpaces();
  const modelInfo = space ? getModelDisplayInfo(space.model) : null;
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleModelSelect = async (model: Model, provider: Provider) => {
    if (!space?.id) {
      toast({
        title: "No Active Space",
        description: "Please select a space first",
        variant: "destructive",
      });
      return;
    }

    if (model.id === space.model) {
      return; // Don't update if it's the same model
    }

    setIsUpdating(model.id);
    try {
      const success = await updateSpaceModel(space.id, model.id, provider);
      if (success) {
        toast({
          title: "Model Updated",
          description: `Now using ${model.name}`,
          variant: "default",
        });
      } else {
        throw new Error("Failed to update model");
      }
    } catch (error) {
      console.error('Error updating model:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleModelAction = (action: string, modelId?: string) => {
    // Extract the provider and model id from the combined id
    if (!modelId) return;
    
    const [provider, id] = modelId.split('-');
    
    if (!provider || !id) return;
    
    toast({
      title: "Model Action",
      description: `${action} model ${id} from ${provider}`,
      variant: "default",
    });
  };

  // Filter models based on search query
  const filterModels = (models: Model[]) => {
    if (!searchQuery.trim()) return models;
    
    const query = searchQuery.toLowerCase().trim();
    return models.filter(model =>
      model.name.toLowerCase().includes(query) ||
      (model.description && model.description.toLowerCase().includes(query))
    );
  };

  // Build model sections for dropdown
  const modelSections: DropdownSection[] = [];
  let totalModelsShown = 0;

  Object.entries(AVAILABLE_MODELS).forEach(([provider, modelList]) => {
    // Ensure modelList is an array
    const models = Array.isArray(modelList) ? modelList : [];
    
    // Filter models based on search query
    const filteredModels = filterModels(models);
    totalModelsShown += filteredModels.length;
    
    if (filteredModels.length > 0) {
      modelSections.push({
        title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Models (${filteredModels.length})`,
        items: filteredModels.map((model: Model) => ({
          id: `${provider}-${model.id}`,
          isActive: space?.model === model.id,
          isDisabled: isUpdating !== null,
          onSelect: () => handleModelSelect(model, provider as Provider),
          content: (
            <div className="flex w-full">
              <div className="flex-shrink-0 mr-2.5">
                <ProviderIcon
                  type="color"
                  provider={provider as Provider}
                  size={16}
                  className={`${isUpdating === model.id ? 'opacity-50' : ''}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-white/90 truncate">{model.name}</span>
                  {space?.model === model.id && (
                    <span className="text-xs bg-white/10 text-white/80 px-1.5 py-0.5 rounded-full">
                      {isUpdating === model.id ? 'Updating...' : 'Current'}
                    </span>
                  )}
                </div>
                {model.description && (
                  <span className="text-xs text-white/60 line-clamp-1 w-full">
                    {model.description}
                  </span>
                )}
              </div>
            </div>
          )
        }))
      });
    }
  });

  // Define footer actions
  const footerActions: DropdownFooterAction[] = [
    {
      icon: <Info className="w-3.5 h-3.5" />,
      label: "Model details",
      onClick: (modelId) => handleModelAction("Viewing details for", modelId)
    },
    {
      icon: <Settings className="w-3.5 h-3.5" />,
      label: "Configure",
      onClick: (modelId) => handleModelAction("Configuring", modelId)
    }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="p-0 h-auto hover:bg-white/[0.05] rounded-sm transition-all duration-200 group"
          aria-label={modelInfo ? `Current model: ${modelInfo.displayName}` : "Select model"}
        >
          <BaseTab
            icon={modelInfo ? (
              <div className="flex items-center justify-center w-5 h-5 group-hover:scale-110 transition-transform duration-300">
                <ProviderIcon type="color" provider={modelInfo.provider} size={18} />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-white/[0.03] border border-white/[0.1] group-hover:border-white/20 transition-all duration-200" />
            )}
            label={modelInfo?.displayName || 'Select Model'}
            isActive={!!modelInfo}
          />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownList 
        headerContent={
          <div className="px-2 pt-1.5 pb-2">
            {/* Search input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-white/40" />
              </div>
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.05] rounded-md py-1.5 pl-8 pr-3 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/[0.07]"
                aria-label="Search models"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2 flex items-center text-white/40 hover:text-white/60"
                >
                  <span className="sr-only">Clear search</span>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Search feedback */}
            {searchQuery && (
              <div className="flex justify-between items-center text-xs text-white/50 mt-1.5 px-1">
                <span>
                  {totalModelsShown === 0 
                    ? 'No matches found' 
                    : `Found ${totalModelsShown} match${totalModelsShown === 1 ? '' : 'es'}`}
                </span>
                <button 
                  className="hover:text-white/70 transition-colors text-xs"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        }
        sections={modelSections}
        footerActions={footerActions}
        emptyState={
          <div className="text-sm text-white/50 flex flex-col items-center py-4">
            {searchQuery ? (
              <>
                <Search className="w-8 h-8 text-white/20 mb-2" />
                <p>No models match your search</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 text-xs" 
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
              </>
            ) : (
              <div>No models available. Please check your configuration.</div>
            )}
          </div>
        }
      />
    </DropdownMenu>
  );
}
