"use client"

import React from "react";
import { SpacesProvider } from "@/hooks/spaces-provider";
import { ConversationsProvider } from "@/hooks/conversations-provider";
import { MessagesProvider } from "@/hooks/messages-provider";
import { ChatStateProvider } from "@/hooks/chat-state-provider";
import { CommandStateProvider } from "@/components/ui/command-state-provider";
import { QuickActionsCommandProvider } from "@/components/ui/quick-actions-command-provider";

interface ProtectedProvidersProps {
  children: React.ReactNode;
  initialUserId: string;
}

export default function ProtectedProviders({
  children,
  initialUserId,
}: ProtectedProvidersProps) {
  // Optionally, you might initialize some providers with the initialUserId.
  return (
    <SpacesProvider>
      <ConversationsProvider>
        <MessagesProvider>
          <ChatStateProvider>
            <CommandStateProvider>
              <QuickActionsCommandProvider>{children}</QuickActionsCommandProvider>
            </CommandStateProvider>
          </ChatStateProvider>
        </MessagesProvider>
      </ConversationsProvider>
    </SpacesProvider>
  );
} 