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

export interface DialogData {
  title?: string;
  message?: string;
  type?: 'info' | 'error' | 'warning' | 'success';
  [key: string]: any;
}
