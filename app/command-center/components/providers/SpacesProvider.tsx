"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Trash, Globe, Plus } from "lucide-react";
import { Command } from 'cmdk';
import { Button } from "vinci-ui";
import { API } from '@/lib/api-client';
import { Space } from '@/types';
import { useAppState } from '@/lib/app-state-context';
import { ProviderComponentProps } from "../../types";

export const SpacesProvider: React.FC<ProviderComponentProps> = ({ searchQuery, onSelect, onAction }) => {
  const { appState, refreshAppState } = useAppState();
  const spaces = appState.spaces || [];

  const filteredSpaces = spaces.filter(space => 
    space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    space.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (space: Space) => {
    try {
      const result = await API.activeSpace.setActiveSpace(space.id);
      if (result.success) {
        await refreshAppState();
        if (onSelect) onSelect({...space, closeOnSelect: true});
      } else {
        console.error('Error setting active space:', result.error);
      }
    } catch (error) {
      console.error('Error handling space selection:', error);
    }
  };

  const handleEdit = (e: React.MouseEvent, space: Space) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('edit', space);
  };

  const handleDelete = (e: React.MouseEvent, space: Space) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('delete', space);
  };

  const handleCreate = () => {
    if (onAction) onAction('create', {});
  };

  return (
    <Command.List>
      <Command.Group heading="Spaces">
        {filteredSpaces.length === 0 ? (
          <Command.Empty>No spaces found</Command.Empty>
        ) : (
          filteredSpaces.map(space => (
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
