 'use client'

import { SpacesProvider } from '@/hooks/spaces-provider'
import { ConversationsProvider } from '@/hooks/conversations-provider'
import { MessagesProvider } from '@/hooks/messages-provider'
import { ChatStateProvider } from '@/hooks/chat-state-provider'
import { CommandStateProvider } from '@/components/ui/command-state-provider'
import { QuickActionsCommandProvider } from '@/components/ui/quick-actions-command-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SpacesProvider>
      <ConversationsProvider>
        <MessagesProvider>
          <ChatStateProvider>
            <CommandStateProvider>
              <QuickActionsCommandProvider>
                {children}
              </QuickActionsCommandProvider>
            </CommandStateProvider>
          </ChatStateProvider>
        </MessagesProvider>
      </ConversationsProvider>
    </SpacesProvider>
  )
}