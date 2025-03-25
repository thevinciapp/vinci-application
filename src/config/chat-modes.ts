import { MessageSquare, Bot, Search, BookOpen } from 'lucide-react';

export interface ChatModeConfig {
  id: string;
  name: string;
  description: string;
  icon: any;
  tools?: string[];
}

const chatModes: Record<string, ChatModeConfig> = {
  ask: {
    id: 'ask',
    name: 'Ask',
    description: 'Ask questions and get direct answers',
    icon: MessageSquare,
    tools: []
  },
  agent: {
    id: 'agent',
    name: 'Agent',
    description: 'Use an AI agent to accomplish complex tasks',
    icon: Bot,
    tools: ['browser', 'terminal', 'filesystem']
  },
  research: {
    id: 'research',
    name: 'Research',
    description: 'Deep research and analysis with multiple sources',
    icon: BookOpen,
    tools: ['browser', 'filesystem']
  },
  search: {
    id: 'search',
    name: 'Search',
    description: 'Search through your content and the web',
    icon: Search,
    tools: ['browser', 'filesystem']
  }
};

export function getChatModeConfig(mode: string): ChatModeConfig {
  return chatModes[mode] || chatModes.ask;
}

export function getAllChatModes(): ChatModeConfig[] {
  return Object.values(chatModes);
}

export default chatModes; 