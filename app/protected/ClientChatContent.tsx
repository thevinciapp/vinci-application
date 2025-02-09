"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useChat } from "ai/react";
import { useSpaces } from "@/hooks/spaces-provider";
import { useConversations } from "@/hooks/conversations-provider";
import { useMessages } from "@/hooks/messages-provider";
import { useChatState } from "@/hooks/chat-state-provider";
import { Message, convertToAIMessage } from "@/types";
import { ChatMessages } from "@/components/ui/chat-messages";
import { UnifiedInput } from "@/components/ui/unified-input";

interface ClientChatContentProps {
  initialUserId: string;
}

export default function ClientChatContent({ initialUserId }: ClientChatContentProps) {
  // The user ID is now passed from the server.
  const [userId] = useState(initialUserId);
  const { activeSpace } = useSpaces();
  const { activeConversation } = useConversations();
  const { messages, addMessage } = useMessages();
  const { batchUpdate } = useChatState();
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);

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
    initialMessages: useMemo(() => messages.map(convertToAIMessage), [messages]),
    onResponse: (response: Response) => {
      if (!response.ok) {
        console.error(
          "Failed to get response from server",
          response.status,
          response.statusText
        );
        batchUpdate({ error: "Failed to get response from server" });
      } else {
        batchUpdate({ isLoading: true, error: null });
      }
    },
    onFinish: async (message: { content: string }) => {
      if (!activeSpace?.id || !activeConversation?.id || !userId) return;
      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: activeConversation.id,
            user_id: userId,
            role: "assistant",
            content: message.content,
            model_used: activeSpace.model,
            provider: activeSpace.provider,
          }),
        });
        if (!response.ok) {
          throw new Error(
            `Failed to save assistant message: ${response.status} ${response.statusText}`
          );
        }
        const assistantMessageData = await response.json();
        if (!assistantMessageData.id) {
          throw new Error("Failed to save assistant message: Invalid API response");
        }
        addMessage(assistantMessageData);
        setStreamingMessage(null);
      } catch (error) {
        console.error("Error saving assistant message:", error);
        batchUpdate({ error: "Failed to save assistant message" });
      } finally {
        batchUpdate({ isLoading: false });
      }
    },
  });

  useEffect(() => {
    if (!isStreaming || aiMessages.length === 0) return;
    const lastMessage = aiMessages[aiMessages.length - 1];
    if (lastMessage.role === "assistant") {
      setStreamingMessage((prev) => {
        if (!prev || prev.content !== lastMessage.content) {
          return {
            id: lastMessage.id,
            conversation_id: activeConversation?.id || "",
            user_id: userId,
            role: "assistant",
            content: lastMessage.content,
            model_used: activeSpace?.model,
            provider: activeSpace?.provider,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        return prev;
      });
    }
  }, [aiMessages, isStreaming, activeSpace, activeConversation, userId, batchUpdate]);

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
            `Failed to save user message: ${response.status} ${response.statusText}`
          );
        }
        const userMessageData = await response.json();
        if (!userMessageData.id) {
          throw new Error("Failed to save user message: Invalid API response");
        }
        addMessage(userMessageData);
        // Create a skeleton assistant message immediately
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
        setStreamingMessage(null);
      }
    },
    [
      input,
      isStreaming,
      userId,
      activeConversation,
      activeSpace,
      originalHandleSubmit,
      batchUpdate,
      addMessage,
    ]
  );

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <div className="flex-1 w-full h-full flex flex-col">
        <ChatMessages
          messages={streamingMessage ? [...messages, streamingMessage] : messages}
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