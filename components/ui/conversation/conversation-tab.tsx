import { MessageSquare, Plus, Check } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/common/tooltip"
import { BaseTab } from '@/components/ui/common/base-tab'
import { Conversation } from '@/types'
import { useSpaceActions } from '@/hooks/useSpaceActions'
import { cn } from '@/lib/utils'
import { useCommandCenter } from '@/hooks/useCommandCenter'
import { useConversationActions } from '@/hooks/useConversationActions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ConversationTabProps {
  activeConversation: Conversation | null
  onConversationSelect?: (conversationId: string) => Promise<void>
}

export function ConversationTab({ activeConversation, onConversationSelect }: ConversationTabProps) {
  const router = useRouter()
  const { activeSpace, spaces } = useSpaceActions()
  const { openCommandType } = useCommandCenter()
  const { 
    createConversation, 
    isCreating, 
    isSuccess 
  } = useConversationActions({
    onCreateSuccess: async (conversation) => {
      if (onConversationSelect) {
        await onConversationSelect(conversation.id)
      }
    },
    showToasts: true
  })

  const handleNewConversation = async () => {
    if (!activeSpace) return
    await createConversation('New Conversation')
  }

  return (
    <div className="flex h-full overflow-hidden">
      {activeSpace ? (
        <div className="flex-1 overflow-hidden">
          <BaseTab
            icon={<MessageSquare className="w-3 h-3" />}
            label={activeConversation?.title || 'Conversations'}
            shortcut="D"
            minWidth="space"
            className="overflow-hidden text-ellipsis"
            commandType="conversations"
            onClick={() => openCommandType("conversations")}
          />
        </div>
      ) : null}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleNewConversation()}
              className={cn(
                'h-full p-2 flex items-center rounded-md border-white/[0.08]',
                'hover:bg-white/[0.08] bg-white/[0.03] active:bg-white/[0.02]',
                'transition-colors duration-200',
                'focus:outline-none',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              disabled={!activeSpace || isCreating}
            >
              {isSuccess ? (
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