import { CommandModal } from '@/components/ui/command-modal';
import { Sparkles, Image, Link, FileText, Share2, Bookmark, Globe, Plus, Cpu } from 'lucide-react';
import { useQuickActionsCommand } from '@/components/ui/quick-actions-command-provider';
import { useSpaces } from '@/hooks/spaces-provider';
import { useChatState } from '@/hooks/chat-state-provider';
import { Command } from 'cmdk';

const AVAILABLE_MODELS = [
  { id: 'deepseek-r1-distill-llama-70b', name: 'Deepseek R1 70B', provider: 'groq' },
  { id: 'mixtral-8x7b-instruct', name: 'Mixtral 8x7B', provider: 'groq' },
  { id: 'gemma-7b-it', name: 'Gemma 7B', provider: 'groq' }
];

interface QuickActionsCommandProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionsCommand = ({ isOpen, onClose }: QuickActionsCommandProps) => {
  const { isExecuting, handleGlobalCommand, showSpaces, setShowSpaces, showModels, setShowModels } = useQuickActionsCommand();
  const { spaces, setActiveSpace, activeSpace } = useSpaces();
  const { batchUpdate } = useChatState();

  const handleSpaceSelect = async (spaceId: string) => {
    console.log('Selecting space:', spaceId);
    batchUpdate({ isLoading: true });
    try {
      console.log('Making request to:', `/api/spaces/${spaceId}`);
      const response = await fetch(`/api/spaces/${spaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setActive: true })
      });
      
      if (!response.ok) {
        throw new Error('Failed to set active space');
      }
      
      const space = await response.json();
      console.log('Received space data:', space);
      setActiveSpace(space);
    } catch (error) {
      console.error('Error switching space:', error);
      batchUpdate({ error: 'Failed to switch space' });
    } finally {
      batchUpdate({ isLoading: false });
      onClose();
    }
  };

  const handleCreateSpace = async () => {
    batchUpdate({ isLoading: true });
    try {
      const response = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Space ${spaces.length + 1}`,
          description: 'New space',
          model: 'deepseek-r1-distill-llama-70b',
          provider: 'groq'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create space');
      }

      const newSpace = await response.json();
      setActiveSpace(newSpace);
    } catch (error) {
      console.error('Error creating space:', error);
      batchUpdate({ error: 'Failed to create space' });
    } finally {
      batchUpdate({ isLoading: false });
      onClose();
    }
  };

  const handleModelSelect = async (modelId: string, provider: string) => {
    if (!activeSpace) return;
    batchUpdate({ isLoading: true });

    try {
      const response = await fetch(`/api/spaces/${activeSpace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          provider: provider
        })
      });

      const updatedSpace = await response.json();
      if (!updatedSpace.error) {
        setActiveSpace(updatedSpace);
      }
    } catch (error) {
      console.error('Error updating model:', error);
      batchUpdate({ error: 'Failed to update model' });
    } finally {
      batchUpdate({ isLoading: false });
      onClose();
    }
  };

  const quickActions = [
    { 
      id: 'spaces',
      name: 'Switch Space',
      icon: <Globe className="w-4 h-4" />,
      shortcut: ['⌘', 'S'],
      callback: () => setShowSpaces(true)
    },
    {
      id: 'models',
      name: 'Switch Model',
      icon: <Cpu className="w-4 h-4" />,
      shortcut: ['⌘', 'M'],
      callback: () => setShowModels(true)
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

  return (
    <CommandModal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setShowSpaces(false);
        setShowModels(false);
      }}
      placeholder={showSpaces ? "Search spaces..." : showModels ? "Search models..." : "Search quick actions..."}
    >
      <Command.List>
        {!showSpaces && !showModels ? (
          <>
            {quickActions.map((item) => (
              <Command.Item
                key={item.id}
                value={item.name}
                onSelect={() => {
                  item.callback?.();
                }}
                className={`
                  group relative flex items-center gap-3 rounded-md px-4 py-3 text-sm text-white/90 outline-none
                  transition-all duration-200
                  hover:bg-white/[0.08] aria-selected:bg-white/[0.12]
                `}
              >
                <span className="flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                  {item.icon}
                </span>
                <span className="flex-1">
                  {item.name}
                </span>
                {item.shortcut?.length && (
                  <span className="flex items-center gap-1">
                    {item.shortcut.map((key, index) => (
                      <kbd
                        key={`${item.id}-shortcut-${index}`}
                        className="rounded bg-white/5 px-2 py-1 text-[10px] font-medium text-white/40 border border-white/10 transition-colors group-hover:bg-white/10"
                      >
                        {key}
                      </kbd>
                    ))}
                  </span>
                )}
              </Command.Item>
            ))}
          </>
        ) : showSpaces ? (
          <>
            <Command.Item
              value="back"
              onSelect={() => setShowSpaces(false)}
              className="group relative flex items-center gap-3 rounded-md px-4 py-3 text-sm text-white/90 outline-none
                transition-all duration-200 hover:bg-white/[0.08] aria-selected:bg-white/[0.12]"
            >
              <span className="text-white/60">←</span>
              <span>Back to Quick Actions</span>
            </Command.Item>

            <div className="my-2 h-px bg-white/[0.08]" />

            {spaces.map((space) => (
              <Command.Item
                key={space.id}
                value={space.name}
                onSelect={() => handleSpaceSelect(space.id)}
                className="group relative flex items-center gap-3 rounded-md px-4 py-3 text-sm text-white/90 outline-none
                  transition-all duration-200 hover:bg-white/[0.08] aria-selected:bg-white/[0.12]"
              >
                <div className={`w-2 h-2 rounded-full ${space.id === activeSpace?.id ? 'bg-blue-500' : 'bg-white/20'}`} />
                <span>{space.name}</span>
              </Command.Item>
            ))}

            <div className="my-2 h-px bg-white/[0.08]" />

            <Command.Item
              value="new-space"
              onSelect={handleCreateSpace}
              className="group relative flex items-center gap-3 rounded-md px-4 py-3 text-sm text-white/90 outline-none
                transition-all duration-200 hover:bg-white/[0.08] aria-selected:bg-white/[0.12]"
            >
              <Plus className="w-4 h-4 text-white/70" />
              <span>Create New Space</span>
            </Command.Item>
          </>
        ) : (
          <>
            <Command.Item
              value="back"
              onSelect={() => setShowModels(false)}
              className="group relative flex items-center gap-3 rounded-md px-4 py-3 text-sm text-white/90 outline-none
                transition-all duration-200 hover:bg-white/[0.08] aria-selected:bg-white/[0.12]"
            >
              <span className="text-white/60">←</span>
              <span>Back to Quick Actions</span>
            </Command.Item>

            <div className="my-2 h-px bg-white/[0.08]" />

            {AVAILABLE_MODELS.map((model) => (
              <Command.Item
                key={model.id}
                value={model.name}
                onSelect={() => handleModelSelect(model.id, model.provider)}
                className="group relative flex items-center gap-3 rounded-md px-4 py-3 text-sm text-white/90 outline-none
                  transition-all duration-200 hover:bg-white/[0.08] aria-selected:bg-white/[0.12]"
              >
                <div className={`w-2 h-2 rounded-full ${model.id === activeSpace?.model ? 'bg-blue-500' : 'bg-white/20'}`} />
                <span>{model.name}</span>
              </Command.Item>
            ))}
          </>
        )}
      </Command.List>
    </CommandModal>
  );
};
