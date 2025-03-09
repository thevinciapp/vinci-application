// Core data models
export interface Space {
  id: string;
  name: string;
  description?: string;
  model: string;
  provider: string;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
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

// Message types
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  conversationId: string;
  conversationName?: string;
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

// Export all type definitions
export * from './mention';
export * from './command-center';
export * from './api';

// Add to global Window interface
declare global {
  interface Window {
    openSimilarMessages?: (messages: SimilarMessage[]) => void;
  }
}