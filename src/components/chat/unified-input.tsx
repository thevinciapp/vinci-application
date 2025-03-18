"use client";

import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { File, Loader2, MessageSquare, X } from 'lucide-react';
import { Button, cn } from "vinci-ui";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from 'cmdk';
import path from 'path';
import { CommandCenterEvents, SearchEvents, MessageEvents } from '@/src/core/ipc/constants';


type FileTag = {
  id: string
  name: string
  path: string
}

type MessageTag = {
  id: string
  name: string
  conversationTitle: string
  role: 'user' | 'assistant' | 'system'
  conversationId: string
}

type Token = {
  id: string
  type: "text" | "file" | "message"
  content: string
  file?: FileTag
  message?: MessageTag
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

  interface FileReference {
    id: string;
    name: string;
    path: string;
    content?: string;
    type?: string;
  }

  const addFileReference = (file: FileReference) => {
    // We'll handle this through props in the future
    console.log('File reference added:', file);
  };
  
  // These will come from props in the future
  const spaceId = undefined;
  const activeConversationId = undefined;

  const [fileResults, setFileResults] = useState<FileTag[]>([]);
  const [messageResults, setMessageResults] = useState<MessageTag[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search for files using CommandCenterEvents
  const searchFiles = useCallback(async (query: string) => {
    if (!query.trim()) {
      setFileResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await window.electron.invoke(CommandCenterEvents.SEARCH_FILES, query);
      
      if (response.success && response.data) {
        // Convert to file tags
        const fileTags: FileTag[] = response.data.map((item: any) => ({
          id: item.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: item.name || item.fileName || path.basename(item.path),
          path: item.path || '',
        }));
        
        setFileResults(fileTags);
      } else {
        console.error("Error searching files:", response.error);
        setFileResults([]);
      }
    } catch (error) {
      console.error("Error searching files:", error);
      // Provide fallback results in case of error
      setFileResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Search for messages using SearchEvents
  const searchMessages = useCallback(async (query: string) => {
    if (!query.trim()) {
      setMessageResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const searchOptions = {
        query,
        limit: 10,
        conversationId: activeConversationId, // Optional filter by conversation
        spaceId: spaceId // Optional filter by space
      };
      
      const response = await window.electron.invoke(SearchEvents.SEARCH_MESSAGES, searchOptions);
      
      if (response.success && response.data) {
        // Convert to message tags
        const messageTags: MessageTag[] = response.data.map((item: any) => ({
          id: item.id || `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: item.content?.substring(0, 50) + (item.content?.length > 50 ? '...' : '') || 'Message',
          conversationTitle: item.conversationTitle || 'Unknown conversation',
          role: item.role || 'user',
          conversationId: item.conversationId || ''
        }));
        
        setMessageResults(messageTags);
      } else {
        console.error("Error searching messages:", response.error);
        setMessageResults([]);
      }
    } catch (error) {
      console.error("Error searching messages:", error);
      setMessageResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [activeConversationId, spaceId]);

  useEffect(() => {
    if (suggestionQuery) {
      // Search both files and messages concurrently
      searchFiles(suggestionQuery);
      searchMessages(suggestionQuery);
    }
  }, [suggestionQuery, searchFiles, searchMessages]);

  // Create memoized filtered results for both files and messages
  const filteredFiles = React.useMemo(() => {
    if (!suggestionQuery) return fileResults;
    return fileResults;
  }, [suggestionQuery, fileResults]);

  const filteredMessages = React.useMemo(() => {
    if (!suggestionQuery) return messageResults;
    return messageResults;
  }, [suggestionQuery, messageResults]);

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
      // Remove the last token if backspace is pressed and input is empty
      const lastToken = tokens[tokens.length - 1];
      if (lastToken.type === "file" || lastToken.type === "message") {
        const newTokens = [...tokens];
        newTokens.pop();
        setTokens(newTokens);
      }
    } else if (e.key === "Escape" && showSuggestions) {
      setShowSuggestions(false);
      e.preventDefault();
    } else if (e.key === "Enter" && showSuggestions) {
      // Handle selecting the first suggestion based on available results
      if (filteredFiles.length > 0) {
        selectFile(filteredFiles[0]);
        e.preventDefault();
      } else if (filteredMessages.length > 0) {
        selectMessage(filteredMessages[0]);
        e.preventDefault();
      }
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
      // Read file content using CommandCenterEvents.READ_FILE
      console.log(`Loading content for file: ${file.path}`);
      let fileContent = '';
      
      try {
        const response = await window.electron.invoke(CommandCenterEvents.READ_FILE, file.path);
        if (response.success && response.data) {
          fileContent = response.data.content;
          console.log(`File content loaded, size: ${fileContent.length} bytes`);
        } else {
          console.error(`Error loading file content: ${response.error}`);
          fileContent = `[Error loading file content: ${response.error}]`;
        }
      } catch (error) {
        console.error(`Error loading file content for ${file.path}:`, error);
        fileContent = `[Error loading file content: ${error instanceof Error ? error.message : String(error)}]`;
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
      
      // Add the file reference
      addFileReference({
        id: fileToken.id,
        path: file.path,
        name: file.name,
        content: fileContent || '',
        type: 'file'
      });
      
      console.log(`Added file reference: ${file.name} with content`);
  
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

  // Select a message from suggestions
  const selectMessage = async (message: MessageTag) => {
    setIsSearching(true);
    
    try {
      // Fetch the message content using the MessageEvents
      console.log(`Loading content for message: ${message.id}`);
      let messageContent = '';
      
      try {
        // Get the message by its ID
        const messageId = message.id.replace('message-', '');
        const response = await window.electron.invoke(MessageEvents.GET_CONVERSATION_MESSAGES, message.conversationId, messageId);
        
        if (response.success && response.data?.length > 0) {
          const messageData = response.data[0];
          messageContent = messageData.content;
          console.log(`Message content loaded, size: ${messageContent.length} bytes`);
        } else {
          console.error(`Error loading message data: ${response.error || 'Message not found'}`);
          messageContent = `[Error loading message content]`;
        }
      } catch (error) {
        console.error(`Error loading message content for ${message.id}:`, error);
        messageContent = `[Error loading message content: ${error instanceof Error ? error.message : String(error)}]`;
      }
      
      // Create a new message token
      const messageToken: Token = {
        id: message.id || `message-${Date.now()}`,
        type: "message",
        content: messageContent.substring(0, 30) + (messageContent.length > 30 ? '...' : ''),
        message: {
          id: message.id,
          name: message.name,
          conversationTitle: message.conversationTitle,
          role: message.role,
          conversationId: message.conversationId
        }
      };
      
      // Add a new empty text token
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
  
        // Add the message token and a new empty text token
        setTokens([...newTokens, messageToken, newTextToken]);
      } else {
        // Just add the message token after the current text
        setTokens([...tokens, messageToken, newTextToken]);
      }
      
      // Clear the input after adding message token
      const event = { target: { value: "" } } as ChangeEvent<HTMLInputElement>;
      onChange(event);
    } catch (error) {
      console.error("Error selecting message:", error);
    } finally {
      setShowSuggestions(false);
      setIsSearching(false);
  
      // Focus back on the input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  // Remove a token (file or message)
  const removeToken = (tokenId: string) => {
    const tokenIndex = tokens.findIndex((t) => t.id === tokenId);
    if (tokenIndex === -1) return;

    const newTokens = [...tokens];

    // Remove the token
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
        token.type === "file" ||
        token.type === "message"
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
          if (token.type === "file") return `@[${token.file?.name}](${token.file?.path})`;
          if (token.type === "message") {
            return `@[${token.message?.role === 'assistant' ? 'AI' : 'User'}](${token.message?.conversationTitle})`;
          }
          return '';
        })
        .join("") + value;
      
      console.log('[UnifiedInput] Submitting message:', displayMessage);
      
      // Ensure non-empty message
      let finalMessage = displayMessage.trim() || " ";
      
      try {
        // Save the current state in case we need to restore it
        const savedTokens = [...tokens];

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
      setTokens([{ id: "initial", type: "text", content: "" }]);
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
    <div
  className={cn(
    "command-glass-effect relative rounded-2xl",
    "transition-all duration-300",
    isFocused && "bg-white/[0.05] border-white/[0.1]"
  )}
>
      {children}
      
      {/* Suggestions Popover (Files & Messages) */}
      {showSuggestions && (
        <div 
          className="absolute bottom-full left-0 right-0 z-50 mb-2 file-suggestions-menu"
          style={{ display: showSuggestions ? 'block' : 'none' }}
        >
          <div className="max-h-60 rounded-md bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg">
            <Command className="bg-transparent">
              <CommandList className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {isSearching ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
                    <span className="ml-2 text-white/60">Searching files and messages...</span>
                  </div>
                ) : filteredFiles.length === 0 && filteredMessages.length === 0 ? (
                  <CommandEmpty className="text-white/60 text-sm py-2 px-4">
                    No results found. Try a different search term.
                  </CommandEmpty>
                ) : (
                  <>
                    {/* File search results */}
                    {filteredFiles.length > 0 && (
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
                    
                    {/* Message search results */}
                    {filteredMessages.length > 0 && (
                      <CommandGroup heading="Messages" className="text-white/80">
                        {filteredMessages.map((message) => (
                          <CommandItem 
                            key={message.id} 
                            value={message.name} 
                            onSelect={() => selectMessage(message)}
                            className="text-white/80 hover:bg-white/10"
                          >
                            <MessageSquare className={`mr-2 h-4 w-4 ${message.role === 'assistant' ? 'text-cyan-400' : 'text-white/60'}`} />
                            <div className="flex flex-col">
                              <span className="truncate max-w-[300px]">{message.name}</span>
                              <span className="text-xs text-white/40">From: {message.conversationTitle}</span>
                            </div>
                            <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                              {message.role === 'assistant' ? 'AI' : 'User'}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </>
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
                      className="flex-1 min-w-[120px] bg-transparent outline-hidden text-white/90 text-sm placeholder:text-white/40"
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
                      placeholder={tokens.length === 1 ? "Type @ to mention a file or message (Press ⌘+/ to focus)" : ""}
                    />
                  ) : (
                    <span key={token.id} className="inline-block text-white/90 text-sm">
                      {token.content}
                    </span>
                  )
                ) : token.type === "file" ? (
                  <span
                    key={token.id}
                    className="inline-flex items-center gap-1 rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-sm text-cyan-300"
                  >
                    <File className="h-3 w-3" />
                    {token.file?.name}
                    <button
                      type="button"
                      className="ml-1 rounded-full hover:bg-cyan-500/30"
                      onClick={() => removeToken(token.id)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove</span>
                    </button>
                  </span>
                ) : (
                  <span
                    key={token.id}
                    className="inline-flex items-center gap-1 rounded-md bg-purple-500/20 px-1.5 py-0.5 text-sm text-purple-300"
                  >
                    <MessageSquare className="h-3 w-3" />
                    {token.message?.role === 'assistant' ? 'AI' : 'User'} message
                    <button
                      type="button"
                      className="ml-1 rounded-full hover:bg-purple-500/30"
                      onClick={() => removeToken(token.id)}
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