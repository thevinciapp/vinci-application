import { redirect } from "next/navigation";
import ClientChatContent from "@/app/protected/ClientChatContent";
import { createClient } from "@/utils/supabase/server";
import { createSpace, getActiveSpace, getConversations, getSpaces, setActiveSpace, createConversation, createMessage, getMessages } from "../actions";
import { Providers } from "@/components/providers";
import { COLUMNS, DEFAULTS } from "@/lib/constants";
import { AVAILABLE_MODELS, type Provider } from "@/config/models";

const DEFAULT_PROVIDER: Provider = 'anthropic'
const DEFAULT_MODEL = AVAILABLE_MODELS[DEFAULT_PROVIDER][0].id

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  let spaces = await getSpaces();
  let activeSpace = await getActiveSpace();

  if (!spaces || spaces.length === 0) {
    const space = await createSpace(
      DEFAULTS.SPACE_NAME,
      DEFAULTS.SPACE_DESCRIPTION,
      DEFAULT_MODEL,
      DEFAULT_PROVIDER,
      false
    );

    if (!space) {
      throw new Error("Failed to create default space");
    }

    await setActiveSpace(space.id);
    activeSpace = space;

    const conversation = await createConversation(space.id, "Welcome");
    if (!conversation) {
      throw new Error("Failed to create initial conversation");
    }

    spaces = await getSpaces();
  }

  if (!activeSpace && spaces && spaces.length > 0) {
    await setActiveSpace(spaces[0].id);
    activeSpace = spaces[0];
  }

  const defaultConversations = await getConversations(activeSpace?.id || '');
  const defaultMessages = await getMessages(defaultConversations?.[0]?.id || '');

  return (
    <Providers>
      <div className="flex flex-col h-screen bg-black text-white">
        <ClientChatContent
          userId={session.user.id}
          defaultSpace={activeSpace}
          defaultConversations={defaultConversations}
          defaultMessages={defaultMessages}
          spaces={spaces}
        />
      </div>
    </Providers>
  );
}