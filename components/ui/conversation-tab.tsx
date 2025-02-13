import { MessageSquare } from 'lucide-react'
import { BaseTab } from '@/components/ui/base-tab'
import { Conversation } from '@/types'
import { useQuickActionsCommand } from './quick-actions-command-provider'

interface ConversationTabProps {
  activeConversation: Conversation | null
}

export function ConversationTab({ activeConversation }: ConversationTabProps) {
  const { toggleQuickActionsCommand } = useQuickActionsCommand()

  return (
    <BaseTab
      icon={<MessageSquare className="w-3 h-3" />}
      label={activeConversation?.title || 'Conversations'}
      shortcut="D"
      isActive={!!activeConversation}
      minWidth="space"
      onClick={() => toggleQuickActionsCommand({ withConversations: true })}
    />
  )
} 