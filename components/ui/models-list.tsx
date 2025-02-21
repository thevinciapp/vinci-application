import { Command } from 'cmdk';
import { AVAILABLE_MODELS, PROVIDER_NAMES, PROVIDER_DESCRIPTIONS, type Provider } from '@/config/models';
import { commandItemClass } from './command-item';
import { ProviderIcon } from './provider-icon';
import { Space } from '@/types';
import { updateSpace } from '@/app/actions';
import { CommandBadge } from './command-badge';
import { cn } from '@/lib/utils';
import { Bot, Zap, Sparkles } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

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
            <Command.Group heading="AI Providers" className="pb-4">
                {Object.entries(PROVIDER_NAMES).map(([provider, name]) => (
                    <Command.Item
                        key={provider}
                        value={`provider ${provider} ${name}`}
                        onSelect={() => onProviderSelect(provider as Provider)}
                        className={commandItemClass(activeSpace?.provider === provider)}
                    >
                        <div className="flex items-center gap-3 w-full">
                            <div className={cn(
                                'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center',
                                activeSpace?.provider === provider ? 'bg-[#3ecfff]/10' : 'bg-white/5 group-hover:bg-white/10'
                            )}>
                                <ProviderIcon
                                    provider={provider as Provider}
                                    size={16}
                                    className={cn(
                                        'transition-colors duration-300',
                                        activeSpace?.provider === provider ? 'text-[#3ecfff]' : 'text-white/60 group-hover:text-white/80'
                                    )}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-white/90">{name}</span>
                                    <div className="flex items-center gap-2">
                                        <CommandBadge variant="count" className="flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            {AVAILABLE_MODELS[provider as Provider].length}
                                        </CommandBadge>
                                        {activeSpace?.provider === provider && (
                                            <CommandBadge variant="active">Active</CommandBadge>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-white/50">{PROVIDER_DESCRIPTIONS[provider as Provider]}</p>
                            </div>
                        </div>
                    </Command.Item>
                ))}
            </Command.Group>
        )
    }

    const models = AVAILABLE_MODELS[selectedProvider] || [];

    return (
        <Command.Group className="pb-4">
            {models.map((model) => (
                <Command.Item
                    key={model.id}
                    value={`model ${model.id} ${model.name}`}
                    onSelect={() => handleModelSelection(model.id, selectedProvider)}
                    className={commandItemClass(activeSpace?.model === model.id)}
                >
                    <div className="flex items-center gap-3 w-full">
                        <div className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center',
                            activeSpace?.model === model.id ? 'bg-[#3ecfff]/10' : 'bg-white/5 group-hover:bg-white/10'
                        )}>
                            <ProviderIcon
                                provider={selectedProvider}
                                size={16}
                                className={cn(
                                    'transition-colors duration-300',
                                    activeSpace?.model === model.id ? 'text-[#3ecfff]' : 'text-white/60 group-hover:text-white/80'
                                )}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-white/90">{model.name}</span>
                                <div className="flex items-center gap-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <CommandBadge variant="count" className="flex items-center gap-1">
                                                    {model.contextWindow.toLocaleString()}
                                                </CommandBadge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Context window size in tokens</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    {model.multimodal && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <CommandBadge variant="count" className="flex items-center gap-1">
                                                        Multimodal
                                                    </CommandBadge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Supports images and other media types</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {model.features?.includes('fast') && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <CommandBadge variant="count" className="flex items-center gap-1">
                                                        Fast
                                                    </CommandBadge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Optimized for faster response times</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {activeSpace?.model === model.id && (
                                        <CommandBadge variant="active">Active</CommandBadge>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-white/50">{model.description}</p>
                        </div>
                    </div>
                </Command.Item>
            ))}
        </Command.Group>
    )
}