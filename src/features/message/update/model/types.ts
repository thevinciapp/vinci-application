import { Message, MessageAnnotation } from '@/entities/message/model/types';

export interface UpdateMessageRequest {
  content?: string;
  annotations?: MessageAnnotation[];
  is_deleted?: boolean;
}

export interface UpdateMessageResponse {
  message: Message;
}