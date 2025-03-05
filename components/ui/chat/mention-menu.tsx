"use client"

import React, { useEffect, useState, useRef } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { MentionItem, MentionItemType } from '@/types/mention';
import { cn } from '@/lib/utils';

interface MentionMenuProps {
  isVisible: boolean;
  isSearching: boolean;
  items: MentionItem[];
  onItemSelect: (item: MentionItem) => void;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
  searchTerm?: string;
}

// Helper to group items by type
const getMentionGroups = (items: MentionItem[]): Record<string, MentionItem[]> => {
  return items.reduce((groups, item) => {
    const group = groups[item.type] || [];
    group.push(item);
    groups[item.type] = group;
    return groups;
  }, {} as Record<string, MentionItem[]>);
};

// Helper to get human-readable group names
const getGroupDisplayName = (type: MentionItemType): string => {
  const displayNames: Record<MentionItemType, string> = {
    file: 'Files',
    folder: 'Folders',
    message: 'Messages',
    conversation: 'Conversations'
  };
  return displayNames[type] || type;
};

export interface MentionMenuHandle {
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
}

export const MentionMenu = React.forwardRef<MentionMenuHandle, MentionMenuProps>(({
  isVisible,
  isSearching,
  items,
  onItemSelect,
  onClose,
  anchorRef,
  searchTerm = ''
}, ref) => {
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [filteredItems, setFilteredItems] = useState<MentionItem[]>(items);
  const commandRef = useRef<HTMLDivElement>(null);
  
  // Filter items based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredItems(items);
      return;
    }
    
    const filtered = items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredItems(filtered);
    // Reset highlighted index when items change
    setHighlightedIndex(-1);
  }, [items, searchTerm]);
  
  // Create a keyboard handler function that can be passed to the input
  const handleKeyboardNavigation = (e: React.KeyboardEvent) => {
    if (!isVisible) return false;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault(); // Prevent cursor movement in textarea
      setHighlightedIndex(prev => 
        prev < filteredItems.length - 1 ? prev + 1 : 0
      );
      return true; // Signal the event was handled
    } 
    else if (e.key === 'ArrowUp') {
      e.preventDefault(); // Prevent cursor movement in textarea
      setHighlightedIndex(prev => 
        prev > 0 ? prev - 1 : filteredItems.length - 1
      );
      return true; // Signal the event was handled
    } 
    else if ((e.key === 'Enter' || e.key === 'Tab') && highlightedIndex >= 0) {
      // Only handle if we have a highlighted item
      if (filteredItems[highlightedIndex]) {
        e.preventDefault(); // Prevent default for Enter/Tab
        e.stopPropagation(); // Also stop propagation to prevent bubbling
        onItemSelect(filteredItems[highlightedIndex]);
        return true; // Signal the event was handled
      }
    }
    
    return false; // Signal the event was not handled
  };
  
  // Expose the keyboard handler to parent components via ref
  React.useImperativeHandle(ref, () => ({
    handleKeyDown: handleKeyboardNavigation
  }));
  
  // Group the filtered items by type
  const mentionGroups = getMentionGroups(filteredItems);
  
  // For positioning relative to the text input
  const popoverPositionStyles = {
    width: '320px',
    maxWidth: 'calc(100% - 20px)',
  };
  
  return (
    <Popover 
      open={isVisible} 
      onOpenChange={(open) => {
        // Only allow the parent component to control visibility
        if (!open) {
          onClose();
        }
      }}
      modal={false} // Non-modal to allow input focus to remain
    >
      {anchorRef && <PopoverAnchor asChild><span ref={anchorRef as React.RefObject<HTMLSpanElement>} /></PopoverAnchor>}
      
      <PopoverContent 
        className="p-0 rounded-t-lg border border-white/10 bg-black/90 shadow-xl backdrop-blur-lg overflow-hidden"
        side="top"
        sideOffset={5}
        align="start"
        avoidCollisions={true}
        style={popoverPositionStyles}
        collisionPadding={10}
        onPointerDownOutside={(e) => {
          // Prevent clicking outside from closing if in input field
          if (e.target && anchorRef?.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
        onOpenAutoFocus={(e) => {
          // Prevent popover from stealing focus when opened
          e.preventDefault();
        }}
      >
        <Command 
          ref={commandRef}
          className="bg-transparent" 
          shouldFilter={false}
          loop={true}
          filter={() => 1} // We handle filtering ourselves
          // Remove the onKeyDown handler here - we'll handle all keys in the input
        >
          {/* Title header */}
          <div className="border-b border-white/5 px-3 py-2 text-sm font-medium text-white/70">
            {searchTerm ? `Searching: ${searchTerm}` : 'Select a file or resource...'}
          </div>
          <CommandList className="max-h-[300px] overflow-auto">
            {isSearching ? (
              <div className="py-6 text-center">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-white/70 border-r-transparent"></div>
                <p className="mt-2 text-sm text-white/70">Searching...</p>
              </div>
            ) : Object.keys(mentionGroups).length === 0 ? (
              <CommandEmpty>No items found.</CommandEmpty>
            ) : (
              Object.entries(mentionGroups).map(([type, typeItems], groupIndex) => (
                <CommandGroup key={type} heading={getGroupDisplayName(type as MentionItemType)}>
                  {typeItems.map((item, itemIndex) => {
                    // Calculate absolute index for this item
                    let absoluteIndex = 0;
                    for (let i = 0; i < groupIndex; i++) {
                      const prevType = Object.keys(mentionGroups)[i];
                      absoluteIndex += mentionGroups[prevType].length;
                    }
                    absoluteIndex += itemIndex;
                    
                    const isHighlighted = absoluteIndex === highlightedIndex;
                    
                    return (
                      <CommandItem
                        key={item.id}
                        onSelect={() => {
                          // No event here, just call the handler
                          onItemSelect(item);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 cursor-pointer select-none hover:bg-white/10",
                          isHighlighted && "bg-white/10",
                          "hover:opacity-80 active:opacity-60 transition-all duration-200" // Add clear hover and active states
                        )}
                        value={item.name} // For keyboard accessibility
                        data-highlighted={isHighlighted}
                      >
                        <span className="flex-shrink-0 text-white/70">{item.icon}</span>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium text-white truncate">{item.name}</span>
                          {item.description && (
                            <span className="text-xs text-white/60 truncate max-w-[250px]">{item.description}</span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

// Add display name for React devtools
MentionMenu.displayName = "MentionMenu";