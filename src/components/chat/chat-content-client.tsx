import { useChat } from '@ai-sdk/react';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { ArrowDown, Search, File, Loader2, MessageSquare } from 'lucide-react';
import { useSpaces } from '@/hooks/use-spaces';
import { useConversations } from '@/hooks/use-conversations';
import { UnifiedInput } from './unified-input';
import { ChatMessages } from './chat-messages';
import { UserProfileDropdown } from '@/components/auth/user-profile-dropdown';
import { SpaceTab } from '@/components/chat/ui/space-tab';
import { ModelTab } from '@/components/chat/ui/model-tab';
import { ChatModeTab } from '@/components/chat/ui/chat-mode-tab';
import { ActionsTab } from '@/components/chat/ui/actions-tab';
import { TasksTab } from '@/components/chat/ui/tasks-tab';
import { SuggestionsTab } from '@/components/chat/ui/suggestions-tab';
import { MessagesTab } from '@/components/chat/ui/messages-tab';
import { useRendererStore } from '@/store/renderer';
import { API_BASE_URL } from '@/config/api';
import { useCommandWindow } from '@/hooks/use-command-window';
import { ConversationTab } from '@/components/chat/ui/conversation-tab';
import { BaseTab } from '@/components/ui/base-tab';
import { toast } from '@/hooks/use-toast';
import { Conversation } from '@/types/conversation';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from 'cmdk';
import path from 'path';
import { CommandCenterEvents, MessageEvents } from '@/core/ipc/constants';

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

