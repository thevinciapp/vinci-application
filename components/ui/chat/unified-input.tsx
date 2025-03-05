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
import { File, Folder, Hash, FileText, Code, Database, ArrowRightFromLine, Clock, X } from 'lucide-react';

// Types of items that can be mentioned - expandable for future providers
type MentionItemType = 
  | 'file'      // Local files
  | 'folder'    // Local folders
  | 'context'   // Context items
  | 'code'      // Code snippets
  | 'database'  // Database items
  | 'history'   // Conversation history
  | 'command'   // Commands
  | 'message'   // Individual messages
  | 'conversation' // Entire conversations
  | 'gmail'     // Gmail emails
  | 'gdrive'    // Google Drive files
  | 'onedrive'  // OneDrive files
  | 'dropbox'   // Dropbox files
  | 'notion'    // Notion pages
  | 'github'    // GitHub repos/issues
  | 'slack';    // Slack messages

// Generic interface for mention items with common properties
interface MentionItem {
  id: string;                // Unique identifier
  type: MentionItemType;     // Type of the mention item
  name: string;              // Display name
  description?: string;      // Optional description
  icon: React.ReactNode;     // Icon to display
  
  // Provider-specific properties
  providerData?: any;        // Generic container for provider-specific data
  
  // Common optional properties
  path?: string;             // Path or location (files, folders, etc.)
  contentType?: string;      // MIME type or format
  size?: number;             // Size in bytes if applicable
  created?: Date | string;   // Creation time
  modified?: Date | string;  // Last modified time
  author?: string;           // Author or creator
  url?: string;              // URL if applicable
  
  // Legacy properties for backward compatibility
  filePath?: string;         // Path to file (deprecated, use path)
  fileType?: string;         // File extension (deprecated, use contentType)
}

// Generic content provider interface - this could be moved to a separate file
interface ContentProvider {
  id: string;                // Unique provider ID
  name: string;              // Display name
  icon: React.ReactNode;     // Icon for this provider
  description: string;       // Description of the provider
  isEnabled: boolean;        // Whether this provider is currently enabled
  requiresAuth: boolean;     // Whether authentication is required
  isAuthenticated: boolean;  // Authentication status
  
  // Search method - returns promise of MentionItems
  search: (query: string, options?: any) => Promise<MentionItem[]>;
  
  // Get content method - returns promise with content
  getContent: (item: MentionItem) => Promise<any>;
  
  // Optional methods
  authenticate?: () => Promise<boolean>;
  refresh?: () => Promise<void>;
  configure?: (config: any) => Promise<void>;
}

