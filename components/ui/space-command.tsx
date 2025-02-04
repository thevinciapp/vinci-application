import React from 'react';
import { CommandModal } from '@/components/ui/command-modal';
import { Plus, Trash2 } from 'lucide-react';
import { useSpaceStore } from '@/store/spaceStore';
import { useSpaceCommand } from '@/components/ui/space-command-provider';

interface SpaceCommandProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpaceCommand({ isOpen, onClose }: SpaceCommandProps) {
  const { isExecuting, handleGlobalCommand, setCurrentSpace, spaces, currentSpace } = useSpaceCommand();

  const spaceItems = [
    ...spaces.map((space) => ({
      key: space.id,
      label: space.name,
      icon: <div className="w-2 h-2 rounded-full bg-blue-500" />,
      onSelect: () => handleGlobalCommand(() => {
        setCurrentSpace(space);
      }),
      className: currentSpace?.id === space.id ? 'bg-white/10' : ''
    }))
  ];

  return (
    <CommandModal
      isOpen={isOpen}
      onClose={onClose}
      position="top"
      items={spaceItems.map(item => ({
        ...item,
        className: `flex items-center gap-3 px-4 py-2 text-sm ${
          isExecuting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer'
        }`
      }))}
      searchPlaceholder="Search spaces..."
    />
  );
}
