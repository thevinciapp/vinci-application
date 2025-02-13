import { Command } from 'cmdk';
import { Plus } from 'lucide-react';
import { Space } from '@/types';
import { createSpace } from '@/app/actions';
import { useState } from 'react';
import { commandItemClass } from './command-item';
import { useSpaceStore } from '@/lib/stores/space-store';

interface SpacesListProps {
  spaces: Space[] | null;
  onSpaceSelect: (spaceId: string) => Promise<void>;
  activeSpaceId?: string;
  onCreateSpace?: () => void;
}

export function SpacesList({ spaces, onSpaceSelect, activeSpaceId, onCreateSpace }: SpacesListProps) {


  if (!spaces) {
    return <div className="py-6 text-center text-sm text-white/40">Loading...</div>;
  }
  if (spaces.length === 0) {
     return <div className="py-6 text-center text-sm text-white/40">No spaces found.</div>;
  }

  return (
    <>
      <Command.Group heading="Create">
        <Command.Item
          value="create new space"
          onSelect={() => onCreateSpace?.()}
          className={commandItemClass()}
        >
          <div className="w-4 h-4 text-white/60 group-hover:text-[#3ecfff]/80 transition-colors duration-300">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-white/75 transition-colors duration-300 group-hover:text-white/95">
            Create New Space
          </span>
        </Command.Item>
      </Command.Group>

      <Command.Group heading="Spaces">
        {spaces.map((space) => (
          <Command.Item
            key={space.id}
            value={`${space.id} ${space.name}`}
            onSelect={() => onSpaceSelect(space.id)}
            className={commandItemClass(space.id === activeSpaceId)}
          >
            <div className={`w-2 h-2 rounded-full transition-colors duration-300 
              ${space.id === activeSpaceId ? 'bg-[#3ecfff]' : 'bg-white/60 group-hover:bg-[#3ecfff]/80'}`} 
            />
            <span className="text-white/75 transition-colors duration-300 group-hover:text-white/95">
              {space.name}
            </span>
            {space.id === activeSpaceId && (
              <span className="ml-auto text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded-md">
                Active
              </span>
            )}
          </Command.Item>
        ))}
      </Command.Group>
    </>

  );
}