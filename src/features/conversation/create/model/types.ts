import { Conversation } from '@/entities/conversation/model/types';

export interface CreateConversationRequest {
  title: string;
  space_id: string;
}

export interface CreateConversationResponse {
  conversation: Conversation;
}