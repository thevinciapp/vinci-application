import React, { useRef } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { MentionItem, MentionItemType } from '@/types/mention';

interface MentionMenuProps {
  isVisible: boolean;
  isSearching: boolean;
  items: MentionItem[];
  onItemSelect: (item: MentionItem) => void;
  onClose: () => void;
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

export const MentionMenu: React.FC<MentionMenuProps> = ({
  isVisible,
  isSearching,
  items,
  onItemSelect,
  onClose
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mentionGroups = getMentionGroups(items);
  
  if (!isVisible) return null;
  
  return (
    <div 
      ref={containerRef}
      className="absolute z-[9999]"
      style={{ 
        bottom: 'calc(100% + 0px)',
        left: '0',
        width: '320px',
        maxWidth: 'calc(100% - 20px)',
        transform: 'translateY(38px)',
      }}
    >
      <div className="rounded-t-lg border border-white/10 bg-black/90 shadow-xl backdrop-blur-lg overflow-hidden">
        <Command 
          className="bg-transparent" 
          shouldFilter={false}
          loop={true}
          filter={() => 1} // We handle filtering elsewhere
          onKeyDown={(e) => {
            // Forward key events from Command to textarea
            if (e.key === "Escape") {
              onClose();
            }
          }}
        >
          {/* Title header */}
          <div className="border-b border-white/5 px-3 py-2 text-sm font-medium text-white/70">
            Select a file or resource...
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
              Object.entries(mentionGroups).map(([type, typeItems]) => (
                <CommandGroup key={type} heading={getGroupDisplayName(type as MentionItemType)}>
                  {typeItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      onSelect={() => onItemSelect(item)}
                      className="flex items-center gap-2 px-4 py-2 cursor-pointer select-none hover:bg-white/10"
                      value={item.name} // Help with keyboard selection
                      onClick={() => onItemSelect(item)} // Explicitly handle clicks
                    >
                      <span className="flex-shrink-0 text-white/70">{item.icon}</span>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium text-white truncate">{item.name}</span>
                        {item.description && (
                          <span className="text-xs text-white/60 truncate max-w-[250px]">{item.description}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </div>
    </div>
  );
};