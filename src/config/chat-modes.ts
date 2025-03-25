import { ReactNode } from 'react';
import { 
  MessagesSquare, 
  Bot, 
  Search, 
  BookOpen 
} from 'lucide-react';

export type ChatMode = 'ask' | 'agent' | 'research' | 'search';

export interface ChatModeConfig {
  id: ChatMode;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const chatModes: Record<ChatMode, ChatModeConfig> = {
  ask: {
    id: 'ask',
    name: 'Ask',
    description: 'Ask questions and get answers',
    icon: MessagesSquare
  },
  agent: {
    id: 'agent',
    name: 'Agent',
    description: 'Use an AI agent to accomplish tasks',
    icon: Bot
  },
  research: {
    id: 'research',
    name: 'Research',
    description: 'Research a topic with advanced analysis',
    icon: BookOpen
  },
  search: {
    id: 'search',
    name: 'Search',
    description: 'Search for information across the web',
    icon: Search
  }
};

export function getChatModeConfig(mode: string): ChatModeConfig {
  return chatModes[mode as ChatMode] || chatModes.ask;
}

export function getAllChatModes(): ChatModeConfig[] {
  return Object.values(chatModes);
} 