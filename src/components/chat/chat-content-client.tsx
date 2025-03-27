import { useChat } from '@ai-sdk/react';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { ArrowDown, Search } from 'lucide-react';
import { useSpaces } from '@/hooks/use-spaces';
import { useConversations } from '@/hooks/use-conversations';
import { UnifiedInput } from './unified-input';
import { ChatMessages } from './chat-messages';
import { UserProfileDropdown } from '@/components/auth/user-profile-dropdown';
import { SpaceTab } from '@/components/chat/ui/space-tab';
import { ModelTab } from '@/components/chat/ui/model-tab';
import { ChatModeTab } from '@/components/chat/ui/chat-mode-tab';
import { QuickActionsTab } from '@/components/chat/ui/quick-actions-tab';
import { BackgroundTasksTab } from '@/components/chat/ui/background-tasks-tab';
import { SuggestionsTab } from '@/components/chat/ui/suggestions-tab';
import { MessagesTab } from '@/components/chat/ui/messages-tab';
import { useRendererStore } from '@/store/renderer';
import { API_BASE_URL } from '@/config/api';
import { useCommandWindow } from '@/hooks/use-command-window';
import { ConversationTab } from '@/components/chat/ui/conversation-tab';
import { BaseTab } from '@/components/ui/base-tab';
import { toast } from '@/hooks/use-toast';
import { Conversation } from '@/types/conversation';

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
    const response = await window.electron.getAuthToken();
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
    initialMessages,
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
            <UnifiedInput
              value={input}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              disabled={!activeSpace || !activeConversation || status !== 'ready'}
            >
              <div className="flex items-center divide-x divide-white/[0.05]">
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
                  <QuickActionsTab onCreateConversation={handleCreateConversation} />
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
                  <BackgroundTasksTab />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
                  <SuggestionsTab 
                    currentConversationId={activeConversation?.id}
                    messages={messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
                      id: m.id || '',
                      content: typeof m.content === 'string' ? m.content : '',
                      role: m.role as 'user' | 'assistant',
                      timestamp: new Date()
                    }))}
                  />
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