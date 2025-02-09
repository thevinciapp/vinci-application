import { Command } from 'cmdk';
import { Globe, Cpu, Sparkles, Image, Link, FileText, Share2, Bookmark } from 'lucide-react';
import { JSX } from 'react';

interface QuickAction {
  id: string;
  name: string;
  icon: JSX.Element;
  shortcut?: string[];
  callback?: () => void;
}

interface QuickActionsListProps {
  onShowSpaces: () => void;
  onShowModels: () => void;
  handleGlobalCommand: (callback: () => void) => void;
}

export function QuickActionsList({ onShowSpaces, onShowModels, handleGlobalCommand }: QuickActionsListProps) {
  const quickActions: QuickAction[] = [
    { 
      id: 'spaces',
      name: 'Spaces',
      icon: <Globe className="w-4 h-4" />,
      shortcut: ['⌘', 'S'],
      callback: onShowSpaces
    },
    {
      id: 'models',
      name: 'Models',
      icon: <Cpu className="w-4 h-4" />,
      shortcut: ['⌘', 'M'],
      callback: onShowModels
    },
    { 
      id: 'generate',
      name: 'Generate Content',
      icon: <Sparkles className="w-4 h-4" />,
      callback: () => handleGlobalCommand(() => console.log('Generate'))
    },
    { 
      id: 'image',
      name: 'Create Image',
      icon: <Image className="w-4 h-4" />,
      callback: () => handleGlobalCommand(() => console.log('Image'))
    },
    { 
      id: 'link',
      name: 'Add Link',
      icon: <Link className="w-4 h-4" />,
      callback: () => handleGlobalCommand(() => console.log('Link'))
    },
    { 
      id: 'document',
      name: 'New Document',
      icon: <FileText className="w-4 h-4" />,
      callback: () => handleGlobalCommand(() => console.log('Doc'))
    },
    { 
      id: 'share',
      name: 'Share',
      icon: <Share2 className="w-4 h-4" />,
      callback: () => handleGlobalCommand(() => console.log('Share'))
    },
    { 
      id: 'bookmark',
      name: 'Bookmark',
      icon: <Bookmark className="w-4 h-4" />,
      callback: () => handleGlobalCommand(() => console.log('Bookmark'))
    },
  ];

  const commandItemBaseClass = `group relative flex items-center gap-3 mx-2 my-1 px-4 py-3 text-sm text-white/90 outline-none
    transition-all duration-200 rounded-lg backdrop-blur-sm border border-transparent
    data-[selected=true]:bg-white/[0.08] data-[selected=true]:border-white/20 data-[selected=true]:text-white
    hover:bg-white/[0.08] hover:border-white/20`;

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
          className={commandItemBaseClass}
        >
          <span className="flex-shrink-0 opacity-70 group-hover:opacity-100 group-data-[selected=true]:opacity-100 transition-opacity">
            {item.icon}
          </span>
          <span className="flex-1 transition-colors duration-200 group-hover:text-white">
            {item.name}
          </span>
          {item.shortcut?.length && (
            <span className="flex items-center gap-1">
              {item.shortcut.map((key, index) => (
                <kbd
                  key={`${item.id}-shortcut-${index}`}
                  className="flex items-center justify-center w-6 h-6 rounded bg-white/5 text-[10px] font-medium text-white/40 border border-white/10 transition-colors group-hover:bg-white/10 group-data-[selected=true]:bg-white/10"
                >
                  {key}
                </kbd>
              ))}
            </span>
          )}
        </Command.Item>
      ))}
    </Command.Group>
  );
} 