import { Command } from 'cmdk';
import { Cpu, Sparkles, Globe, MessageSquare, Plus, Search, ArrowRight, History } from 'lucide-react';
import { JSX } from 'react';
import { AnimatedCommandItem } from './command-item';

interface QuickAction {
    id: string;
    name: string;
    description?: string;
    icon: JSX.Element;
    callback?: () => void;
    shortcut?: string[];
    category?: 'navigation' | 'creation' | 'action';
}

interface QuickActionsListProps {
    onShowSpaces: () => void;
    onShowModels: () => void;
    onShowConversations: () => void;
    onCreateSpace?: () => void;
    onCreateConversation?: () => void;
}

export function QuickActionsList({ onShowSpaces, onShowModels, onShowConversations, onCreateSpace, onCreateConversation }: QuickActionsListProps) {

    const aiActions: QuickAction[] = [
        {
            id: 'generate',
            name: 'Generate Content',
            description: 'Create new AI-generated content',
            icon: <Sparkles className="w-4 h-4" />,
            category: 'action'
        },
        {
            id: 'continue',
            name: 'Continue Generation',
            description: 'Continue from the last AI response',
            icon: <ArrowRight className="w-4 h-4" />,
            category: 'action'
        }
    ];

    const navigationActions: QuickAction[] = [
        {
            id: 'conversations',
            name: 'Search Conversations',
            description: 'Find and switch between conversations',
            icon: <Search className="w-4 h-4" />,
            callback: onShowConversations,
            shortcut: ['⌘', 'C'],
            category: 'navigation'
        },
        {
            id: 'recent-conversations',
            name: 'Recent Conversations',
            description: 'View your latest conversations',
            icon: <History className="w-4 h-4" />,
            category: 'navigation'
        },
        {
            id: 'spaces',
            name: 'Switch Space',
            description: 'Change to a different workspace',
            icon: <Globe className="w-4 h-4" />,
            callback: onShowSpaces,
            shortcut: ['⌘', 'S'],
            category: 'navigation'
        },
        {
            id: 'models',
            name: 'Change Model',
            description: 'Select a different AI model',
            icon: <Cpu className="w-4 h-4" />,
            callback: onShowModels,
            shortcut: ['⌘', 'M'],
            category: 'navigation'
        }
    ];

    const creationActions: QuickAction[] = [
        {
            id: 'new-conversation',
            name: 'New Conversation',
            description: 'Start a fresh conversation',
            icon: <Plus className="w-4 h-4" />,
            callback: onCreateConversation,
            category: 'creation'
        },
        {
            id: 'create-space',
            name: 'Create New Space',
            description: 'Create a new workspace',
            icon: <Plus className="w-4 h-4" />,
            callback: onCreateSpace,
            category: 'creation'
        }
    ];


    const renderQuickActions = (actions: QuickAction[]) => {
        return actions.map((item, index) => (
            <AnimatedCommandItem
                key={item.id}
                value={`${item.id} ${item.name} ${item.description || ''}`}
                onSelect={() => {
                    item.callback?.();
                }}
                data-selected={index === 0 ? 'true' : undefined}
            >
                <div className="flex items-center gap-3 w-full">
                    <span className="flex-shrink-0 opacity-70 group-hover:opacity-100 group-data-[selected=true]:opacity-100 transition-opacity">
                        {item.icon}
                    </span>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <span className="font-medium transition-colors duration-200 group-hover:text-white">
                                {item.name}
                            </span>
                            {item.shortcut && (
                                <div className="flex items-center gap-2">
                                    <span className="flex gap-1 items-center">
                                        {item.shortcut.map((key, i) => (
                                            <kbd key={i} className="flex items-center justify-center w-6 h-6 rounded bg-white/10 border border-white/20 text-white/70 text-xs font-medium">
                                                {key}
                                            </kbd>
                                        ))}
                                    </span>
                                </div>
                            )}
                        </div>
                        {item.description && (
                            <p className="text-sm text-white/50 group-hover:text-white/70 transition-colors">
                                {item.description}
                            </p>
                        )}
                    </div>
                </div>
            </AnimatedCommandItem>
        ));
    };

    return (
        <>
            <Command.Group heading="Quick Actions" className="pb-4">
                {renderQuickActions(aiActions)}
            </Command.Group>

            <Command.Group heading="Navigation" className="pb-4">
                {renderQuickActions(navigationActions)}
            </Command.Group>

            <Command.Group heading="Create New" className="pb-4">
                {renderQuickActions(creationActions)}
            </Command.Group>
        </>
    );
}