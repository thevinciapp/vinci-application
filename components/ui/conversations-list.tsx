import { Command } from 'cmdk'
import { Plus } from 'lucide-react'
import { Conversation } from '@/types'
import { commandItemClass } from './command-item'
import { createConversation } from '@/app/actions'
import { useState } from 'react'

interface ConversationsListProps {
  conversations: Conversation[] | null
  onConversationSelect: (conversationId: string) => Promise<void>
  activeConversationId?: string
  spaceId: string
}

export function ConversationsList({
  conversations,
  onConversationSelect,
  activeConversationId,
  spaceId
}: ConversationsListProps) {

  if (!conversations) {
    return <div className="py-6 text-center text-sm text-white/40">Loading...</div>
  }

    if (conversations.length === 0) {
    return <div className="py-6 text-center text-sm text-white/40">No Conversations found.</div>;
  }


  return (
    <>
      <Command.Group>
        {conversations.map((conversation) => (
          <Command.Item
            key={conversation.id}
            value={`conversation ${conversation.id} ${conversation.title}`}
            onSelect={() => onConversationSelect(conversation.id)}

            className={commandItemClass(conversation.id === activeConversationId)}
          >
            <div className={`w-2 h-2 rounded-full transition-opacity duration-200
              ${conversation.id === activeConversationId ? 'bg-blue-500' : 'bg-gray-500/50'}`}
            />
            <span className={`transition-opacity duration-200
              ${conversation.id === activeConversationId ? 'text-white' : 'text-white/75'}`}>
              {conversation.title || 'Untitled Conversation'}
            </span>
            {conversation.id === activeConversationId && (
              <span className="ml-auto text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded-md">
                Active
              </span>
            )}
          </Command.Item>
        ))}
      </Command.Group>
    </>
 );
}