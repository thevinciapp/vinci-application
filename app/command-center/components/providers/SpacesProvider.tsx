"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Trash, Globe, Plus } from "lucide-react";
import { CommandGroup, CommandItem, CommandList, CommandSeparator, Button } from "vinci-ui";
import { useSpaceStore } from '@/stores/space-store';
import { setActiveSpace } from "@/app/actions/spaces";
import { ProviderComponentProps } from "../../types";

export const SpacesProvider: React.FC<ProviderComponentProps> = ({ searchQuery, onSelect, onAction }) => {
  const router = useRouter();
  const { spaces } = useSpaceStore();
  const filteredSpaces = (spaces ?? []).filter(space => 
    space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    space.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (space: any) => {
    try {
      // Set this space as active using server action
      await setActiveSpace(space.id);
      
      // Let the parent know something was selected to close the command center
      if (onSelect) onSelect(space);
    } catch (error) {
      console.error('Error handling space selection:', error);
    }
  };

  const handleEdit = (e: React.MouseEvent, space: any) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('edit', space);
  };

  const handleDelete = (e: React.MouseEvent, space: any) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAction) onAction('delete', space);
  };

  const handleCreate = () => {
    if (onAction) onAction('create', {});
  };

  return (
    <CommandList>
      <CommandGroup heading="Spaces">
        {filteredSpaces.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">No spaces found</p>
        ) : (
          filteredSpaces.map(space => (
            <CommandItem
              key={space.id}
              value={space.name}
              onSelect={() => handleSelect(space)}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-primary" style={{ color: space.color || 'var(--primary)' }} />
                <div>
                  <p className="font-medium">{space.name}</p>
                  {space.description && (
                    <p className="text-xs text-muted-foreground">{space.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7" 
                  onClick={(e) => handleEdit(e, space)}
                >
                  <PencilLine size={14} />
                </Button>
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/20" 
                  onClick={(e) => handleDelete(e, space)}
                >
                  <Trash size={14} />
                </Button>
              </div>
            </CommandItem>
          ))
        )}
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup>
        <CommandItem 
          onSelect={handleCreate}
          className="text-primary"
        >
          <Plus size={16} className="mr-2" />
          Create new space
        </CommandItem>
      </CommandGroup>
    </CommandList>
  );
};
