'use client'

import React from 'react'
import { BaseTab } from 'vinci-ui'
import { getChatModeConfig } from '@/config/chat-modes'
import { useSpaceStore } from '@/stores/space-store'
import { useShallow } from 'zustand/react/shallow'

export const ChatModeTab: React.FC = () => {
  const { activeSpace } = useSpaceStore(
    useShallow((state) => ({ activeSpace: state.uiState.activeSpace }))
  )
  
  const currentMode = activeSpace?.chat_mode || 'ask'
  
  const modeConfig = getChatModeConfig(currentMode)
  
  const Icon = modeConfig.icon
  
  return (
    <BaseTab
      icon={<Icon className="w-3.5 h-3.5" />}
      label={`Mode: ${modeConfig.name}`}
      shortcut="M"
      commandType="chat-modes"
    />
  )
}