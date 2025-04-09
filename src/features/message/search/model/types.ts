import { MessageSearchResult } from '@/entities/message/model/types';

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