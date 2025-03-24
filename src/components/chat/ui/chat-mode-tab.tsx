import { BaseTab, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from 'vinci-ui';
import { MessageSquare, Settings } from 'lucide-react';
import { Space } from '@/types/space';
import { toast } from '@/components/chat/ui/toast';
import { useSpaces } from '@/hooks/use-spaces';

export interface ChatModeTabProps {
  space: Space | null;
}

export function ChatModeTab({ space }: ChatModeTabProps) {
  const { updateSpace } = useSpaces();
  const chatMode = space?.chat_mode || null;

  const chatModes = [
    {
      id: 'default',
      name: 'Default Mode',
      description: 'Standard chat interaction mode',
    },
    {
      id: 'code-review',
      name: 'Code Review',
      description: 'Focused on reviewing and improving code',
    },
    {
      id: 'brainstorm',
      name: 'Brainstorm',
      description: 'Creative ideation and problem-solving mode',
    }
  ];

  const handleSelectMode = async (modeId: string) => {
    if (!space) return;
    
    try {
      await updateSpace(space.id, {
        chat_mode: modeId,
      });
      toast({
        title: 'Success',
        description: 'Chat mode updated',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update chat mode',
        variant: 'destructive',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
          <BaseTab
          icon={chatMode ? (
            <div className="w-5 h-5 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-white/[0.03] border border-white/[0.1]" />
          )}
          label={chatMode ? getChatModeLabel(chatMode) : 'Select Mode'}
          isActive={!!chatMode}
        />
      </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-[240px] max-h-[400px] mt-1.5 overflow-y-auto">
        <DropdownMenuLabel>Select Chat Mode</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {chatModes.map((mode) => (
          <DropdownMenuItem
            key={mode.id}
            onSelect={() => handleSelectMode(mode.id)}
            className="flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            <div className="flex flex-col">
              <span className="text-sm">{mode.name}</span>
              <span className="text-xs text-muted-foreground">{mode.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getChatModeLabel(mode: string): string {
  const modeMap: Record<string, string> = {
    'default': 'Default Mode',
    'code-review': 'Code Review',
    'brainstorm': 'Brainstorm',
  };
  return modeMap[mode] || mode;
}
