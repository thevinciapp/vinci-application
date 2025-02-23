import { Command } from 'cmdk'
import { Plus, MessageSquare, Clock, MessageCircle } from 'lucide-react'
import { Conversation } from '@/types'
import { commandItemClass } from './command-item'
import { createConversation, setActiveConversation as setActiveConversationDB } from '@/app/actions'
import { useConversationStore } from '@/lib/stores/conversation-store'
import { CommandBadge } from './command-badge'
import { cn } from '@/lib/utils'

interface ConversationsListProps {
  onConversationSelect: (conversationId: string) => Promise<void>
  spaceId: string
}

export function ConversationsList({
  onConversationSelect,
  spaceId
}: ConversationsListProps) {
  const { conversations, activeConversation, setActiveConversation } = useConversationStore()

  if (!conversations) {
    return (
      <div className="py-8 text-center">
        <MessageSquare className="w-6 h-6 text-white/20 mx-auto mb-3 animate-pulse" />
        <p className="text-sm text-white/40">Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="py-8 text-center">
        <MessageSquare className="w-6 h-6 text-white/20 mx-auto mb-3" />
        <p className="text-sm text-white/40">No conversations found</p>
        <p className="text-xs text-white/30 mt-1">Start a new conversation to begin</p>
      </div>
    );
  }

  return (
    <>
      <Command.Group heading="Quick Actions" className="pb-4">
        <Command.Item
          value="create new conversation start conversation"
          onSelect={async () => {
            const newConversation = await createConversation(spaceId, 'New Conversation');
            if (newConversation) {
              await setActiveConversationDB(newConversation.id);
              await onConversationSelect(newConversation.id);
            }
          }}
          className={commandItemClass()}
        >
          <div className="flex items-center gap-3 w-full">
            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-[#3ecfff]/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-[#3ecfff]" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white/90">New Conversation</div>
              <p className="text-sm text-white/50">Start a fresh chat with AI</p>
            </div>
          </div>
        </Command.Item>
      </Command.Group>

      <Command.Group heading="Recent Conversations" className="pb-4">
        {conversations.map((conversation) => (
          <Command.Item
            key={conversation.id}
            value={`conversation ${conversation.id} ${conversation.title}`}
            onSelect={async () => {
              await setActiveConversationDB(conversation.id);
              await onConversationSelect(conversation.id);
            }}
            className={commandItemClass(conversation.id === activeConversation?.id)}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={cn(
                'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center',
                conversation.id === activeConversation?.id ? 'bg-[#3ecfff]/10' : 'bg-white/5 group-hover:bg-white/10'
              )}>
                <MessageCircle className={cn(
                  'w-4 h-4 transition-colors duration-300',
                  conversation.id === activeConversation?.id ? 'text-[#3ecfff]' : 'text-white/60 group-hover:text-white/80'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white/90 truncate">
                    {conversation.title || 'Untitled Conversation'}
                  </span>
                  <div className="flex items-center gap-2 ml-2">
                    {conversation.id === activeConversation?.id && (
                      <CommandBadge variant="active">Active</CommandBadge>
                    )}
                    {conversation.messageCount > 0 && (
                      <CommandBadge variant="count">{conversation.messageCount} messages</CommandBadge>
                    )}
                  </div>
                </div>
                {conversation.lastMessage && (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Clock className="w-3 h-3" />
                    <span className="truncate">{conversation.lastMessage}</span>
                  </div>
                )}
              </div>
            </div>
          </Command.Item>
        ))}
      </Command.Group>
    </>
  )
}