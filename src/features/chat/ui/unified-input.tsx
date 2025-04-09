import React, { ChangeEvent, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { File, Loader2, MessageSquare, X } from 'lucide-react';
import { Button } from "shared/components/button";
import { cn } from "shared/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from 'cmdk';
import path from 'path';
import { CommandCenterEvents, SearchEvents, MessageEvents } from '@/core/ipc/constants';
import { toast } from "shared/hooks/use-toast";


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
  externalFileReferences?: FileReference[];
  onFileReferencesChange?: (fileReferences: FileReference[]) => void;
  onSuggestionQueryChange?: (query: string, caretPosition: {x: number, y: number} | null) => void;
  onSelectFile?: (file: FileTag) => void;
  showSuggestions?: boolean;
  setShowSuggestions?: React.Dispatch<React.SetStateAction<boolean>>;
}

interface FileReference {
  id: string;
  name: string;
  path: string;
  content?: string;
  type?: string;
}

export const UnifiedInput: React.FC<UnifiedInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  children,
  externalFileReferences,
  onFileReferencesChange,
  onSuggestionQueryChange,
  onSelectFile,
  showSuggestions,
  setShowSuggestions
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([{ id: "initial", type: "text", content: "" }]);
  
  // Use external file references if provided, otherwise use internal state
  const [internalFileReferences, setInternalFileReferences] = useState<FileReference[]>([]);
  
  // Determine which file references to use
  const fileReferences = externalFileReferences || internalFileReferences;
  
  // Function to update file references
  const updateFileReferences = useCallback((newFileReferences: FileReference[] | ((prev: FileReference[]) => FileReference[])) => {
    if (onFileReferencesChange) {
      // If using external state, call the change handler
      const nextReferences = typeof newFileReferences === 'function' 
        ? newFileReferences(fileReferences) 
        : newFileReferences;
      onFileReferencesChange(nextReferences);
    } else {
      // Otherwise update internal state
      setInternalFileReferences(newFileReferences);
    }
  }, [fileReferences, onFileReferencesChange]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFileReference = (file: FileReference) => {
    updateFileReferences(prevReferences => {
      const existingFileIndex = prevReferences.findIndex(ref => ref.id === file.id);
      if (existingFileIndex !== -1) {
        // Update existing file reference
        const updatedReferences = [...prevReferences];
        updatedReferences[existingFileIndex] = file;
        return updatedReferences;
      } else {
        // Add new file reference
        return [...prevReferences, file];
      }
    });
  };

  const fileReferencesMap = useMemo(() => {
    const fileMap: Record<string, any> = {};
    fileReferences.forEach(fileRef => {
      fileMap[fileRef.id] = {
        id: fileRef.id,
        path: fileRef.path,
        name: fileRef.name,
        content: fileRef.content,
        type: fileRef.type || 'file'
      };
    });
    return fileMap;
  }, [fileReferences]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
    
    if (e.target.value.includes("@") && onSuggestionQueryChange) {
      const atIndex = e.target.value.lastIndexOf("@");
      const caretPosition = e.target.selectionStart || 0;
      
      if (caretPosition > atIndex && caretPosition <= atIndex + 20) {
        const query = e.target.value.substring(atIndex + 1, caretPosition);
        
        const rect = inputRef.current?.getBoundingClientRect();
        const position = rect ? { 
          x: rect.left, 
          y: rect.top 
        } : null;
        
        onSuggestionQueryChange(query, position);
      } else if (caretPosition <= atIndex && setShowSuggestions) {
        setShowSuggestions(false);
      }
    } else if (setShowSuggestions) {
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
    } else if (e.key === "Escape" && showSuggestions && setShowSuggestions) {
      setShowSuggestions(false);
      e.preventDefault();
    } else if (e.key === "Enter" && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle a selected file from the parent component
  const handleFileSelection = (file: FileTag) => {
    if (!onSelectFile) return;
    
    // Create a new file token
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

      // Add the file token and a new empty text token
      setTokens([...newTokens, fileToken, newTextToken]);
    } else {
      // Just add the file token after the current text
      setTokens([...tokens, fileToken, newTextToken]);
    }
    
    // Clear the input after adding file token
    const event = { target: { value: "" } } as ChangeEvent<HTMLInputElement>;
    onChange(event);
    
    // Call parent's onSelectFile
    onSelectFile(file);
    
    // Focus back on the input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // Remove a token (file or message)
  const removeToken = (tokenId: string) => {
    const tokenIndex = tokens.findIndex((t) => t.id === tokenId);
    if (tokenIndex === -1) return;

    const newTokens = [...tokens];
    const removedToken = newTokens[tokenIndex];

    // Remove the token
    newTokens.splice(tokenIndex, 1);

    // Remove associated file reference if it's a file token
    if (removedToken.type === "file" && removedToken.file) {
      updateFileReferences(prevReferences => 
        prevReferences.filter(ref => ref.id !== removedToken.file?.id)
      );
    }

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
      console.log('[UnifiedInput] File references:', fileReferencesMap);
      
      // Ensure non-empty message
      const finalMessage = displayMessage.trim() || " ";
      
      try {
        // Save the current state in case we need to restore it
        const savedTokens = [...tokens];

        // Update parent value and submit
        const event = { target: { value: finalMessage } } as ChangeEvent<HTMLInputElement>;
        onChange(event);
        await Promise.resolve(onSubmit());
        
        // Only clear tokens and file references after successful submission
        setTokens([{ id: "initial", type: "text", content: "" }]);
        // Clear file references only if using internal state
        if (!externalFileReferences) {
          updateFileReferences([]);
        }
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
    // If parent provided selected file, handle it
    if (onSelectFile && showSuggestions === false) {
      // Clear the input
      inputRef.current?.focus();
    }
  }, [showSuggestions, onSelectFile]);

  // Effect to sync external file references with tokens
  useEffect(() => {
    if (externalFileReferences && externalFileReferences.length > 0) {
      // Check if we need to add new file tokens for any references not yet in tokens
      const existingFileTokenIds = tokens
        .filter(token => token.type === 'file' && token.file)
        .map(token => token.file?.id);
      
      // Find file references not yet in tokens
      const newFileReferences = externalFileReferences.filter(
        ref => !existingFileTokenIds.includes(ref.id)
      );
      
      if (newFileReferences.length > 0) {
        // Add new tokens for each new file reference
        const updatedTokens = [...tokens];
        
        // If the last token is an empty text token, remove it first
        if (updatedTokens.length > 0 && 
            updatedTokens[updatedTokens.length - 1].type === 'text' && 
            updatedTokens[updatedTokens.length - 1].content === '') {
          updatedTokens.pop();
        }
        
        // Add file tokens
        newFileReferences.forEach(fileRef => {
          updatedTokens.push({
            id: `token-${fileRef.id}`,
            type: 'file',
            content: fileRef.name,
            file: {
              id: fileRef.id,
              name: fileRef.name,
              path: fileRef.path
            }
          });
        });
        
        // Add an empty text token at the end
        updatedTokens.push({
          id: `text-${Date.now()}`,
          type: 'text',
          content: ''
        });
        
        setTokens(updatedTokens);
      }
    }
  }, [externalFileReferences]);

  return (
    <div
      className={cn(
        "command-glass-effect relative rounded-2xl",
        "transition-all duration-300",
        "divide-y divide-white/[0.05]",
        isFocused && "bg-white/[0.03]"
      )}
    >
      {children}
      
      <div>
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
                            if (setShowSuggestions) setShowSuggestions(false);
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