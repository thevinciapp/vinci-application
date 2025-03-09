'use client'

import React from 'react'
import { BaseTab } from 'vinci-ui'
import { getChatModeConfig } from '@/config/chat-modes'
import { useCommandCenter } from '@/hooks/useCommandCenter'
import { useSpaceStore } from '@/stores/space-store'
import { useShallow } from 'zustand/react/shallow'

export const ChatModeTab: React.FC = () => {
  const { openCommandType } = useCommandCenter()
  const { activeSpace } = useSpaceStore(
    useShallow((state) => ({ activeSpace: state.uiState.activeSpace }))
  )
  
  // Get the current mode from the active space, default to 'ask'
  const currentMode = activeSpace?.chat_mode || 'ask'
  
  // Get the mode configuration
  const modeConfig = getChatModeConfig(currentMode)
  
  // Get the icon component based on the mode
  const Icon = modeConfig.icon
  
  return (
    <BaseTab
      icon={<Icon className="w-3.5 h-3.5" />}
      label={`Mode: ${modeConfig.name}`}
      shortcut="M"
      commandType="chat-modes"
      onClick={() => openCommandType("chat-modes")}
    />
  )
}