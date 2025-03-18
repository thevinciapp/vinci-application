import { MessageSquare, Plus, Check, Loader2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  BaseTab
} from "vinci-ui"
import { cn } from '@/src/lib/utils/utils'
import { useState } from 'react'
import { useSpaces } from '@/src/hooks/use-spaces';
import { useConversations } from '@/src/hooks/use-conversations';

export function ServerDrivenConversationTab({
  onCreateConversation,
}: {
  onCreateConversation: (title: string) => Promise<void>;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const { activeSpace } = useSpaces();
  const { conversations, activeConversation } = useConversations();

  const handleNewConversation = async () => {
    if (!activeSpace?.id) return;
    
    try {
      setIsCreating(true);
      await onCreateConversation("New Conversation");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center justify-between w-full overflow-hidden">
      <div className="flex-1 min-w-0 overflow-hidden">
        <BaseTab 
          icon={<MessageSquare className="w-3 h-3" />}
          label={activeConversation?.title || "No Conversation Selected"}
          shortcut="C"
          commandType="conversations"
          className="w-full"
        />
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleNewConversation}
              disabled={isCreating || !activeSpace?.id}
              className={cn(
                "inline-flex items-center justify-center rounded-full w-4 h-4 ml-1.5 shrink-0",
                "text-white/80 bg-white/5 hover:bg-white/10",
                "border border-white/10 transition-colors",
                "focus:outline-hidden focus:ring-2 focus:ring-white/20",
                (isCreating || !activeSpace?.id) && "opacity-50 cursor-not-allowed"
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