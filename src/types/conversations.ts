import { Message } from 'ai';

export interface Conversation {
  id: string;
  space_id: string;
  title?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActiveConversation {
  id: string;
  user_id: string;
  conversation_id: string;
  created_at: string;
}

export interface CreateConversationRequest {
  title?: string;
  space_id: string;
}

export interface CreateConversationResponse {
  conversation: Conversation;
}

export interface UpdateConversationRequest {
  title?: string;
  is_deleted?: boolean;
}

export interface UpdateConversationResponse {
  conversation: Conversation;
}

export interface GetConversationsResponse {
  conversations: Conversation[];
}

export interface GetConversationResponse {
  conversation: Conversation;
}

export interface DeleteConversationResponse {
  success: boolean;
}

export interface MessageDB {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  annotations?: any[];
  conversation_id: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  search_vector?: any;
}

export interface CreateMessageRequest {
  content: string;
  role: 'user' | 'assistant' | 'system';
  conversation_id: string;
  annotations?: any[];
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
  annotations?: any[];
  is_deleted?: boolean;
}

export interface UpdateMessageResponse {
  message: Message;
}

export interface DeleteMessageResponse {
  success: boolean;
}

export interface MessageSearchResult {
  id: string;
  conversation_id: string;
  content: string;
  role: string;
  created_at: string;
  ts_rank: number;
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