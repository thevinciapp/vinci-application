import { redirect } from "next/navigation";
import ClientChatContent from "@/components/ui/chat/chat-content-client";
import { createClient } from "@/utils/supabase/server";
import { getSpaceData, setActiveSpace, getSpaces } from "@/app/actions/spaces";
import { getMessages } from "@/app/actions/conversations";
import { getNotifications } from "@/app/actions/notifications";
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
  const spaceDataResponse = await getSpaceData(spaceId);
  
  if (!spaceDataResponse.data || !spaceDataResponse.data.space) {
    // Space not found, redirect to spaces page
    redirect("/protected/spaces");
  }
  
  const { space, conversations: spaceConversations } = spaceDataResponse.data;
  const conversations = spaceConversations || [];
  
  // Find the active conversation
  const activeConversation = conversations.find(
    conversation => conversation.id === conversationId
  );
  
  if (!activeConversation) {
    // Conversation not found, redirect to space's conversations page
    redirect(`/protected/spaces/${spaceId}/conversations`);
  }
  
  const messagesResponse = await getMessages(conversationId);
  
  const spacesResponse = await getSpaces();
  
  const notificationsResponse = await getNotifications();
  
  const allMessages: Record<string, any[]> = {};
  allMessages[conversationId] = messagesResponse.data || [];
  
  const initialData = {
    spaces: spacesResponse.data || [],
    activeSpace: space,
    conversations,
    activeConversation,
    messages: messagesResponse.data || [],
    allMessages,
    notifications: notificationsResponse.data || [],
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