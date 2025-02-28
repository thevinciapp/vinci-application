import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getSpaceData, setActiveSpace } from "@/app/actions/spaces";
import { createConversation } from "@/app/actions/conversations";

export default async function SpaceConversationsPage({
  params
}: {
  params: { spaceId: string }
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { spaceId } = params;
  
  // Set this as the active space
  await setActiveSpace(spaceId);
  
  // Get comprehensive space data
  const spaceDataResponse = await getSpaceData(spaceId);
  
  if (!spaceDataResponse.data || !spaceDataResponse.data.space) {
    // Space not found, redirect to spaces page
    redirect("/protected/spaces");
  }
  
  const { space, conversations } = spaceDataResponse.data;
  
  // If there are conversations, redirect to the first one
  if (conversations && conversations.length > 0) {
    redirect(`/protected/spaces/${spaceId}/conversations/${conversations[0].id}`);
  }
  
  // No conversations exist, create a default one
  const conversationResponse = await createConversation(spaceId, "Welcome");
  if (!conversationResponse.data) {
    throw new Error("Failed to create conversation for space");
  }
  
  // Redirect to the new conversation
  redirect(`/protected/spaces/${spaceId}/conversations/${conversationResponse.data.id}`);
} 