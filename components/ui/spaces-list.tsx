// components/ui/spaces-list.tsx
import { Command } from 'cmdk';
import { Plus } from 'lucide-react';
import { Space } from '@/types';
import { createSpace } from '@/app/actions';
import { useState } from 'react';
import { commandItemClass } from './command-item';

interface SpacesListProps {
  spaces: Space[] | null; // Allow null
  onSpaceSelect: (spaceId: string) => Promise<void>;
  activeSpaceId?: string;
}

export function SpacesList({ spaces, onSpaceSelect, activeSpaceId }: SpacesListProps) {

    const [showForm, setShowForm] = useState(false);
    const [newSpaceName, setNewSpaceName] = useState('');

  const handleCreateSpace = async () => {
    if (newSpaceName.trim() !== '') {

      const newSpace = await createSpace(newSpaceName, '', 'mixtral-8x7b-instruct', 'groq', true);
      if (newSpace) {
        onSpaceSelect(newSpace.id); // Select new space and refetch data
        setShowForm(false);
        setNewSpaceName('');
      }
    }
  };

  if (!spaces) {
    return <div className="py-6 text-center text-sm text-white/40">Loading...</div>;
  }

  return (
    <>
    <Command.Group>
      {spaces.map((space, index) => (
        <Command.Item
          key={space.id}
          value={`space ${space.id} ${space.name}`}
          onSelect={() => {
                onSpaceSelect(space.id)
            }}
          data-selected={index === 0 ? 'true' : undefined}
          className={commandItemClass(space.id === activeSpaceId)}
        >
          <div className={`w-2 h-2 rounded-full transition-opacity duration-200 
            ${space.id === activeSpaceId ? 'bg-blue-500' : 'bg-gray-500/50'}`} 
          />
          <span className={`transition-opacity duration-200 
            ${space.id === activeSpaceId ? 'text-white' : 'text-white/75'}`}>
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
     {showForm ? (
        <div className="mx-2 my-1 px-4 py-3">
          <input
            type="text"
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            placeholder="Enter space name..."
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateSpace();
              }
            }}
            autoFocus
          />
        </div>
      ) : (
        <Command.Item
          value="new-space create-space"
          onSelect={() => setShowForm(true)}
          className={commandItemClass()}
        >
          <Plus className="w-4 h-4" />
          <span>Create New Space</span>
        </Command.Item>
      )}
    </>

  );
}