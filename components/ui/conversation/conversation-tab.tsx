import { MessageSquare, Plus, Check } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/common/tooltip"
import { BaseTab } from '@/components/ui/common/base-tab'
import { useSpaceActions } from '@/hooks/useSpaceActions'
import { cn } from '@/lib/utils'
import { useCommandCenter } from '@/hooks/useCommandCenter'
import { useConversationActions } from '@/hooks/useConversationActions'
import { useState } from 'react'

export function ConversationTab() {
  const { activeSpace } = useSpaceActions()
  const { openCommandType } = useCommandCenter()
  const { 
    conversations,
    activeConversation,
    createConversation, 
    isCreating,
  } = useConversationActions()

  const hasActiveConversation = !!activeConversation
  const hasMultipleConversations = conversations && conversations.length > 1

  const handleNewConversation = async () => {
    if (!activeSpace) return
    await createConversation("New Conversation")
  }

  return (
    <div className="flex items-center space-x-1">
      <BaseTab 
        icon={<MessageSquare className="w-3 h-3" />}
        label={activeConversation?.title || "No Conversation Selected"}
        shortcut="C"
        commandType="conversations"
        onClick={() => openCommandType("conversations")}
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleNewConversation}
              disabled={isCreating || !activeSpace}
              className={cn(
                "inline-flex items-center justify-center rounded-full w-4 h-4",
                "text-white/80 bg-white/5 hover:bg-white/10",
                "border border-white/10 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-white/20",
                (isCreating || !activeSpace) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isCreating ? (
                <Check className="w-2 h-2" />
              ) : (
                <Plus className="w-2 h-2" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>New Conversation</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

export function ServerDrivenConversationTab({
  conversations,
  activeConversation,
  onSwitchConversation,
  onCreateConversation,
  onDeleteConversation,
}: {
  conversations: any[];
  activeConversation: any;
  onSwitchConversation: (conversationId: string) => Promise<void>;
  onCreateConversation: (title: string) => Promise<void>;
  onDeleteConversation: (conversationId: string) => Promise<void>;
}) {
  const { openCommandType } = useCommandCenter();
  const [isCreating, setIsCreating] = useState(false);

  const hasActiveConversation = !!activeConversation;
  const hasMultipleConversations = conversations && conversations.length > 1;

  const handleNewConversation = async () => {
    if (!activeConversation?.space_id) return;
    
    try {
      setIsCreating(true);
      await onCreateConversation("New Conversation");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center space-x-1">
      <BaseTab 
        icon={<MessageSquare className="w-3 h-3" />}
        label={activeConversation?.title || "No Conversation Selected"}
        shortcut="C"
        commandType="conversations"
        onClick={() => openCommandType("conversations")}
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleNewConversation}
              disabled={isCreating || !activeConversation?.space_id}
              className={cn(
                "inline-flex items-center justify-center rounded-full w-4 h-4",
                "text-white/80 bg-white/5 hover:bg-white/10",
                "border border-white/10 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-white/20",
                (isCreating || !activeConversation?.space_id) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isCreating ? (
                <Check className="w-2 h-2" />
              ) : (
                <Plus className="w-2 h-2" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>New Conversation</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}