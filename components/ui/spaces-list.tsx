import { Command } from 'cmdk';
import { Plus } from 'lucide-react';
import { Space } from '@/types';

interface SpacesListProps {
  spaces: Space[];
  onSpaceSelect: (spaceId: string) => void;
  onCreateSpace: () => void;
}

export function SpacesList({ spaces, onSpaceSelect, onCreateSpace }: SpacesListProps) {
  const createSpaceButton = (
    <Command.Item
      value="new-space create-space"
      onSelect={onCreateSpace}
      className="flex items-center gap-2 px-4 py-2 text-sm text-white/90 bg-[#5E6AD2] hover:bg-[#4F5ABF] rounded-md transition-colors
        border border-white/10 backdrop-blur-xl w-full max-w-[200px] justify-center font-medium"
    >
      <Plus className="w-4 h-4" />
      <span>Create New Space</span>
    </Command.Item>
  );

  if (spaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-white/40">
        <p className="text-sm mb-4">No spaces found</p>
        {createSpaceButton}
      </div>
    );
  }

  return (
    <Command.Group>
      {spaces.map((space, index) => (
        <Command.Item
          key={space.id}
          value={`space ${space.id} ${space.name}`}
          onSelect={() => onSpaceSelect(space.id)}
          data-selected={index === 0 ? 'true' : undefined}
          className={`group relative flex items-center gap-3 mx-2 my-1 px-4 py-3 text-sm outline-none
            transition-all duration-200 rounded-lg backdrop-blur-sm
            data-[selected=true]:bg-white/[0.08] data-[selected=true]:border-white/20 data-[selected=true]:text-white
            hover:bg-white/[0.08] hover:border-white/20
            ${space.isActive 
              ? 'bg-white/[0.05] border border-white/10 shadow-[0_0_1px_rgba(255,255,255,0.1)]' 
              : 'text-white/90 border border-transparent'}`}
        >
          <div className={`w-2 h-2 rounded-full transition-all duration-200 
            ${space.isActive 
              ? 'bg-blue-500 ring-2 ring-blue-500/20' 
              : 'bg-white/20 group-hover:bg-white/40 group-data-[selected=true]:bg-white/40'}`} />
          <span className={`transition-all duration-200 
            ${space.isActive 
              ? 'text-white font-medium' 
              : 'text-white/90 group-hover:text-white group-data-[selected=true]:text-white'}`}>
            {space.name}
          </span>
          {space.isActive && (
            <span className="ml-auto text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded-md">
              Active
            </span>
          )}
        </Command.Item>
      ))}
    </Command.Group>
  );
} 