import { Command } from 'cmdk';
import { AVAILABLE_MODELS, PROVIDER_NAMES, type Provider } from '@/config/models';
import { commandItemClass } from './command-item';
import { ProviderIcon } from './provider-icon';
import { Space } from '@/types';
import { updateSpace } from '@/app/actions';

interface ModelsListProps {
    selectedProvider: Provider | null;
    onProviderSelect: (provider: Provider) => void;
    onModelSelect: (modelId: string, provider: Provider) => Promise<void>;
    activeSpace: Space | null;
}

export function ModelsList({ selectedProvider, onProviderSelect, onModelSelect, activeSpace }: ModelsListProps) {

     const handleModelSelection = async (modelId: string, provider: Provider) => {
        if (!activeSpace) return;
        const updatedSpace = await updateSpace(activeSpace.id, { model: modelId, provider: provider });
        if (updatedSpace) {
            onModelSelect(modelId, provider)

        } else {
            console.error('Failed to update space with new model.');
        }
    };

    if (!selectedProvider) {
        return (
            <Command.Group>
                {Object.entries(PROVIDER_NAMES).map(([provider, name]) => (
                    <Command.Item
                        key={provider}
                        value={`provider ${provider} ${name}`}
                        onSelect={() => onProviderSelect(provider as Provider)}

                        className={commandItemClass(activeSpace?.provider === provider)}
                    >
                        <ProviderIcon
                            provider={provider as Provider}
                            size={16}
                            className={`transition-opacity duration-200
                ${activeSpace?.provider === provider ? 'opacity-100' : 'opacity-75 group-hover:opacity-100'}`}
                        />
                         <span className={`transition-opacity duration-200
       ${activeSpace?.provider === provider ? 'text-white' : 'text-white/75'}`}>
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
        )
    }

    const models = AVAILABLE_MODELS[selectedProvider] || [];

    return (

        <Command.Group>
            {models.map((model) => (
                <Command.Item
                    key={model.id}
                    value={`model ${model.id} ${model.name}`}
                    onSelect={() => handleModelSelection(model.id, selectedProvider)}

                    className={commandItemClass(activeSpace?.model === model.id)}
                >
                    <ProviderIcon
                        provider={selectedProvider}
                        size={16}
                        className={`transition-opacity duration-200
                ${activeSpace?.model === model.id ? 'opacity-100' : 'opacity-75 group-hover:opacity-100'}`}
                    />
                     <span className={`transition-opacity duration-200
                ${activeSpace?.model === model.id ? 'text-white' : 'text-white/75'}`}>
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