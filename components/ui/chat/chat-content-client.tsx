"use client";
import { useChat } from "@ai-sdk/react";
import { ServerDrivenSpaceTab } from "@/components/ui/space/space-tab";
import { ServerDrivenConversationTab } from "@/components/ui/conversation/conversation-tab";
import { ServerDrivenQuickActionsTab } from "@/components/ui/quick-actions-tab";
import { ServerDrivenModelTab } from "@/components/ui/chat/model-tab";
import { ChatModeTab } from "@/components/ui/chat/chat-mode-tab";
import { ArrowDown, Search, Sparkles } from "lucide-react";
import { BaseTab } from "@/components/ui/common/base-tab";
import { User } from "@supabase/supabase-js";
import { UnifiedInput } from "@/components/ui/chat/unified-input";
import { ChatMessages } from "@/components/ui/chat/chat-messages";
import { UserProfileDropdown } from "@/components/ui/auth/user-profile-dropdown";
import { useCommandCenter } from "@/hooks/useCommandCenter";
import { useRouter } from "next/navigation";
import { sendMessage, createConversation, switchConversation, deleteConversation } from "@/app/actions/conversations";
import { updateSpace } from "@/app/actions/spaces";
import { useCallback, useRef, useState, useEffect } from "react";
import { useSpaceStore } from "@/stores/space-store";
import { useShallow } from "zustand/react/shallow";

interface ClientChatContentProps {
  user: User;
  initialData: {
    spaces: any[];
    activeSpace: any;
    conversations: any[];
    activeConversation: any;
    messages: any[];
    allMessages: Record<string, any[]>;
    notifications?: any[];
  };
}

export default function ClientChatContent({
  user,
  initialData,
}: ClientChatContentProps) {
  const router = useRouter();
  const { openCommandType } = useCommandCenter();
  
  const [isStickToBottom, setIsStickToBottom] = useState(true);
  const [searchMode, setSearchMode] = useState<"chat" | "search" | "semantic" | "hybrid">("chat");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    activeSpace: storeActiveSpace,
    conversations: storeConversations,
    activeConversation: storeActiveConversation,
    messages: storeMessages,
  } = useSpaceStore(
    useShallow((state) => state.uiState)
  );
  
  const activeSpace = storeActiveSpace || initialData.activeSpace;
  const conversations = storeConversations || initialData.conversations;
  const activeConversation = storeActiveConversation || initialData.activeConversation;
  const initialMessages = storeMessages || initialData.messages;

  useEffect(() => {
    if (storeActiveConversation && storeActiveConversation !== activeConversation) {
      setMessages(storeMessages || []);
      setData([]);
    }
  }, [storeActiveConversation?.id]);
  
  const {
    messages,
    setMessages,
    input,
    setInput,
    isLoading: isChatLoading,
    handleInputChange,
    handleSubmit: aiSubmit,
    data,
    setData,
  } = useChat({
    id: activeConversation?.id || 'default',
    api: "/api/chat",
    initialMessages: initialMessages,
    body: {
      spaceId: activeSpace?.id || "",
      conversationId: activeConversation?.id || null,
      provider: activeSpace?.provider || "",
      model: activeSpace?.model || "",
      searchMode,
    },
    onFinish() {
      setData([]);
    },
  });

  const handleStickToBottomChange = useCallback((isAtBottom: boolean) => {
    setIsStickToBottom(isAtBottom);
  }, []);
  
  const scrollToBottomHandler = useRef<() => void>(() => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  });

  const handleScrollToBottom = useCallback((callback: () => void) => {
    scrollToBottomHandler.current = callback;
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || !activeSpace || !activeConversation) return;
    
    try {
      // First submit through the AI SDK for streaming
      aiSubmit();
      
      // Also send to server action to persist in database
      await sendMessage({
        content: input,
        spaceId: activeSpace.id,
        conversationId: activeConversation.id,
        searchMode,
      });
      
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  const handleCreateConversation = async () => {
    if (!activeSpace) return;
    
    try {
      const result = await createConversation(activeSpace.id);
      if (result.status === 'success' && result.data) {
        router.push(`/protected/spaces/${activeSpace.id}/conversations/${result.data.id}`);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-black text-white relative chat-container">
      <div className="fixed top-4 right-4 z-50">
        {user && <UserProfileDropdown user={user} initialNotifications={initialData.notifications} />}
      </div>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div
          className="relative p-1 rounded-full bg-black/20 border border-white/[0.08] backdrop-blur-xl"
          style={{
            background: `color-mix(in srgb, ${activeSpace?.color || "#3ecfff"}10, transparent)`,
            boxShadow: `0 0 20px ${activeSpace?.color || "#3ecfff"}10, inset 0 0 20px ${
              activeSpace?.color || "#3ecfff"
            }05`,
          }}
        >
          <div className="flex items-center divide-x divide-white/[0.08]">
            <div className="px-1 first:pl-1 last:pr-1">
              {/* @ts-ignore */}
              <ServerDrivenSpaceTab 
                spaces={initialData.spaces}
                activeSpace={activeSpace}
              />
            </div>
            <div className="px-1 first:pl-1 last:pr-1">
              {/* @ts-ignore */}
              <ServerDrivenModelTab 
                activeSpace={activeSpace}
                onUpdateSpace={async (spaceId: string, updates: any) => {
                  const success = await updateSpace(spaceId, updates);
                  if (success) {
                    router.refresh();
                  }
                }}
              />
            </div>
            <div className="px-1 first:pl-1 last:pr-1">
              <ChatModeTab 
                mode={searchMode} 
                onModeChange={setSearchMode} 
              />
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
          isLoading={isChatLoading}
          streamData={data}
        />
        <div className="fixed left-1/2 bottom-8 -translate-x-1/2 w-[800px] z-50">
          <div className="relative w-full">
            <UnifiedInput
              value={input}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              disabled={!activeSpace || isChatLoading}
            >
              <div className="flex items-center divide-x divide-white/[0.05] bg-white/[0.03] border-t border-l border-r border-white/[0.05] rounded-t-2xl overflow-hidden backdrop-blur-xl w-full shadow-[0_-4px_20px_rgba(62,207,255,0.03)]">
                <div className="px-1 first:pl-2 last:pr-2 py-1 flex-1">
                  {/* @ts-ignore */}
                  <ServerDrivenQuickActionsTab 
                    onCreateConversation={handleCreateConversation}
                  />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 flex-1">
                  <BaseTab
                    icon={<Search className="w-3 h-3" />}
                    label="Messages"
                    shortcut="F"
                    commandType="conversations"
                    onClick={() => openCommandType("conversations")}
                  />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 flex-1">
                  <BaseTab
                    icon={<Sparkles className="w-3 h-3" />}
                    label="Prompts"
                    shortcut="P"
                    commandType="actions"
                    onClick={() => openCommandType("actions")}
                  />
                </div>
                <div className="flex-shrink min-w-0 flex-1 flex items-center px-1 first:pl-2 last:pr-2 py-1">
                  {/* @ts-ignore */}
                  <ServerDrivenConversationTab
                    conversations={conversations}
                    activeConversation={activeConversation}
                    onCreateConversation={handleCreateConversation}
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