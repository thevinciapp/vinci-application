import { useState, useRef, useCallback, useEffect } from 'react';
import { MentionItem, SelectedMentionItem } from '@/types/mention';
import { extractMentions, formatMention } from '@/lib/mention-utils';
import { providerRegistry } from '@/lib/providers/provider-registry';

// This hook encapsulates all the functionality for the mention system
export const useMentionSystem = () => {
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [atIndex, setAtIndex] = useState(-1);
  const [mentionItems, setMentionItems] = useState<MentionItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedMentionItem>>({});
  const [processingItems, setProcessingItems] = useState<Record<string, boolean>>({});
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Search for content across providers
  const searchContentProviders = useCallback(async (searchTerm: string) => {
    // Cancel any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search to prevent excessive API calls
    searchTimeoutRef.current = setTimeout(async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setMentionItems([]);
        return;
      }
      
      setIsSearching(true);
      
      try {
        // Use the provider registry to search across all providers
        const results = await providerRegistry.searchAllProviders(searchTerm);
        setMentionItems(results);
      } catch (error) {
        console.error(`Error searching providers:`, error);
        setMentionItems([]);
      } finally {
        setIsSearching(false);
      }
    }, 200); // Debounce delay
  }, []);
  
  // Handle item selection
  const handleMentionSelect = useCallback(async (item: MentionItem, text: string, onTextUpdate: (newText: string) => void) => {
    // Insert the selected item at the @ position first for better UI responsiveness
    if (atIndex >= 0) {
      const beforeAt = text.substring(0, atIndex);
      const afterSearch = text.substring(atIndex + mentionSearch.length + 1); // +1 for the @ symbol
      
      // Format as @[name](id)
      const mentionText = formatMention(item.name, item.id);
      
      const newValue = beforeAt + mentionText + afterSearch;
      
      // Update text via callback
      onTextUpdate(newValue);
    }
    
    // Close the mention menu
    setShowMentionMenu(false);
    setMentionSearch('');
    setAtIndex(-1);
    
    // Process the item to fetch its content
    const processItem = async () => {
      // Mark item as being processed
      setProcessingItems(prev => ({ ...prev, [item.id]: true }));
      
      try {
        // Find the appropriate provider for this item
        const provider = providerRegistry.getProviderForItem(item);
        
        if (!provider) {
          console.error(`No provider found for item type: ${item.type}`);
          return;
        }
        
        // Get content using the provider
        const content = await provider.getContent(item);
        
        // Store the content
        setSelectedItems(prev => ({
          ...prev,
          [item.id]: {
            path: item.path,
            content: content.content,
            type: content.type,
            metadata: content.metadata
          }
        }));
        
        console.log(`Content loaded for ${item.name}`);
      } catch (error) {
        console.error(`Error processing item ${item.name}:`, error);
      } finally {
        setProcessingItems(prev => {
          const newState = { ...prev };
          delete newState[item.id];
          return newState;
        });
      }
    };
    
    // Process the item
    setTimeout(processItem, 100);
  }, [atIndex, mentionSearch]);
  
  // Function to check for @ symbol and set up the mention menu
  const checkForMentionTrigger = useCallback((text: string, caretPosition: number) => {
    // Find the last @ symbol before the cursor
    const textBeforeCursor = text.substring(0, caretPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || /\s/.test(text[lastAtIndex - 1]))) {
      // Extract search term after @
      const searchTerm = textBeforeCursor.substring(lastAtIndex + 1);
      
      // If we're within a word that started with @
      if (!searchTerm.includes(' ')) {
        setAtIndex(lastAtIndex);
        setMentionSearch(searchTerm);
        setShowMentionMenu(true);
        
        // Search for content if we have enough characters
        if (searchTerm) {
          searchContentProviders(searchTerm);
        }
        
        return true;
      }
    } else {
      // Hide menu if we're not after an @ symbol
      setShowMentionMenu(false);
    }
    
    return false;
  }, [searchContentProviders]);
  
  // Function to remove a selected item
  const removeSelectedItem = useCallback((itemId: string, text: string, onTextUpdate: (newText: string) => void) => {
    // Remove mention from text
    const mentions = extractMentions(text);
    const mention = mentions.find(m => m.id === itemId);
    
    if (mention) {
      const newValue = text.substring(0, mention.index) + 
                       text.substring(mention.index + mention.length);
      
      // Update text via callback
      onTextUpdate(newValue);
      
      // Remove from selected items
      setSelectedItems(prev => {
        const newItems = {...prev};
        delete newItems[itemId];
        return newItems;
      });
    }
  }, []);
  
  // Clean up when unmounting
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    showMentionMenu,
    setShowMentionMenu,
    mentionSearch,
    mentionItems,
    isSearching,
    selectedItems,
    processingItems,
    atIndex,
    handleMentionSelect,
    checkForMentionTrigger,
    removeSelectedItem
  };
};