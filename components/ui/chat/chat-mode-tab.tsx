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
// Cycle through modes when tab is clicked
const handleClick = () => {
  // Define the order of modes to cycle through
  const modes: Array<'chat' | 'search' | 'semantic' | 'hybrid'> = [
    'chat', 'search', 'semantic', 'hybrid'
  ];
  
  // Find current mode index
  const currentIndex = modes.indexOf(mode);
  
  // Get next mode (cycling back to beginning if at the end)
  const nextIndex = (currentIndex + 1) % modes.length;
  
  // Call the onModeChange callback with the next mode
  onModeChange(modes[nextIndex]);
}

return (
  <BaseTab
    icon={getModeIcon(mode)}
    label={getModeLabel(mode)}
    shortcut="C"
    isActive={true}
    minWidth="model"
    onClick={handleClick}
  />
)
}
