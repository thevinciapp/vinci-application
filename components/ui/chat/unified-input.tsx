"use client";

import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/components/ui/common/button';
import { File, Loader2, X } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useSpaceStore } from '@/stores/space-store';
import { useShallow } from 'zustand/react/shallow';
import { providerRegistry } from '@/lib/providers/provider-registry';

type FileTag = {
  id: string
  name: string
  path: string
}

type Token = {
  id: string
  type: "text" | "file"
  content: string
  file?: FileTag
}

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
  const [tokens, setTokens] = useState<Token[]>([{ id: "initial", type: "text", content: "" }]);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { 
    addFileReference
  } = useSpaceStore(
    useShallow((state) => ({
      addFileReference: state.addFileReference,
    }))
  );

  // State for file search results and loading state
  const [fileResults, setFileResults] = useState<FileTag[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search for files using the file system provider
  const searchFiles = useCallback(async (query: string) => {
    // Don't search if query is empty
    if (!query.trim()) {
      setFileResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Use the provider registry to search files
      const fileSystemProvider = providerRegistry.getProviderById('filesystem');
      
      if (!fileSystemProvider) {
        console.error("File system provider not found");
        return;
      }
      
      // Execute the search
      const results = await fileSystemProvider.search(query);
      
      // Convert to file tags
      const fileTags: FileTag[] = results.map(item => ({
        id: item.id,
        name: item.name,
        path: item.path || item.description || '',
      }));
      
      setFileResults(fileTags);
    } catch (error) {
      console.error("Error searching files:", error);
      // Provide fallback results in case of error
      setFileResults([
        { id: "fallback-1", name: "index.tsx", path: "/app/index.tsx" },
        { id: "fallback-2", name: "page.tsx", path: "/app/page.tsx" },
      ]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Effect to search files when query changes (with debounce controlled by the input handler)
  useEffect(() => {
    if (suggestionQuery) {
      searchFiles(suggestionQuery);
    }
  }, [suggestionQuery, searchFiles]);

  // Get filtered files for display
  const filteredFiles = React.useMemo(() => {
    if (!suggestionQuery) return fileResults;
    
    const query = suggestionQuery.toLowerCase().trim();
    // Don't filter further if we already searched
    return fileResults;
  }, [suggestionQuery, fileResults]);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  useHotkeys('meta+/', (e) => {
    e.preventDefault();
    focusInput();
  }, { enableOnFormTags: true });

  // Focus the input when clicking on the container
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      inputRef.current?.focus();
    }
  };

  // Track the last time we performed a file search to avoid excessive searches
  const lastSearchTimeRef = useRef<number>(0);
  // Track search debounce timer
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle input changes with optimized file search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Detect @ symbol with cursor position awareness
    if (value.includes("@")) {
      const atIndex = value.lastIndexOf("@");
      const caretPosition = e.target.selectionStart || 0;
      
      // Only trigger search if user is typing after an @ symbol
      if (caretPosition > atIndex && caretPosition <= atIndex + 20) {
        const query = value.substring(atIndex + 1, caretPosition);
        
        // If the query changed, debounce search updates to avoid excessive API calls
        if (query !== suggestionQuery) {
          setSuggestionQuery(query);
          
          // Clear previous timeout
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
          }
          
          // Immediately show the suggestions menu, but debounce the search
          setShowSuggestions(true);
          
          // Start short debounce timer for searching to prevent spamming file system
          const now = Date.now();
          const timeSinceLastSearch = now - lastSearchTimeRef.current;
          const minSearchDelay = query.length <= 2 ? 150 : 50; // Shorter delay for longer queries
          
          if (timeSinceLastSearch > 500) {
            // If it's been a while, search immediately
            console.log(`Searching immediately for: @${query}`);
            // No need to set timeout, just remember the time
            lastSearchTimeRef.current = now;
          } else {
            // Otherwise debounce
            searchTimeoutRef.current = setTimeout(() => {
              console.log(`Debounced search for: @${query}`);
              lastSearchTimeRef.current = Date.now();
            }, minSearchDelay);
          }
        }
      } else if (caretPosition <= atIndex) {
        // User moved cursor back before the @ symbol, hide suggestions
        setShowSuggestions(false);
      }
    } else {
      // No @ symbol in text, hide suggestions
      setShowSuggestions(false);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && inputValue === "" && tokens.length > 0) {
      // Remove the last token if it's a file tag
      const lastToken = tokens[tokens.length - 1];
      if (lastToken.type === "file") {
        const newTokens = [...tokens];
        newTokens.pop();
        setTokens(newTokens);
      }
    } else if (e.key === "Escape" && showSuggestions) {
      setShowSuggestions(false);
      e.preventDefault();
    } else if (e.key === "Enter" && showSuggestions && filteredFiles.length > 0) {
      selectFile(filteredFiles[0]);
      e.preventDefault();
    } else if (e.key === "Enter" && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Select a file from suggestions
  const selectFile = async (file: FileTag) => {
    // Start loading state for this file
    setIsSearching(true);
    
    try {
      // Get the file system provider to read the file content
      const fileSystemProvider = providerRegistry.getProviderById('filesystem');
      
      if (!fileSystemProvider) {
        console.error("File system provider not found");
        throw new Error("File system provider not found");
      }
      
      // Create a mention item to get content
      const mentionItem = {
        id: file.id || `file-${Date.now()}`,
        type: 'file' as const,
        name: file.name,
        path: file.path,
        description: file.path
      };
      
      // Fetch the file content using the provider
      console.log(`Loading content for file: ${file.path}`);
      let fileContent;
      try {
        // Get the file content using the provider
        const content = await fileSystemProvider.getContent(mentionItem);
        fileContent = content.content;
        console.log(`File content loaded, size: ${fileContent.length} bytes`);
      } catch (error) {
        console.error(`Error loading file content for ${file.path}:`, error);
        fileContent = `[Error loading file content: ${error.message}]`;
      }
      
      // Create a new file token, properly formatted with content
      const fileToken: Token = {
        id: file.id || `file-${Date.now()}`,
        type: "file",
        content: file.name,
        file: {
          id: file.id || `file-${Date.now()}`,
          name: file.name,
          path: file.path
        },
      };
      
      // Immediately add the file reference to the store with content
      addFileReference({
        id: fileToken.id,
        path: file.path,
        name: file.name,
        content: fileContent || '',
        type: 'file'
      });
      
      console.log(`Added file reference to store: ${file.name} with content`);
  
      // Add the file token and a new empty text token
      const newTextToken: Token = {
        id: `text-${Date.now()}`,
        type: "text",
        content: "",
      };
  
      // If the current input has an @ symbol, split it
      if (inputValue.includes("@")) {
        const atIndex = inputValue.lastIndexOf("@");
        const textBefore = inputValue.substring(0, atIndex);
  
        // Update the current text token with text before @
        const newTokens = [...tokens];
        if (newTokens[newTokens.length - 1].type === "text") {
          newTokens[newTokens.length - 1].content = textBefore;
        }
  
        // Add the file token and a new empty text token
        setTokens([...newTokens, fileToken, newTextToken]);
      } else {
        // Just add the file token after the current text
        setTokens([...tokens, fileToken, newTextToken]);
      }
    } catch (error) {
      console.error("Error selecting file:", error);
    } finally {
      // Reset input and suggestions
      setInputValue("");
      setShowSuggestions(false);
      setIsSearching(false);
  
      // Focus back on the input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  // Remove a file tag
  const removeFileTag = (tokenId: string) => {
    const tokenIndex = tokens.findIndex((t) => t.id === tokenId);
    if (tokenIndex === -1) return;

    const newTokens = [...tokens];

    // Remove the file token
    newTokens.splice(tokenIndex, 1);

    // If there are two adjacent text tokens now, merge them
    if (
      tokenIndex > 0 &&
      tokenIndex < newTokens.length &&
      newTokens[tokenIndex - 1].type === "text" &&
      newTokens[tokenIndex].type === "text"
    ) {
      newTokens[tokenIndex - 1].content += newTokens[tokenIndex].content;
      newTokens.splice(tokenIndex, 1);
    }

    setTokens(newTokens);

    // Focus back on the input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // Handle form submission
  const handleSubmit = () => {
    if (disabled) return;
    
    // Check if there's any content to submit
    const hasContent = tokens.some(token => 
      (token.type === "text" && token.content.trim() !== "") || 
      token.type === "file"
    );
    
    if (!hasContent && inputValue.trim() === "") {
      console.log('[UnifiedInput] Nothing to submit - empty message');
      return;
    }
    
    // Combine all tokens into a cleaned display message - without the file path information
    // Instead, we'll use files in the store for the actual API request
    const displayMessage = tokens
      .map((token) => {
        if (token.type === "text") return token.content;
        // Just add the file name with a special marker that will be detected and styled in chat-message
        return `@[${token.file?.name}](${token.file?.path})`;
      })
      .join("") + inputValue;
    
    console.log('[UnifiedInput] Submitting message:', displayMessage);
    
    // We don't need to add file references again as they were added when the files were selected
    // Just collect references to log what's being sent
    const files: Record<string, any> = {};
    tokens.forEach(token => {
      if (token.type === "file" && token.file) {
        const file = token.file;
        files[file.id] = {
          id: file.id,
          path: file.path,
          name: file.name
        };
      }
    });
    
    console.log('[UnifiedInput] Sending message with file references:', Object.keys(files).length);
    
    // Debug: Log file references to ensure they have content
    if (Object.keys(files).length > 0) {
      // Get all file references from the store to verify they have content
      const allFileRefs = useSpaceStore.getState().uiState.fileReferences;
      console.log(`[UnifiedInput] File references in store: ${allFileRefs.length}`);
      allFileRefs.forEach(ref => {
        console.log(`[UnifiedInput] File [${ref.name}]: Content size = ${ref.content?.length || 0} bytes`);
      });
    }
    
    // Make sure we have a non-empty message to submit
    let finalMessage = displayMessage;
    if (finalMessage.trim() === "") {
      console.log('[UnifiedInput] Warning: Empty message after processing - adding space to ensure it\'s sent');
      finalMessage = " "; // Add a space to ensure it's not empty
    }
    
    // Update the parent component's value with the display message
    const event = { target: { value: finalMessage } } as ChangeEvent<HTMLInputElement>;
    onChange(event);
    
    // Call the submit handler which will use the file references from the space store
    // Use a small timeout to ensure state changes have been processed
    setTimeout(() => {
      console.log('[UnifiedInput] Calling submit handler');
      onSubmit();
      
      // Reset state after submission
      setTokens([{ id: "initial", type: "text", content: "" }]);
      setInputValue("");
    }, 10);
  };

  // Cleanup function to remove timers when component unmounts
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      {children}
      
      {/* File Suggestions Popover */}
      {showSuggestions && (
        <div 
          className="absolute bottom-full left-0 right-0 z-50 mb-2 file-suggestions-menu"
          style={{ display: showSuggestions ? 'block' : 'none' }}
        >
          <div className="max-h-60 rounded-md bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg">
            <Command className="bg-transparent">
              <CommandList className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {isSearching ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
                    <span className="ml-2 text-white/60">Searching files...</span>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <CommandEmpty className="text-white/60 text-sm py-2 px-4">
                    No files found. Type to search your files.
                  </CommandEmpty>
                ) : (
                  <CommandGroup heading="Files" className="text-white/80">
                    {filteredFiles.map((file) => (
                      <CommandItem 
                        key={file.id} 
                        value={file.path} 
                        onSelect={() => selectFile(file)}
                        className="text-white/80 hover:bg-white/10"
                      >
                        <File className="mr-2 h-4 w-4 text-white/60" />
                        <span>{file.name}</span>
                        <span className="ml-2 text-xs text-white/40 truncate max-w-[200px]">{file.path}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>
        </div>
      )}
      
      <div
        className={`
          relative rounded-b-2xl
          bg-white/[0.03] border border-white/[0.05]
          transition-all duration-300
          overflow-hidden backdrop-blur-xl
          ${isFocused ? 'bg-white/[0.05] border-white/[0.1]' : ''}
        `}
      >
        <div className="flex items-center">
          <div className="flex-1">
            <div 
              ref={containerRef}
              className="flex flex-wrap items-center gap-1.5 p-3 min-h-[48px] max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
              onClick={handleContainerClick}
            >
              {tokens.map((token, index) =>
                token.type === "text" ? (
                  index === tokens.length - 1 ? (
                    <input
                      key={token.id}
                      ref={inputRef}
                      type="text"
                      className="flex-1 min-w-[120px] bg-transparent outline-none text-white/90 text-sm placeholder:text-white/40"
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => {
                        // Longer delay to allow clicks on the suggestions menu
                        setTimeout(() => {
                          if (!document.activeElement?.closest('.file-suggestions-menu')) {
                            setIsFocused(false);
                            setShowSuggestions(false);
                          }
                        }, 200);
                      }}
                      placeholder={tokens.length === 1 ? "Type @ to mention a file (Press ⌘+/ to focus)" : ""}
                    />
                  ) : (
                    <span key={token.id} className="inline-block text-white/90 text-sm">
                      {token.content}
                    </span>
                  )
                ) : (
                  <span
                    key={token.id}
                    className="inline-flex items-center gap-1 rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-sm text-cyan-300"
                  >
                    <File className="h-3 w-3" />
                    {token.file?.name}
                    <button
                      type="button"
                      className="ml-1 rounded-full hover:bg-cyan-500/30"
                      onClick={() => removeFileTag(token.id)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove</span>
                    </button>
                  </span>
                ),
              )}
            </div>
          </div>
          <div className="flex items-center mr-2">
            <Button
              variant="cyan"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              disabled={disabled}
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