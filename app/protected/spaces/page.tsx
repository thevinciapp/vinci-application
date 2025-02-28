import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createSpace, getSpaces, getActiveSpace, createConversation } from "@/app/actions";
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
  let spaces = await getSpaces();
  
  // Create default space if needed
  if (!spaces || spaces.length === 0) {
    const space = await createSpace(
      DEFAULTS.SPACE_NAME,
      '',
      DEFAULT_MODEL,
      DEFAULT_PROVIDER,
      true
    );

    if (!space) {
      throw new Error("Failed to create default space");
    }

    const conversation = await createConversation(space.id, "Welcome");
    if (!conversation) {
      throw new Error("Failed to create initial conversation");
    }
    
    // Redirect to the new space and conversation
    redirect(`/protected/spaces/${space.id}/conversations/${conversation.id}`);
  }

  // Get active space, or default to first space
  const activeSpace = await getActiveSpace();
  const targetSpace = activeSpace || spaces[0];
  
  // Redirect to the space's conversations
  redirect(`/protected/spaces/${targetSpace.id}/conversations`);
} 