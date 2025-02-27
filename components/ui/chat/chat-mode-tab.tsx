'use client'

import React from 'react'
import { BaseTab } from '../common/base-tab'
import { Search, MessageSquare, Sparkles, GitCompare } from 'lucide-react'

interface ChatModeTabProps {
  mode: 'chat' | 'search' | 'semantic' | 'hybrid'
  onModeChange: (mode: 'chat' | 'search' | 'semantic' | 'hybrid') => void
}

const getModeIcon = (mode: string) => {
  switch (mode) {
    case 'search':
      return <Search className="w-3.5 h-3.5" />
    case 'semantic':
      return <Sparkles className="w-3.5 h-3.5" />
    case 'hybrid':
      return <GitCompare className="w-3.5 h-3.5" />
    default:
      return <MessageSquare className="w-3.5 h-3.5" />
  }
}

const getModeLabel = (mode: string) => {
  const label = mode.charAt(0).toUpperCase() + mode.slice(1)
  return `Mode: ${label}`
}

export const ChatModeTab: React.FC<ChatModeTabProps> = ({ mode, onModeChange }) => {

  const handleClick = () => {
  }

  return (
    <BaseTab
      icon={getModeIcon(mode)}
      label={getModeLabel(mode)}
      shortcut="C"
      isActive={true}
      minWidth="mode"
      onClick={handleClick}
    />
  )
}
