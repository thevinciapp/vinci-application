import { redirect } from "next/navigation";
import ClientChatContent from "@/components/ui/chat/chat-content-client";
import { createClient } from "@/utils/supabase/server";
import { API } from "@/lib/api-client";
import { AllCommandProviders } from "@/components/AllCommandProviders";
import { AppStateProvider } from "@/lib/app-state-context";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }
  
  console.log('[SERVER] Loading application data');
  
  // Load all spaces first to determine initial state
  const spacesResponse = await API.spaces.getSpaces();
  if (!spacesResponse.success) {
    throw new Error('Failed to load spaces');
  }
  const spaces = spacesResponse.data || [];
  
  if (spaces.length === 0) {
    // If no spaces exist, render the UI to create first space
    const initialData = {
      spaces: [],
      activeSpace: null,
      conversations: [],
      activeConversation: null,
      messages: [],
      allMessages: {},
      notifications: [],
    };
    
    return (
      <ClientChatContent
        user={user}
        initialData={initialData}
      />
    );
  }
  
  // Get data for the first space (will be initial active space)
  const firstSpace = spaces[0];
  
  const [spaceDataResponse, notificationsResponse] = 
    await Promise.all([
      API.spaces.getSpaceData(firstSpace.id),          // Get space data with conversations
      API.search.searchMessages({ searchTerm: '', searchScope: 'all' }) // Get all messages as notifications
    ]);
  
  if (!spaceDataResponse.success || !spaceDataResponse.data || !spaceDataResponse.data.space) {
    throw new Error('Failed to load space data');
  }
  
  const { space, conversations: spaceConversations } = spaceDataResponse.data;
  const conversations = spaceConversations || [];
  
  // If there are conversations, get messages for the first one
  let messages: any[] = [];
  let activeConversation = null;
  let allMessages: Record<string, any[]> = {};
  
  if (conversations.length > 0) {
    activeConversation = conversations[0];
    const messagesResponse = await API.messages.getMessages(activeConversation.id);
    if (messagesResponse.success) {
      messages = messagesResponse.data || [];
      allMessages[activeConversation.id] = messages;
    }
  }
  
  console.log('[SERVER] Application data loaded:', {
    spacesCount: spaces.length,
    conversationsCount: conversations.length,
    messagesCount: messages.length,
    notificationsCount: notificationsResponse.data?.results?.length || 0
  });
  
  const initialData = {
    spaces,
    activeSpace: space,
    conversations,
    activeConversation,
    messages,
    allMessages,
    notifications: notificationsResponse.data?.results || [],
  };

  return (
    <AppStateProvider>  
      <ClientChatContent
        user={user}
        initialData={initialData}
      />
    </AppStateProvider>
  );
}