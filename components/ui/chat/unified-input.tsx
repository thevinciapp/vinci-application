"use client";

import React, { ChangeEvent, useRef, useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/components/ui/common/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/common/dropdown-menu';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { File, Folder, Hash, FileText, Code, Database, ArrowRightFromLine, Clock } from 'lucide-react';

// Types of items that can be mentioned
type MentionItemType = 'file' | 'folder' | 'context' | 'code' | 'database' | 'history' | 'command';

interface MentionItem {
  id: string;
  type: MentionItemType;
  name: string;
  description?: string;
  icon: React.ReactNode;
}

// Sample mention items for demonstration
const SAMPLE_MENTION_ITEMS: MentionItem[] = [
  { id: 'file-1', type: 'file', name: 'README.md', description: 'Project documentation', icon: <FileText className="h-4 w-4" /> },
  { id: 'file-2', type: 'file', name: 'package.json', description: 'Project dependencies', icon: <FileText className="h-4 w-4" /> },
  { id: 'folder-1', type: 'folder', name: 'components/', description: 'UI components', icon: <Folder className="h-4 w-4" /> },
  { id: 'folder-2', type: 'folder', name: 'app/', description: 'Application routes', icon: <Folder className="h-4 w-4" /> },
  { id: 'context-1', type: 'context', name: 'User Authentication', description: 'Sign-in and auth flow', icon: <Hash className="h-4 w-4" /> },
  { id: 'code-1', type: 'code', name: 'useAutoScroll()', description: 'Scroll hook implementation', icon: <Code className="h-4 w-4" /> },
  { id: 'database-1', type: 'database', name: 'Users table', description: 'User data schema', icon: <Database className="h-4 w-4" /> },
  { id: 'history-1', type: 'history', name: 'Last conversation', description: '3 hours ago', icon: <Clock className="h-4 w-4" /> },
  { id: 'command-1', type: 'command', name: '/search', description: 'Search for documents', icon: <ArrowRightFromLine className="h-4 w-4" /> },
];

// Group items by type
const getMentionGroups = (items: MentionItem[], search: string): Record<string, MentionItem[]> => {
  const filteredItems = search.trim() 
    ? items.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) || 
        item.description?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return filteredItems.reduce((groups, item) => {
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
    context: 'Context',
    code: 'Code Snippets',
    database: 'Database',
    history: 'History',
    command: 'Commands'
  };
  return displayNames[type] || type;
};

interface UnifiedInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const UnifiedInput: React.FC<UnifiedInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  children
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const [atIndex, setAtIndex] = useState(-1);
  const mentionContainerRef = useRef<HTMLDivElement>(null);

  const focusInput = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  useHotkeys('meta+/', (e) => {
    e.preventDefault();
    focusInput();
  }, { enableOnFormTags: true });

  // Update textarea height when content changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    };

    adjustHeight();
  }, [value]);
  
  // Ensure the mention menu repositions correctly on window resize and scroll
  useEffect(() => {
    if (!showMentionMenu) return;
    
    const handleWindowChange = () => {
      // Force a re-render of the menu position when window changes
      if (textareaRef.current && atIndex >= 0) {
        const textarea = textareaRef.current;
        const textBeforeCursor = value.substring(0, atIndex);
        
        // Create a temporary mirror element to measure text position
        const mirror = document.createElement('div');
        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.wordBreak = 'break-word';
        mirror.style.padding = window.getComputedStyle(textarea).padding;
        mirror.style.width = window.getComputedStyle(textarea).width;
        mirror.style.font = window.getComputedStyle(textarea).font;
        mirror.style.lineHeight = window.getComputedStyle(textarea).lineHeight;
        
        // Insert text up to the @ symbol
        mirror.textContent = textBeforeCursor;
        
        // Add a span to mark the position
        const marker = document.createElement('span');
        marker.id = 'temp-marker';
        mirror.appendChild(marker);
        
        document.body.appendChild(mirror);
        
        // Get position of the marker
        const markerRect = document.getElementById('temp-marker')?.getBoundingClientRect();
        
        if (markerRect) {
          setMentionPosition({
            top: 0,
            left: markerRect.left - textarea.getBoundingClientRect().left
          });
        }
        
        document.body.removeChild(mirror);
      }
    };

    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);
    
    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [showMentionMenu, value, atIndex]);

  // Check for @ symbol and position the mention menu
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    onChange(e);

    // Find the last @ symbol before the cursor
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || /\s/.test(newValue[lastAtIndex - 1]))) {
      // Extract search term after @
      const searchTerm = textBeforeCursor.substring(lastAtIndex + 1);
      
      // If we're within a word that started with @
      if (!searchTerm.includes(' ')) {
        setAtIndex(lastAtIndex);
        setMentionSearch(searchTerm);
        setShowMentionMenu(true);
        
        // Position the mention menu
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          
          // Create a temporary mirror element to measure text position
          const mirror = document.createElement('div');
          mirror.style.position = 'absolute';
          mirror.style.visibility = 'hidden';
          mirror.style.whiteSpace = 'pre-wrap';
          mirror.style.wordBreak = 'break-word';
          mirror.style.padding = window.getComputedStyle(textarea).padding;
          mirror.style.width = window.getComputedStyle(textarea).width;
          mirror.style.font = window.getComputedStyle(textarea).font;
          mirror.style.lineHeight = window.getComputedStyle(textarea).lineHeight;
          
          // Insert text up to the @ symbol
          mirror.textContent = textBeforeCursor.substring(0, lastAtIndex);
          
          // Add a span to mark the position
          const marker = document.createElement('span');
          marker.id = 'marker';
          mirror.appendChild(marker);
          
          document.body.appendChild(mirror);
          
          // Get position of the marker
          const markerRect = document.getElementById('marker')?.getBoundingClientRect();
          
          if (markerRect) {
            // Calculate cursor position relative to textarea
            setMentionPosition({
              top: 0, // Not needed anymore as we use fixed positioning with absolute coordinates
              left: markerRect.left - textarea.getBoundingClientRect().left
            });
          }
          
          document.body.removeChild(mirror);
        }
        return;
      }
    }
    
    // Hide menu if we're not after an @ symbol
    setShowMentionMenu(false);
  };

  // Handle item selection from mention menu
  const handleMentionSelect = (item: MentionItem) => {
    // Insert the selected item at the @ position
    if (atIndex >= 0 && textareaRef.current) {
      const beforeAt = value.substring(0, atIndex);
      const afterSearch = value.substring(atIndex + mentionSearch.length + 1); // +1 for the @ symbol
      
      // Format: @[item.name](item.id)
      const mentionText = `@[${item.name}](${item.id}) `;
      
      const newValue = beforeAt + mentionText + afterSearch;
      
      // Update the input value
      const event = {
        target: { value: newValue }
      } as ChangeEvent<HTMLTextAreaElement>;
      
      onChange(event);
      
      // Set cursor position after the inserted mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = atIndex + mentionText.length;
          textareaRef.current.selectionStart = newPosition;
          textareaRef.current.selectionEnd = newPosition;
          textareaRef.current.focus();
        }
      }, 0);
    }
    
    setShowMentionMenu(false);
  };

  // Handle keyboard navigation in mention menu
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(false);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab' || e.key === 'Enter') {
        // These keys will be handled by the Command component
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
        }
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSubmit();
  };

  // Group and filter mention items based on search
  const mentionGroups = getMentionGroups(SAMPLE_MENTION_ITEMS, mentionSearch);

  return (
    <div className="relative">
      {children}
      
      {/* Mention dropdown menu */}
      {showMentionMenu && (
        <div 
          ref={mentionContainerRef}
          className="absolute z-50"
          style={{ 
            bottom: 'calc(100% + 10px)',
            left: mentionPosition.left,
            width: '320px'
          }}
        >
          <div className="rounded-lg border border-white/10 bg-black/90 shadow-xl backdrop-blur-lg overflow-hidden">
            <Command className="bg-transparent" shouldFilter={false}>
              <CommandInput 
                placeholder="Search..." 
                value={mentionSearch}
                onValueChange={setMentionSearch}
                className="border-b border-white/5"
              />
              <CommandList className="max-h-[300px] overflow-auto">
                {Object.keys(mentionGroups).length === 0 ? (
                  <CommandEmpty>No items found.</CommandEmpty>
                ) : (
                  Object.entries(mentionGroups).map(([type, items]) => (
                    <CommandGroup key={type} heading={getGroupDisplayName(type as MentionItemType)}>
                      {items.map((item) => (
                        <CommandItem
                          key={item.id}
                          onSelect={() => handleMentionSelect(item)}
                          className="flex items-center gap-2 px-4 py-2 cursor-pointer"
                        >
                          <span className="flex-shrink-0 text-white/70">{item.icon}</span>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">{item.name}</span>
                            {item.description && (
                              <span className="text-xs text-white/60">{item.description}</span>
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
      )}
      
      <div 
        className={`
          relative rounded-2xl rounded-t-none
          bg-white/[0.03] border border-white/[0.05]
          transition-all duration-300
          overflow-hidden backdrop-blur-xl
          ${isFocused ? 'bg-white/[0.05] border-white/[0.1]' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
              // Delay hiding the mention menu to allow for clicking on it
              setTimeout(() => {
                if (!mentionContainerRef.current?.contains(document.activeElement)) {
                  setShowMentionMenu(false);
                  setIsFocused(false);
                }
              }, 100);
            }}
            onKeyDown={handleKeyDown}
            placeholder={"Type @ to mention or insert... (Press ⌘+/ to focus)"}
            className="flex-1 text-sm resize-none min-h-[48px] max-h-[200px] px-4 py-3 focus:bg-transparent bg-transparent focus:outline-none transition-colors duration-200 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent text-white/90 placeholder:text-white/40"
            style={{ overflow: value.split('\n').length > 8 ? 'auto' : 'hidden' }}
            rows={1}
          />

          <Button
            variant="cyan"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            disabled={disabled}
            className="h-8 mr-2 rounded-xl"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};