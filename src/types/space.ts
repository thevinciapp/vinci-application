import { Provider } from '@/types/provider';
import { IpcResponse } from '@/types/ipc';
import { Conversation } from './conversation';
import { Message } from './message';

export interface Space {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  model: string;
  provider: Provider;
  chat_mode: string;
  chat_mode_config: Record<string, any>;
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
  metadata: Record<string, any>;
  created_at: string;
}

export interface SpaceUserRelation {
  id: string;
  space_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
}

export interface CreateSpaceRequest {
  name: string;
  description?: string;
  model?: string;
  provider?: Provider;
  chat_mode?: string;
  chat_mode_config?: Record<string, any>;
}

export interface UpdateSpaceRequest {
  name?: string;
  description?: string;
  model?: string;
  provider?: Provider;
  is_archived?: boolean;
  chat_mode?: string;
  chat_mode_config?: Record<string, any>;
}

export interface CreateSpaceResponse {
  space: Space;
}

export interface UpdateSpaceResponse {
  space: Space;
}

export interface GetSpacesResponse {
  spaces: Space[];
}

export interface GetSpaceResponse {
  space: Space;
}

export interface DeleteSpaceResponse {
  success: boolean;
}

export interface GetSpaceHistoryResponse {
  history: SpaceHistory[];
} 