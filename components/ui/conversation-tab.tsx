import { MessageSquare } from 'lucide-react'
import { BaseTab } from './base-tab'
import { Conversation } from '@/types'

interface ConversationTabProps {
  activeConversation: Conversation | null
}

export function ConversationTab({ activeConversation }: ConversationTabProps) {
  return (
    <BaseTab
      icon={<MessageSquare className="w-3 h-3" />}
      label={activeConversation?.title || 'No Active Conversation'}
      shortcut="C"
      isActive={!!activeConversation}
      minWidth="space"
    />
  )
} 