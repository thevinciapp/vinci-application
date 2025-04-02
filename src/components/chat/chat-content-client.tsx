import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useSpaces } from '@/hooks/use-spaces';
import { useConversations } from '@/hooks/use-conversations';
import { ChatMessages } from './chat-messages';
import { useUser } from '@/hooks/use-user';
import { useMessages } from '@/hooks/use-messages';
import { useCommandWindow } from '@/hooks/use-command-window';
import { useToast } from '@/hooks/use-toast';
import { Conversation } from '@/types/conversation';
import { CommandCenterEvents, AppStateEvents, ChatEvents, MessageEvents } from '@/core/ipc/constants';
import { useFileReferences } from '@/hooks/use-file-references';
import { ChatTopBar } from './ui/chat-top-bar';
import { ChatInputArea } from './chat-input-area';
import { Message } from '@/types/message';
import { Logger } from '@/utils/logger';
import { Message as VercelMessage } from '@ai-sdk/react';
import { IpcResponse } from '@/types/ipc';

const logger = new Logger('ChatContentClient');

type FileTag = {
  id: string;
  name: string;
  path: string;
};

export default function ChatContent() {
  const { profile: user } = useUser();
  const { messages: allMessages, isLoading: messagesLoading } = useMessages();
  const { spaces, activeSpace, setActiveSpaceById, isLoading: isSpaceLoading } = useSpaces();
  const {
    activeConversation,
    setActiveConversation,
    createConversation,
  } = useConversations();
  const { handleCommandWindowToggle } = useCommandWindow();
  const { fileReferences, setFileReferences, clearFileReferences, fileReferencesMap } = useFileReferences();
  const { toast } = useToast();

  const [input, setInput] = useState('');
  const [chatStatus, setChatStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchMode, setSearchMode] = useState<'chat' | 'search' | 'semantic' | 'hybrid'>('chat');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isStickToBottom, setIsStickToBottom] = useState(true);

  const currentConversationMessages = useMemo(() => {
    return allMessages?.filter(m => m.conversation_id === activeConversation?.id) || [];
  }, [allMessages, activeConversation?.id]);

  const displayMessages = useMemo(() => {
    const combined: Message[] = [...currentConversationMessages];
    if (chatStatus === 'loading' && streamingMessage) {
      combined.push(streamingMessage);
    }
    return combined;
  }, [currentConversationMessages, chatStatus, streamingMessage]);

  const mappedDisplayMessages: VercelMessage[] = useMemo(() => {
    return displayMessages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(msg.created_at),
    }));
  }, [displayMessages]);

  useEffect(() => {
    type StreamChunkData = { chunk: string; messageId?: string };
    const cleanupChunk = window.electron.on(ChatEvents.CHAT_STREAM_CHUNK, (_event: Electron.IpcRendererEvent, response: IpcResponse<StreamChunkData>) => {
       if (response.success && response.data) {
          const { chunk, messageId } = response.data;
          setStreamingMessage((prev: Message | null): Message => {
            const now = new Date().toISOString();
            return {
              id: prev?.id || messageId || `streaming_${Date.now()}`,
              role: 'assistant',
              content: (prev?.content || '') + chunk,
              created_at: prev?.created_at || now,
              updated_at: now,
              conversation_id: prev?.conversation_id || activeConversation?.id || '',
              user_id: prev?.user_id || 'assistant_id',
              is_deleted: false,
              annotations: prev?.annotations || [],
            };
          });
       } else if (!response.success) {
         // Handle potential errors sent over the CHUNK channel if needed
         logger.warn('[ChatClient] Received unsuccessful CHUNK event', { error: response.error });
       }
    });

    const cleanupFinish = window.electron.on(ChatEvents.CHAT_STREAM_FINISH, (_event: Electron.IpcRendererEvent, response: IpcResponse) => {
       if (response.success) {
          logger.debug('[ChatClient] Stream finished event received');
          setStreamingMessage(null);
          setChatStatus('idle');
       }
    });

    const cleanupError = window.electron.on(ChatEvents.CHAT_STREAM_ERROR, (_event: Electron.IpcRendererEvent, response: IpcResponse) => {
       if (!response.success) {
          const error = response.error || 'Unknown stream error';
          logger.error('[ChatClient] Stream error event received:', { error });
          setErrorMessage(error);
          setChatStatus('error');
          setStreamingMessage(null);
          toast({
            title: 'Chat Error',
            description: error,
            variant: 'destructive',
          });
       }
    });

    return () => {
      logger.debug('Cleaning up chat listeners...');
      cleanupChunk(); 
      cleanupFinish();
      cleanupError();
    };
  }, [toast, activeConversation?.id, activeSpace?.id]);

  useEffect(() => {
    if (isStickToBottom && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [mappedDisplayMessages, chatStatus, isStickToBottom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!input.trim() || chatStatus === 'loading' || !activeSpace || !activeConversation || !user) {
      logger.warn('[ChatClient] Submission prevented', { 
        hasInput: !!input.trim(), 
        chatStatus, 
        hasActiveSpace: !!activeSpace, 
        hasActiveConversation: !!activeConversation, 
        hasUser: !!user 
      });
      return;
    }

    // Prepare user message locally
    const now = new Date().toISOString();
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input,
      created_at: now,
      updated_at: now,
      conversation_id: activeConversation.id,
      user_id: user.id,
      is_deleted: false,
      annotations: [],
    };

    // Clear input immediately after preparing the message
    const currentInput = input;
    setInput(''); 
    clearFileReferences(); 

    // Set loading state AFTER clearing input, BEFORE async calls
    setChatStatus('loading');
    setErrorMessage(null);
    setStreamingMessage(null);

    try {
      // --- 1. Add user message via invoke --- 
      logger.info('[ChatClient] Adding user message via IPC invoke', { messageId: userMessage.id });
      // Use invoke with the event constant
      const addResponse = await window.electron.invoke(MessageEvents.ADD_MESSAGE, userMessage); 
      if (!addResponse.success) {
        logger.error('[ChatClient] Failed to add user message via IPC', { error: addResponse.error });
        toast({
          title: 'Error Saving Message',
          description: `Could not save your message: ${addResponse.error || 'Unknown error'}`,
          variant: 'destructive',
        });
        setInput(currentInput); 
        setChatStatus('idle');
        return;
      }

      // --- 2. Prepare payload for chat stream initiation --- 
      const payload = {
        messages: [...currentConversationMessages, userMessage], // Send current context + new message
        spaceId: activeSpace.id,
        conversationId: activeConversation.id,
        provider: activeSpace.provider,
        model: activeSpace.model,
        searchMode,
        chatMode: activeSpace.chat_mode || 'ask',
        chatModeConfig: activeSpace.chat_mode_config || { tools: [] },
        files: fileReferencesMap, // Use the map which should be up-to-date
      };

      // --- 3. Initiate chat stream via invoke --- 
      logger.info('[ChatClient] Initiating chat stream via IPC invoke', { conversationId: payload.conversationId });
      // Use invoke with the event constant
      await window.electron.invoke(ChatEvents.INITIATE_CHAT_STREAM, payload); 

    } catch (error: any) {
      // This catch block now primarily handles errors from initiateChatStream
      logger.error('[ChatClient] Error initiating chat stream', { error: error?.message || error });
      setErrorMessage(error?.message || 'Failed to start chat.');
      setChatStatus('error'); // Keep error status
      toast({
        title: 'Error Getting Response',
        description: `Assistant failed to respond: ${error?.message || 'Unknown error'}`,
        variant: 'destructive',
      });
      // User message should already be visible due to the earlier ADD_MESSAGE call
    }
  };

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
          throw new Error(response.error || 'Unknown error reading file');
        }
      } catch (error) {
         const errorMsg = error instanceof Error ? error.message : String(error);
         fileContent = `[Error loading file content: ${errorMsg}]`;
         logger.error(`Error reading file`, { path: file.path, error: errorMsg });
         toast({
           title: "Error Reading File",
           description: `Could not read file content for "${file.name}": ${errorMsg}`,
           variant: "destructive",
         });
      }
      
      const fileId = file.id || `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      setFileReferences(prev => {
        const newRef = {
            id: fileId,
            path: file.path,
            name: file.name,
            content: fileContent,
            type: 'file' as const
        };
        if (!prev.some(ref => ref.path === file.path)) {
            return [...prev, newRef];
        }
        return prev;
      });
      
      if (input.includes('@')) {
        const atIndex = input.lastIndexOf('@');
        setInput(input.substring(0, atIndex));
      }
      
    } catch (error) {
      logger.error("Error processing selected file", { fileName: file.name, error });
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

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);
  
  const handleCreateConversation = async (title: string = 'New Conversation') => {
    if (!activeSpace?.id) {
      toast({ title: 'Error', description: 'Please select a space first', variant: 'destructive' });
      return;
    }
    try {
      await createConversation(activeSpace.id, title);
    } catch (error) {
      logger.error('Error creating conversation', { spaceId: activeSpace?.id, title, error });
      toast({ title: 'Error', description: 'Failed to create conversation', variant: 'destructive' });
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    try {
      await setActiveConversation(conversation);
    } catch (error) {
      logger.error('Error selecting conversation', { conversationId: conversation?.id, error });
      toast({ title: 'Error', description: 'Failed to select conversation', variant: 'destructive' });
    }
  };

  const handleSetActiveSpace = useCallback(async (id: string) => {
    await setActiveSpaceById(id);
  }, [setActiveSpaceById]);

  return (
    <div className="h-full w-full flex flex-col">
      <ChatTopBar
        user={user}
        activeSpace={activeSpace}
        spaces={spaces}
        setActiveSpaceById={handleSetActiveSpace}
        isStickToBottom={isStickToBottom}
        messagesLength={mappedDisplayMessages.length}
        onScrollToBottom={scrollToBottom}
      />
      
      <div className="flex-1 w-full overflow-hidden flex flex-col">
        <ChatMessages
          messages={mappedDisplayMessages}
          onStickToBottomChange={handleStickToBottomChange}
          ref={messagesContainerRef}
          isLoading={chatStatus === 'loading' || isSpaceLoading || messagesLoading}
        />
        
        <ChatInputArea
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          disabled={!activeSpace || !activeConversation || chatStatus === 'loading'}
          fileReferences={fileReferences}
          setFileReferences={setFileReferences}
          messages={mappedDisplayMessages}
          activeConversation={activeConversation}
          activeSpace={activeSpace}
          onCreateConversation={handleCreateConversation}
          onSelectConversation={handleSelectConversation}
          onCommandWindowToggle={handleCommandWindowToggle}
          onSelectFile={selectFile}
        />
      </div>
      {errorMessage && (
         <div className="p-2 text-center text-red-500 bg-red-100 border-t border-red-200">
            Error: {errorMessage}
         </div>
       )}
    </div>
  );
}