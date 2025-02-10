import { Message } from "ai";

export interface Space {
  id: string;
  name: string;
  description?: string;
  model: string;
  provider: string;
  is_archived?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  user_id: string;
  isActive?: boolean;
}

export interface Conversation {
  id: string;
  space_id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExtendedMessage extends Message {
  conversation_id: string;
  user_id: string;
  model_used?: string;
  provider?: string;
}

export interface Message {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  annotations: {
    conversation_id: string;
    model_used?: string;
    provider?: string;
    parent_message_id?: string;
  };
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}