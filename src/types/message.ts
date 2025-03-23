import { Provider } from './provider';

export interface Message {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  annotations?: MessageAnnotation[];
  conversation_id: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  search_vector?: any;
}

export interface MessageAnnotation {
  provider: Provider;
  chat_mode: string;
  model_used: string;
  similarMessages?: SimilarMessage[];
  chat_mode_config?: {
    tools: string[];
    mcp_servers?: string[];
  };
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

export interface MessageSearchResult {
  id: string;
  conversation_id: string;
  content: string;
  role: string;
  created_at: string;
  ts_rank: number;
}

export interface CreateMessageRequest {
  content: string;
  role: 'user' | 'assistant' | 'system';
  conversation_id: string;
  annotations?: MessageAnnotation[];
}

export interface CreateMessageResponse {
  message: Message;
}

export interface GetMessagesResponse {
  messages: Message[];
}

export interface GetMessageResponse {
  message: Message;
}

export interface UpdateMessageRequest {
  content?: string;
  annotations?: MessageAnnotation[];
  is_deleted?: boolean;
}

export interface UpdateMessageResponse {
  message: Message;
}

export interface DeleteMessageResponse {
  success: boolean;
}

export interface SearchConversationMessagesRequest {
  conversation_id: string;
  query: string;
  limit?: number;
}

export interface SearchSpaceMessagesRequest {
  space_id: string;
  query: string;
  limit?: number;
}

export interface SearchAllUserMessagesRequest {
  query: string;
  limit?: number;
}

export interface SearchMessagesResponse {
  messages: MessageSearchResult[];
} 