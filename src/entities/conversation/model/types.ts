import { IpcResponse } from '@/shared/types/ipc';
import { Message } from '@/entities/message/model/types';

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
  data?: Conversation | Conversation[] | { deleted: boolean } | { updated: boolean } | { messages: Message[] };
}

export interface ActiveConversation {
  id: string;
  user_id: string;
  conversation_id: string;
  created_at: string;
}

export interface GetConversationsResponse {
  conversations: Conversation[];
}

export interface GetConversationResponse {
  conversation: Conversation;
}