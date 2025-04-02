import { IpcResponse } from '@/types/ipc';

export interface Conversation {
  id: string;
  space_id: string;
  title?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  messageCount?: number;
  lastMessage?: string;
}

export interface ConversationResponse extends IpcResponse {
  data?: Conversation | Conversation[] | { deleted: boolean } | { updated: boolean } | { messages: any[] };
}

export interface ActiveConversation {
  id: string;
  user_id: string;
  conversation_id: string;
  created_at: string;
}

export interface CreateConversationRequest {
  title: string;
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