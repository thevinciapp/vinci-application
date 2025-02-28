import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getSpaceData, setActiveSpace, createConversation } from "@/app/actions";

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
  const spaceData = await getSpaceData(spaceId);
  
  if (!spaceData || !spaceData.space) {
    // Space not found, redirect to spaces page
    redirect("/protected/spaces");
  }
  
  const { space, conversations } = spaceData;
  
  // If there are conversations, redirect to the first one
  if (conversations && conversations.length > 0) {
    redirect(`/protected/spaces/${spaceId}/conversations/${conversations[0].id}`);
  }
  
  // No conversations exist, create a default one
  const conversation = await createConversation(spaceId, "Welcome");
  if (!conversation) {
    throw new Error("Failed to create conversation for space");
  }
  
  // Redirect to the new conversation
  redirect(`/protected/spaces/${spaceId}/conversations/${conversation.id}`);
} 