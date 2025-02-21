import { MessageSquare, Plus } from 'lucide-react'
import { BaseTab } from '@/components/ui/base-tab'
import { Conversation } from '@/types'
import { useQuickActionsCommand } from './quick-actions-command-provider'
import { useSpaceStore } from '@/lib/stores/space-store'
import { useConversationStore } from '@/lib/stores/conversation-store'
import { createConversation } from '@/app/actions'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface ConversationTabProps {
  activeConversation: Conversation | null
  onSelect?: (conversationId: string) => Promise<void>
}

export function ConversationTab({ activeConversation, onSelect }: ConversationTabProps) {
  const { toggleQuickActionsCommand } = useQuickActionsCommand()
  const { activeSpace } = useSpaceStore()
  const { setActiveConversation } = useConversationStore()
  const { toast } = useToast()

  const handleNewConversation = async () => {
    if (!activeSpace) return
    const newConversation = await createConversation(activeSpace.id, 'New Conversation')
    if (newConversation) {
      setActiveConversation(newConversation)
      if (onSelect) {
        await onSelect(newConversation.id)
      }
      toast({
        title: 'New Conversation Created',
        description: 'You can start chatting right away.',
        variant: 'default',
        className: cn(
          'bg-black/90 border border-white/10',
          'backdrop-blur-xl shadow-xl shadow-black/20',
          'text-white/90 font-medium',
          'rounded-lg'  
        ),
        duration: 2000,
      })
    }
  }

  return (
    <div className="flex items-center">
      <BaseTab
        icon={<MessageSquare className="w-3 h-3" />}
        label={activeConversation?.title || 'Conversations'}
        shortcut="D"
        isActive={!!activeConversation}
        minWidth="space"
        onClick={() => toggleQuickActionsCommand({ withConversations: true })}
      />
      <button
        onClick={handleNewConversation}
        className={cn(
          'ml-px h-full p-2 flex items-center rounded-md border-white/[0.08]',
          'hover:bg-white/[0.08] bg-white/[0.03] active:bg-white/[0.02]',
          'transition-colors duration-200',
          'focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        disabled={!activeSpace}
        title="Create New Conversation"
      >
        <Plus className="w-3 h-3 text-white/60" />
      </button>
    </div>
  )
}