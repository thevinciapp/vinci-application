import { redirect } from "next/navigation";
import ClientChatContent from "@/components/ui/chat/chat-content-client";
import { createClient } from "@/utils/supabase/server";
import { getSpaceData, setActiveSpace, getMessages, getSpaces, getNotifications } from "@/app/actions";   
import { Toaster } from "@/components/ui/common/toaster";
import { CommandProvider } from "@/hooks/useCommandCenter";
import { AllCommandProviders } from "@/components/CommandProviders";
import CommandRoot from "@/components/CommandRoot";

export default async function ConversationPage({
  params
}: {
  params: { spaceId: string; conversationId: string }
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { spaceId, conversationId } = params;
  
  // Set the active space
  await setActiveSpace(spaceId);
  
  // Get comprehensive space data
  const spaceData = await getSpaceData(spaceId);
  
  if (!spaceData || !spaceData.space) {
    // Space not found, redirect to spaces page
    redirect("/protected/spaces");
  }
  
  const { space, conversations: spaceConversations } = spaceData;
  const conversations = spaceConversations || [];
  
  // Find the active conversation
  const activeConversation = conversations.find(
    conversation => conversation.id === conversationId
  );
  
  if (!activeConversation) {
    // Conversation not found, redirect to space's conversations page
    redirect(`/protected/spaces/${spaceId}/conversations`);
  }
  
  const messages = await getMessages(conversationId);
  
  const spaces = await getSpaces();
  
  const notifications = await getNotifications();
  
  const allMessages: Record<string, any[]> = {};
  allMessages[conversationId] = messages || [];
  
  const initialData = {
    spaces: spaces || [],
    activeSpace: space,
    conversations,
    activeConversation,
    messages: messages || [],
    allMessages,
    notifications,
  };

  return (
    <CommandProvider>
        <AllCommandProviders
        spaces={initialData.spaces}
        activeSpace={initialData.activeSpace}
        conversations={initialData.conversations}
        activeConversation={initialData.activeConversation}
        user={user}
        messages={initialData.messages}
        >
            <div className="flex flex-col h-screen bg-black text-white">
            <ClientChatContent
                user={user}
                initialData={initialData}
            />
            </div>
            <CommandRoot />
            <Toaster />
        </AllCommandProviders>
    </CommandProvider>                      
  );
} 