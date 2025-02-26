"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Message, useChat } from "@ai-sdk/react";
import { ChatMessagesSkeleton } from "@/components/ui/chat-messages-skeleton";
import { SpaceTab } from "@/components/ui/space-tab";
import { ConversationTab } from "@/components/ui/conversation-tab";
import QuickActionsTab from "@/components/ui/quick-actions-tab";
import { ModelTab } from "@/components/ui/model-tab";
import { ChatModeTab } from "@/components/ui/chat-mode-tab";
import { ArrowDown, Search, Sparkles } from "lucide-react";
import { BaseTab } from "@/components/ui/base-tab";
import { useConversationStore } from '@/lib/stores/conversation-store';
import { useSpaceStore } from "@/lib/stores/space-store";
import { User } from "@supabase/supabase-js";
import { getMessages, getConversations, setActiveConversation as setActiveConversationDB, getActiveConversation } from "../actions";
import { UnifiedInput } from "@/components/ui/unified-input";
import { ChatMessages } from '@/components/ui/chat-messages';
import { UserProfileDropdown } from "@/components/ui/user-profile-dropdown";
import { Space, Conversation } from "@/types";

interface ClientChatContentProps {
  user: User;
  defaultSpace: Space | null;
  defaultConversations: Conversation[] | null;
  spaces: Space[] | null;
  defaultMessages: Message[] | null;
}

