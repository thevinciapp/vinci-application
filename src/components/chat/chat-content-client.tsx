import { useChat } from '@ai-sdk/react';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { ArrowDown, Search } from 'lucide-react';
import { BaseTab } from 'vinci-ui';
import { useSpaces } from '@/hooks/use-spaces';
import { useConversations } from '@/hooks/use-conversations';
import { useMessages } from '@/hooks/use-messages';
import { UnifiedInput } from './unified-input';
import { ChatMessages } from './chat-messages';
import { UserProfileDropdown } from '@/components/chat/ui/user-profile-dropdown';
import { SpaceTab } from '@/components/chat/ui/space-tab';
import { ModelTab } from '@/components/chat/ui/model-tab';
import { ChatModeTab } from '@/components/chat/ui/chat-mode-tab';
import { toast } from '@/components/chat/ui/toast';
import { ConversationTab } from '../conversation/conversation-tab';
import { QuickActionsTab, BackgroundTasksTab, SuggestionsTab } from './quick-actions-tab';
import { useRendererStore } from '@/store/renderer';
import { IpcResponse } from '@/types';
import { API_BASE_URL } from '@/config/api';

export default function ChatContent() {
  const { user, messages: messagesFromStore } = useRendererStore();
  const { activeSpace, isLoading: isSpaceLoading } = useSpaces();
  const { activeConversation, createConversation } = useConversations();

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

  return (
    <div className="h-full w-full">
      <div className="fixed top-4 right-4 z-50">
        {user && <UserProfileDropdown user={user} />}
      </div>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div
          className="relative p-1 rounded-full bg-black/20 border border-white/[0.08] backdrop-blur-xl"
          style={{
            background: `color-mix(in srgb, ${activeSpace?.color || '#3ecfff'}10, transparent)`,
            boxShadow: `0 0 20px ${activeSpace?.color || '#3ecfff'}10, inset 0 0 20px ${activeSpace?.color || '#3ecfff'
              }05`,
          }}
        >
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
        <div className="absolute top-0 left-0 w-full h-screen pointer-events-none">
          <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-[#3ecfff]/[0.015] blur-[120px] rounded-full" />
          <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] bg-[#D4966A]/[0.015] blur-[100px] rounded-full" />
          <div className="absolute bottom-[10%] left-[30%] w-[600px] h-[600px] bg-[#3ecfff]/[0.01] blur-[130px] rounded-full" />
        </div>
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
              <div className="flex items-center divide-x divide-white/[0.05] bg-white/[0.03] border-t border-l border-r border-white/[0.05] rounded-t-2xl overflow-hidden backdrop-blur-xl w-full shadow-[0_-4px_20px_rgba(62,207,255,0.03)]">
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5">
                  <QuickActionsTab onCreateConversation={handleCreateConversation} />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5">
                  <BaseTab
                    icon={<Search className="w-3 h-3" />}
                    label="Messages"
                    shortcut="F"
                  />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5">
                  <BackgroundTasksTab />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5">
                  <SuggestionsTab />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5">
                  <ConversationTab
                    onCreateConversation={handleCreateConversation}
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