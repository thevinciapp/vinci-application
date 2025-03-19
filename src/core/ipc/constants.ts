/**
 * Auth-related IPC events
 */
export const AuthEvents = {
  VERIFY_TOKEN: 'verify-token',
  GET_AUTH_TOKEN: 'get-auth-token',
  REFRESH_AUTH_TOKENS: 'refresh-auth-tokens',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
  SIGN_OUT: 'sign-out',
  RESET_PASSWORD: 'reset-password',
  SET_AUTH_TOKENS: 'set-auth-tokens',
  CLEAR_AUTH_DATA: 'clear-auth-data'
} as const;

/**
 * Command center-related IPC events
 */
export const CommandCenterEvents = {
  OPEN_DIALOG: 'open-dialog',
  DIALOG_OPENED: 'dialog-opened',
  DIALOG_CLOSED: 'dialog-closed',
  TOGGLE: 'toggle-command-center',
  SHOW: 'show-command-center',
  CLOSE: 'close-command-center',
  SET_TYPE: 'set-command-type',
  ON_SET_TYPE: 'on-set-command-type',
  ON_DIALOG_OPEN: 'on-open-dialog',
  SYNC_STATE: 'sync-command-center-state',
  REFRESH: 'refresh-command-center',
  ON_REFRESH: 'on-refresh-command-center',
  CHECK_TYPE: 'check-command-type',
  ON_CHECK_TYPE: 'on-check-command-type',
  ON_RESIZE: 'on-window-resize',
  REMOVE_RESIZE_LISTENER: 'remove-window-resize-listener',
  SEARCH_FILES: 'search-files',
  READ_FILE: 'read-file',
  PING: 'ping'
} as const;

/**
 * Space-related IPC events
 */
export const SpaceEvents = {
  GET_SPACE_CONVERSATIONS: 'get-space-conversations',
  UPDATE_SPACE: 'update-space',
  UPDATE_SPACE_MODEL: 'update-space-model',
  SET_ACTIVE_SPACE: 'set-active-space',
  GET_ACTIVE_SPACE: 'get-active-space',
  GET_SPACES: 'get-spaces',
  SPACE_UPDATED: 'space-updated',
  CREATE_SPACE: 'create-space',
  DELETE_SPACE: 'delete-space'
} as const;

/**
 * Message-related IPC events
 */
export const MessageEvents = {
  GET_CONVERSATION_MESSAGES: 'get-conversation-messages',
  SEND_MESSAGE: 'send-message',
  DELETE_MESSAGE: 'delete-message',
  UPDATE_MESSAGE: 'update-message'
} as const;

/**
 * Search-related IPC events
 */
export const SearchEvents = {
  SEARCH_MESSAGES: 'search-messages',
  SEARCH_CONVERSATIONS: 'search-conversations',
  SEARCH_SPACES: 'search-spaces'
} as const;

/**
 * App state-related IPC events
 */
export const UserEvents = {
  GET_PROFILE: 'get-profile',
  UPDATE_PROFILE: 'update-profile',
  UPDATE_PASSWORD: 'update-password',
  UPDATE_EMAIL_PREFERENCES: 'update-email-preferences',
  GET_SETTINGS: 'get-settings',
  UPDATE_SETTINGS: 'update-settings'
} as const;

/**
 * Conversation-related IPC events
 */
export const ConversationEvents = {
  GET_CONVERSATIONS: 'get-conversations',
  CREATE_CONVERSATION: 'create-conversation',
  UPDATE_CONVERSATION: 'update-conversation',
  DELETE_CONVERSATION: 'delete-conversation',
  CONVERSATIONS_UPDATED: 'conversations-updated'
} as const;

export const AppStateEvents = {
  SYNC_STATE: 'sync-app-state',
  GET_STATE: 'get-app-state',
  REFRESH_DATA: 'refresh-app-data',
  STATE_UPDATED: 'state-updated'
} as const;

/**
 * Notification-related IPC events
 */
export const NotificationEvents = {
  GET_NOTIFICATIONS: 'get-notifications',
  MARK_AS_READ: 'mark-notification-as-read',
  MARK_ALL_AS_READ: 'mark-all-notifications-as-read',
  NOTIFICATION_RECEIVED: 'notification-received'
} as const;

// Type for all IPC events
export type IpcEvent = 
  | typeof AuthEvents[keyof typeof AuthEvents]
  | typeof CommandCenterEvents[keyof typeof CommandCenterEvents]
  | typeof SpaceEvents[keyof typeof SpaceEvents]
  | typeof MessageEvents[keyof typeof MessageEvents]
  | typeof SearchEvents[keyof typeof SearchEvents]
  | typeof UserEvents[keyof typeof UserEvents]
  | typeof ConversationEvents[keyof typeof ConversationEvents]
  | typeof AppStateEvents[keyof typeof AppStateEvents]
  | typeof NotificationEvents[keyof typeof NotificationEvents];
