import { useChat } from '@ai-sdk/react';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { useSpaces } from '@/hooks/use-spaces';
import { useConversations } from '@/hooks/use-conversations';
import { ChatMessages } from './chat-messages';
import { useRendererStore } from '@/store/renderer';
import { API_BASE_URL } from '@/config/api';
import { useCommandWindow } from '@/hooks/use-command-window';
import { toast } from '@/hooks/use-toast';
import { Conversation } from '@/types/conversation';
import path from 'path';
import { CommandCenterEvents, MessageEvents } from '@/core/ipc/constants';
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
  const { activeSpace, isLoading: isSpaceLoading } = useSpaces();
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
        }
      } catch (error) {
        fileContent = `[Error loading file content: ${error instanceof Error ? error.message : String(error)}]`;
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
      console.error("Error selecting file:", error);
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