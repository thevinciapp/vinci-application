import { redirect } from "next/navigation";
import ClientChatContent from "@/app/protected/ClientChatContent";
import { createClient } from "@/utils/supabase/server";
import { createSpace, getActiveSpace, getConversations, getSpaces, setActiveSpace, createConversation, createMessage, getMessages, getSpaceData } from "../actions";
import { Providers } from "@/components/providers";
import { COLUMNS, DEFAULTS } from "@/lib/constants";
import { AVAILABLE_MODELS, type Provider } from "@/config/models";
import { Tabs } from "@/components/tabs";

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
      true // Set as active immediately
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

  console.log('spaceData', spaceData);

  const defaultConversations = spaceData?.conversations || [];
  const defaultMessages = defaultConversations.length > 0 
    ? await getMessages(defaultConversations[0].id)
    : null;

  return (
    <Providers>
      <div className="flex flex-col h-screen bg-black text-white">
        <ClientChatContent
          user={user}
          defaultSpace={activeSpace}
          defaultConversations={defaultConversations}
          defaultMessages={defaultMessages}
          spaces={spaces}
        />
      </div>
    </Providers>
  );
}