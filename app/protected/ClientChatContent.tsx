"use client";

import React, { useState, useEffect, useMemo, FormEvent } from "react";
import { useChat } from "ai/react";
import { ChatMessages } from "@/components/ui/chat-messages";
import { UnifiedInput } from "@/components/ui/unified-input";
import { createConversation, getSpaceData, getMessages } from "../actions";
import { Conversation, Space, ExtendedMessage } from "@/types";
import { SpaceTab } from "@/components/ui/space-tab";
import { ModelTab } from "@/components/ui/model-tab";
import QuickActionsTab from "@/components/ui/quick-actions-tab";
import { useSpaceStore } from "@/lib/stores/space-store";
import { Message } from "ai";

interface ClientChatContentProps {
    userId: string;
    defaultSpace: Space | null;
    defaultConversations: Conversation[] | null;
    spaces: Space[] | null;
    defaultMessages: Message[] | null;
}

export default function ClientChatContent({
    userId,
    defaultSpace,
    defaultConversations,
    defaultMessages,
    spaces
}: ClientChatContentProps) {
    const { activeSpace, setActiveSpace, setSpaces } = useSpaceStore()
    const [conversations, setConversations] = useState<Conversation[]>(defaultConversations || []);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setActiveSpace(defaultSpace);
        setSpaces(spaces);
        setIsLoading(false);
    }, [defaultSpace, spaces, setActiveSpace, setSpaces]);

    useEffect(() => {
        async function loadSpaceData() {
            setIsLoading(true)
            setMessages([])

            if (!activeSpace?.id) {
                setIsLoading(false)
                return
            }

            const spaceData = await getSpaceData(activeSpace.id)
            if (!spaceData) {
                setIsLoading(false)
                return
            }

            if (spaceData.space) {
                setActiveSpace(spaceData.space)
            }

            const conversations = spaceData.conversations ?? []
            setConversations(conversations)

            if (conversations.length > 0) {
                const latestConversation = conversations[0]
                setActiveConversation(latestConversation)

                const messageData = spaceData.messages ?? await getMessages(latestConversation.id)
                if (messageData) {
                    setMessages(messageData)
                }
            } else {
                const newConversation = await createConversation(activeSpace.id, 'New Chat')
                if (newConversation) {
                    setConversations([newConversation])
                    setActiveConversation(newConversation)
                }
            }

            setIsLoading(false)
        }

        loadSpaceData()
    }, [activeSpace?.id])

    const { messages, setMessages, input, isLoading: isChatLoading, handleInputChange, handleSubmit } = useChat({
        api: "/api/chat",
        initialMessages: defaultMessages || [],
        body: {
            spaceId: activeSpace?.id || '',
            conversationId: activeConversation?.id || null
        },
    });

    return (
        <div className="flex flex-col h-full bg-black text-white">
            <div className="flex-1 w-full h-full flex flex-col">
                <ChatMessages messages={messages} />
                <div className="fixed left-1/2 bottom-8 -translate-x-1/2 w-[800px] z-50">
                    <div className="relative w-full">
                        <div className="absolute -top-8 left-0 right-0 flex justify-center z-[100]">
                            <div className="flex items-center gap-2">
                                <SpaceTab
                                    activeSpace={activeSpace}
                                    isLoading={isLoading}
                                />
                                <QuickActionsTab />
                                <ModelTab
                                    activeSpace={activeSpace}
                                    isLoading={isLoading}
                                />
                            </div>
                        </div>
                        <UnifiedInput
                            value={input}
                            onChange={handleInputChange}
                            onSubmit={handleSubmit}
                            disabled={!activeSpace || isLoading || isChatLoading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}