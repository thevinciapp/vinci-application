import { Command } from 'cmdk';
import { Cpu, Sparkles, Globe } from 'lucide-react';
import { JSX } from 'react';
import { commandItemClass } from './command-item';

interface QuickAction {
  id: string;
  name: string;
  icon: JSX.Element;
  callback?: () => void;
}

interface QuickActionsListProps {
  onShowSpaces: () => void;
  onShowModels: () => void;
}

export function QuickActionsList({ onShowSpaces, onShowModels }: QuickActionsListProps) {
  const quickActions: QuickAction[] = [
    {
      id: 'spaces',
      name: 'Spaces',
      icon: <Globe className="w-4 h-4" />,
      callback: onShowSpaces
    },
    {
      id: 'models',
      name: 'Models',
      icon: <Cpu className="w-4 h-4" />,
      callback: onShowModels
    },
    {
      id: 'generate',
      name: 'Generate Content',
      icon: <Sparkles className="w-4 h-4" />,
    },
  ];

  return (
    <Command.Group>
      {quickActions.map((item, index) => (
        <Command.Item
          key={item.id}
          value={`${item.id} ${item.name}`}
          onSelect={() => {
            item.callback?.();
          }}
          data-selected={index === 0 ? 'true' : undefined}
          className={commandItemClass()}
        >
          <span className="flex-shrink-0 opacity-70 group-hover:opacity-100 group-data-[selected=true]:opacity-100 transition-opacity">
            {item.icon}
          </span>
          <span className="flex-1 transition-colors duration-200 group-hover:text-white">
            {item.name}
          </span>
        </Command.Item>
      ))}
    </Command.Group>
  );
}