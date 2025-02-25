import { Command } from 'cmdk';
import { Plus, Settings, Edit2 } from 'lucide-react';
import PlanetIcon from './planet-icon';
import { Space } from '@/types';
import { createSpace } from '@/app/actions';
import { useState } from 'react';
import { commandItemClass } from './command-item';
import { useSpaceStore } from '@/lib/stores/space-store';
import { CommandBadge } from './command-badge';
import { cn } from '@/lib/utils';
import { ProviderIcon } from './provider-icon';
import { PROVIDER_NAMES } from '@/config/models';
import { DeleteSpaceDialog } from './delete-space-dialog';

interface SpacesListProps {
  spaces: Space[] | null;
  onSpaceSelect: (spaceId: string) => Promise<void>;
  activeSpaceId?: string;
  onCreateSpace?: () => void;
  onEditSpace?: (space: Space) => void;
}

export function SpacesList({ spaces, onSpaceSelect, activeSpaceId, onCreateSpace, onEditSpace }: SpacesListProps) {
  if (!spaces) {
    return (
      <div className="py-8 text-center">
        <PlanetIcon size={24} className="mx-auto mb-3 animate-pulse opacity-20" />
        <p className="text-sm text-white/40">Loading spaces...</p>
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="py-8 text-center">
        <PlanetIcon size={24} className="mx-auto mb-3 opacity-20" />
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
            <PlanetIcon size={20} seed={space.id} />
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
                    {!space.id.includes('default') && (
                      <>
                        <div className="flex items-center justify-center w-5 h-5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditSpace?.(space);
                            }}
                            className="flex items-center justify-center text-white/50 hover:text-white/90 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                        {spaces.length > 1 && (
                          <div className="flex items-center justify-center w-5 h-5">
                            <DeleteSpaceDialog spaceId={space.id} spaceName={space.name} />
                          </div>
                        )}
                      </>
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