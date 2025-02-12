"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useChat } from "ai/react";
import { ChatMessages } from "@/components/ui/chat-messages";
import { UnifiedInput } from "@/components/ui/unified-input";
import { getSpaceData, getMessages } from "../actions";
import { Conversation, Space } from "@/types";
import { useSpaceStore } from "@/lib/stores/space-store";
import { Message } from "ai";
import { Tabs } from "@/components/tabs";
import { TabSkeleton } from "@/components/ui/tab-skeleton";
import { ChatMessagesSkeleton } from "@/components/ui/chat-messages-skeleton";
import { SpaceTab } from "@/components/ui/space-tab";
import { ConversationTab } from "@/components/ui/conversation-tab";
import QuickActionsTab from "@/components/ui/quick-actions-tab";
import { ModelTab } from "@/components/ui/model-tab";
import { ArrowDown, Search, Sparkles, Settings, Plus } from "lucide-react";
import { BaseTab } from "@/components/ui/base-tab";

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
    spaces,
}: ClientChatContentProps) {
    const { activeSpace, setActiveSpace, setSpaces } = useSpaceStore()
    const [conversations, setConversations] = useState<Conversation[]>(defaultConversations || []);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isStickToBottom, setIsStickToBottom] = useState(true);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

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

    const handleScrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({ 
                top: messagesContainerRef.current.scrollHeight, 
                behavior: 'smooth' 
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-black text-white">
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
                <div className="p-1 rounded-full bg-white/[0.03] border border-white/[0.05] backdrop-blur-xl shadow-[0_0_15px_rgba(62,207,255,0.1)]">
                    <div className="flex items-center divide-x divide-white/[0.05]">
                        <div className="px-1 first:pl-1 last:pr-1">
                            <SpaceTab />
                        </div>
                        {!isStickToBottom && messages.length > 0 && (
                            <div className="px-1 first:pl-1 last:pr-1">
                                <BaseTab
                                    icon={<ArrowDown className="w-3 h-3" />}
                                    label="Scroll to Bottom"
                                    onClick={() => {
                                        const messagesContainer = document.querySelector('.messages-container');
                                        if (messagesContainer) {
                                            messagesContainer.scrollTo({
                                                top: messagesContainer.scrollHeight,
                                                behavior: 'smooth'
                                            });
                                        }
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
                <Suspense fallback={<ChatMessagesSkeleton />}>
                    <ChatMessages 
                        messages={messages} 
                        onStickToBottomChange={setIsStickToBottom}
                        ref={messagesContainerRef}
                    />
                </Suspense>
                <div className="fixed left-1/2 bottom-8 -translate-x-1/2 w-[800px] z-50">
                    <div className="relative w-full">
                        <UnifiedInput
                            value={input}
                            onChange={handleInputChange}
                            onSubmit={handleSubmit}
                            disabled={!activeSpace || isLoading || isChatLoading}
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
                                <div className="px-1 first:pl-2 last:pr-2 py-1 flex-1">
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