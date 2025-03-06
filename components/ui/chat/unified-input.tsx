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

  const [fileResults, setFileResults] = useState<FileTag[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchFiles = useCallback(async (query: string) => {
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

  useEffect(() => {
    if (suggestionQuery) {
      searchFiles(suggestionQuery);
    }
  }, [suggestionQuery, searchFiles]);

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

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      inputRef.current?.focus();
    }
  };

  const lastSearchTimeRef = useRef<number>(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
    
    if (e.target.value.includes("@")) {
      const atIndex = e.target.value.lastIndexOf("@");
      const caretPosition = e.target.selectionStart || 0;
      
      if (caretPosition > atIndex && caretPosition <= atIndex + 20) {
        const query = e.target.value.substring(atIndex + 1, caretPosition);
        
        if (query !== suggestionQuery) {
          setSuggestionQuery(query);
          setShowSuggestions(true);
        }
      } else if (caretPosition <= atIndex) {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && value === "" && tokens.length > 0) {
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
      if (value.includes("@")) {
        const atIndex = value.lastIndexOf("@");
        const textBefore = value.substring(0, atIndex);
  
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
      
      // Clear the input after adding file token
      const event = { target: { value: "" } } as ChangeEvent<HTMLInputElement>;
      onChange(event);
    } catch (error) {
      console.error("Error selecting file:", error);
    } finally {
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

  // Track if a message is currently being submitted to prevent double submission
  const isSubmittingRef = useRef(false);

  const handleSubmit = async () => {
    if (disabled || isSubmittingRef.current) {
      console.log('[UnifiedInput] Submission blocked: disabled or already submitting');
      return;
    }
    
    isSubmittingRef.current = true;
    
    try {
      // Check if there's any content to submit
      const hasContent = tokens.some(token => 
        (token.type === "text" && token.content.trim() !== "") || 
        token.type === "file"
      );
      
      if (!hasContent && value.trim() === "") {
        console.log('[UnifiedInput] Nothing to submit - empty message');
        isSubmittingRef.current = false;
        return;
      }
      
      // Combine all tokens into a cleaned display message
      const displayMessage = tokens
        .map((token) => {
          if (token.type === "text") return token.content;
          return `@[${token.file?.name}](${token.file?.path})`;
        })
        .join("") + value;
      
      console.log('[UnifiedInput] Submitting message:', displayMessage);
      
      // Ensure non-empty message
      let finalMessage = displayMessage.trim() || " ";
      
      // Save the current state in case we need to restore it
      const savedTokens = [...tokens];
      
      try {
        // Update parent value and submit
        const event = { target: { value: finalMessage } } as ChangeEvent<HTMLInputElement>;
        onChange(event);
        await Promise.resolve(onSubmit());
        
        // Only clear tokens after successful submission
        setTokens([{ id: "initial", type: "text", content: "" }]);
        console.log('[UnifiedInput] Message submitted successfully');
      } catch (error) {
        console.error('[UnifiedInput] Submission failed:', error);
        throw error;
      }
    } catch (error) {
      console.error('[UnifiedInput] Error during submission:', error);
      // Restore tokens if submission fails
      setTokens(savedTokens);
    } finally {
      isSubmittingRef.current = false;
    }
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
                      value={value}
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