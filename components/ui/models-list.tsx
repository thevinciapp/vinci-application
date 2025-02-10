import { Command } from 'cmdk';
import { AVAILABLE_MODELS, PROVIDER_NAMES, type Provider } from '@/config/models';
import { ProviderIcon } from './provider-icon';
import { Space } from '@/types';
import { updateSpace } from '@/app/actions';

interface ModelsListProps {
  selectedProvider: Provider | null;
  onProviderSelect: (provider: Provider) => void;
  onModelSelect: (modelId: string, provider: Provider) => Promise<void>; // Changed
  activeSpace: Space | null;
}

export function ModelsList({ selectedProvider, onProviderSelect, onModelSelect, activeSpace }: ModelsListProps) {

    const handleModelSelection = async (modelId: string, provider: Provider) => {
        if (!activeSpace) return;
        const updatedSpace = await updateSpace(activeSpace.id, { model: modelId, provider: provider });
        if (updatedSpace) {
            onModelSelect(modelId, provider); // Notify parent of selection
        } else {
            console.error('Failed to update space with new model.');
        }

    }

  if (!selectedProvider) {
    return (
      <Command.Group>
        {Object.entries(PROVIDER_NAMES).map(([provider, name], index) => (
          <Command.Item
            key={provider}
            value={`provider ${provider} ${name}`}
            onSelect={() => onProviderSelect(provider as Provider)}
            data-selected={index === 0 ? 'true' : undefined}
            className={`group relative flex items-center gap-3 mx-2 my-1 px-4 py-3 text-sm outline-none
              transition-all duration-200 rounded-lg backdrop-blur-sm
              data-[selected=true]:bg-white/[0.08] data-[selected=true]:border-white/20 data-[selected=true]:text-white
              hover:bg-white/[0.08] hover:border-white/20
              ${activeSpace?.provider === provider
                ? 'bg-white/[0.05] border border-white/10 shadow-[0_0_1px_rgba(255,255,255,0.1)]'
                : 'text-white/90 border border-transparent'}`}
          >
            <ProviderIcon
              provider={provider as Provider}
              size={16}
              className={`transition-opacity duration-200
                ${activeSpace?.provider === provider
                  ? 'opacity-100'
                  : 'opacity-75 group-hover:opacity-100 group-data-[selected=true]:opacity-100'}`}
            />
            <span className={`transition-all duration-200
              ${activeSpace?.provider === provider
                ? 'text-white font-medium'
                : 'text-white/90 group-hover:text-white group-data-[selected=true]:text-white'}`}>
              {name}
            </span>
            {activeSpace?.provider === provider && (
              <span className="ml-auto text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded-md">
                Active
              </span>
            )}
          </Command.Item>
        ))}
      </Command.Group>
    );
  }

  return (
    <Command.Group>
      {AVAILABLE_MODELS[selectedProvider].map((model, index) => (
        <Command.Item
          key={model.id}
          value={`model ${model.id} ${model.name}`}
          onSelect={() => handleModelSelection(model.id, selectedProvider)}
          data-selected={index === 0 ? 'true' : undefined}
          className={`group relative flex items-center gap-3 mx-2 my-1 px-4 py-3 text-sm outline-none
            transition-all duration-200 rounded-lg backdrop-blur-sm
            data-[selected=true]:bg-white/[0.08] data-[selected=true]:border-white/20 data-[selected=true]:text-white
            hover:bg-white/[0.08] hover:border-white/20
            ${activeSpace?.model === model.id
              ? 'bg-white/[0.05] border border-white/10 shadow-[0_0_1px_rgba(255,255,255,0.1)]'
              : 'text-white/90 border border-transparent'}`}
        >
          <ProviderIcon
            provider={selectedProvider}
            size={16}
            className={`transition-opacity duration-200
              ${activeSpace?.model === model.id
                ? 'opacity-100'
                : 'opacity-75 group-hover:opacity-100 group-data-[selected=true]:opacity-100'}`}
          />
          <span className={`transition-all duration-200
            ${activeSpace?.model === model.id
              ? 'text-white font-medium'
              : 'text-white/90 group-hover:text-white group-data-[selected=true]:text-white'}`}>
            {model.name}
          </span>
          {activeSpace?.model === model.id && (
            <span className="ml-auto text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded-md">
              Active
            </span>
          )}
        </Command.Item>
      ))}
    </Command.Group>
  );
}