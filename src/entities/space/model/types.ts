import { Provider } from '@/entities/model/model/types';
import { Conversation } from '@/entities/conversation/model/types';
import { Message } from '@/entities/message/model/types';

export interface Space {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  model: string;
  provider: Provider;
  chat_mode: string;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  color?: string;
  isActive?: boolean;
}

export interface SpaceResponse {
  success: boolean;
  error?: string;
  data?: {
    space: Space;
    conversations: Conversation[];
    messages: Message[];
  } | Space[];
}

export interface ActiveSpace {
  id: string;
  user_id: string;
  space_id: string;
  created_at: string;
  updated_at: string;
}

export type SpaceActionType =
  | 'created'
  | 'deleted'
  | 'updated'
  | 'model_changed'
  | 'conversation_added'
  | 'conversation_deleted';

export interface SpaceHistory {
  id: string;
  space_id: string;
  user_id: string;
  action_type: SpaceActionType;
  title: string;
  description: string;
  metadata: object;
  created_at: string;
}

export interface SpaceUserRelation {
  id: string;
  space_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
}

export interface GetSpacesResponse {
  spaces: Space[];
}

export interface GetSpaceResponse {
  space: Space;
}

export interface GetSpaceHistoryResponse {
  history: SpaceHistory[];
}