// Helper to get icon for a file type
const getIconForFileType = (fileType: string): React.ReactNode => {
  switch (fileType?.toLowerCase()) {
    case 'md':
    case 'txt':
    case 'doc':
    case 'docx':
    case 'rtf':
    case 'odt':
      return <FileText className="h-4 w-4" />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'java':
    case 'c':
    case 'cpp':
    case 'go':
    case 'rb':
      return <Code className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
};

// File system provider implementation
const FileSystemProvider: ContentProvider = {
  id: 'filesystem',
  name: 'Local Files',
  icon: <FileText className="h-4 w-4" />,
  description: 'Access files from your local file system',
  isEnabled: true,
  requiresAuth: false,
  isAuthenticated: true,
  
  // Search for files in the local system
  search: async (query: string, options?: any) => {
    if (!window.electronAPI) {
      console.log("Electron API not available, using mock data");
      // Return mock data for testing
      const mockFiles = [
        { path: '/Users/example/Documents/example.txt', name: 'example.txt', type: 'txt' },
        { path: '/Users/example/Documents/report.pdf', name: 'report.pdf', type: 'pdf' },
        { path: '/Users/example/code/app.js', name: 'app.js', type: 'js' }
      ];
      
      return mockFiles
        .filter(file => file.name.toLowerCase().includes(query.toLowerCase()))
        .map(file => ({
          id: `file-${file.path}`,
          type: 'file',
          name: file.name,
          description: file.path,
          icon: getIconForFileType(file.type),
          path: file.path,
          contentType: file.type,
          // Legacy properties
          filePath: file.path,
          fileType: file.type
        }));
    }
    
    try {
      const files = await window.electronAPI.searchFiles(query);
      
      // Convert to MentionItems
      return files.map((file: any) => ({
        id: `file-${file.path}`,
        type: 'file',
        name: file.name,
        description: file.path,
        icon: getIconForFileType(file.type),
        path: file.path,
        contentType: file.type,
        // Legacy properties
        filePath: file.path,
        fileType: file.type
      }));
    } catch (error) {
      console.error("Error searching files:", error);
      return [];
    }
  },
  
  // Get content for a file
  getContent: async (item: MentionItem) => {
    if (!window.electronAPI) {
      return { content: "Mock file content for " + item.name, type: "text" };
    }
    
    try {
      const filePath = item.path || item.filePath;
      if (!filePath) throw new Error("No file path provided");
      
      return await window.electronAPI.readFile(filePath);
    } catch (error) {
      console.error("Error reading file:", error);
      throw error;
    }
  }
};

// All available content providers
const CONTENT_PROVIDERS: ContentProvider[] = [
  FileSystemProvider,
  // Add more providers here as they are implemented
];

// Default content provider is file system
const DEFAULT_PROVIDER = FileSystemProvider;

// Initial mention items for non-provider-based options
const INITIAL_MENTION_ITEMS: MentionItem[] = [
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

// Component for displaying selected content tags with remove button
const ContentTag: React.FC<{
  item: {
    name: string;
    id: string;
    type: MentionItemType;
  };
  onRemove: (id: string) => void;
}> = ({ item, onRemove }) => {
  // Get the appropriate icon based on content type
  const getIconForType = (type: MentionItemType): React.ReactNode => {
    switch (type) {
      case 'file':
        return <FileText className="h-3 w-3 text-cyan-400" />;
      case 'folder':
        return <Folder className="h-3 w-3 text-cyan-400" />;
      case 'gmail':
        return <Hash className="h-3 w-3 text-red-400" />;
      case 'gdrive':
        return <FileText className="h-3 w-3 text-blue-400" />;
      case 'dropbox':
        return <FileText className="h-3 w-3 text-blue-400" />;
      case 'github':
        return <Code className="h-3 w-3 text-purple-400" />;
      case 'conversation':
        return <Clock className="h-3 w-3 text-green-400" />;
      case 'message':
        return <Clock className="h-3 w-3 text-amber-400" />;
      default:
        return <FileText className="h-3 w-3 text-white/70" />;
    }
  };
  
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-1 mr-1 mb-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-xs text-white/90 group"
      title={item.name}
    >
      {getIconForType(item.type)}
      <span className="truncate max-w-[150px]">{item.name}</span>
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="ml-1 text-white/40 hover:text-white/90 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Remove item"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
};

interface UnifiedInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

// Declare global types for Electron API
declare global {
  interface Window {
    electronAPI?: {
      searchFiles: (searchTerm: string) => Promise<any[]>;
      readFile: (filePath: string) => Promise<{
        content: string;
        type: 'text' | 'binary';
        extension?: string;
      }>;
    };
  }
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
  const [mentionItems, setMentionItems] = useState<MentionItem[]>(INITIAL_MENTION_ITEMS);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{[key: string]: {
    path: string;
    content: string;
    type: string;
  }}>({});
  // Track files being processed
  const [processingFiles, setProcessingFiles] = useState<{[key: string]: boolean}>({}); 
  const [internalValue, setInternalValue] = useState<string>(value);

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
      // Use fixed left positioning rather than calculated position
      if (textareaRef.current) {
        setMentionPosition({
          top: 0,
          left: 0 // Fixed left alignment
        });
      }
    };

    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);
    
    // Call once initially to position correctly
    handleWindowChange();
    
    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [showMentionMenu]);

  // This effect updates our internal state when external value changes
  useEffect(() => {
    // Only update if the values are actually different
    // This prevents issues with cursor position when parent
    // component re-renders but doesn't actually change the value
    if (value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  // Check for @ symbol and position the mention menu
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplayText = e.target.value;
    const caretPosition = e.target.selectionStart || 0;
    setCursorPosition(caretPosition);
    
    // Find the last @ symbol before the cursor
    const textBeforeCursor = newDisplayText.substring(0, caretPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || /\s/.test(newDisplayText[lastAtIndex - 1]))) {
      // Extract search term after @
      const searchTerm = textBeforeCursor.substring(lastAtIndex + 1);
      
      // If we're within a word that started with @
      if (!searchTerm.includes(' ')) {
        setAtIndex(lastAtIndex);
        setMentionSearch(searchTerm);
        setShowMentionMenu(true);
        
        // Search for content across providers
        if (searchTerm) {
          searchContentProviders(searchTerm);
        }
        
        // Position the mention menu
        if (textareaRef.current) {
          // Instead of calculating position based on @ symbol, use fixed left alignment
          setMentionPosition({
            top: 0,
            left: 0 // Fixed left alignment
          });
          
          // Make sure textarea keeps focus - critical for good UX
          setTimeout(() => {
            textareaRef.current?.focus();
          }, 0);
        }
      }
    } else {
      // Hide menu if we're not after an @ symbol
      setShowMentionMenu(false);
    }
    
    // Map the display position to the internal position
    const internalPosition = mapCursorPositionToInternal(caretPosition);
    
    // Construct new internal value with mentions preserved
    let newInternalValue = internalValue;
    
    // Get previous display text
    const prevDisplayText = getDisplayText();
    
    // Find what changed
    let commonPrefixLength = 0;
    while (
      commonPrefixLength < prevDisplayText.length && 
      commonPrefixLength < newDisplayText.length && 
      prevDisplayText[commonPrefixLength] === newDisplayText[commonPrefixLength]
    ) {
      commonPrefixLength++;
    }
    
    // Insert or remove at the mapped position
    if (newDisplayText.length >= prevDisplayText.length) {
      // Text was added
      const addedText = newDisplayText.substring(commonPrefixLength, caretPosition);
      const internalInsertPos = mapCursorPositionToInternal(commonPrefixLength);
      newInternalValue = 
        internalValue.substring(0, internalInsertPos) + 
        addedText + 
        internalValue.substring(internalInsertPos);
    } else {
      // Text was removed
      // This is a simplified approach - for complex editing, more logic would be needed
      const displayDiff = prevDisplayText.length - newDisplayText.length;
      const internalRemoveStart = mapCursorPositionToInternal(commonPrefixLength);
      const internalRemoveEnd = internalRemoveStart + displayDiff;
      
      newInternalValue = 
        internalValue.substring(0, internalRemoveStart) + 
        internalValue.substring(internalRemoveEnd);
    }
    
    // Update internal value
    setInternalValue(newInternalValue);
    
    // Send to parent
    const syntheticEvent = {
      target: { value: newInternalValue }
    } as ChangeEvent<HTMLTextAreaElement>;
    onChange(syntheticEvent);
    
    // Manually trigger height adjustment
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Check for Electron API availability
  useEffect(() => {
    console.log("Checking for Electron API:", !!window.electronAPI);
    if (window.electronAPI) {
      try {
        // Remove the ping check since it doesn't exist in the API
        console.log("Electron API detected");
      } catch (error) {
        console.error("Error with Electron API:", error);
      }
    }
  }, []);

  // Debounce search to improve performance
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track the active content provider (could expand to multiple providers in the future)
  const [activeProvider, setActiveProvider] = useState<ContentProvider>(DEFAULT_PROVIDER);

  // Unified search using the content provider framework
  const searchContentProviders = async (searchTerm: string) => {
    // Cancel any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search to prevent excessive API calls
    searchTimeoutRef.current = setTimeout(async () => {
      if (!searchTerm || searchTerm.length < 2) {
        // Only show default items for very short searches
        setMentionItems(INITIAL_MENTION_ITEMS);
        return;
      }
      
      setIsSearching(true);
      
      try {
        // Get results from active provider
        const providerResults = await activeProvider.search(searchTerm);
        
        // Combine with standard items
        const nonProviderItems = INITIAL_MENTION_ITEMS.filter(item => 
          item.type !== 'file' && item.type !== 'folder'
        ).slice(0, 3);
        
        setMentionItems([...providerResults, ...nonProviderItems]);
      } catch (error) {
        console.error(`Error searching with provider ${activeProvider.name}:`, error);
      } finally {
        setIsSearching(false);
      }
    }, 200); // Debounce delay
  };

  // Get appropriate icon for file type
  const getFileIcon = (fileType: string) => {
    // You can add more icons based on file types
    switch (fileType) {
      case 'md':
      case 'txt':
      case 'doc':
      case 'docx':
      case 'rtf':
      case 'odt':
        return <FileText className="h-4 w-4" />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'java':
      case 'c':
      case 'cpp':
      case 'go':
      case 'rb':
        return <Code className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  // Handle item selection from mention menu
  const handleMentionSelect = (item: MentionItem) => {
    // Insert the selected item at the @ position first for better UI responsiveness
    if (atIndex >= 0 && textareaRef.current) {
      const beforeAt = internalValue.substring(0, atIndex);
      const afterSearch = internalValue.substring(atIndex + mentionSearch.length + 1); // +1 for the @ symbol
      
      // Format: @[filename](item.id) - Just show the file name, not the full path
      const mentionText = `@[${item.name}](${item.id}) `;
      
      const newValue = beforeAt + mentionText + afterSearch;
      
      // Update internal value
      setInternalValue(newValue);
      
      // Update the parent component's value
      const event = {
        target: { value: newValue }
      } as ChangeEvent<HTMLTextAreaElement>;
      
      onChange(event);
      
      // Focus the textarea without moving cursor to end (will be handled in effect)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 10);
    }
    
    // Close the mention menu
    setShowMentionMenu(false);
    setMentionSearch('');
    setAtIndex(-1);
    
    // Process the item based on its type using the content provider framework
    const processItem = async () => {
      // Mark item as being processed
      setProcessingFiles(prev => ({ ...prev, [item.id]: true }));
      
      try {
        // Find the appropriate provider based on item type
        let provider: ContentProvider | undefined;
        
        // For now we just handle files with FileSystemProvider
        if (item.type === 'file') {
          provider = CONTENT_PROVIDERS.find(p => p.id === 'filesystem');
        }
        // Add more provider types as they are implemented
        // Example:
        // else if (item.type === 'gdrive') {
        //   provider = CONTENT_PROVIDERS.find(p => p.id === 'google-drive');
        // } 
        
        if (!provider) {
          console.error(`No provider found for item type: ${item.type}`);
          return;
        }
        
        // Get content using the provider
        const content = await provider.getContent(item);
        
        // Store content based on item type
        if (item.type === 'file') {
          setSelectedFiles(prev => ({
            ...prev,
            [item.id]: {
              path: item.path || item.filePath || '',
              content: content.content || '',
              type: content.type || 'text'
            }
          }));
          console.log(`Content loaded from ${provider.name}:`, item.name);
        }
        // Handle other content types here as they are implemented
        
      } catch (error) {
        console.error(`Error processing item ${item.name}:`, error);
      } finally {
        setProcessingFiles(prev => {
          const newState = { ...prev };
          delete newState[item.id];
          return newState;
        });
      }
    };
    
    // Use timeout for better UX
    if (['file', 'gdrive', 'dropbox', 'onedrive'].includes(item.type)) {
      setTimeout(processItem, 100);
    }
  };

  // Handle keyboard navigation in mention menu
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(false);
      } else if (e.key === 'ArrowUp') {
        // Navigate up in the mention menu
        e.preventDefault();
        // Navigation will be handled directly by Command component
      } else if (e.key === 'ArrowDown') {
        // Navigate down in the mention menu
        e.preventDefault();
        // Navigation will be handled directly by Command component
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Select the current item
        e.preventDefault();
        // Selection will be handled by Command component
      } else if (e.key === 'Tab') {
        // Close menu on tab
        e.preventDefault();
        setShowMentionMenu(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Backspace') {
      // If the display text is empty and there are file mentions, remove the last file
      const displayText = getDisplayText();
      const mentions = extractFileMentions();
      
      if (displayText === '' && mentions.length > 0) {
        e.preventDefault();
        
        // Get the last file mention
        const lastMention = mentions[mentions.length - 1];
        
        // Remove it from the text
        const newValue = internalValue.substring(0, lastMention.index) + 
                         internalValue.substring(lastMention.index + lastMention.length);
        
        // Update internal value
        setInternalValue(newValue);
        
        // Update the parent component
        const event = {
          target: { value: newValue }
        } as ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
        
        // Remove from selected files
        if (selectedFiles[lastMention.id]) {
          setSelectedFiles(prev => {
            const newFiles = {...prev};
            delete newFiles[lastMention.id];
            return newFiles;
          });
        }
      }
    }
  };

  // Custom submit handler to include selected files
  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    
    // Create a custom event with file data
    const customEvent = new CustomEvent('chatSubmit', {
      detail: {
        message: value,
        files: selectedFiles
      }
    });
    
    // Dispatch the event
    document.dispatchEvent(customEvent);
    
    // Clear selected files
    setSelectedFiles({});
    
    // Call the original onSubmit
    onSubmit();
  };

  // Extract all content mentions from text (files, conversations, etc.)
  const extractFileMentions = () => {
    // Regex to match all mentions in the format @[name](id)
    const regex = /@\[([^\]]+)\]\(([^)]+)\)(\s)?/g;
    let match;
    const mentions = [];
    
    // Make a copy of internalValue to prevent regex.exec from affecting state
    let text = String(internalValue);
    
    // Find all mentions
    while ((match = regex.exec(text)) !== null) {
      const name = match[1];
      const id = match[2];
      // Include the space after the mention if it exists
      const hasSpace = !!match[3];
      const fullMatch = match[0];
      
      // Accept mentions with different prefixes for different providers
      // In the future, we could be more selective based on provider types
      const validPrefixes = ['file-', 'gdrive-', 'message-', 'conversation-', 'dropbox-', 'github-', 'slack-'];
      const isValidMention = validPrefixes.some(prefix => id.startsWith(prefix)) || id.includes('/');
      
      if (isValidMention) {
        mentions.push({ 
          id, 
          name,
          index: match.index,
          length: fullMatch.length,
          text: fullMatch,
          // Determine the type from the ID
          type: id.startsWith('file-') ? 'file' : 
                id.startsWith('gdrive-') ? 'gdrive' :
                id.startsWith('message-') ? 'message' :
                id.startsWith('conversation-') ? 'conversation' :
                id.startsWith('github-') ? 'github' :
                id.startsWith('slack-') ? 'slack' :
                'file' // Default to file type for backward compatibility
        });
      }
    }
    
    // Sort by position in text
    mentions.sort((a, b) => a.index - b.index);
    
    return mentions;
  };

  // Group and filter mention items based on search
  const mentionGroups = getMentionGroups(mentionItems, mentionSearch);

  // Function to get the display text without any mention syntax
  const getDisplayText = () => {
    if (!internalValue) return '';
    
    let displayText = String(internalValue);
    const mentions = extractFileMentions();
    
    // Replace mentions from right to left to avoid position issues
    for (let i = mentions.length - 1; i >= 0; i--) {
      const mention = mentions[i];
      displayText = displayText.substring(0, mention.index) + 
                    displayText.substring(mention.index + mention.length);
    }
    
    return displayText;
  };

  // Map cursor position in display text to position in internal text
  const mapCursorPositionToInternal = (displayPosition: number) => {
    if (!internalValue) return displayPosition;
    
    const mentions = extractFileMentions();
    if (mentions.length === 0) return displayPosition;
    
    let internalPosition = displayPosition;
    let offset = 0;
    
    // Create a mapping of display positions to internal positions
    for (const mention of mentions) {
      // The display position where this mention would be
      const displayStartPos = mention.index - offset;
      
      // If the cursor is after this mention in the display text,
      // adjust the internal position
      if (displayPosition > displayStartPos) {
        internalPosition += mention.length;
      }
      
      // Update the offset for future mentions
      offset += mention.length;
    }
    
    return internalPosition;
  };

  // Map from internal position to display position
  const mapInternalPositionToDisplay = (internalPosition: number) => {
    if (!internalValue) return internalPosition;
    
    const mentions = extractFileMentions();
    if (mentions.length === 0) return internalPosition;
    
    let displayPosition = internalPosition;
    
    // For each mention before the internal position, adjust the display position
    for (const mention of mentions) {
      if (mention.index < internalPosition) {
        // If the cursor is within the mention, place it at the start
        if (internalPosition <= mention.index + mention.length) {
          displayPosition = mention.index;
          break;
        }
        // If the cursor is after the mention, subtract its length
        displayPosition -= mention.length;
      }
    }
    
    return displayPosition;
  };

  return (
    <div className="relative">
      {children}
      
      {/* Mention dropdown menu */}
      {showMentionMenu && (
        <div 
          ref={mentionContainerRef}
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
              filter={(value, search) => {
                // We handle filtering manually in the searchLocalFiles function
                return 1;
              }}
              onKeyDown={(e) => {
                // Forward key events from Command to textarea
                if (e.key === "Escape") {
                  setShowMentionMenu(false);
                  textareaRef.current?.focus();
                }
              }}
            >
              {/* Title header instead of search */}
              <div className="border-b border-white/5 px-3 py-2 text-sm font-medium text-white/70">
                Select a file or resource...
              </div>
              <CommandList className="max-h-[300px] overflow-auto">
                {isSearching ? (
                  <div className="py-6 text-center">
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-white/70 border-r-transparent"></div>
                    <p className="mt-2 text-sm text-white/70">Searching files...</p>
                  </div>
                ) : Object.keys(mentionGroups).length === 0 ? (
                  <CommandEmpty>No items found.</CommandEmpty>
                ) : (
                  Object.entries(mentionGroups).map(([type, items]) => (
                    <CommandGroup key={type} heading={getGroupDisplayName(type as MentionItemType)}>
                      {items.map((item) => (
                        <CommandItem
                          key={item.id}
                          onSelect={() => handleMentionSelect(item)}
                          className="flex items-center gap-2 px-4 py-2 cursor-pointer select-none hover:bg-white/10"
                          value={item.name} // Help with keyboard selection
                          onClick={() => handleMentionSelect(item)} // Explicitly handle clicks
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
        {/* Display selected content items with our reusable component */}
        <div className="selected-files-container px-4 pt-2 flex flex-wrap gap-2">
          {extractFileMentions().map(({id, name}) => (
            <ContentTag
              key={id}
              item={{
                id,
                name,
                // For backward compatibility, we assume it's a file type
                // In future, you can extract the provider type from the ID prefix
                type: id.startsWith('file-') ? 'file' : 
                       id.startsWith('gdrive-') ? 'gdrive' :
                       id.startsWith('message-') ? 'message' :
                       id.startsWith('conversation-') ? 'conversation' :
                       'file'
              }}
              onRemove={(itemId) => {
                // Remove mention from text
                const mentions = extractFileMentions();
                const mention = mentions.find(m => m.id === itemId);
                
                if (mention) {
                  const newValue = internalValue.substring(0, mention.index) + 
                                   internalValue.substring(mention.index + mention.length);
                  
                  // Update internal value
                  setInternalValue(newValue);
                  
                  // Update the parent component
                  const event = {
                    target: { value: newValue }
                  } as ChangeEvent<HTMLTextAreaElement>;
                  onChange(event);
                  
                  // Remove from selected files (if applicable)
                  if (selectedFiles[itemId]) {
                    setSelectedFiles(prev => {
                      const newFiles = {...prev};
                      delete newFiles[itemId];
                      return newFiles;
                    });
                  }
                }
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <textarea
            ref={textareaRef}
            value={getDisplayText()}
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

          <div className="flex items-center mr-2">
            {Object.keys(processingFiles).length > 0 && (
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
              disabled={disabled || Object.keys(processingFiles).length > 0}
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