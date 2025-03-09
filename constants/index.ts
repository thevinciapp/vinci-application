// Database table names
export const DB_TABLES = {
  SPACES: 'spaces',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  USERS: 'users',
  USER_SETTINGS: 'user_settings',
} as const;

// Database column names
export const COLUMNS = {
  ID: 'id',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  USER_ID: 'user_id',
  SPACE_ID: 'space_id',
  NAME: 'name',
  DESCRIPTION: 'description',
  MODEL: 'model',
  PROVIDER: 'provider',
  COLOR: 'color',
  CHAT_MODE: 'chat_mode',
  CHAT_MODE_CONFIG: 'chat_mode_config',
  TITLE: 'title',
  CONTENT: 'content',
  ROLE: 'role',
  ANNOTATIONS: 'annotations',
  TAGS: 'tags',
  IS_DELETED: 'is_deleted',
} as const;
