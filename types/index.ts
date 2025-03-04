export interface Space {
  id: string;
  name: string;
  description?: string;
  model?: string;
  provider?: string;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  color?: string;
  isActive?: boolean;
}

export interface Conversation {
  id: string;
  space_id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  messageCount?: number;
  lastMessage?: string;
}

// Define the SimilarMessage type for global use
export interface SimilarMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: number;
  score: number;
  conversationId?: string;
  metadata?: Record<string, any>;
}

// Add to global Window interface
declare global {
  interface Window {
    openSimilarMessages?: (messages: SimilarMessage[]) => void;
  }
}