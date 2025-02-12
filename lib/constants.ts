import { Provider } from "@/config/models";

export interface AIModel {
  id: string;
  name: string;
  contextLength: number;
  provider: Provider;
}

export interface AIProvider {
  id: Provider;
  name: string;
  models: AIModel[];
}

export const API_ROUTES = {
  CHAT: '/api/chat',
  CONVERSATIONS: (spaceId: string) => `/api/conversations/${spaceId}`,
  MESSAGES: (conversationId: string) => `/api/messages/${conversationId}`,
  SPACES: '/api/spaces',
  SPACE: (id: string) => `/api/spaces/${id}`,
};


// Database Tables
export const DB_TABLES = {
  SPACES: 'spaces',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  ACTIVE_SPACES: 'active_spaces'
} as const

// Common Table Columns
export const COLUMNS = {
  // Common columns
  ID: 'id',
  USER_ID: 'user_id',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  IS_DELETED: 'is_deleted',

  // Space columns
  NAME: 'name',
  DESCRIPTION: 'description',
  MODEL: 'model',
  PROVIDER: 'provider',
  IS_ACTIVE: 'isActive',

  // Conversation columns
  SPACE_ID: 'space_id',
  TITLE: 'title',

  // Message columns
  CONVERSATION_ID: 'conversation_id',
  ROLE: 'role',
  CONTENT: 'content',
  MODEL_USED: 'model_used',
  PARENT_MESSAGE_ID: 'parent_message_id',
  ANNOTATIONS: 'annotations'
} as const

// Message Roles
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant'
} as const

// Common Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: { error: 'Unauthorized', status: 401 },
  MISSING_FIELDS: { error: 'Missing required fields', status: 400 },
  INVALID_PROVIDER: { error: 'Invalid provider', status: 400 },
  INVALID_MODEL: { error: 'Invalid model for the selected provider', status: 400 },
  MISSING_SPACE_ID: { error: 'Space ID is required', status: 400 },
  MISSING_CONVERSATION_ID: { error: 'Conversation ID is required', status: 400 },
  INVALID_ROLE: { error: 'Invalid role: must be either "user" or "assistant"', status: 400 },
  MISSING_ASSISTANT_FIELDS: { error: 'Assistant messages require model_used and provider fields', status: 400 },
  SPACE_NOT_FOUND: { error: 'Space not found or access denied', status: 404 },
  CONVERSATION_NOT_FOUND: { error: 'Conversation not found', status: 404 },
  SERVER_ERROR: (message: string) => ({ error: message, status: 500 })
} as const

export const DEFAULTS = {
  CONVERSATION_TITLE: 'New Conversation',
  SPACE_NAME: 'My Space',
  SPACE_DESCRIPTION: 'My first space',
  WELCOME_MESSAGE: 'Welcome to Vinci! I\'m here to help you explore and create. What would you like to do?'
} as const