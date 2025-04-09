import { JSONValue } from "@ai-sdk/ui-utils";
import type { CreateMessage as VercelCreateMessage } from '@ai-sdk/ui-utils';
import { Message, MessageAnnotation } from '@/entities/message/model/types';

export interface VinciCreateMessage extends Omit<VercelCreateMessage, 'data'> {
  conversation_id: string;
  annotations?: JSONValue[] | undefined;
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