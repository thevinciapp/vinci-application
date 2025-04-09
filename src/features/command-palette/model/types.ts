export type CommandType =
  | 'spaces'
  | 'conversations'
  | 'models'
  | 'backgroundTasks'
  | 'suggestions'
  | 'actions'
  | 'chatModes'
  | 'chat-modes'
  | 'messageSearch'
  | 'similarMessages'
  | 'application'
  | 'background-tasks'
  | 'unified';

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