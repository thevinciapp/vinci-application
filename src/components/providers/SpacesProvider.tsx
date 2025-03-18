"use client";

import React from "react";
import { PencilLine, Trash, Globe, Plus } from "lucide-react";
import { Command } from 'cmdk';
import { Button } from "vinci-ui";
import { Space } from '@/src/types';
import { ProviderComponentProps } from "../../types";
import { useSpaces } from '@/src/hooks/use-spaces';

export const SpacesProvider: React.FC<ProviderComponentProps> = ({ searchQuery, onSelect, onAction }) => {
  const { spaces, setActiveSpaceById } = useSpaces();
  
  const filteredSpaces = spaces.filter((space) => 
    space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    space.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (space: Space): Promise<void> => {
    try {
      // Validate space object and ID
      if (!space || !space.id) {
        console.error('[SpacesProvider] Cannot select space: Invalid space or missing ID', space);
        return;
      }

      console.log('[SpacesProvider] Selecting space:', space.id, space.name);
      
      // Ensure space.id is a string and not null/undefined
      const spaceId = String(space.id);
      
      try {
        const success = await setActiveSpaceById(spaceId);
        if (success) {
          if (onSelect) onSelect({...space, closeOnSelect: true});
        } else {
          console.error('[SpacesProvider] Error setting active space');
        }
      } catch (error) {
        console.error('[SpacesProvider] Exception setting active space:', error);
      }
    } catch (error) {
      console.error('[SpacesProvider] Error handling space selection:', error);
    }
  };

  const handleEdit = (e: React.MouseEvent<HTMLButtonElement>, space: Space): void => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('edit', space);
  };

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>, space: Space): void => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('delete', space);
  };

  const handleCreate = (): void => {
    if (onAction) onAction('create', {});
  };

  return (
    <Command.List>
      <Command.Group heading="Spaces">
        {filteredSpaces.length === 0 ? (
          <Command.Empty>No spaces found</Command.Empty>
        ) : (
          filteredSpaces.map((space: Space) => (
            <Command.Item
              key={space.id}
              value={space.name}
              onSelect={() => handleSelect(space)}
            >
              <Globe size={16} style={{ color: space.color || 'var(--primary)' }} />
              <div>
                {space.name}
                {space.description && (
                  <span className="cmdk-meta">{space.description}</span>
                )}
              </div>
              <div className="cmdk-actions">
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleEdit(e, space)}
                >
                  <PencilLine size={14} />
                </Button>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDelete(e, space)}
                >
                  <Trash size={14} />
                </Button>
              </div>
            </Command.Item>
          ))
        )}
      </Command.Group>
      <Command.Separator />
      <Command.Group>
        <Command.Item onSelect={handleCreate}>
          <Plus size={16} />
          Create new space
        </Command.Item>
      </Command.Group>
    </Command.List>
  );
};
