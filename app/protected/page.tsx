import { redirect } from "next/navigation";
import ClientChatContent from "@/components/ui/chat/chat-content-client";
import { createClient } from "@/utils/supabase/server";
import { createSpace, getActiveSpace, getSpaces, setActiveSpace, createConversation, getMessages, getSpaceData } from "../actions";
import { DEFAULTS } from "@/constants";
import { AVAILABLE_MODELS, type Provider } from "@/config/models";

const DEFAULT_PROVIDER: Provider = 'anthropic'
const DEFAULT_MODEL = AVAILABLE_MODELS[DEFAULT_PROVIDER][0].id

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  let spaces = await getSpaces();
  let activeSpace = await getActiveSpace();

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

    spaces = [space];
    activeSpace = space;
  }

  if (!activeSpace && spaces && spaces.length > 0) {
    const firstSpace = spaces[0];
    await setActiveSpace(firstSpace.id);
    activeSpace = firstSpace;
  }

  const spaceData = await getSpaceData(activeSpace?.id || '');
  
  if (spaceData?.space) {
    activeSpace = spaceData.space;
  }

  const conversations = spaceData?.conversations || [];
  const activeConversation = conversations.length > 0 ? conversations[0] : null;
  const messages = conversations.length > 0 
    ? await getMessages(conversations[0].id)
    : null;

  const initialData = {
    spaces,
    activeSpace,
    conversations,
    activeConversation,
    messages
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
        <ClientChatContent
          user={user}
          initialData={initialData}
        />
    </div>
  );
}