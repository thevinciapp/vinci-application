import { Command } from 'cmdk';
import { Globe2, Plus, Settings } from 'lucide-react';
import { Space } from '@/types';
import { createSpace } from '@/app/actions';
import { useState } from 'react';
import { commandItemClass } from './command-item';
import { useSpaceStore } from '@/lib/stores/space-store';
import { CommandBadge } from './command-badge';
import { cn } from '@/lib/utils';
import { ProviderIcon } from './provider-icon';
import { PROVIDER_NAMES } from '@/config/models';

interface SpacesListProps {
  spaces: Space[] | null;
  onSpaceSelect: (spaceId: string) => Promise<void>;
  activeSpaceId?: string;
  onCreateSpace?: () => void;
}

export function SpacesList({ spaces, onSpaceSelect, activeSpaceId, onCreateSpace }: SpacesListProps) {


  if (!spaces) {
    return (
      <div className="py-8 text-center">
        <Globe2 className="w-6 h-6 text-white/20 mx-auto mb-3 animate-pulse" />
        <p className="text-sm text-white/40">Loading spaces...</p>
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="py-8 text-center">
        <Globe2 className="w-6 h-6 text-white/20 mx-auto mb-3" />
        <p className="text-sm text-white/40">No spaces found</p>
        <p className="text-xs text-white/30 mt-1">Create a new space to get started</p>
      </div>
    );
  }

  return (
    <>
      <Command.Group heading="Quick Actions" className="pb-4">
        <Command.Item
          value="create new space create space"
          onSelect={() => onCreateSpace?.()}
          className={commandItemClass()}
        >
          <div className="flex items-center gap-3 w-full">
            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-[#3ecfff]/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-[#3ecfff]" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white/90">Create New Space</div>
              <p className="text-sm text-white/50">Set up a new workspace with custom models</p>
            </div>
          </div>
        </Command.Item>
      </Command.Group>

      <Command.Group heading="Your Spaces" className="pb-4">
        {spaces.map((space) => (
          <Command.Item
            key={space.id}
            value={`${space.id} ${space.name} ${space.description || ''}`}
            onSelect={() => onSpaceSelect(space.id)}
            className={commandItemClass(space.id === activeSpaceId)}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={cn(
                'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center',
                space.id === activeSpaceId ? 'bg-[#3ecfff]/10' : 'bg-white/5 group-hover:bg-white/10'
              )}>
                <Globe2 className={cn(
                  'w-4 h-4 transition-colors duration-300',
                  space.id === activeSpaceId ? 'text-[#3ecfff]' : 'text-white/60 group-hover:text-white/80'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white/90 truncate">{space.name}</span>
                  <div className="flex items-center gap-2 ml-2">
                    {space.id === activeSpaceId && <CommandBadge variant="active">Active</CommandBadge>}
                    {space.provider && (
                      <div className="w-5 h-5 flex items-center justify-center">
                  <ProviderIcon provider={space.provider} size={16} />
                </div>
                    )}
                  </div>
                </div>
                {space.description && (
                  <p className="text-sm text-white/50 truncate">{space.description}</p>
                )}
              </div>
            </div>
          </Command.Item>
        ))}
      </Command.Group>
    </>

  );
}