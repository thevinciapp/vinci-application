import { Command } from 'cmdk'
import { Plus } from 'lucide-react'
import { Conversation } from '@/types'
import { commandItemClass } from './command-item'
import { createConversation } from '@/app/actions'
import { useConversationStore } from '@/lib/stores/conversation-store'

interface ConversationsListProps {
  onConversationSelect: (conversationId: string) => Promise<void>
  spaceId: string
}

export function ConversationsList({
  onConversationSelect,
  spaceId
}: ConversationsListProps) {
  const { conversations, activeConversation } = useConversationStore()

  if (!conversations) {
    return <div className="py-6 text-center text-sm text-white/40">Loading...</div>
  }

  if (conversations.length === 0) {
    return <div className="py-6 text-center text-sm text-white/40">No Conversations found.</div>
  }

  return (
    <>
      <Command.Group heading="Create">
        <Command.Item
          value="create new conversation"
          onSelect={async () => {
            const newConversation = await createConversation(spaceId, 'New Conversation')
            if (newConversation) {
              onConversationSelect(newConversation.id)
            }
          }}
          className={commandItemClass()}
        >
          <div className="w-4 h-4 text-white/60 group-hover:text-[#3ecfff]/80 transition-colors duration-300">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-white/75 transition-colors duration-300 group-hover:text-white/95">
            Create New Conversation
          </span>
        </Command.Item>
      </Command.Group>

      <Command.Group heading="Conversations">
        {conversations.map((conversation) => (
          <Command.Item
            key={conversation.id}
            value={`conversation ${conversation.id} ${conversation.title}`}
            onSelect={() => onConversationSelect(conversation.id)}
            className={commandItemClass(conversation.id === activeConversation?.id)}
          >
            <div className={`w-2 h-2 rounded-full transition-colors duration-300
              ${conversation.id === activeConversation?.id ? 'bg-[#3ecfff]' : 'bg-white/60 group-hover:bg-[#3ecfff]/80'}`}
            />
            <span className="text-white/75 transition-colors duration-300 group-hover:text-white/95">
              {conversation.title || 'Untitled Conversation'}
            </span>
            {conversation.id === activeConversation?.id && (
              <span className="ml-auto text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded-md">
                Active
              </span>
            )}
          </Command.Item>
        ))}
      </Command.Group>
    </>
  )
}