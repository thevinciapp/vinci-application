"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Trash, Globe, Plus } from "lucide-react";
import { CommandGroup, CommandItem, CommandList, CommandSeparator, Button } from "vinci-ui";
import { API } from '@/lib/api-client';
import { Space } from '@/types';
import { ProviderComponentProps } from "../../types";

export const SpacesProvider: React.FC<ProviderComponentProps> = ({ searchQuery, onSelect, onAction }) => {
  const router = useRouter();
  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    const loadSpaces = async () => {
      try {
        // First try to get spaces from Electron app state
        if (typeof window !== 'undefined' && window.electronAPI) {
          try {
            const appState = await window.electronAPI.getAppState();
            if (appState && appState.spaces && appState.spaces.length > 0) {
              console.log('SpacesProvider: Using cached spaces from Electron');
              setSpaces(appState.spaces);
              setIsLoading(false);
              return; // Exit early if we have data
            }
          } catch (error) {
            console.log('SpacesProvider: No cached spaces available');
          }
        }
        
        // Fallback to API call if needed
        const result = await API.spaces.getSpaces();
        if (result.success) {
          setSpaces(result.data || []);
        } else {
          console.error('Error fetching spaces:', result.error);
        }
      } catch (error) {
        console.error('Error fetching spaces:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSpaces();
  }, []);

  const filteredSpaces = spaces.filter(space => 
    space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    space.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (space: Space) => {
    try {
      const result = await API.activeSpace.setActiveSpace(space.id);
      if (result.success) {
        if (onSelect) onSelect(space);
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
    <CommandList>
      <CommandGroup heading="Spaces">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading spaces...</span>
          </div>
        ) : filteredSpaces.length === 0 ? (
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
          disabled={isLoading}
        >
          <Plus size={16} className="mr-2" />
          Create new space
        </CommandItem>
      </CommandGroup>
    </CommandList>
  );
};
