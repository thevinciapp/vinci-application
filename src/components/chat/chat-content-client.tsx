import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useSpaces } from '@/hooks/use-spaces';
import { useConversations } from '@/hooks/use-conversations';
import { ChatMessages } from './chat-messages';
import { useUser } from '@/hooks/use-user';
import { useCommandWindow } from '@/hooks/use-command-window';
import { useToast } from '@/hooks/use-toast';
import { Conversation } from '@/types/conversation';
import { CommandCenterEvents } from '@/core/ipc/constants';
import { useFileReferences } from '@/hooks/use-file-references';
import { ChatTopBar } from './ui/chat-top-bar';
import { ChatInputArea } from './chat-input-area';
import { VinciUIMessage } from '@/types/message';
import { Logger } from '@/utils/logger';
import { useChat, VinciChatRequestOptions } from '@/hooks/use-chat';
import { useFileSelection } from '@/hooks/use-file-selection';
import { FileReference } from '../../types/file-reference';
import { useMessages } from '@/hooks/use-messages';
import { getMessageParts } from '@ai-sdk/ui-utils';
import { generateId } from '@/core/utils/ai-sdk-adapter/adapter-utils';

const logger = new Logger('ChatContentClient');


function ensureMessageFormat(message: any): VinciUIMessage {
  if (!message) {
    return {
      id: generateId(),
      role: 'user',
      content: '',
      createdAt: new Date(),
      conversation_id: '',
      space_id: '',
      parts: [],
      annotations: [],
    };
  }
  
  const formattedMessage: VinciUIMessage = {
    ...message,
    id: message.id || generateId(),
    role: message.role || 'user',
    content: message.content || '',
    createdAt: message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt || message.created_at || Date.now()),
    conversation_id: message.conversation_id || message.conversationId || '',
    space_id: message.space_id || message.spaceId || '',
    parts: message.parts || getMessageParts({
      role: message.role || 'user',
      content: message.content || ''
    }),
    annotations: message.annotations || [],
  };
  
  return formattedMessage;
}

export default function ChatContent() {
  const { profile: user } = useUser();
  const { spaces, activeSpace, setActiveSpaceById, isLoading: isSpaceLoading } = useSpaces();
  const {
    activeConversation,
    setActiveConversation,
    createConversation,
  } = useConversations();
  const { messages: initialMessages } = useMessages();
  
  const { handleCommandWindowToggle } = useCommandWindow();
  const { fileReferences, setFileReferences, clearFileReferences, fileReferencesMap } = useFileReferences();
  const { toast } = useToast();

  const [searchMode, setSearchMode] = useState<'chat' | 'search' | 'semantic' | 'hybrid'>('chat');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isStickToBottom, setIsStickToBottom] = useState(true);

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit: hookHandleSubmit,
    isLoading: chatIsLoading,
    status: chatStatus,
    error: chatError,
    setMessages,
  } = useChat({
    initialMessages,
    id: activeConversation?.id,
    spaceId: activeSpace?.id,
    onError: (err) => {
      logger.error('[ChatClient] useChat onError callback:', err);
    },
    onFinish: (message) => {
      logger.debug('[ChatClient] useChat onFinish callback:', message);
    },
  });

  // Add a useMemo to ensure messages are properly formatted
  const formattedMessages = useMemo(() => {
    return messages.map(message => ensureMessageFormat(message));
  }, [messages]);

  useEffect(() => {
    if (isStickToBottom && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, chatStatus, isStickToBottom]);

  const handleSubmit = useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!input.trim() || chatIsLoading || !activeSpace || !activeConversation || !user) {
      logger.warn('[ChatClient] Submission prevented', {
        hasInput: !!input.trim(),
        chatIsLoading,
        hasActiveSpace: !!activeSpace,
        hasActiveConversation: !!activeConversation,
        hasUser: !!user
      });
      return;
    }

    const options: VinciChatRequestOptions = {
       provider: activeSpace.provider,
       model: activeSpace.model,
       files: fileReferencesMap,
       searchMode: searchMode,
       chatMode: activeSpace.chat_mode || 'ask',
    };

    hookHandleSubmit(event, options);
    clearFileReferences();
  }, [
     input, 
     chatIsLoading, 
     activeSpace, 
     activeConversation, 
     user, 
     fileReferencesMap, 
     searchMode, 
     hookHandleSubmit, 
     clearFileReferences
  ]);

  const handleStickToBottomChange = useCallback((isAtBottom: boolean) => {
    setIsStickToBottom(isAtBottom);
  }, []);

  const { selectFile: selectFileHandler } = useFileSelection({
    setFileReferences,
    setInput,
    currentInput: input
  });

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);
   
  const handleCreateConversation = useCallback(async (title: string = 'New Conversation') => {
    if (!activeSpace?.id) {
      toast({ title: 'Error', description: 'Please select a space first', variant: 'destructive' });
      return;
    }
    try {
      setMessages([]);
      setInput('');
      await createConversation(activeSpace.id, title);
    } catch (error) {
      logger.error('Error creating conversation', { spaceId: activeSpace?.id, title, error });
      toast({ title: 'Error', description: 'Failed to create conversation', variant: 'destructive' });
    }
  }, [activeSpace?.id, toast, setMessages, setInput, createConversation]);

  const handleSelectConversation = useCallback(async (conversation: Conversation) => {
    try {
      await setActiveConversation(conversation);
    } catch (error) {
      logger.error('Error selecting conversation', { conversationId: conversation?.id, error });
      toast({ title: 'Error', description: 'Failed to select conversation', variant: 'destructive' });
    }
  }, [setActiveConversation, toast]);

  const handleSetActiveSpace = useCallback(async (id: string) => {
    await setActiveSpaceById(id);
  }, [setActiveSpaceById]);

  const isLoading = chatIsLoading || isSpaceLoading;

  return (
    <div className="h-full w-full flex flex-col">
      <ChatTopBar
        user={user}
        activeSpace={activeSpace}
        spaces={spaces}
        setActiveSpaceById={handleSetActiveSpace}
        isStickToBottom={isStickToBottom}
        messagesLength={formattedMessages.length}
        onScrollToBottom={scrollToBottom}
      />
      
      <div className="flex-1 w-full overflow-hidden flex flex-col">
        <ChatMessages
          messages={formattedMessages}
          streamingMessage={null}
          onStickToBottomChange={handleStickToBottomChange}
          ref={messagesContainerRef}
          isLoading={isLoading}
          spaceId={activeSpace?.id}
        />
        
        <ChatInputArea
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          disabled={!activeSpace || !activeConversation || chatIsLoading}
          fileReferences={fileReferences}
          setFileReferences={setFileReferences}
          messages={formattedMessages}
          activeConversation={activeConversation}
          activeSpace={activeSpace}
          onCreateConversation={handleCreateConversation}
          onSelectConversation={handleSelectConversation}
          onCommandWindowToggle={handleCommandWindowToggle}
          onSelectFile={selectFileHandler}
        />
      </div>
    </div>
  );
}