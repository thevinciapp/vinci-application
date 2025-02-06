"use client"

import { redirect } from "next/navigation";
import { useChat } from "ai/react";
import { UnifiedInput } from "@/components/ui/unified-input";
import { ChatMessages } from "@/components/ui/chat-messages";
import { CommandStateProvider } from "@/components/ui/command-state-provider";
import { QuickActionsCommandProvider } from "@/components/ui/quick-actions-command-provider";
import { SpacesProvider, useSpaces } from "@/hooks/spaces-provider";
import { ConversationsProvider, useConversations } from "@/hooks/conversations-provider";
import { MessagesProvider, useMessages } from "@/hooks/messages-provider";
import { ChatStateProvider, useChatState } from "@/hooks/chat-state-provider";
import { Message, convertToAIMessage } from "@/types";  // Keep this import if needed elsewhere
import { useCallback, useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

function ChatContent() {
  const { activeSpace, state: spacesState } = useSpaces();
  const { activeConversation, state: conversationsState } = useConversations();
  const { messages: chatMessages, state: messagesState, addMessage } = useMessages();
  const { batchUpdate } = useChatState();
  const [userId, setUserId] = useState<string | null>(null);

    // Fetch user ID only once on component mount.  More efficient.
    useEffect(() => {
      const fetchUser = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) {
              redirect('/sign-in'); // Consider a loading state or error boundary instead of immediate redirect
          }
          setUserId(session.user.id);
      };

      fetchUser();
  }, []);


  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading: isStreaming,
  } = useChat({
    api: "/api/chat",
    body: useMemo(() => ({
      spaceId: activeSpace?.id,
      model: activeSpace?.model,
      provider: activeSpace?.provider,
    }), [activeSpace]),
    id: activeConversation?.id,
    initialMessages: useMemo(() => chatMessages.map(convertToAIMessage), [chatMessages]),
    onResponse: useCallback((response: Response) => {
      if (!response.ok) {
        console.error('Failed to get response from server', response.status, response.statusText);
        batchUpdate({ error: 'Failed to get response from server' });
      } else {
        batchUpdate({ isLoading: true, error: null });
      }
    }, [batchUpdate]),
    onFinish: useCallback(async (message: { content: string }) => {
      if (!activeSpace?.id || !activeConversation?.id || !userId) return;

      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: activeConversation.id,
            user_id: userId,
            role: 'assistant',
            content: message.content,
            model_used: activeSpace.model,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save assistant message: ${response.status} ${response.statusText}`);
        }

        const assistantMessageData = await response.json();
        if(!assistantMessageData.id) throw new Error('Failed to save assistant message: Invalid API response');
        
        addMessage({
          id: assistantMessageData.id,
          conversation_id: activeConversation.id,
          user_id: userId,
          role: 'assistant',
          content: assistantMessageData.content,
        });

      } catch (error) {
        console.error('Error saving assistant message:', error);
        batchUpdate({ error: 'Failed to save assistant message' });
      } finally {
        batchUpdate({ isLoading: false });
      }
    }, [activeSpace?.id, activeConversation?.id, userId, addMessage, batchUpdate])
  });


  // Consolidated handleSubmit function
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();  // Use optional chaining since e might be undefined
    if (!input.trim() || isStreaming || !userId || !activeConversation?.id) return;

    // Set loading state immediately
    batchUpdate({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConversation.id,
          user_id: userId,
          role: 'user',
          content: input,
          model_used: activeSpace?.model,
        }),
      });

      if (!response.ok) {
          throw new Error(`Failed to save user message: ${response.status} ${response.statusText}`);
      }
      const userMessageData = await response.json();
      if(!userMessageData.id) throw new Error('Failed to save user message: Invalid API response');

      await originalHandleSubmit(e);

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      batchUpdate({ isLoading: false, error: 'Failed to send message' });
    }
  }, [input, isStreaming, userId, activeConversation?.id, activeSpace?.model, originalHandleSubmit, batchUpdate]);

  const mappedMessages = messages.map(msg => ({
    id: msg.id,
    conversation_id: activeConversation?.id || '',
    user_id: userId || '',
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    model_used: activeSpace?.model
  }));

  // Loading state - simplified
  if (!spacesState.isInitialized || !conversationsState.isInitialized || !messagesState.isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm text-white/70">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <div className="flex-1 w-full h-full flex flex-col">
        <ChatMessages messages={mappedMessages} />
        <UnifiedInput
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          disabled={isStreaming}
        />
      </div>
    </div>
  );
}

export default function Chat() {
  return (
    <SpacesProvider>
      <ConversationsProvider>
        <MessagesProvider>
          <ChatStateProvider>
            <CommandStateProvider>
              <QuickActionsCommandProvider>
                <ChatContent />
              </QuickActionsCommandProvider>
            </CommandStateProvider>
          </ChatStateProvider>
        </MessagesProvider>
      </ConversationsProvider>
    </SpacesProvider>
  );
}