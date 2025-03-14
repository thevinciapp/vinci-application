'use client'

import React from 'react'
import { BaseTab } from 'vinci-ui'
import { getChatModeConfig } from '@/src/config/chat-modes'
interface ChatModeTabProps {
  chatMode?: string;
}

export const ChatModeTab: React.FC<ChatModeTabProps> = ({ chatMode = 'ask' }) => {
  
  const currentMode = chatMode
  
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