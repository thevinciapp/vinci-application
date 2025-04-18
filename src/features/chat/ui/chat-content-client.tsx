import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useSpaces } from '@/features/spaces/use-spaces';
import { useConversations } from '@/features/chat/use-conversations';
import { ChatMessages } from './chat-messages';
import { useUser } from '@/features/user/use-user';
import { useCommandWindow } from '@/features/command-center/use-command-window';
import { useToast } from '@/shared/hooks/use-toast';
import { Conversation } from '@/entities/conversation/model/types';
import { ChatTopBar } from '@/features/chat/ui/chat-top-bar';
import { ChatInputArea } from '@/features/chat/ui/chat-input-area';
import { VinciUIMessage } from '@/entities/message/model/types';
import { Logger } from '@/shared/lib/logger';
import { useChat, VinciChatRequestOptions } from '@/features/chat/use-chat';
import { useMessages } from '@/features/chat/use-messages';
import { getMessageParts } from '@ai-sdk/ui-utils';
import { generateId } from '@/core/utils/ai-sdk-adapter/adapter-utils';

const logger = new Logger('ChatContentClient');


function ensureMessageFormat(message: VinciUIMessage | Partial<VinciUIMessage>): VinciUIMessage {
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
    createdAt: message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt || Date.now()),
    conversation_id: message.conversation_id || '',
    space_id: message.space_id || '',
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
  const { toast } = useToast();

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
       chatMode: activeSpace.chat_mode || 'ask',
    };

    hookHandleSubmit(event, options);
  }, [
     input,
     chatIsLoading,
     activeSpace,
     activeConversation,
     user,
     hookHandleSubmit
  ]);

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
          messages={formattedMessages}
          activeConversation={activeConversation}
          activeSpace={activeSpace}
          onCreateConversation={handleCreateConversation}
          onSelectConversation={handleSelectConversation}
          onCommandWindowToggle={(mode) => {
            if (mode === 'messageSearch') {
              handleCommandWindowToggle('messageSearch');
            } else if (mode === 'command') {
              handleCommandWindowToggle('unified');
            }
          }}
        />
      </div>
    </div>
  );
}