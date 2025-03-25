import React from 'react'
import { BaseTab } from 'vinci-ui'
import { getChatModeConfig, getAllChatModes } from '@/config/chat-modes'
import { useSpaces } from '@/hooks/use-spaces'
import { Space } from '@/types/space'
import { toast } from '@/components/chat/ui/toast'

interface ChatModeTabProps {
  space: Space | null;
}

export const ChatModeTab: React.FC<ChatModeTabProps> = ({ space }) => {
  const { updateSpace } = useSpaces()
  const currentMode = space?.chat_mode || 'ask'
  const modeConfig = getChatModeConfig(currentMode)
  const Icon = modeConfig.icon

  const handleModeChange = async (modeId: string) => {
    if (!space) return

    try {
      await updateSpace(space.id, {
        chat_mode: modeId,
        chat_mode_config: getChatModeConfig(modeId).tools ? {
          tools: getChatModeConfig(modeId).tools
        } : {}
      })
      toast({
        title: 'Success',
        description: 'Chat mode updated',
        variant: 'default',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update chat mode',
        variant: 'destructive',
      })
    }
  }

  return (
    <BaseTab
      icon={<Icon className="w-3.5 h-3.5" />}
      label={`Mode: ${modeConfig.name}`}
      shortcut="M"
      commandType="chat-modes"
      onClick={() => {
        const modes = getAllChatModes()
        const currentIndex = modes.findIndex(mode => mode.id === currentMode)
        const nextIndex = (currentIndex + 1) % modes.length
        handleModeChange(modes[nextIndex].id)
      }}
    />
  )
}