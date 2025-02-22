import { MessageSquare, Plus, Check } from 'lucide-react'
import { useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
}

export function ConversationTab({ activeConversation }: ConversationTabProps) {
  const { toggleQuickActionsCommand } = useQuickActionsCommand()
  const { activeSpace } = useSpaceStore()
  const { setActiveConversation } = useConversationStore()
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleNewConversation = async () => {
    if (!activeSpace || isCreating) return
    
    try {
      setIsCreating(true)
      const newConversation = await createConversation(activeSpace.id, 'New Conversation')
      
      if (newConversation) {
        setActiveConversation(newConversation)

        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 1500)
        
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
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex items-center w-full gap-px min-w-0">
      <div className="flex-1 min-w-0 overflow-hidden">
        <BaseTab
          icon={<MessageSquare className="w-3 h-3" />}
          label={activeConversation?.title || 'Conversations'}
          shortcut="D"
          isActive={!!activeConversation}
          minWidth="space"
          onClick={() => toggleQuickActionsCommand({ withConversations: true })}
          className="overflow-hidden text-ellipsis"
        />
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleNewConversation}
              className={cn(
                'h-full p-2 flex items-center rounded-md border-white/[0.08]',
                'hover:bg-white/[0.08] bg-white/[0.03] active:bg-white/[0.02]',
                'transition-colors duration-200',
                'focus:outline-none',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              disabled={!activeSpace || isCreating}
            >
              {showSuccess ? (
                <Check className="w-3 h-3 text-emerald-400 animate-in fade-in-0 zoom-in-95" />
              ) : (
                <Plus className={cn(
                  'w-3 h-3',
                  isCreating ? 'text-white/30 animate-pulse' : 'text-white/60'
                )} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Create New Conversation</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}