export default function ClientChatContent({
  user,
  defaultSpace,
  defaultConversations,
  defaultMessages,
  spaces,
}: ClientChatContentProps) {
  const { activeSpace, setActiveSpace, setSpaces } = useSpaceStore();
  const { setConversations, setActiveConversation, activeConversation, conversations } = useConversationStore();
  const [cachedConversations, setCachedConversations] = useState<Conversation[]>(defaultConversations || []);
  const [isSpacesLoading, setIsSpacesLoading] = useState(true);
  const [isConversationsLoading, setIsConversationsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(true);
  const [isStickToBottom, setIsStickToBottom] = useState(true);
  const [searchMode, setSearchMode] = useState<'chat' | 'search' | 'semantic' | 'hybrid'>('chat');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const cachedSpaces = useMemo(() => spaces || [], [spaces]);

  const handleConversationSelect = async (conversationId: string) => {
    if (!conversationId) return;
    
    setIsMessagesLoading(true);
    try {
      const currentConversations = useConversationStore.getState().conversations || [];
      const selectedConversation = currentConversations.find(conv => conv.id === conversationId && !conv.is_deleted);
      
      if (!selectedConversation) {
        console.error(`Conversation ${conversationId} not found or has been deleted`);
        setIsMessagesLoading(false);
        return;
      }
      
      await setActiveConversationDB(conversationId);
      setActiveConversation(selectedConversation);
      
      const messageData = await getMessages(conversationId);
      setMessages(messageData || []);
    } catch (error) {
      console.error('Error selecting conversation:', error);
      setMessages([]);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const { messages, setMessages, input, isLoading: isChatLoading, handleInputChange, handleSubmit, data, setData } = useChat({
    id: searchMode,
    api: "/api/chat",
    body: {
      spaceId: activeSpace?.id || '',
      conversationId: activeConversation?.id || null,
      provider: activeSpace?.provider || '',
      model: activeSpace?.model || '',
    },
    onFinish() {
      setData([]);
    },
    initialMessages: defaultMessages || [],
  });

  useEffect(() => {
    const initializeChat = async () => {
      try {
        if (!activeSpace || !spaces?.length) {
          setIsSpacesLoading(true);
          await Promise.all([
            defaultSpace && setActiveSpace(defaultSpace),
            setSpaces(cachedSpaces),
          ]);
          setIsSpacesLoading(false);
        }
        
        const nonDeletedConversations = cachedConversations.filter(conv => !conv.is_deleted);
        setConversations(nonDeletedConversations);
        
        if (!activeConversation || !nonDeletedConversations.length) {
          setIsConversationsLoading(true);
          if (nonDeletedConversations.length) {
            await setActiveConversationDB(nonDeletedConversations[0].id);
            setActiveConversation(nonDeletedConversations[0]);
          }
          setIsConversationsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
      } finally {
        setIsSpacesLoading(false);
        setIsConversationsLoading(false);
      }
    };
    initializeChat();
  }, [defaultSpace, cachedConversations, cachedSpaces, setActiveSpace, setConversations, setActiveConversation, setSpaces]);

  const loadSpaceData = useCallback(async (spaceId: string) => {
    if (!spaceId) return;
    
    setIsConversationsLoading(true);
    setIsMessagesLoading(true);
    setMessages([]);
    try {
      const conversations = await getConversations(spaceId);
      const nonDeletedConversations = conversations?.filter((conv) => !conv.is_deleted) || [];
      
      setConversations(nonDeletedConversations);
      setCachedConversations(nonDeletedConversations);
      
      const activeConvData = await getActiveConversation();
      const activeConv = activeConvData && nonDeletedConversations.find(c => c.id === activeConvData.id);
      
      if (activeConv && !activeConv.is_deleted) {
        setActiveConversation(activeConv);
        const messageData = await getMessages(activeConv.id);
        setMessages(messageData || []);
      } else if (nonDeletedConversations.length > 0) {
        const newActiveConversation = nonDeletedConversations[0];
        setActiveConversation(newActiveConversation);
        await setActiveConversationDB(newActiveConversation.id);
        const messageData = await getMessages(newActiveConversation.id);
        setMessages(messageData || []);
      } else {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading space data:', error);
      setConversations([]);
      setCachedConversations([]);
      setActiveConversation(null);
      setMessages([]);
    } finally {
      setIsConversationsLoading(false);
      setIsMessagesLoading(false);
    }
  }, [getConversations, getMessages, setActiveConversationDB, getActiveConversation]);

  useEffect(() => {
    const loadConversationMessages = async () => {
      if (!activeConversation?.id) {
        setMessages([]);
        setIsMessagesLoading(false);
        return;
      }
      setIsMessagesLoading(true);
      try {
        const messageData = await getMessages(activeConversation.id);
        setMessages(messageData || []);
      } catch (error) {
        console.error('Error loading messages:', error);
        setMessages([]);
      } finally {
        setIsMessagesLoading(false);
      }
    };
    loadConversationMessages();
  }, [activeConversation?.id]);

  useEffect(() => {
    if (activeSpace?.id) {
      loadSpaceData(activeSpace.id);
    }
  }, [activeSpace?.id, loadSpaceData]);

  const handleScrollToBottom = () => {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white relative chat-container">
      <div className="fixed top-4 right-4 z-50">
        {user && <UserProfileDropdown user={user} />}
      </div>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="relative p-1 rounded-full bg-black/20 border border-white/[0.08] backdrop-blur-xl"
          style={{
            background: `color-mix(in srgb, ${activeSpace?.color || '#3ecfff'}10, transparent)`,
            boxShadow: `0 0 20px ${activeSpace?.color || '#3ecfff'}10, inset 0 0 20px ${activeSpace?.color || '#3ecfff'}05`
          }}>
          <div className="flex items-center divide-x divide-white/[0.08]">
            <div className="px-1 first:pl-1 last:pr-1">
              <SpaceTab />
            </div>
            <div className="px-1 first:pl-1 last:pr-1">
              <ModelTab />
            </div>
            <div className="px-1 first:pl-1 last:pr-1">
              <ChatModeTab mode={searchMode} onModeChange={setSearchMode} />
            </div>
            {!isStickToBottom && messages.length > 0 && (
              <div className="px-1 first:pl-1 last:pr-1">
                <BaseTab
                  icon={<ArrowDown className="w-3 h-3" />}
                  label="Scroll to Bottom"
                  onClick={handleScrollToBottom}
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
        {isMessagesLoading ? (
          <ChatMessagesSkeleton />
        ) : (
          <ChatMessages
            messages={messages}
            onStickToBottomChange={setIsStickToBottom}
            ref={messagesContainerRef}
            isLoading={isChatLoading}
            streamData={data}
          />
        )}
        <div className="fixed left-1/2 bottom-8 -translate-x-1/2 w-[800px] z-50">
          <div className="relative w-full">
            <UnifiedInput
              value={input}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              disabled={!activeSpace || isSpacesLoading || isConversationsLoading || isMessagesLoading || isChatLoading}
            >
              <div className="flex items-center divide-x divide-white/[0.05] bg-white/[0.03] border-t border-l border-r border-white/[0.05] rounded-t-2xl overflow-hidden backdrop-blur-xl w-full shadow-[0_-4px_20px_rgba(62,207,255,0.03)]">
                <div className="px-1 first:pl-2 last:pr-2 py-1 flex-1">
                  <QuickActionsTab />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 flex-1">
                  <BaseTab
                    icon={<Search className="w-3 h-3" />}
                    label="Messages"
                    shortcut="F"
                  />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 flex-1">
                  <BaseTab
                    icon={<Sparkles className="w-3 h-3" />}
                    label="Prompts"
                    shortcut="P"
                  />
                </div>
                <div className="flex-shrink min-w-0 flex-1 flex items-center px-1 first:pl-2 last:pr-2 py-1">
                  <ConversationTab activeConversation={activeConversation} onConversationSelect={handleConversationSelect} />
                </div>
              </div>
            </UnifiedInput>
          </div>
        </div>
      </div>
    </div>
  );
}