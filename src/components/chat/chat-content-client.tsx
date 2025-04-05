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
import { useChatStream } from '@/hooks/use-chat-stream';
import { useFileSelection } from '@/hooks/use-file-selection';
import { FileReference } from '../../types/file-reference';

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
  const { 
    streamingMessage, 
    isStreamComplete,
    chatStatus, 
    errorMessage, 
    setChatStatus, 
    setErrorMessage, 
    setStreamingMessage,
    setIsStreamComplete
  } = useChatStream({ activeConversationId: activeConversation?.id });
  const { selectFile } = useFileSelection({ setFileReferences, setInput, currentInput: input });

  const [searchMode, setSearchMode] = useState<'chat' | 'search' | 'semantic' | 'hybrid'>('chat');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isStickToBottom, setIsStickToBottom] = useState(true);

  const currentConversationMessages = useMemo(() => {
    return allMessages?.filter(m => m.conversation_id === activeConversation?.id) || [];
  }, [allMessages, activeConversation?.id]);

  const displayMessages = useMemo(() => {
    return [...currentConversationMessages];
  }, [currentConversationMessages]);

  const mappedDisplayMessages: VercelMessage[] = useMemo(() => {
    const allMessages = [...displayMessages];
    if (chatStatus === 'loading' && streamingMessage) {
      allMessages.push(streamingMessage);
    }
    return allMessages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(msg.created_at),
    }));
  }, [displayMessages, chatStatus, streamingMessage]);

  const streamData = useMemo(() => {
    if (streamingMessage && chatStatus === 'loading') {
      return [{ content: streamingMessage.content }];
    }
    return undefined;
  }, [streamingMessage, chatStatus]);

  useEffect(() => {
    if (isStickToBottom && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [mappedDisplayMessages, chatStatus, isStickToBottom]);

  useEffect(() => {
    if (streamingMessage && isStreamComplete && currentConversationMessages.length > 0) {
      const messageExists = currentConversationMessages.some(
        msg => (msg.id === streamingMessage.id || msg.content === streamingMessage.content) && 
               msg.role === 'assistant'
      );
      
      if (messageExists) {
        setStreamingMessage(null);
        setIsStreamComplete(false);
      }
    }
  }, [currentConversationMessages, streamingMessage, isStreamComplete, setStreamingMessage, setIsStreamComplete]);

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

    const currentInputSubmit = input;
    setInput(''); 
    clearFileReferences(); 

    setChatStatus('loading');
    setErrorMessage(null);
    setStreamingMessage(null);

    try {
      logger.info('[ChatClient] Adding user message via IPC invoke', { messageId: userMessage.id });
      const addResponse = await window.electron.invoke(MessageEvents.ADD_MESSAGE, userMessage); 
      if (!addResponse.success) {
        logger.error('[ChatClient] Failed to add user message via IPC', { error: addResponse.error });
        toast({
          title: 'Error Saving Message',
          description: `Could not save your message: ${addResponse.error || 'Unknown error'}`,
          variant: 'destructive',
        });
        setInput(currentInputSubmit); 
        setChatStatus('idle'); // Revert status if add fails
        return;
      }

      const payload = {
        messages: [...currentConversationMessages, userMessage],
        spaceId: activeSpace.id,
        conversationId: activeConversation.id,
        provider: activeSpace.provider,
        model: activeSpace.model,
        searchMode,
        chatMode: activeSpace.chat_mode || 'ask',
        chatModeConfig: activeSpace.chat_mode_config || { tools: [] },
        files: fileReferencesMap,
      };

      logger.info('[ChatClient] Initiating chat stream via IPC invoke', { conversationId: payload.conversationId });
      await window.electron.invoke(ChatEvents.INITIATE_CHAT_STREAM, payload);

    } catch (error: any) {
      logger.error('[ChatClient] Error initiating chat stream', { error: error?.message || error });
      setErrorMessage(error?.message || 'Failed to start chat.');
      setChatStatus('error'); 
      toast({
        title: 'Error Getting Response',
        description: `Assistant failed to respond: ${error?.message || 'Unknown error'}`,
        variant: 'destructive',
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
          messages={displayMessages}
          streamingMessage={streamingMessage}
          onStickToBottomChange={handleStickToBottomChange}
          ref={messagesContainerRef}
          isLoading={chatStatus === 'loading' || isSpaceLoading || messagesLoading}
          streamData={streamData}
          spaceId={activeSpace?.id}
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