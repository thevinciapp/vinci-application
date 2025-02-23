"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { getMessages, getConversations, setActiveConversation as setActiveConversationDB } from "../actions";
import { UnifiedInput } from "@/components/ui/unified-input";
import { ChatMessages } from '@/components/ui/chat-messages';
import { UserProfileDropdown } from "@/components/ui/user-profile-dropdown";
import { Space, Conversation } from "@/types";
import { debounce } from 'lodash';
import { useStickToBottom } from "@/hooks/use-stick-to-bottom";

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
  const { setConversations, setActiveConversation, activeConversation } = useConversationStore();
  const [isSpacesLoading, setIsSpacesLoading] = useState(true);
  const [isConversationsLoading, setIsConversationsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(true);
  const [isStickToBottom, setIsStickToBottom] = useState(true)
  const [searchMode, setSearchMode] = useState('chat')
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const cachedConversations = useMemo(() => defaultConversations || [], [defaultConversations]);
  const cachedSpaces = useMemo(() => spaces || [], [spaces]);

  const { messages, setMessages, input, isLoading: isChatLoading, handleInputChange, handleSubmit } = useChat({
    id: searchMode,
    api: "/api/chat",
    body: {
      spaceId: activeSpace?.id || '',
      conversationId: activeConversation?.id || null,
      provider: activeSpace?.provider || '',
      model: activeSpace?.model || '',
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
        if (!activeConversation || !cachedConversations.length) {
          setIsConversationsLoading(true);
          await Promise.all([
            setConversations(cachedConversations),
            cachedConversations.length && setActiveConversation(cachedConversations[0]),
          ]);
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

  useEffect(() => {
    const loadSpaceData = async () => {
      if (!activeSpace?.id) return;
      setIsConversationsLoading(true);
      setIsMessagesLoading(true);
      setMessages([]);
      try {
        const conversations = await getConversations(activeSpace.id);
        setConversations(conversations || []);
        const newActiveConversation = conversations?.length ? conversations[0] : null;
        if (newActiveConversation) {
          await setActiveConversationDB(newActiveConversation.id);
          setActiveConversation(newActiveConversation);
        } else {
          setActiveConversation(null);
          setMessages([]);
        }
      } catch (error) {
        console.error('Error loading space data:', error);
        setConversations([]);
        setActiveConversation(null);
        setMessages([]);
      } finally {
        setIsConversationsLoading(false);
        setIsMessagesLoading(false);
      }
    };
    loadSpaceData();
  }, [activeSpace?.id, setConversations, setActiveConversation, setMessages]);

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
  }, [activeConversation?.id, setMessages]);

  const handleScrollToBottom = () => {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }
}


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
            userAvatarUrl={user?.user_metadata?.avatar_url}
          />
        )}
        <div className="fixed left-1/2 bottom-8 -translate-x-1/2 w-[800px] z-50">
          <div className="relative w-full">
            <UnifiedInput
              value={input}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              disabled={isChatLoading}
              searchMode={searchMode}
              onSearchModeChange={setSearchMode}
              onSubmit={handleSubmit}
              disabled={!activeSpace || isSpacesLoading || isConversationsLoading || isMessagesLoading || isChatLoading}
            >
              <div className="flex items-center divide-x divide-white/[0.05] bg-white/[0.03] border-t border-l border-r border-white/[0.05] rounded-t-2xl overflow-hidden backdrop-blur-xl w-full shadow-[0_-4px_20px_rgba(62,207,255,0.03)]">
                <div className="px-1 first:pl-2 last:pr-2 py-1 flex-1">
                  <QuickActionsTab />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 flex-1">
                  <ModelTab />
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
                  <ConversationTab activeConversation={activeConversation} />
                </div>
              </div>
            </UnifiedInput>
          </div>
        </div>
      </div>
    </div>
  );
}