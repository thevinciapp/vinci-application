import { Provider } from '@/entities/model/model/types';
import { IpcResponse } from '@/shared/types/ipc';
import { JSONValue } from "@ai-sdk/ui-utils";
import type { Message as VercelMessage, UIMessage as VercelUIMessage } from '@ai-sdk/ui-utils';

export interface VinciMessage extends VercelMessage {
  conversation_id: string;
  updated_at?: string;
  space_id?: string;
}

export interface VinciUIMessage extends VercelUIMessage {
  conversation_id: string;
  updated_at?: string;
  space_id?: string;
}

export interface Message {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  annotations?: JSONValue[];
  conversation_id: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageResponse extends IpcResponse {
  data?: VinciMessage | VinciMessage[] | { deleted: boolean } | { messageId: string; chunk: string } | { success: boolean };
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
  metadata?: Record<string, unknown>;
}

export interface MessageSearchResult {
  id: string;
  conversation_id: string;
  content: string;
  role: string;
  created_at: string;
  ts_rank: number;
}

export interface GetMessagesResponse {
  messages: Message[];
}

export interface GetMessageResponse {
  message: Message;
}