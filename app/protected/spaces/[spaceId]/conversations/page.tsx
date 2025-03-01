import { getMostRecentConversation } from "@/app/actions/conversations"
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation"


export default async function SpaceConversationsPage({
  params
}: {
  params: { spaceId: string }
}) {
  const { spaceId } = params

  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: conversation } = await getMostRecentConversation(spaceId)

  if (!conversation) {
    redirect(`/protected/spaces/${spaceId}/conversations`)
  }

  redirect(`/protected/spaces/${spaceId}/conversations/${conversation.id}`)
}