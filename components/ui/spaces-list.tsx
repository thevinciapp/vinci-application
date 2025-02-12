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
}

export function SpacesList({ spaces, onSpaceSelect, activeSpaceId }: SpacesListProps) {


  if (!spaces) {
    return <div className="py-6 text-center text-sm text-white/40">Loading...</div>;
  }
  if (spaces.length === 0) {
     return <div className="py-6 text-center text-sm text-white/40">No spaces found.</div>;
  }

  return (
    <>
    <Command.Group>
      {spaces.map((space) => (  // Corrected: Removed unnecessary index
        <Command.Item
          key={space.id}
          value={`${space.id} ${space.name}`} // Use a combination of ID and name for the value
          onSelect={() => onSpaceSelect(space.id)}
          className={commandItemClass(space.id === activeSpaceId)}

        >
          <div className={`w-2 h-2 rounded-full transition-opacity duration-200 
            ${space.id === activeSpaceId ? 'bg-blue-500' : 'bg-gray-500/50'}`} 
           />
          <span className={`transition-opacity duration-200 
            ${space.id === activeSpaceId ? 'text-white' : 'text-white/75'}`}>
            {space.name}
          </span>
          {/* Display "Active" label if it's the active space */}
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