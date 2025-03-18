import { User } from '@supabase/supabase-js';
import { FC } from 'react';
import { 
  AuthEvents,
  AppStateEvents,
  CommandCenterEvents, 
  SpaceEvents, 
  MessageEvents,
  UserEvents,
  NotificationEvents,
  ConversationEvents
} from '@/src/core/ipc/constants';

export type AuthEventType = typeof AuthEvents[keyof typeof AuthEvents];
export type AppStateEventType = typeof AppStateEvents[keyof typeof AppStateEvents];
export type CommandCenterEventType = typeof CommandCenterEvents[keyof typeof CommandCenterEvents];
export type SpaceEventType = typeof SpaceEvents[keyof typeof SpaceEvents];
export type MessageEventType = typeof MessageEvents[keyof typeof MessageEvents];
export type UserEventType = typeof UserEvents[keyof typeof UserEvents];
export type NotificationEventType = typeof NotificationEvents[keyof typeof NotificationEvents];
export type ConversationEventType = typeof ConversationEvents[keyof typeof ConversationEvents];

// IPC Response Types
export interface IpcResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface IpcStateResponse extends IpcResponse {
  data?: {
    spaces: Space[];
    activeSpace: Space | null;
    conversations: Conversation[];
    initialDataLoaded: boolean;
    lastFetched: number | null;
  };
}

export interface Space {
  id: string;
  name: string;
  description?: string;
  model: string;
  provider: string;
  is_archived?: boolean;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  user_id?: string;
  color?: string;
  isActive?: boolean;
  chat_mode?: string;
  chat_mode_config?: Record<string, any>;
}

export interface ActiveSpace {
  id: string;
  user_id: string;
  space_id: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  space_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  messageCount?: number;
  lastMessage?: string;
}

// Message Types
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  conversation_id?: string;  // For compatibility with electron types
  conversationId?: string;   // For frontend usage
  conversationName?: string;
  created_at?: string;
  updated_at?: string;
  timestamp?: number;
}

export interface SimilarMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: number;
  score: number;
  conversationId?: string;
  metadata?: Record<string, any>;
}

// Command Center Types
export type CommandType = 
  | 'spaces'
  | 'conversations'
  | 'models'
  | 'backgroundTasks'
  | 'suggestions'
  | 'actions'
  | 'chatModes'
  | 'messageSearch'
  | 'similarMessages';

export type CommandCenterAction = 'open' | 'close' | 'refresh';

export interface CommandCenterStateData {
  action: CommandCenterAction;
  commandType?: CommandType;
}

export type ShortcutKey = 
  | 'CommandOrControl+Option+A'
  | 'CommandOrControl+Option+S'
  | 'CommandOrControl+Option+C'
  | 'CommandOrControl+Option+M'
  | 'CommandOrControl+Option+T'
  | 'CommandOrControl+Option+G'
  | 'CommandOrControl+Option+H'
  | 'CommandOrControl+Option+Q'
  | 'CommandOrControl+Option+W'
  | 'CommandOrControl+Option+E';

// Dialog Types
export interface DialogData {
  title?: string;
  message?: string;
  type?: 'info' | 'error' | 'warning' | 'success';
  [key: string]: any;
}

// Component Props Types
export type ProviderComponentProps = {
  searchQuery: string;
  onSelect?: (item: any) => void;
  onAction?: (action: string, data: any) => void;
};

export type DialogComponentProps = {
  data: any;
  onClose: () => void;
  onConfirm?: (data: any) => void;
};

export interface ProviderRegistry {
  [key: string]: FC<ProviderComponentProps>;
}

export interface DialogRegistry {
  [key: string]: FC<DialogComponentProps>;
}

// API Types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
}

