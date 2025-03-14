import { redirect } from "next/navigation";
import ClientChatContent from "@/components/ui/chat/chat-content-client";
import { AppStateProvider } from "@/src/types/app-state-context";

export default async function ProtectedPage() {
  return (
    <AppStateProvider>  
      <ClientChatContent />
    </AppStateProvider>
  );
}