"use client";

import React, { ChangeEvent, useRef, useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/components/ui/common/button';
import { 
  extractMentions, 
  getDisplayText, 
  mapDisplayToInternalPosition,
  mapInternalToDisplayPosition
} from '@/lib/mention-utils';
import { MentionItem, ExtractedMention, SelectedMentionItem } from '@/types/mention';
import { useMentionSystem } from '@/hooks/useMentionSystem';
import { ContentTag } from './content-tag';
import { MentionMenu } from './mention-menu';

interface UnifiedInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

// Component for text input with @ mentions functionality
export const UnifiedInput: React.FC<UnifiedInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  children
}) => {
  // UI state
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [internalValue, setInternalValue] = useState<string>(value);
  
  // Use the mention system hook for most of the mention functionality
  const { 
    showMentionMenu,
    setShowMentionMenu,
    mentionItems,
    mentionSearch,
    isSearching,
    selectedItems,
    processingItems,
    handleMentionSelect,
    checkForMentionTrigger,
    removeSelectedItem
  } = useMentionSystem();

  // Focus the input field
  const focusInput = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  // Keyboard shortcut to focus the input
  useHotkeys('meta+/', (e) => {
    e.preventDefault();
    focusInput();
  }, { enableOnFormTags: true });

  // Auto-adjust textarea height based on content
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

  // Sync internal state with external value
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  // Handle input changes and mention detection
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplayText = e.target.value;
    const caretPosition = e.target.selectionStart || 0;
    setCursorPosition(caretPosition);
    
    // Check for @ symbol to trigger mention menu
    checkForMentionTrigger(newDisplayText, caretPosition);
    
    // Map display position to internal position
    const internalPosition = mapDisplayToInternalPosition(caretPosition, internalValue);
    
    // Update internal value while preserving mentions
    let newInternalValue = internalValue;
    const prevDisplayText = getDisplayText(internalValue);
    
    // Find common prefix length to determine what changed
    let commonPrefixLength = 0;
    while (
      commonPrefixLength < prevDisplayText.length && 
      commonPrefixLength < newDisplayText.length && 
      prevDisplayText[commonPrefixLength] === newDisplayText[commonPrefixLength]
    ) {
      commonPrefixLength++;
    }
    
    // Handle text addition or removal
    if (newDisplayText.length >= prevDisplayText.length) {
      // Text was added
      const addedText = newDisplayText.substring(commonPrefixLength, caretPosition);
      const internalInsertPos = mapDisplayToInternalPosition(commonPrefixLength, internalValue);
      newInternalValue = 
        internalValue.substring(0, internalInsertPos) + 
        addedText + 
        internalValue.substring(internalInsertPos);
    } else {
      // Text was removed
      const displayDiff = prevDisplayText.length - newDisplayText.length;
      const internalRemoveStart = mapDisplayToInternalPosition(commonPrefixLength, internalValue);
      const internalRemoveEnd = internalRemoveStart + displayDiff;
      
      newInternalValue = 
        internalValue.substring(0, internalRemoveStart) + 
        internalValue.substring(internalRemoveEnd);
    }
    
    // Update internal value
    setInternalValue(newInternalValue);
    
    // Notify parent component
    const syntheticEvent = {
      target: { value: newInternalValue }
    } as ChangeEvent<HTMLTextAreaElement>;
    onChange(syntheticEvent);
    
    // Adjust textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Create ref for mention menu
  const mentionMenuRef = useRef<{handleKeyDown: (e: React.KeyboardEvent) => boolean}>(null);
  
  // No need for code block generation anymore
  
  // Handle keyboard navigation and special keys
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu && mentionMenuRef.current) {
      // First try to let the mention menu handle the key event
      const handled = mentionMenuRef.current.handleKeyDown(e);
      
      // If the mention menu handled it, we're done
      if (handled) {
        return;
      }
      
      // If not handled and it's Escape, close the menu
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Backspace') {
      // Handle backspace when text is empty but mentions exist
      const displayText = getDisplayText(internalValue);
      const mentions = extractMentions(internalValue);
      
      if (displayText === '' && mentions.length > 0) {
        e.preventDefault();
        
        // Remove the last mention
        const lastMention = mentions[mentions.length - 1];
        removeSelectedItem(lastMention.id, internalValue, (newText) => {
          setInternalValue(newText);
          const event = { target: { value: newText } } as ChangeEvent<HTMLTextAreaElement>;
          onChange(event);
        });
      }
    }
  };

  // Submit the message with any attached items
  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    
    // Use the internal value which preserves the @[name](id) format
    const finalMessage = internalValue;
    
    // Create a custom event with content data
    const customEvent = new CustomEvent('chatSubmit', {
      detail: {
        message: finalMessage,
        files: selectedItems
      }
    });
    
    // Dispatch the event for external listeners
    document.dispatchEvent(customEvent);
    
    // Call the original onSubmit
    onSubmit();
  };

  // Get all mentions in the text
  const mentions = extractMentions(internalValue);

  return (
    <div className="relative">
      {children}
      
      {/* Mention selection menu */}
      <MentionMenu
        ref={mentionMenuRef}
        isVisible={showMentionMenu}
        isSearching={isSearching}
        items={mentionItems}
        searchTerm={mentionSearch}
        onItemSelect={(item) => 
          handleMentionSelect(item, internalValue, (newText) => {
            setInternalValue(newText);
            const event = { target: { value: newText } } as ChangeEvent<HTMLTextAreaElement>;
            onChange(event);
            
            // Focus the textarea immediately
            textareaRef.current?.focus();
          })
        }
        onClose={() => setShowMentionMenu(false)}
        anchorRef={textareaRef}
      />
      
      <div 
        className={`
          relative rounded-2xl rounded-t-none
          bg-white/[0.03] border border-white/[0.05]
          transition-all duration-300
          overflow-hidden backdrop-blur-xl
          ${isFocused ? 'bg-white/[0.05] border-white/[0.1]' : ''}
        `}
      >
        {/* Selected content items */}
        <div className="selected-files-container px-4 pt-2 flex flex-wrap gap-2">
          {mentions.map(({id, name, type}) => (
            <ContentTag
              key={id}
              item={{id, name, type}}
              onRemove={(itemId) => {
                removeSelectedItem(itemId, internalValue, (newText) => {
                  setInternalValue(newText);
                  const event = { target: { value: newText } } as ChangeEvent<HTMLTextAreaElement>;
                  onChange(event);
                });
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <textarea
            ref={textareaRef}
            value={getDisplayText(internalValue)}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Only update focus state, don't hide the mention menu
              // The Popover component will handle menu visibility
              setTimeout(() => {
                setIsFocused(false);
              }, 100);
            }}
            onKeyDown={handleKeyDown}
            placeholder={"Type @ to mention or insert... (Press ⌘+/ to focus)"}
            className="flex-1 text-sm resize-none min-h-[48px] max-h-[200px] px-4 py-3 focus:bg-transparent bg-transparent focus:outline-none transition-colors duration-200 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent text-white/90 placeholder:text-white/40"
            style={{ overflow: value.split('\n').length > 8 ? 'auto' : 'hidden' }}
            rows={1}
          />
          
          <div className="flex items-center mr-2">
            {Object.keys(processingItems).length > 0 && (
              <div className="flex items-center mr-2">
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse mr-1" />
                <span className="text-xs text-white/60">Loading files...</span>
              </div>
            )}
            <Button
              variant="cyan"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              disabled={disabled || Object.keys(processingItems).length > 0}
              className="h-8 rounded-xl"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};