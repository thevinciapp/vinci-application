import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from 'shared/components/dropdown-menu';
import { Button } from 'shared/components/button';

export interface DropdownItem {
  id: string;
  content: React.ReactNode;
  isActive?: boolean;
  isDisabled?: boolean;
  onSelect?: () => void;
}

export interface DropdownSection {
  title: string;
  items: DropdownItem[];
  actionButton?: {
    icon: React.ReactNode;
    label?: string;
    onClick: () => void;
    isLoading?: boolean;
    ariaLabel: string;
  };
}

export interface DropdownFooterAction {
  icon: React.ReactNode;
  label: string;
  onClick: (itemId: string) => void;
  variant?: 'default' | 'destructive';
  isDisabled?: boolean | ((itemId: string) => boolean);
  shouldShow?: (itemId: string) => boolean;
}

export interface DropdownListProps {
  sections: DropdownSection[];
  footerActions: DropdownFooterAction[];
  emptyState?: React.ReactNode;
  className?: string;
  headerContent?: React.ReactNode;
}

export function DropdownList({
  sections,
  footerActions,
  emptyState,
  className = '',
  headerContent,
}: DropdownListProps) {
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [keyboardControlActive, setKeyboardControlActive] = useState(false);
  const itemsRef = useRef<Map<string, HTMLElement>>(new Map());
  const allItems = sections.flatMap(section => section.items);
  
  // Set the first item as highlighted by default
  useEffect(() => {
    if (allItems.length > 0 && !highlightedItemId) {
      setHighlightedItemId(allItems[0].id);
    }
  }, [allItems, highlightedItemId]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!allItems.length) return;
    
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setKeyboardControlActive(true); // Enable keyboard control mode
      
      const currentIndex = allItems.findIndex(item => item.id === highlightedItemId);
      let newIndex;
      
      if (e.key === 'ArrowDown') {
        newIndex = currentIndex === allItems.length - 1 ? 0 : currentIndex + 1;
      } else {
        newIndex = currentIndex <= 0 ? allItems.length - 1 : currentIndex - 1;
      }
      
      // Skip disabled items
      while (allItems[newIndex].isDisabled && newIndex !== currentIndex) {
        newIndex = e.key === 'ArrowDown' 
          ? (newIndex === allItems.length - 1 ? 0 : newIndex + 1)
          : (newIndex <= 0 ? allItems.length - 1 : newIndex - 1);
      }
      
      const newItem = allItems[newIndex];
      setHighlightedItemId(newItem.id);
      
      // Scroll into view
      const element = itemsRef.current.get(newItem.id);
      if (element) {
        element.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Tab' || e.key === 'Escape') {
      // Disable keyboard mode when Tab or Escape is pressed
      setKeyboardControlActive(false);
    }
  };
  
  // Handle mouse click on container - disables keyboard control
  const handleMouseDown = () => {
    setKeyboardControlActive(false);
  };
  
  // Handle mouse hover on items
  const handleItemHover = (itemId: string) => {
    // Only update highlight if keyboard control is NOT active
    if (!keyboardControlActive) {
      setHighlightedItemId(itemId);
    }
  };

  // Check if any section has items
  const hasItems = sections.some(section => section.items.length > 0);

  return (
    <DropdownMenuContent 
      align="center" 
      className={`w-[340px] max-h-[480px] flex flex-col p-0 border border-white/10 shadow-xl ${className}`}
      sideOffset={4}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
    >
      {headerContent && (
        <div className="flex-shrink-0 pt-2">
          {headerContent}
          {hasItems && <DropdownMenuSeparator className="my-1.5" />}
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto py-2 px-0 min-h-0">
        {hasItems ? (
          <div role="menu">
            {sections.map((section, sectionIndex) => (
              <div key={section.title || sectionIndex} className="mb-3">
                <div className="px-3 mb-1 flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-white/40 font-medium">
                    {section.title}
                  </div>
                  {section.actionButton && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-white/[0.06]"
                      onClick={section.actionButton.onClick}
                      disabled={section.actionButton.isLoading}
                      aria-label={section.actionButton.ariaLabel}
                    >
                      {section.actionButton.icon}
                    </Button>
                  )}
                </div>

                <div className="px-0.5 space-y-0.5">
                  {section.items.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-white/50 text-center">
                      No items available
                    </div>
                  ) : (
                    section.items.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        ref={(el) => {
                          if (el) itemsRef.current.set(item.id, el);
                          else itemsRef.current.delete(item.id);
                        }}
                        className={`flex items-start py-2 px-3 cursor-pointer mx-1.5 rounded-md transition-all duration-150 
                          ${item.isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}
                          ${item.isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                          ${highlightedItemId === item.id ? 'ring-1 ring-white/20' : ''}
                        `}
                        onSelect={() => !item.isDisabled && item.onSelect?.()}
                        disabled={item.isDisabled}
                        onMouseEnter={() => handleItemHover(item.id)}
                        onClick={() => setKeyboardControlActive(false)} // Disable keyboard mode on click
                        role="menuitem"
                        tabIndex={0}
                      >
                        {item.content}
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 py-6 flex-1 flex items-center justify-center">
            {emptyState || <span className="text-sm text-white/50">No items available</span>}
          </div>
        )}
      </div>
      
      {/* Footer with actions */}
      {hasItems && footerActions.length > 0 && (
        <div className="flex-shrink-0 w-full bg-[#0e0e10] border-t border-white/[0.08] pt-1.5 pb-1.5">
          <div className="px-3 py-1.5 flex justify-center items-center">
            {footerActions
              .filter(action => !action.shouldShow || action.shouldShow(highlightedItemId || ''))
              .map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant === 'destructive' ? 'ghost' : 'ghost'}
                  size="sm"
                  className={`text-xs ${
                    action.variant === 'destructive' 
                      ? 'text-red-400/80 hover:text-red-400 hover:bg-red-400/10' 
                      : 'text-white/50 hover:text-white/90 hover:bg-white/[0.05]'
                  } h-7 px-2 ${index > 0 ? 'ml-2' : ''}`}
                  onClick={() => action.onClick(highlightedItemId || '')}
                  disabled={
                    typeof action.isDisabled === 'function' 
                      ? action.isDisabled(highlightedItemId || '') 
                      : action.isDisabled || !highlightedItemId
                  }
                >
                  {action.icon && <span className="mr-1.5">{action.icon}</span>}
                  <span>{action.label}</span>
                </Button>
              ))}
          </div>
        </div>
      )}
    </DropdownMenuContent>
  );
} 