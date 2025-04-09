import { Conversation } from '@/entities/conversation/model/types';

export interface UpdateConversationRequest {
  title?: string;
  is_deleted?: boolean;
}

export interface UpdateConversationResponse {
  conversation: Conversation;
}