// App State Types
export interface AppState {
  spaces: Space[];
  activeSpace: Space | null;
  conversations: Conversation[];
  messages: Message[];
  initialDataLoaded: boolean;
  lastFetched: number | null;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface AppStateResult extends AppState {
  error?: string;
}

// Model Types
export interface Model {
  id: string;
  name: string;
  description?: string;
  contextWindow: number;
  provider?: string;
}

export type Provider = 'groq' | 'anthropic' | 'openai' | 'cohere' | 'mistral' | 'google' | 'xai' | 'togetherai' | 'perplexity';

export interface ModelsByProvider {
  [key: string]: Model[];
}

// Provider and Model Types
export const PROVIDER_DESCRIPTIONS: Record<Provider, string> = {
  groq: 'Ultra-fast inference optimized for real-time applications',
  anthropic: 'Advanced language models with strong reasoning capabilities',
  openai: 'State-of-the-art models with broad capabilities',
  cohere: 'Specialized models for enterprise and business use cases',
  mistral: 'Open-source foundation models with various specializations',
  google: 'Cutting-edge multimodal models from Google DeepMind',
  xai: 'Advanced models focused on reasoning and transparency',
  togetherai: 'Curated collection of top open-source models',
  perplexity: 'Research-focused models optimized for reasoning tasks'
};

export const AVAILABLE_MODELS = {
  groq: [
    { id: 'deepseek-r1-distill-llama-70b', name: 'Deepseek R1 70B', description: 'Powerful general-purpose model with fast inference', contextWindow: 32768 },
    { id: 'mixtral-8x7b-instruct', name: 'Mixtral 8x7B', description: 'Efficient model balancing speed and capability', contextWindow: 32768 },
    { id: 'deepseek-r1-distill-llama-70b-specdec', name: 'Deepseek R1 70B SpecDec', description: 'Specialized for technical documentation', contextWindow: 32768 },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Compact model optimized for quick responses', contextWindow: 8192 },
    { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B Versatile', description: 'Latest LLaMA optimized for versatility', contextWindow: 128000 },
  ],
  anthropic: [
    { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', description: 'Most capable model for complex tasks', contextWindow: 128000 },
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', description: 'Balanced performance and speed', contextWindow: 128000 },
    { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', description: 'Fast, efficient for simple tasks', contextWindow: 128000 },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most powerful model for complex reasoning', contextWindow: 128000, multimodal: true },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Efficient version of GPT-4', contextWindow: 128000, multimodal: true },
    { id: 'o1', name: 'O1', description: 'Fast, general-purpose assistant', contextWindow: 128000 },
    { id: 'o3-mini', name: 'O3 Mini', description: 'Quick responses for simple tasks', contextWindow: 128000 },
  ],
  cohere: [
    { id: 'command', name: 'Command', description: 'Enterprise-grade general model', contextWindow: 128000 },
    { id: 'command-light', name: 'Command Light', description: 'Faster, lighter version of Command', contextWindow: 32768 },
    { id: 'command-nightly', name: 'Command Nightly', description: 'Latest experimental features', contextWindow: 128000 },
    { id: 'command-light-nightly', name: 'Command Light Nightly', description: 'Fast experimental version', contextWindow: 32768 }
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Most capable open model', contextWindow: 32000 },
    { id: 'codestral-latest', name: 'Codestral', description: 'Specialized for code generation', contextWindow: 32000 },
    { id: 'pixtral-large-latest', name: 'Pixtral Large', description: 'Vision and image understanding', contextWindow: 128000, multimodal: true },
    { id: 'ministral-3b-latest', name: 'Ministral 3B', description: 'Ultra-compact, fast responses', contextWindow: 4096 },
    { id: 'ministral-8b-latest', name: 'Ministral 8B', description: 'Balanced size and capability', contextWindow: 8192 },
    { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Efficient for simple tasks', contextWindow: 4096 },
  ],
  google: [
    { id: 'gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', description: 'Ultra-fast responses, latest version', contextWindow: 1000000, multimodal: true },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Balanced performance model', contextWindow: 1000000, multimodal: true },
  ],
  xai: [
    { id: 'grok-2-1212', name: 'Grok 2', description: 'Advanced reasoning capabilities', contextWindow: 128000 },
    { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', description: 'Multimodal understanding', contextWindow: 128000, multimodal: true },
  ],
  togetherai: [
    { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', description: 'General purpose reasoning', contextWindow: 128000 },
    { id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free', name: 'DeepSeek R1 Distill Llama 70B', description: 'Efficient large model', contextWindow: 32768 },
    { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', description: 'Latest architecture improvements', contextWindow: 128000 },
    { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', name: 'Llama 3.3 70B Instruct Turbo', description: 'Fast instruction following', contextWindow: 128000 },
    { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B Instruct Turbo', description: 'Massive model, best quality', contextWindow: 128000 },
  ],
  perplexity: [
    { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', description: 'Advanced reasoning capabilities', contextWindow: 200000 },
    { id: 'sonar-reasoning', name: 'Sonar Reasoning', description: 'Efficient reasoning model', contextWindow: 200000 },
    { id: 'sonar-pro', name: 'Sonar Pro', description: 'Professional general use', contextWindow: 200000 },
    { id: 'sonar', name: 'Sonar', description: 'Fast, reliable model', contextWindow: 200000 }
  ]
} as const;

export const PROVIDER_NAMES: Record<Provider, string> = {
  groq: 'Groq',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  cohere: 'Cohere',
  mistral: 'Mistral',
  google: 'Google',
  xai: 'xAI',
  togetherai: 'Together AI',
  perplexity: 'Perplexity'
};