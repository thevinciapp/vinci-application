import { redirect } from "next/navigation";
import ProtectedProviders from "@/app/protected/ProtectedProviders";
import ClientChatContent from "@/app/protected/ClientChatContent";
import { createClient } from "@/utils/supabase/server";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const initialUserId = session.user.id;

  return (
    <ProtectedProviders initialUserId={initialUserId}>
      <ClientChatContent initialUserId={initialUserId} />
    </ProtectedProviders>
  );
}