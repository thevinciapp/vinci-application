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
  
  const [spaceDataResponse, messagesResponse, spacesResponse, notificationsResponse] = 
    await Promise.all([
      getSpaceData(spaceId),          // Get space data with conversations
      getMessages(conversationId),    // Get messages for this conversation
      getSpaces(),                    // Get all spaces
      getNotifications()              // Get notifications
    ]);
  
  if (!spaceDataResponse.data || !spaceDataResponse.data.space) {
    redirect("/protected/spaces");
  }
  
  const { space, conversations: spaceConversations } = spaceDataResponse.data;
  const conversations = spaceConversations || [];
  
  const activeConversation = conversations.find(
    conversation => conversation.id === conversationId
  );
  
  if (!activeConversation) {
    redirect(`/protected/spaces/${spaceId}/conversations`);
  }
  
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