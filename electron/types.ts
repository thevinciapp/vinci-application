/**
 * Shared types between main and renderer processes
 */

/**
 * Command types for the command center
 */
export type CommandType = 
  | 'spaces'
  | 'conversations'
  | 'models'
  | 'backgroundTasks'
  | 'suggestions'
  | 'actions'
  | 'chatModes'
  | 'messageSearch'
  | 'similarMessages'
  | 'application'
  | 'background-tasks';

/**
 * Shortcut keys for the application
 */
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

/**
 * Application state interface
 */
export interface AppState {
  spaces: Space[];
  activeSpace: Space | null;
  conversations: Conversation[];
  messages: Message[];
  initialDataLoaded: boolean;
  lastFetched: number | null;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiryTime: number | null; // Unix timestamp in seconds when the token expires
}

/**
 * User interface
 */
export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  created_at: string;
}

/**
 * Space interface
 */
export interface Space {
  id: string;
  name: string;
  description?: string;
  model: string;
  provider: string;
  is_archived?: boolean;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  user_id?: string;
  color?: string;
  isActive?: boolean;
  chat_mode?: string;
  chat_mode_config?: Record<string, any>;
}

/**
 * Conversation interface
 */
export interface Conversation {
  id: string;
  space_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  messageCount?: number;
  lastMessage?: string;
}

/**
 * Message interface
 */
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  conversation_id?: string;
  conversationId?: string;
  conversationName?: string;
  created_at?: string;
  updated_at?: string;
  timestamp?: number;
}