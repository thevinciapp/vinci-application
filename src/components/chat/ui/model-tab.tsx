import { Space } from '@/types/space';
import { BaseTab } from 'vinci-ui';
import { ProviderIcon } from '@lobehub/icons';
import { getModelDisplayInfo } from '@/utils/model-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Button
} from 'vinci-ui';
import { AVAILABLE_MODELS, Model, Provider } from '@/types/provider';
import { useSpaces } from '@/hooks/use-spaces';
import { toast } from '@/components/chat/ui/toast';

export interface ModelTabProps {
  space: Space | null;
}

export function ModelTab({ space }: ModelTabProps) {
  const { updateSpaceModel } = useSpaces();
  const modelInfo = space ? getModelDisplayInfo(space.model) : null;

  const handleModelSelect = async (model: Model, provider: Provider) => {
    if (!space?.id) {
      toast({
        title: "Error",
        description: "No active space selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const success = await updateSpaceModel(space.id, model.id, provider);
      if (success) {
        toast({
          title: "Success",
          description: `Model updated to ${model.name}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update model",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating model:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
          <BaseTab
            icon={modelInfo ? (
              <ProviderIcon type="color" provider={modelInfo.provider} size={18} />
            ) : (
              <div className="w-5 h-5 rounded-full bg-white/[0.03] border border-white/[0.1]" />
            )}
            label={modelInfo?.displayName || 'Select Model'}
            isActive={!!modelInfo}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="center" 
        className="w-64 mt-1.5"
        style={{ maxHeight: '60vh', overflowY: 'auto' }}
        sideOffset={4}
      >
        <DropdownMenuLabel className="text-sm font-medium">Select Model</DropdownMenuLabel>
        <div className="overflow-y-auto">
          {Object.entries(AVAILABLE_MODELS).map(([provider, models]) => (
            <DropdownMenuGroup key={provider}>
              <DropdownMenuLabel className="text-xs text-white/40">
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </DropdownMenuLabel>
              {models.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => handleModelSelect(model, provider as Provider)}
                >
                  <ProviderIcon type="color" provider={provider as Provider} size={16} className="mr-2" />
                  <div className="flex flex-col">
                    <span>{model.name}</span>
                    {model.description && (
                      <span className="text-xs text-white/40">{model.description}</span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
