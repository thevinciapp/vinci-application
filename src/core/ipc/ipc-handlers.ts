import { registerAuthHandlers } from './handlers/auth-handlers';
import { registerMessageHandlers } from './handlers/message-handlers';
import { registerSpaceHandlers } from './handlers/space-handlers';
import { registerAppStateHandlers } from './handlers/app-state-handlers';
import { registerConversationHandlers } from './handlers/conversation-handlers';
import { registerCommandCenterHandlers } from './handlers/command-center-handlers';
import { registerProfileHandlers } from './handlers/profile-handlers';
import { registerNotificationHandlers } from './handlers/notification-handlers';
import { registerUserHandlers } from './handlers/user-handlers';
import { registerChatHandlers } from './handlers/chat-handlers';

/**
 * Register all IPC handlers for the application
 */
export function registerIpcHandlers(): void {
  registerAuthHandlers();
  registerMessageHandlers();
  registerSpaceHandlers();
  registerAppStateHandlers();
  registerConversationHandlers();
  registerCommandCenterHandlers();
  registerProfileHandlers();
  registerNotificationHandlers();
  registerUserHandlers();
  registerChatHandlers();
}