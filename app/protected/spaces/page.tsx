import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createSpace, getSpaces, getActiveSpace } from "@/app/actions/spaces";
import { createConversation } from "@/app/actions/conversations";
import { DEFAULTS } from "@/constants";
import { AVAILABLE_MODELS, type Provider } from "@/config/models";

const DEFAULT_PROVIDER: Provider = 'anthropic'
const DEFAULT_MODEL = AVAILABLE_MODELS[DEFAULT_PROVIDER][0].id

export default async function SpacesIndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch all spaces
  const spacesResponse = await getSpaces();
  
  // Create default space if needed
  if (!spacesResponse.data || spacesResponse.data.length === 0) {
    const spaceResponse = await createSpace(
      DEFAULTS.SPACE_NAME,
      '',
      DEFAULT_MODEL,
      DEFAULT_PROVIDER,
      true
    );

    if (!spaceResponse.data) {
      throw new Error("Failed to create default space");
    }

    const conversationResponse = await createConversation(spaceResponse.data.id, "Welcome");
    if (!conversationResponse.data) {
      throw new Error("Failed to create initial conversation");
    }
    
    // Redirect to the new space and conversation
    redirect(`/protected/spaces/${spaceResponse.data.id}/conversations/${conversationResponse.data.id}`);
  }

  // Get active space, or default to first space
  const activeSpaceResponse = await getActiveSpace();
  const targetSpace = activeSpaceResponse.data || spacesResponse.data[0];
  
  // Redirect to the space's conversations
  redirect(`/protected/spaces/${targetSpace.id}/conversations`);
} 