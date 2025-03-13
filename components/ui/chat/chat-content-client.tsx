"use client";
import { useChat } from "@ai-sdk/react";
import { ServerDrivenSpaceTab } from "@/components/ui/space/space-tab";
import { ServerDrivenConversationTab } from "@/components/ui/conversation/conversation-tab";
import { ServerDrivenQuickActionsTab, ServerDrivenBackgroundTasksTab, ServerDrivenSuggestionsTab } from "@/components/ui/quick-actions-tab";
import { ServerDrivenModelTab } from "@/components/ui/chat/model-tab";
import { ChatModeTab } from "@/components/ui/chat/chat-mode-tab";
import { ArrowDown, Search, Sparkles } from "lucide-react";
import { BaseTab } from "vinci-ui";
import { User } from "@supabase/supabase-js";
import { UnifiedInput } from "@/components/ui/chat/unified-input";
import { ChatMessages } from "@/components/ui/chat/chat-messages";
import { UserProfileDropdown } from "@/components/ui/auth/user-profile-dropdown";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useEffect } from "react";
import { ConversationsAPI } from "@/lib/api-client";
import { useAppState } from "@/lib/app-state-context";
import { toast } from "@/components/ui/use-toast";

export default function ClientChatContent() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const handleAppDataUpdate = (event: any, data: { user: User | null }) => {
      setUser(data.user);
    };

    // Listen for app state updates from the main process
    window.electron.on('app-data-updated', handleAppDataUpdate);

    // Initial state check
    window.electron.invoke('get-app-state').then((state: any) => {
      setUser(state.user);
    });

    return () => {
      window.electron.removeListener('app-data-updated', handleAppDataUpdate);
    };
  }, []);
  const router = useRouter();
  const [isStickToBottom, setIsStickToBottom] = useState(true);
  const [searchMode, setSearchMode] = useState<"chat" | "search" | "semantic" | "hybrid">("chat");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [fileReferences, setFileReferences] = useState<any[]>([]);
  const clearFileReferences = () => setFileReferences([]);
  const fileReferencesMap = useCallback(() => {
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

  const { appState, refreshAppState, clearError } = useAppState();
  const { activeSpace, conversations, messages: initialMessages, isLoading: isAppLoading, error: appError } = appState;
  const activeConversation = conversations?.[0] || null;

  const chatKey = `${activeConversation?.id || 'default'}-${activeSpace?.provider || ''}-${activeSpace?.model || ''}`;

  const {
    messages,
    setMessages,
    input,
    isLoading: isChatLoading,
    setInput,
    handleInputChange,
    handleSubmit,
    data,
    setData,
  } = useChat({
    id: chatKey,
    api: "/api/chat",
    initialMessages: initialMessages || [], // Use initialMessages from appState
    body: {
      spaceId: activeSpace?.id || "",
      conversationId: activeConversation?.id || null,
      provider: activeSpace?.provider || "",
      model: activeSpace?.model || "",
      searchMode,
      chatMode: activeSpace?.chat_mode || "ask",
      chatModeConfig: activeSpace?.chat_mode_config || { tools: [] },
      files: fileReferencesMap(),
    },
    onFinish() {
      setData([]);
      clearFileReferences();
    },
  });

  // Update messages when initialMessages changes or when the conversation changes
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      console.log('Setting initial messages from app state:', initialMessages.length);
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages, activeConversation?.id]);

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

  const handleCreateConversation = async (title: string) => {
    if (!activeSpace) return;
    
    try {
      const { success, data: newConversation } = await ConversationsAPI.createConversation(activeSpace.id, title);
      if (success && newConversation) {
        router.push(`/chat/${newConversation.id}`);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
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
            background: `color-mix(in srgb, ${activeSpace?.color || "#3ecfff"}10, transparent)`,
            boxShadow: `0 0 20px ${activeSpace?.color || "#3ecfff"}10, inset 0 0 20px ${
              activeSpace?.color || "#3ecfff"
            }05`,
          }}
        >
          <div className="flex items-center divide-x divide-white/[0.08]">
            <div className="px-1 first:pl-1 last:pr-1">
              <ServerDrivenSpaceTab 
                activeSpace={activeSpace}
                isLoading={isAppLoading}
              />
            </div>
            <div className="px-1 first:pl-1 last:pr-1">
              <ServerDrivenModelTab />
            </div>
            <div className="px-1 first:pl-1 last:pr-1">
              <ChatModeTab chatMode={activeSpace?.chat_mode} />
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
          {appError && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-500/20 text-red-200 px-4 py-2 rounded-lg border border-red-500/30 backdrop-blur-xl">
              {appError}
            </div>
          )}
        </div>
        <ChatMessages
          messages={messages}
          onStickToBottomChange={handleStickToBottomChange}
          onScrollToBottom={handleScrollToBottom}
          ref={messagesContainerRef}
          isLoading={isChatLoading || isAppLoading}
          streamData={data}
        />
        <div className="fixed left-1/2 bottom-8 -translate-x-1/2 w-[800px] z-50">
          <div className="relative w-full">
            <UnifiedInput
              value={input}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              disabled={!activeSpace || isChatLoading || isAppLoading}
            >
              <div className="flex items-center divide-x divide-white/[0.05] bg-white/[0.03] border-t border-l border-r border-white/[0.05] rounded-t-2xl overflow-hidden backdrop-blur-xl w-full shadow-[0_-4px_20px_rgba(62,207,255,0.03)]">
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5">
                  <ServerDrivenQuickActionsTab 
                    onCreateConversation={handleCreateConversation}
                  />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5">
                  <BaseTab
                    icon={<Search className="w-3 h-3" />}
                    label="Messages"
                    shortcut="F"
                    commandType="conversations"
                  />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5">
                  <ServerDrivenBackgroundTasksTab />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5">
                  <ServerDrivenSuggestionsTab />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5">
                  <ServerDrivenConversationTab
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
