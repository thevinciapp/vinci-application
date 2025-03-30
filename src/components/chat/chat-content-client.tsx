import { Message, useChat } from '@ai-sdk/react';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { useSpaces } from '@/hooks/use-spaces';
import { useConversations } from '@/hooks/use-conversations';
import { ChatMessages } from './chat-messages';
import { useRendererStore } from '@/store/renderer';
import { API_BASE_URL } from '@/config/api';
import { useCommandWindow } from '@/hooks/use-command-window';
import { toast } from '@/hooks/use-toast';
import { Conversation } from '@/types/conversation';
import { CommandCenterEvents, AuthEvents } from '@/core/ipc/constants';
import { useFileReferences } from '@/hooks/use-file-references';
import { ChatTopBar } from './ui/chat-top-bar';
import { ChatInputArea } from './chat-input-area';

type FileTag = {
  id: string
  name: string
  path: string
}

export default function ChatContent() {
  const { user, messages: messagesFromStore } = useRendererStore();
  const { spaces, activeSpace, setActiveSpaceById, isLoading: isSpaceLoading } = useSpaces();
  const { 
    activeConversation, 
    setActiveConversation,
    createConversation 
  } = useConversations();
  const { handleCommandWindowToggle } = useCommandWindow();
  const { fileReferences, setFileReferences, clearFileReferences, fileReferencesMap } = useFileReferences();

  const [searchMode, setSearchMode] = useState<'chat' | 'search' | 'semantic' | 'hybrid'>('chat');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isStickToBottom, setIsStickToBottom] = useState(true);

  const initialMessages = useMemo(() => messagesFromStore || [], [messagesFromStore]);

  const chatKey = `${activeConversation?.id || 'default'}-${activeSpace?.provider || ''}-${activeSpace?.model || ''}`;
  
  async function getHeaders() {
    try {
      const response = await window.electron.invoke(AuthEvents.GET_AUTH_TOKEN);
      if (!response.success || !response.data?.accessToken) {
        console.error('Failed to get access token:', response.error || 'No data returned');
        throw new Error('Failed to get access token');
      }
      return {
        Authorization: `Bearer ${response.data.accessToken}`,
      };
    } catch (error) {
      console.error('Error fetching auth token:', error);
      throw new Error(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const customFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const headers = await getHeaders();

      const url = typeof input === 'string' ? input : input.toString();

      const updatedOptions: RequestInit = {
        ...init,
        headers: {
          ...(init?.headers || {}),
          ...headers,
        },
      };

      return fetch(url, updatedOptions);
    } catch (error) {
      console.error('Failed to prepare fetch request due to auth error:', error);
      toast({
        title: 'Authentication Error',
        description: `Could not retrieve authentication token. Please try logging out and back in. Details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
        duration: 9000,
      });
      throw new Error('Failed to prepare request due to authentication error.');
    }
  };

  const chatConfig = useMemo(() => ({
    id: chatKey,
    api: `${API_BASE_URL}/api/chat`,
    initialMessages: initialMessages as Message[],
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
    clearFileReferences
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

  const selectFile = async (file: FileTag) => {
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
          toast({
            title: "Error Reading File",
            description: `Could not read file content for "${file.name}": ${response.error || 'Unknown error'}`,
            variant: "destructive",
          });
        }
      } catch (error) {
        fileContent = `[Error loading file content: ${error instanceof Error ? error.message : String(error)}]`;
        toast({
          title: "Error Reading File",
          description: `An unexpected error occurred while reading "${file.name}": ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        });
      }
      
      const fileId = file.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      
      if (input.includes('@')) {
        const atIndex = input.lastIndexOf('@');
        const newInput = input.substring(0, atIndex);
        handleInputChange({ target: { value: newInput } } as any);
      }
      
    } catch (error) {
      console.error("Error processing selected file:", error);
      toast({
        title: "Error Processing File",
        description: `An unexpected error occurred while processing the file reference for "${file.name}".`,
        variant: "destructive",
      });
    }
  };

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

  const scrollToBottom = useCallback(() => {
    scrollToBottomHandler.current();
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

  return (
    <div className="h-full w-full">
      <ChatTopBar
        user={user}
        activeSpace={activeSpace}
        spaces={spaces}
        setActiveSpaceById={setActiveSpaceById}
        isStickToBottom={isStickToBottom}
        messagesLength={messages.length}
        onScrollToBottom={scrollToBottom}
      />
      
      <div className="flex-1 w-full h-full flex flex-col">
        <ChatMessages
          messages={messages}
          onStickToBottomChange={handleStickToBottomChange}
          onScrollToBottom={handleScrollToBottom}
          ref={messagesContainerRef}
          isLoading={status !== 'ready' || isSpaceLoading}
          streamData={data}
        />
        
        <ChatInputArea
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
              disabled={!activeSpace || !activeConversation || status !== 'ready'}
          fileReferences={fileReferences}
          setFileReferences={setFileReferences}
          messages={messages}
          activeConversation={activeConversation}
          activeSpace={activeSpace}
                    onCreateConversation={handleCreateConversation}
                    onSelectConversation={handleSelectConversation}
          onCommandWindowToggle={handleCommandWindowToggle}
          onSelectFile={selectFile}
                  />
      </div>
    </div>
  );
}