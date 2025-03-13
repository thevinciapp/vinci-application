import { User } from '@supabase/supabase-js';

export type CommandType = 
  | 'spaces'
  | 'conversations'
  | 'models'
  | 'backgroundTasks'
  | 'suggestions'
  | 'actions'
  | 'chatModes'
  | 'messageSearch'
  | 'similarMessages';

export type CommandCenterAction = 'open' | 'close' | 'refresh';

export interface CommandCenterStateData {
  action: CommandCenterAction;
  commandType?: CommandType;
}

export type ShortcutKey = 
  | 'CommandOrControl+Option+A'
  | 'CommandOrControl+Option+S'
  | 'CommandOrControl+Option+C'
  | 'CommandOrControl+Option+M'
  | 'CommandOrControl+Option+T'
  | 'CommandOrControl+Option+G'
  | 'CommandOrControl+Option+H'
  | 'CommandOrControl+Option+Q'
  | 'CommandOrControl+Option+W'
  | 'CommandOrControl+Option+E';

// Dialog Types
export interface DialogData {
  title?: string;
  message?: string;
  type?: 'info' | 'error' | 'warning' | 'success';
  [key: string]: any;
}

// API Types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
}

// Data Models
export interface Space {
  id: string;
  name: string;
  description?: string;
  model: string;
  provider: string;
  color?: string;
  chat_mode?: string;
  chat_mode_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  space_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  conversation_id: string;
  created_at: string;
  updated_at: string;
}

export interface AppState {
  spaces: Space[];
  activeSpace: Space | null;
  conversations: Conversation[];
  messages: Message[];
  initialDataLoaded: boolean;
  lastFetched: number | null;
  user: User | null;
}

export interface AppStateResult extends AppState {
  error?: string;
}
