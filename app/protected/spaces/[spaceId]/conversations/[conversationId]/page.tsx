import { redirect } from "next/navigation";
import ClientChatContent from "@/components/ui/chat/chat-content-client";
import { createClient } from "@/utils/supabase/server";
import { getSpaceData, setActiveSpace, getSpaces } from "@/app/actions/spaces";
import { getMessages } from "@/app/actions/conversations";
import { getNotifications } from "@/app/actions/notifications";
import { AllCommandProviders } from "@/components/AllCommandProviders";

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
  
  console.log('[SERVER] Loading conversation page data:', { spaceId, conversationId });
  
  const [spaceDataResponse, messagesResponse, spacesResponse, notificationsResponse] = 
    await Promise.all([
      getSpaceData(spaceId),          // Get space data with conversations
      getMessages(conversationId),    // Get messages for this conversation
      getSpaces(),                    // Get all spaces
      getNotifications()              // Get notifications
    ]);
  
  if (!spaceDataResponse.data || !spaceDataResponse.data.space) {
    console.error('[SERVER] Space data not found, redirecting to spaces');
    redirect("/protected/spaces");
  }
  
  const { space, conversations: spaceConversations } = spaceDataResponse.data;
  const conversations = spaceConversations || [];
  
  const activeConversation = conversations.find(
    conversation => conversation.id === conversationId
  );
  
  if (!activeConversation) {
    console.error('[SERVER] Active conversation not found, redirecting to space');
    redirect(`/protected/spaces/${spaceId}/conversations`);
  }
  
  const allMessages: Record<string, any[]> = {};  
  allMessages[conversationId] = messagesResponse.data || [];
  
  console.log('[SERVER] Conversation page data loaded:', {
    spacesCount: spacesResponse.data?.length || 0,
    conversationsCount: conversations.length,
    messagesCount: messagesResponse.data?.length || 0,
    notificationsCount: notificationsResponse.data?.length || 0
  });
  
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
    <ClientChatContent
      user={user}
      initialData={initialData}
    />
  );
} 