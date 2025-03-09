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
  
  return (
    <AppStateProvider>  
      <ClientChatContent
        user={user}
      />
    </AppStateProvider>
  );
}