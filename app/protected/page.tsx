"use client"

import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";
import { useState, useEffect, useMemo } from "react"
import { Message, useChat } from "ai/react"
import { User } from '@supabase/supabase-js'
import { UnifiedInput } from "@/components/ui/unified-input";
import { SpaceCommand } from "@/components/ui/space-command";
import { SpaceCommandProvider, useSpaceCommand } from "@/components/ui/space-command-provider";
import { ChatMessages } from "@/components/ui/chat-messages";
import { useChatState } from '@/store/chat-state-store';
import { SpaceLoading } from "@/components/ui/space-loading";
import { CommandStateProvider } from "@/components/ui/command-state-provider";
import { QuickActionsCommandProvider } from "@/components/ui/quick-actions-command-provider";

const supabase = createClient();

interface DatabaseMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  user_message: string;
  assistant_message: string;
  created_at: string;
  updated_at: string;
}

function ChatContent() {
  const { closeSpaceCommand, isOpen: isSpaceCommandOpen } = useSpaceCommand();
  const { currentSpace, isLoading: isSpaceLoading } = useSpaceCommand();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  const { setStatus } = useChatState();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [savedMessages, setSavedMessages] = useState<DatabaseMessage[]>([]);

  // Convert saved messages to the format expected by useChat
  const initialMessages = useMemo(() => {
    return savedMessages.flatMap((msg): Message[] => [
      {
        id: msg.id + '-user',
        content: msg.user_message,
        role: 'user',
        createdAt: new Date(msg.created_at)
      },
      {
        id: msg.id + '-assistant',
        content: msg.assistant_message,
        role: 'assistant',
        createdAt: new Date(msg.created_at)
      }
    ]);
  }, [savedMessages]);

  const { messages, input, handleInputChange, handleSubmit: originalHandleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: { spaceId: currentSpace?.id },
    id: conversationId || undefined,
    initialMessages,
    onResponse: (response) => {
      if (!response.ok) {
        setStatus('error', 'Failed to get response from server');
      }
    },
    onFinish: async (message) => {
      try {
        if (currentSpace?.id) {
          let currentConversationId = conversationId;
          
          if (!currentConversationId) {
            const resConv = await fetch('/api/conversations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ space_id: currentSpace.id, title: 'Default Conversation' })
            });
            
            const convData = await resConv.json();
            if (convData.error) {
              throw new Error('Failed to create conversation');
            }
            
            currentConversationId = convData.id;
            setConversationId(currentConversationId);
          }

          // Find the user message that was just sent
          const userMessage = messages[messages.length - 2]?.content;
          const assistantMessage = message.content;

          if (userMessage && assistantMessage) {
            await fetch('/api/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                conversation_id: currentConversationId,
                user_message: userMessage,
                assistant_message: assistantMessage
              })
            });
          }
        }
      } catch (error) {
        console.error('Error saving messages:', error);
        setStatus('error', 'Failed to save messages');
      } finally {
        setStatus('idle');
      }
    }
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    
    setStatus('generating');
    originalHandleSubmit(e);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      if (!isSpaceLoading && currentSpace?.id) {
        await fetchConversations(currentSpace.id);
        setDataLoading(false);
      }
    };

    loadInitialData();
  }, [currentSpace?.id, isSpaceLoading]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchConversations = async (currentSpaceId: string) => {
    try {
      const res = await fetch(`/api/conversations/${currentSpaceId}`);
      const data = await res.json();
      
      if (!data.error) {
        setConversations(data);
        if (data.length > 0) {
          const latestConversation = data[0];
          setConversationId(latestConversation.id);
          
          const messagesRes = await fetch(`/api/messages/${latestConversation.id}`);
          const messagesData = await messagesRes.json();
          if (!messagesData.error) {
            setSavedMessages(messagesData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setStatus('error', 'Failed to load conversations');
    }
  };

  // Don't render anything while loading or if not authenticated
  if (authLoading || dataLoading || isSpaceLoading || !user) {
    return null;
  }

  // Redirect if not authenticated
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <SpaceCommand 
        isOpen={isSpaceCommandOpen}
        onClose={closeSpaceCommand}
      />
      <div className="flex-1 w-full h-full flex flex-col">
        <ChatMessages messages={messages} />
        <UnifiedInput
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}

export default function Chat() {
  return (
    <CommandStateProvider>
      <SpaceCommandProvider>
        <QuickActionsCommandProvider>
          <ChatContent />
        </QuickActionsCommandProvider>
      </SpaceCommandProvider>
    </CommandStateProvider>
  );
}
