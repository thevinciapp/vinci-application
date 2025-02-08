"use client";

import { useChat } from "ai/react";
import { UnifiedInput } from "@/components/ui/unified-input";
import { ChatMessages } from "@/components/ui/chat-messages";
import { CommandStateProvider } from "@/components/ui/command-state-provider";
import { QuickActionsCommandProvider } from "@/components/ui/quick-actions-command-provider";
import { SpacesProvider, useSpaces } from "@/hooks/spaces-provider";
import { ConversationsProvider, useConversations } from "@/hooks/conversations-provider";
import { MessagesProvider, useMessages } from "@/hooks/messages-provider";
import { ChatStateProvider, useChatState } from "@/hooks/chat-state-provider";
import { Message, convertToAIMessage, Space, Conversation } from "@/types";
import { useCallback, useState, useEffect, useMemo } from "react";
import { User } from "@supabase/supabase-js";

interface ChatContentClientProps {
  initialData: {
    user: User | null;
    spaces: Space[] | null;
    activeSpace: Space | null;
    conversations: Conversation[] | null;
    messages: { [conversationId: string]: Message[] };
  };
}

function ChatContentClient({ initialData }: ChatContentClientProps) {
  const { activeSpace, setSpaces, setActiveSpace } = useSpaces();
  const { activeConversation, setConversations, setActiveConversation } = useConversations();
  const { messages: chatMessages, addMessage, setMessages } = useMessages();
  const { batchUpdate } = useChatState();

  useEffect(() => {
    if (initialData.spaces) {
      setSpaces(initialData.spaces);
    }
    if (initialData.activeSpace) {
        setActiveSpace(initialData.activeSpace);
    }

    if (initialData.conversations) {
        setConversations(initialData.conversations);
    }

    if(initialData.conversations && initialData.conversations.length > 0){
        setActiveConversation(initialData.conversations[0])
    }

    if (initialData.messages && initialData.conversations && initialData.conversations.length > 0) {

      setMessages(initialData.messages[initialData.conversations[0].id] || []);
    }

  }, [initialData, setSpaces, setConversations, setMessages]);



  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const userId = initialData.user?.id;


    const {
        messages: aiMessages,
        input,
        handleInputChange,
        handleSubmit: originalHandleSubmit,
        isLoading: isStreaming,
    } = useChat({
        api: "/api/chat",
        body: {
            spaceId: activeSpace?.id,
            model: activeSpace?.model,
            provider: activeSpace?.provider,
        },
        id: activeConversation?.id,
        initialMessages: useMemo(() => {
            return chatMessages.map(convertToAIMessage)
        }, [chatMessages]),
        onResponse: (response: Response) => {
            if (!response.ok) {
                console.error('Failed to get response from server', response.status, response.statusText);
                batchUpdate({ error: 'Failed to get response from server' });
            } else {
                batchUpdate({ isLoading: true, error: null });
            }
        },
        onFinish: async (message: { content: string }) => {
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
                        provider: activeSpace.provider
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to save assistant message: ${response.status} ${response.statusText}`);
                }

                const assistantMessageData = await response.json();
                if (!assistantMessageData.id) throw new Error('Failed to save assistant message: Invalid API response');

                // Add the full message from the database
                addMessage(assistantMessageData);
                // Clear the streaming message since we now have the final version
                setStreamingMessage(null);

            } catch (error) {
                console.error('Error saving assistant message:', error);
                batchUpdate({ error: 'Failed to save assistant message' });
            } finally {
                batchUpdate({ isLoading: false });
            }
        },
    });

    // Update streaming message whenever AI messages change
    useEffect(() => {
        if (!isStreaming || aiMessages.length === 0) return;

        const lastMessage = aiMessages[aiMessages.length - 1];
        if (lastMessage.role === 'assistant') {
            setStreamingMessage(prev => {
                if (!prev || prev.content !== lastMessage.content) {
                    return {
                        id: lastMessage.id,
                        conversation_id: activeConversation?.id || '',
                        user_id: userId || '',
                        role: 'assistant',
                        content: lastMessage.content,
                        model_used: activeSpace?.model,
                        provider: activeSpace?.provider,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                }
                return prev;
            });
        }
    }, [aiMessages, isStreaming, activeSpace?.model, activeSpace?.provider, activeConversation?.id, userId]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || isStreaming || !userId || !activeConversation?.id) return;

      batchUpdate({ isLoading: true, error: null });

      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: activeConversation.id,
            user_id: userId,
            role: "user",
            content: input,
            model_used: activeSpace?.model,
            provider: activeSpace?.provider,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to save user message: ${response.status} ${response.statusText}`,
          );
        }
        const userMessageData = await response.json();
        if (!userMessageData.id)
          throw new Error("Failed to save user message: Invalid API response");

        // Add the full message from the database
        addMessage(userMessageData);

        // Create skeleton assistant message immediately
        setStreamingMessage({
          id: crypto.randomUUID(),
          conversation_id: activeConversation.id,
          user_id: userId,
          role: "assistant",
          content: "",
          model_used: activeSpace?.model,
          provider: activeSpace?.provider,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        await originalHandleSubmit(e);
      } catch (error) {
        console.error("Error in handleSubmit:", error);
        batchUpdate({ isLoading: false, error: "Failed to send message" });
        // Clear streaming message if there's an error
        setStreamingMessage(null);
      }
    },
    [
      input,
      isStreaming,
      userId,
      activeConversation?.id,
      activeSpace?.model,
      activeSpace?.provider,
      originalHandleSubmit,
      batchUpdate,
      addMessage,
    ],
  );


  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <div className="flex-1 w-full h-full flex flex-col">
        <ChatMessages
          messages={
            streamingMessage
              ? [...chatMessages, streamingMessage]
              : chatMessages
          }
        />
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


//Wrapping providers.
export default function Chat() {

    return (
        <SpacesProvider>
            <ConversationsProvider>
                <MessagesProvider>
                    <ChatStateProvider>
                        <CommandStateProvider>
                            <QuickActionsCommandProvider>
                                <ChatContentClient initialData={{
                                    user: null,
                                    spaces: [],
                                    activeSpace: null,
                                    conversations: [],
                                    messages: {}
                                }} />
                            </QuickActionsCommandProvider>
                        </CommandStateProvider>
                    </ChatStateProvider>
                </MessagesProvider>
            </ConversationsProvider>
        </SpacesProvider>
    );
}