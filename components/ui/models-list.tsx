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
                            className={`transition-colors duration-300 
                                ${activeSpace?.provider === provider ? 'text-[#3ecfff]' : 'text-white/60 group-hover:text-[#3ecfff]/80'}`}
                        />
                        <span className="text-white/75 transition-colors duration-300 group-hover:text-white/95">
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
                        className={`transition-colors duration-300 
                            ${activeSpace?.model === model.id ? 'text-[#3ecfff]' : 'text-white/60 group-hover:text-[#3ecfff]/80'}`}
                    />
                    <span className="text-white/75 transition-colors duration-300 group-hover:text-white/95">
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