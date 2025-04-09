import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from 'shared/components/dropdown-menu';
import { Button } from 'shared/components/button';
import { BaseTab } from 'shared/components/base-tab';
import { getChatModeConfig, getAllChatModes } from '@/config/chat-modes';
import { Space } from '@/entities/space/model/types';
import { useSpaces } from '@/features/spaces/use-spaces';
import { toast } from 'shared/hooks/use-toast';
import { Settings, RefreshCw } from 'lucide-react';
import { DropdownList, DropdownSection, DropdownItem, DropdownFooterAction } from 'shared/components/shared/dropdown-list';

export interface ChatModeTabProps {
  space?: Space | null;
}

export function ChatModeTab({ space }: ChatModeTabProps) {
  const { updateSpace } = useSpaces();
  const [isUpdating, setIsUpdating] = useState(false);
  const chatMode = space?.chat_mode || 'ask';
  const modeConfig = getChatModeConfig(chatMode);
  const Icon = modeConfig.icon;
  const chatModes = getAllChatModes();

  const handleModeSelect = async (modeId: string) => {
    if (!space?.id) {
      toast({
        title: "No Active Space",
        description: "Please select a space first",
        variant: "destructive",
      });
      return;
    }

    if (modeId === chatMode) {
      return; // Don't update if it's the same mode
    }

    setIsUpdating(true);
    try {
      await updateSpace(space.id, {
        chat_mode: modeId,
        chat_mode_config: {}
      });
      
      toast({
        title: "Mode Updated",
        description: `Now using ${getChatModeConfig(modeId).name}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating chat mode:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleModeSettings = (modeId: string) => {
    const mode = getChatModeConfig(modeId);
    
    toast({
      title: "Coming Soon",
      description: `${mode.name} settings will be available soon!`,
      variant: "default",
    });
  };

  // Build sections for dropdown
  const chatModeSections: DropdownSection[] = [
    {
      title: "Chat Modes",
      items: chatModes.map((mode): DropdownItem => ({
        id: mode.id,
        isActive: mode.id === chatMode,
        isDisabled: isUpdating,
        onSelect: () => handleModeSelect(mode.id),
        content: (
          <div className="flex w-full">
            <div className="flex-shrink-0 mr-2.5">
              <mode.icon className="w-4 h-4 text-white/60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-white/90 truncate">{mode.name}</span>
                {mode.id === chatMode && (
                  <span className="text-xs bg-white/10 text-white/80 px-1.5 py-0.5 rounded-full">
                    {isUpdating ? 'Updating...' : 'Current'}
                  </span>
                )}
              </div>
              <span className="text-xs text-white/60 line-clamp-1 w-full">
                {mode.description}
              </span>
            </div>
          </div>
        )
      }))
    }
  ];

  // Define footer actions
  const footerActions: DropdownFooterAction[] = [
    {
      icon: <Settings className="w-3.5 h-3.5" />,
      label: "Configure mode",
      onClick: (modeId) => handleModeSettings(modeId),
    }
  ];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="transparent" 
          className="p-0 h-auto rounded-sm transition-all duration-200 group"
          aria-label={`Current chat mode: ${modeConfig.name}`}
        >
          <BaseTab
            icon={
              <div className="flex items-center justify-center w-5 h-5 group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-3.5 h-3.5" />
              </div>
            }
            label={modeConfig.name}
            isActive={!!chatMode}
          />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownList 
        sections={chatModeSections}
        footerActions={footerActions}
        emptyState={<div className="text-sm text-white/50">No chat modes available</div>}
      />
    </DropdownMenu>
  );
}
