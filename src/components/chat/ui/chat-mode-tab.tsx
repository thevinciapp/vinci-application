import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { BaseTab } from '@/components/ui/base-tab';
import { getChatModeConfig, getAllChatModes } from '@/config/chat-modes';
import { Space } from '@/types/space';
import { useSpaces } from '@/hooks/use-spaces';
import { toast } from '@/hooks/use-toast';

export interface ChatModeTabProps {
  space?: Space | null;
}

export function ChatModeTab({ space }: ChatModeTabProps) {
  const { updateSpace } = useSpaces();
  const chatMode = space?.chat_mode || 'ask';
  const modeConfig = getChatModeConfig(chatMode);
  const Icon = modeConfig.icon;
  const chatModes = getAllChatModes();

  const handleModeSelect = async (modeId: string) => {
    if (!space?.id) {
      toast({
        title: "Error",
        description: "No active space selected",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateSpace(space.id, {
        chat_mode: modeId,
        chat_mode_config: {}
      });
      
      toast({
        title: "Success",
        description: `Mode updated to ${getChatModeConfig(modeId).name}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating chat mode:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
          <BaseTab
            icon={<Icon className="w-3.5 h-3.5" />}
            label={modeConfig.name}
            isActive={!!chatMode}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="w-64 mt-1.5"
        style={{ maxHeight: '60vh', overflowY: 'auto' }}
        sideOffset={4}
      >
        <DropdownMenuLabel>Select Chat Mode</DropdownMenuLabel>
        <DropdownMenuGroup>
          {chatModes.map((mode) => {
            const ModeIcon = mode.icon;
            return (
              <DropdownMenuItem
                key={mode.id}
                onSelect={() => handleModeSelect(mode.id)}
                textValue={mode.name}
              >
                <div className="flex items-center gap-2">
                  <ModeIcon className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span>{mode.name}</span>
                    <span className="text-xs text-white/40">{mode.description}</span>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
