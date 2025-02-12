import { Command } from 'cmdk';
import { Cpu, Sparkles, Globe, MessageSquare, Plus, Search, ArrowRight, History } from 'lucide-react';
import { JSX } from 'react';
import { commandItemClass } from './command-item';

interface QuickAction {
    id: string;
    name: string;
    icon: JSX.Element;
    callback?: () => void;
    shortcut?: string[]; // Keep shortcut as an array of strings
}

interface QuickActionsListProps {
    onShowSpaces: () => void;
    onShowModels: () => void;
    onShowConversations: () => void;
}

export function QuickActionsList({ onShowSpaces, onShowModels, onShowConversations }: QuickActionsListProps) {

    const currentConversationActions: QuickAction[] = [
        {
            id: 'generate',
            name: 'Generate Content',
            icon: <Sparkles className="w-4 h-4" />,
        },
        {
            id: 'continue',
            name: 'Continue Generation',
            icon: <ArrowRight className="w-4 h-4" />,
        }
    ];

    const conversationActions: QuickAction[] = [

        {
            id: 'conversations',
            name: 'Search Conversations',
            icon: <Search className="w-4 h-4" />,
            callback: onShowConversations,
            shortcut: ['Meta', 'C']
        },
        {
            id: 'new-conversation',
            name: 'New Conversation',
            icon: <Plus className="w-4 h-4" />
        },
        {
            id: 'recent-conversations',
            name: 'Recent Conversations',
            icon: <History className="w-4 h-4" />
        }
    ];

    const spaceActions: QuickAction[] = [
        {
            id: 'spaces',
            name: 'Spaces',
            icon: <Globe className="w-4 h-4" />,
            callback: onShowSpaces,
            shortcut: ['Meta', 'S']
        },
        {
            id: 'models',
            name: 'Models',
            icon: <Cpu className="w-4 h-4" />,
            callback: onShowModels,
             shortcut: ['Meta', 'M']
        },
    ];


    const renderQuickActions = (actions: QuickAction[]) => {
        return actions.map((item, index) => (
            <Command.Item
                key={item.id}
                value={`${item.id} ${item.name}`}
                onSelect={() => {
                    item.callback?.();
                }}
                 data-selected={index === 0 ? 'true' : undefined} // Select first by default
                className={commandItemClass()}
            >
                <span className="flex-shrink-0 opacity-70 group-hover:opacity-100 group-data-[selected=true]:opacity-100 transition-opacity">
                    {item.icon}
                </span>
               <span className="flex-1 transition-colors duration-200 group-hover:text-white">
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
            </Command.Item>
        ));
    };

    return (
        <>
            <Command.Group heading="Current Conversation">
                {renderQuickActions(currentConversationActions)}
            </Command.Group>

             <Command.Group heading="Conversations">
                {renderQuickActions(conversationActions)}
            </Command.Group>

            <Command.Group heading="Space">
                {renderQuickActions(spaceActions)}
            </Command.Group>

        </>
    );
}