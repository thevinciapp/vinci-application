export interface Space {
  id: string;
  name: string;
  description?: string;
  model?: string;
  provider?: string;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  color?: string;
  isActive?: boolean;
}

export interface Conversation {
  id: string;
  space_id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  messageCount?: number;
  lastMessage?: string;
}