export default function ChatContent() {
  const { user, messages: messagesFromStore } = useRendererStore();
  const { activeSpace, isLoading: isSpaceLoading } = useSpaces();
  const { 
    activeConversation, 
    setActiveConversation,
    createConversation 
  } = useConversations();
  const { handleCommandWindowToggle } = useCommandWindow();

  const [searchMode, setSearchMode] = useState<'chat' | 'search' | 'semantic' | 'hybrid'>('chat');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [fileReferences, setFileReferences] = useState<any[]>([]);
  const [isStickToBottom, setIsStickToBottom] = useState(true);

  // Suggestion states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [fileResults, setFileResults] = useState<FileTag[]>([]);
  const [messageResults, setMessageResults] = useState<MessageTag[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [atCaretPosition, setAtCaretPosition] = useState<{x: number, y: number} | null>(null);

  const clearFileReferences = () => setFileReferences([]);
  const fileReferencesMap = useMemo(() => {
    const fileMap: Record<string, any> = {};
    fileReferences.forEach(fileRef => {
      fileMap[fileRef.id] = {
        id: fileRef.id,
        path: fileRef.path,
        name: fileRef.name,
        content: fileRef.content,
        type: fileRef.type
      };
    });
    return fileMap;
  }, [fileReferences]);

  const initialMessages = useMemo(() => messagesFromStore || [], [messagesFromStore]);

  const chatKey = `${activeConversation?.id || 'default'}-${activeSpace?.provider || ''}-${activeSpace?.model || ''}`;
  
  async function getHeaders() {
    const response = await window.electron.invoke('AUTH_TOKEN');
    console.log('Get auth token response:', response);
    if (!response.success || !response.data) {
      throw new Error('Failed to get access token');
    }
    return {
      Authorization: `Bearer ${response.data.accessToken}`,
    };
  }

  const customFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    console.log('Custom fetch called with URL:', input);
    console.log('Custom fetch called with init:', init);
    const headers = await getHeaders(); 

    console.log('Headers:', headers);

    const url = typeof input === 'string' ? input : input.toString();

    const updatedOptions: RequestInit = {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...headers,
      },
    };

    console.log('Custom fetch called with updated URL:', url);

    return fetch(url, updatedOptions); 
  };

  const chatConfig = useMemo(() => ({
    id: chatKey,
    api: `${API_BASE_URL}/api/chat`,
    initialMessages: initialMessages as any,
    fetch: customFetch,
    body: {
      spaceId: activeSpace?.id || '',
      conversationId: activeConversation?.id || null,
      provider: activeSpace?.provider || '',
      model: activeSpace?.model || '',
      searchMode,
      chatMode: activeSpace?.chat_mode || 'ask',
      chatModeConfig: activeSpace?.chat_mode_config || { tools: [] },
      files: fileReferencesMap,
    },
    onFinish() {
      setData([]);
      clearFileReferences();
    },
  }), [
    chatKey,
    initialMessages,
    customFetch,
    activeSpace?.id,
    activeConversation?.id,
    activeSpace?.provider,
    activeSpace?.model,
    searchMode,
    activeSpace?.chat_mode,
    activeSpace?.chat_mode_config,
    fileReferencesMap,
  ]);

  const {
    messages,
    input,
    status,
    handleInputChange,
    handleSubmit,
    data,
    setData,
  } = useChat(chatConfig);

  // Search for files using CommandCenterEvents
  const searchFiles = useCallback(async (query: string) => {
    if (!query.trim()) {
      setFileResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await window.electron.invoke(CommandCenterEvents.SEARCH_FILES, {
        query,
        limit: 10,
        type: 'file',
        includeContent: false,
      });
      
      if (response.success && response.data) {
        const fileTags: FileTag[] = response.data
          .filter((item: any) => item && item.path)
          .map((item: any) => ({
            id: item.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: item.name || item.fileName || path.basename(item.path),
            path: item.path,
          }));
        
        setFileResults(fileTags);
      } else {
        console.error("Error searching files:", response.error);
        setFileResults([]);
      }
    } catch (error) {
      console.error("Error searching files:", error);
      setFileResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Select a file from suggestions
  const selectFile = async (file: FileTag) => {
    setIsSearching(true);
    
    try {
      let fileContent = '';
      
      try {
        const response = await window.electron.invoke(CommandCenterEvents.READ_FILE, {
          filePath: file.path,
          maxSize: 1024 * 1024,
        });
        
        if (response.success && response.data) {
          fileContent = response.data.content;
        } else {
          fileContent = `[Error loading file content: ${response.error}]`;
        }
      } catch (error) {
        fileContent = `[Error loading file content: ${error instanceof Error ? error.message : String(error)}]`;
      }
      
      // Create a unique ID for this file if it doesn't have one
      const fileId = file.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add the file reference with content
      setFileReferences(prev => {
        const existingFileIndex = prev.findIndex(ref => ref.id === fileId);
        if (existingFileIndex !== -1) {
          const updatedReferences = [...prev];
          updatedReferences[existingFileIndex] = {
            id: fileId,
            path: file.path,
            name: file.name,
            content: fileContent,
            type: 'file'
          };
          return updatedReferences;
        } else {
          return [...prev, {
            id: fileId,
            path: file.path,
            name: file.name,
            content: fileContent,
            type: 'file'
          }];
        }
      });
      
      // Process input to replace @query with empty string
      if (input.includes('@')) {
        const atIndex = input.lastIndexOf('@');
        const newInput = input.substring(0, atIndex);
        handleInputChange({ target: { value: newInput } } as any);
      }
      
    } catch (error) {
      console.error("Error selecting file:", error);
    } finally {
      setShowSuggestions(false);
      setIsSearching(false);
    }
  };

  // Track suggestion-related actions
  const handleSuggestionQueryChange = (query: string, caretPosition: { x: number, y: number } | null) => {
    setSuggestionQuery(query);
    setAtCaretPosition(caretPosition);
    
    if (query.trim()) {
      setShowSuggestions(true);
      searchFiles(query);
    } else {
      setShowSuggestions(false);
    }
  };

  // Effect to update search results when query changes
  useEffect(() => {
    if (suggestionQuery) {
      searchFiles(suggestionQuery);
    }
  }, [suggestionQuery, searchFiles]);

  // Create memoized filtered results for both files and messages
  const filteredFiles = useMemo(() => {
    if (!suggestionQuery) return fileResults;
    return fileResults;
  }, [suggestionQuery, fileResults]);

  const filteredMessages = useMemo(() => {
    if (!suggestionQuery) return messageResults;
    return messageResults;
  }, [suggestionQuery, messageResults]);

  const handleStickToBottomChange = useCallback((isAtBottom: boolean) => {
    setIsStickToBottom(isAtBottom);
  }, []);

  const scrollToBottomHandler = useRef<() => void>(() => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  });

  const handleScrollToBottom = useCallback((callback: () => void) => {
    scrollToBottomHandler.current = callback;
  }, []);

  const handleCreateConversation = async (title: string = 'New Conversation') => {
    if (!activeSpace?.id) {
      toast({
        title: 'Error',
        description: 'Please select a space first',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createConversation(activeSpace.id, title);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive',
      });
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    try {
      await setActiveConversation(conversation);
    } catch (error) {
      console.error('Error selecting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to select conversation',
        variant: 'destructive',
      });
    }
  };

  // Select a message from suggestions
  const selectMessage = async (message: MessageTag) => {
    setIsSearching(true);
    
    try {
      let messageContent = '';
      
      try {
        const messageId = message.id.replace('message-', '');
        const response = await window.electron.invoke(MessageEvents.GET_CONVERSATION_MESSAGES, message.conversationId, messageId);
        
        if (response.success && response.data?.length > 0) {
          const messageData = response.data[0];
          messageContent = messageData.content;
        } else {
          messageContent = `[Error loading message content]`;
        }
      } catch (error) {
        messageContent = `[Error loading message content: ${error instanceof Error ? error.message : String(error)}]`;
      }
      
      // Add reference as needed
      // You could store message references similar to file references if needed
      
    } catch (error) {
      console.error("Error selecting message:", error);
    } finally {
      setShowSuggestions(false);
      setIsSearching(false);
    }
  };

  return (
    <div className="h-full w-full">
      <div className="fixed top-4 right-4 z-50">
        {user && <UserProfileDropdown user={user} />}
      </div>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div
          className="relative p-1 rounded-full command-glass-effect">
          <div className="flex items-center divide-x divide-white/[0.08]">
            <div className="px-1 first:pl-1 last:pr-1">
              <SpaceTab activeSpace={activeSpace} />
            </div>
            <div className="px-1 first:pl-1 last:pr-1">
              <ModelTab space={activeSpace} />
            </div>
            <div className="px-1 first:pl-1 last:pr-1">
              <ChatModeTab space={activeSpace} />
            </div>
            {!isStickToBottom && messages.length > 0 && (
              <div className="px-1 first:pl-1 last:pr-1">
                <BaseTab
                  icon={<ArrowDown className="w-3 h-3" />}
                  label="Scroll to Bottom"
                  onClick={() => {
                    scrollToBottomHandler.current();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 w-full h-full flex flex-col">
        <ChatMessages
          messages={messages}
          onStickToBottomChange={handleStickToBottomChange}
          onScrollToBottom={handleScrollToBottom}
          ref={messagesContainerRef}
          isLoading={status !== 'ready' || isSpaceLoading}
          streamData={data}
        />
        <div className="fixed left-1/2 bottom-8 -translate-x-1/2 w-[800px] z-50">
          <div className="relative w-full">
            {showSuggestions && (
              <div 
                className="absolute bottom-full left-0 right-0 z-[100] mb-4 file-suggestions-menu"
                style={{ display: showSuggestions ? 'block' : 'none' }}
              >
                <div className="max-h-60 rounded-md bg-white/[0.03] backdrop-blur-xl">
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
                          {filteredFiles.length > 0 && (
                            <CommandGroup heading="Files" className="text-white/80">
                              {filteredFiles.map((file) => (
                                <CommandItem 
                                  key={file.id} 
                                  value={file.path} 
                                  onSelect={() => selectFile(file)}
                                  className="text-white/80 hover:bg-white/[0.05] hover:text-white/95 transition-all duration-200"
                                >
                                  <File className="mr-2 h-4 w-4 text-white/60" />
                                  <span>{file.name}</span>
                                  <span className="ml-2 text-xs text-white/40 truncate max-w-[200px]">{file.path}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          
                          {filteredMessages.length > 0 && (
                            <CommandGroup heading="Messages" className="text-white/80">
                              {filteredMessages.map((message) => (
                                <CommandItem 
                                  key={message.id} 
                                  value={message.name} 
                                  onSelect={() => selectMessage(message)}
                                  className="text-white/80 hover:bg-white/[0.05] hover:text-white/95 transition-all duration-200"
                                >
                                  <MessageSquare className={`mr-2 h-4 w-4 ${message.role === 'assistant' ? 'text-cyan-400' : 'text-white/60'}`} />
                                  <div className="flex flex-col">
                                    <span className="truncate max-w-[300px]">{message.name}</span>
                                    <span className="text-xs text-white/40">From: {message.conversationTitle}</span>
                                  </div>
                                  <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-white/[0.05] text-white/60">
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

            <UnifiedInput
              value={input}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              disabled={!activeSpace || !activeConversation || status !== 'ready'}
              externalFileReferences={fileReferences}
              onFileReferencesChange={setFileReferences}
              onSuggestionQueryChange={handleSuggestionQueryChange}
              onSelectFile={selectFile}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
            >
              <div className="flex items-center divide-x divide-white/[0.05]">
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
                  <ActionsTab onCreateConversation={handleCreateConversation} />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
                  <MessagesTab
                    messages={messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
                      id: m.id || '',
                      content: typeof m.content === 'string' ? m.content : '',
                      role: m.role as 'user' | 'assistant',
                      timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
                      annotations: m.annotations || []
                    }))}
                    conversationId={activeConversation?.id}
                    conversationName={activeConversation?.title}
                    spaceId={activeSpace?.id}
                    spaceName={activeSpace?.name}
                    onCommandWindowToggle={(mode) => handleCommandWindowToggle(mode as any)}
                    onMessageSearch={(query, searchScope) => {
                      if (searchScope === 'space') {
                        toast({
                          title: "Space Search",
                          description: `Searching entire space for "${query}"`,
                          variant: "default",
                        });
                      } else {
                        handleCommandWindowToggle('messageSearch');
                      }
                    }}
                  />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
                  <TasksTab />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
                  <SuggestionsTab />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
                  <ConversationTab
                    onCreateConversation={handleCreateConversation}
                    onSelectConversation={handleSelectConversation}
                    activeConversation={activeConversation}
                  />
                </div>
              </div>
            </UnifiedInput>
          </div>
        </div>
      </div>
    </div>
  );
}